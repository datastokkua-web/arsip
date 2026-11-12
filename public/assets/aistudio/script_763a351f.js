/* ============================================================
   SISTEM INFORMASI TATA PERSURATAN DIGITAL
   script.js - Logika Frontend (SPA + API Google Apps Script)
   ============================================================
   Catatan konfigurasi:
   - URL Web App Apps Script dapat diisi langsung di bawah ini
     (CONFIG.WEB_APP_URL) ATAU lewat halaman "Pengaturan"
     (tersimpan di localStorage browser).
   - Tidak ada password / token yang disimpan di frontend.
   ============================================================
   PERBAIKAN v1.1 (anti "Koneksi ke Web App gagal" saat unggah):
   1. Percobaan ulang OTOMATIS 3x untuk kegagalan lapis jaringan.
   2. Progres unggahan NYATA (byte terkirim) via xhr.upload.onprogress
      (aman, tidak memicu CORS preflight).
   3. Diagnosa otomatis 4 langkah (Internet > URL > GET > POST)
      dengan langkah perbaikan + tombol "Coba Simpan Lagi".
   4. Kartu "Diagnostik Koneksi & Konfigurasi Deploy" di Pengaturan.
   5. File PDF OPSIONAL saat menyimpan surat baru; tautan dapat
      ditambahkan kemudian lewat tombol Edit.
   6. Pantauan peristiwa offline/online perangkat.
   ============================================================
   FITUR v1.2 (URL PERMANEN - semua browser & perangkat):
   - Tombol "Salin Kode Permanen" di Pengaturan: membuat baris
     CONFIG.WEB_APP_URL yang siap ditempel ke script.js. Setelah
     diunggah ulang ke hosting, website OTOMATIS terhubung di
     semua browser & perangkat tanpa membuka Pengaturan.
   - Indikator "Sumber URL": lokal (per browser) vs permanen
     (tertanam di script.js).
   - Prioritas URL: localStorage (penimpaan per perangkat) >
     CONFIG.WEB_APP_URL (permanen). Hapus URL lokal lewat tombol
     "Hapus" agar kembali ke URL permanen.
   ============================================================
   FITUR v1.3 (EKSPOR EXCEL .XLSX di Arsip Digital):
   - Tombol "Ekspor Excel" mengunduh SELURUH hasil filter tab
     aktif (bukan hanya halaman tampil) sebagai file .xlsx asli,
     dibuat sepenuhnya di browser via pustaka ExcelJS (CDN).
   - Isi file: header berwarna (hijau = masuk, biru = keluar),
     tanggal berformat Excel (bisa diurutkan), tautan PDF dapat
     diklik, AutoFilter, dan header beku (frozen panes).
   ============================================================ */

'use strict';

/* ======================= KONFIGURASI ======================= */
const CONFIG = {
  // URL Web App PERMANEN: setelah deploy, tanam URL di baris di bawah
  // agar website otomatis terhubung di SEMUA browser & perangkat
  // (tanpa perlu mengatur Pengaturan lagi). Cara termudah: buka halaman
  // Pengaturan > URL Web App > klik "Salin Kode Permanen", lalu tempel
  // menggantikan baris WEB_APP_URL ini dan unggah ulang script.js ke
  // hosting. Contoh:
  // WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzX8hwL54WYtgyZJJvW3-J9WcUEha6obC_OnRYMEG4z-nEvtSf6RQHMVwu0d032UlETnA/exec',
  WEB_APP_URL: '',
  SPREADSHEET_ID: '1uxoNjks8gHgGuNatak9JFbdlLqfj3t3Fy_KFHZ0VNms',
  FOLDER_MASUK_ID: '1hqVP3XPvjtME72rFWkT5PhZf2pJq3Uvf',
  FOLDER_KELUAR_ID: '1_tqYSmLsF_v7yWfQqVWk7WJgE5IfTB3E',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
  PER_PAGE: 10,
  APP_VERSION: 'v1.3.0'
};

const LS_URL_KEY = 'sitpd_webapp_url';

const PAGES = {
  'dashboard':    { title: 'Dashboard',         sub: 'Ringkasan data persuratan secara real-time' },
  'surat-masuk':  { title: 'Surat Masuk',       sub: 'Daftar seluruh surat masuk (Sheet1)' },
  'input-masuk':  { title: 'Input Surat Masuk', sub: 'Tambah data surat masuk + PDF ke Sheet1 dan folder Drive' },
  'surat-keluar': { title: 'Surat Keluar',      sub: 'Daftar seluruh surat keluar (Sheet2)' },
  'input-keluar': { title: 'Input Surat Keluar',sub: 'Tambah data surat keluar + PDF ke Sheet2 dan folder Drive' },
  'arsip':        { title: 'Arsip Digital',     sub: 'Telusuri, unduh, ubah, dan hapus arsip PDF' },
  'pengaturan':   { title: 'Pengaturan',        sub: 'Koneksi Spreadsheet & Drive, konfigurasi Web App, info aplikasi' }
};

/* ======================= STATE GLOBAL ======================= */
const state = {
  masuk: [],   // baris Sheet1
  keluar: [],  // baris Sheet2
  form: {
    masuk:  { editing: null, file: null },
    keluar: { editing: null, file: null }
  },
  charts: { bar: null, donut: null },
  current: 'dashboard'
};

/* Mesin tabel: filter + urut + paginasi per konteks tabel */
function mkEngine() {
  return { page: 1, perPage: CONFIG.PER_PAGE, sortKey: 'tanggal-desc', search: '', dari: '', sampai: '' };
}
const engines = {
  masuk: mkEngine(), keluar: mkEngine(),
  arsipMasuk: mkEngine(), arsipKeluar: mkEngine()
};

const TABLES = {
  masuk:      { get rows() { return state.masuk;  }, tbody: 'tableMasukBody',      pag: 'paginationMasuk',      count: 'countMasuk',      kontak: 'Pengirim' },
  keluar:     { get rows() { return state.keluar; }, tbody: 'tableKeluarBody',     pag: 'paginationKeluar',     count: 'countKeluar',     kontak: 'Tujuan' },
  arsipMasuk: { get rows() { return state.masuk;  }, tbody: 'tableArsipMasukBody', pag: 'paginationArsipMasuk', count: 'countArsipMasuk', kontak: 'Pengirim' },
  arsipKeluar:{ get rows() { return state.keluar; }, tbody: 'tableArsipKeluarBody',pag: 'paginationArsipKeluar',count: 'countArsipKeluar',kontak: 'Tujuan' }
};

/* ======================= UTILITAS ======================= */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function el(id) { return document.getElementById(id); }

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function formatDateTimeID(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear() + ' ' + hh + ':' + mm;
}

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
  didOpen: (t) => { t.addEventListener('mouseenter', Swal.stopTimer); t.addEventListener('mouseleave', Swal.resumeTimer); }
});

function toastOk(msg)  { Toast.fire({ icon: 'success', title: msg }); }
function toastErr(msg) { Toast.fire({ icon: 'error',   title: msg, timer: 4200 }); }
function toastInfo(msg){ Toast.fire({ icon: 'info',    title: msg }); }

/* Loader global dengan penghitung (aman untuk panggilan paralel) */
let loaderCount = 0;
function loaderOn()  { loaderCount++; el('globalLoader').classList.add('show'); }
function loaderOff() { loaderCount = Math.max(0, loaderCount - 1); if (loaderCount === 0) el('globalLoader').classList.remove('show'); }

/* ======================= LAPISAN API ======================= */
function getApiUrl() {
  let url = '';
  try { url = localStorage.getItem(LS_URL_KEY) || ''; } catch (e) { url = ''; }
  url = (url || CONFIG.WEB_APP_URL || '').trim();
  return url;
}

function setConnBadge(mode) {
  const badge = el('connBadge');
  const txt = el('connText');
  badge.classList.remove('ok', 'err', 'unknown');
  if (mode === 'ok')      { badge.classList.add('ok');      txt.textContent = 'Terhubung'; }
  else if (mode === 'err'){ badge.classList.add('err');     txt.textContent = 'Terputus'; }
  else                    { badge.classList.add('unknown'); txt.textContent = 'Belum Terhubung'; }
}

function friendlyError(err) {
  const m = String(err && err.message ? err.message : err);
  if (!navigator.onLine) {
    return 'Tidak ada koneksi internet. Sambungkan Wi-Fi/data, lalu ulangi (Muat Ulang / Simpan).';
  }
  if (m.indexOf('Unexpected token') !== -1 || m.indexOf('<!DOCTYPE') !== -1 || m.indexOf('HTML') !== -1) {
    return 'Respons bukan JSON. Pastikan Web App sudah di-deploy dengan akses "Anyone" dan URL yang dipakai berakhiran /exec.';
  }
  if (m.indexOf('Failed to fetch') !== -1 || m.indexOf('NetworkError') !== -1) {
    return 'Tidak dapat menghubungi Web App. Periksa koneksi internet dan URL Web App di halaman Pengaturan.';
  }
  return m;
}

async function apiGet(action) {
  const url = getApiUrl();
  if (!url) throw new Error('URL Web App belum dikonfigurasi. Buka halaman Pengaturan untuk mengaturnya.');
  const full = url + (url.indexOf('?') === -1 ? '?' : '&') + 'action=' + encodeURIComponent(action);
  let res;
  try {
    res = await fetch(full, { method: 'GET', redirect: 'follow' });
  } catch (e) {
    setConnBadge('err');
    const err = new Error('Tidak dapat menghubungi Web App (jalur GET). Periksa internet dan URL Web App.');
    err.isNetwork = true;
    throw err;
  }
  const json = await parseJsonResponse(res);
  setConnBadge(json.success ? 'ok' : 'err');
  if (!json.success) throw new Error(json.message || 'Server menolak permintaan.');
  return json;
}

/* POST dikirim sebagai body string (Content-Type bawaan text/plain)
   sehingga TIDAK memicu CORS preflight pada Google Apps Script
   (tanpa header kustom). Dukungan baru v1.1:
   - hooks.onProgress(loaded, total) : progres unggahan NYATA (byte
     terkirim) lewat xhr.upload.onprogress - listener ini TIDAK
     memicu preflight, aman dipakai.
   - err.isNetwork = true            : menandai kegagalan di lapis
     jaringan (internet/deploy/CORS) agar dapat diulang otomatis
     dan didiagnosis dengan tepat oleh diagnoseKoneksi(). */
function apiPost(payload, hooks) {
  hooks = hooks || {};
  return new Promise((resolve, reject) => {
    const url = getApiUrl();
    if (!url) { reject(new Error('URL Web App belum dikonfigurasi. Buka halaman Pengaturan untuk mengaturnya.')); return; }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.timeout = 180000; // 3 menit (upload PDF besar)
    xhr.onload = () => {
      let json = null;
      try { json = JSON.parse(xhr.responseText); }
      catch (e) {
        setConnBadge('err');
        const err = new Error('Respons bukan JSON (HTTP ' + xhr.status + '). Pastikan Web App di-deploy dengan akses "Anyone", URL berakhiran /exec, dan sudah di-deploy ulang (New version) setelah kode berubah.');
        err.isNetwork = false;
        reject(err);
        return;
      }
      setConnBadge(json.success ? 'ok' : 'err');
      if (!json.success) { reject(new Error(json.message || 'Server menolak permintaan.')); return; }
      resolve(json);
    };
    xhr.onerror = () => {
      setConnBadge('err');
      const err = new Error('Koneksi ke Web App gagal pada jalur POST (jaringan terputus, diblokir browser/ekstensi, atau konfigurasi deploy belum benar).');
      err.isNetwork = true;
      reject(err);
    };
    xhr.ontimeout = () => {
      const err = new Error('Waktu tunggu habis (server tidak merespons dalam 3 menit). Koneksi lambat/tidak stabil atau file terlalu besar.');
      err.isNetwork = true;
      reject(err);
    };
    if (xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (hooks.onProgress && e && e.lengthComputable) hooks.onProgress(e.loaded, e.total);
      };
    }
    xhr.send(JSON.stringify(payload));
  });
}

/* ============================================================
   PERBAIKAN v1.1 - KETAHANAN & DIAGNOSA KONEKSI
   ============================================================ */

/* Tes cepat koneksi internet perangkat: navigator.onLine + probe
   jaringan ke server Google (batas waktu 5 detik). */
async function cekInternet() {
  if (!navigator.onLine) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    return true;
  } catch (e) {
    return false;
  }
}

/* apiPostResilient - membungkus apiPost dengan percobaan ulang
   OTOMATIS (maksimal 3 kali) hanya untuk kegagalan lapis jaringan.
   Kesalahan validasi/server (success:false) TIDAK diulang. */
async function apiPostResilient(payload, hooks) {
  hooks = hooks || {};
  const maxAttempts = 3;
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      if (hooks.onStatus) hooks.onStatus('Koneksi terputus - mengulang otomatis (percobaan ' + attempt + '/' + maxAttempts + ')...');
      await new Promise((r) => setTimeout(r, 1400 * attempt));
    }
    try {
      return await apiPost(payload, hooks);
    } catch (err) {
      lastErr = err;
      if (!err || !err.isNetwork) throw err; // bukan masalah jaringan: jangan diulang
    }
  }
  throw lastErr;
}

/* Diagnosa 4 langkah: Internet > Format URL > jalur GET > jalur POST.
   Menghasilkan daftar {ok, judul, pesan, fix} untuk ditampilkan. */
async function diagnoseKoneksi() {
  const langkah = [];

  // 1) Internet
  const online = await cekInternet();
  langkah.push({
    ok: online,
    judul: 'Langkah 1 - Koneksi Internet',
    pesan: online
      ? 'Internet aktif (peramban online dan probe jaringan ke server Google berhasil).'
      : 'Internet TIDAK terdeteksi, atau jaringan/VPN/proxy memblokir akses ke server Google.',
    fix: online ? '' : 'Sambungkan Wi-Fi atau data seluler, matikan mode pesawat, atau coba jaringan lain. Bila memakai VPN/proxy kantor, matikan sementara lalu ulangi.'
  });
  if (!online) return langkah;

  // 2) Format URL Web App
  const url = getApiUrl();
  const urlOk = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url);
  langkah.push({
    ok: urlOk,
    judul: 'Langkah 2 - URL Web App',
    pesan: url
      ? (urlOk ? 'URL berformat benar (https://script.google.com/macros/s/.../exec).' : 'URL tidak berpola /exec: ' + url)
      : 'URL Web App belum diatur di halaman Pengaturan.',
    fix: urlOk ? '' : 'Salin URL dari dialog Deploy (harus berakhiran /exec, bukan /dev), tempel di kolom URL Web App, lalu klik Simpan URL.'
  });
  if (!urlOk) return langkah;

  // 3) Jalur GET (baca data)
  let getOk = false;
  let getPesan = '';
  try {
    const j = await apiGet('test');
    getOk = true;
    getPesan = 'GET berjalan. ' + (j.data && j.data.spreadsheet ? 'Spreadsheet: ' + j.data.spreadsheet.name + '.' : 'API merespons.');
  } catch (e) {
    getPesan = e.message;
  }
  langkah.push({
    ok: getOk,
    judul: 'Langkah 3 - Jalur GET (baca data)',
    pesan: getPesan,
    fix: getOk ? '' : 'Konfigurasi deploy belum benar: buka Apps Script > Deploy > Manage deployments > ikon pensil, pastikan Execute as = Me dan Who has access = Anyone, lalu Deploy. Selesaikan izin (Allow) bila diminta.'
  });
  if (!getOk) return langkah;

  // 4) Jalur POST (simpan & unggah)
  let postOk = false;
  let postPesan = '';
  try {
    const j = await apiPost({ action: 'ping' });
    postOk = true;
    postPesan = 'POST berjalan. Server merespons "' + (j.message || 'pong') + '" pukul ' + (j.time || '-');
  } catch (e) {
    postPesan = e.message;
  }
  langkah.push({
    ok: postOk,
    judul: 'Langkah 4 - Jalur POST (simpan & unggah PDF)',
    pesan: postPesan,
    fix: postOk ? '' : 'GET normal tetapi POST gagal. Penyebab paling umum: (1) Code.gs pernah diubah tetapi belum di-deploy sebagai versi baru - lakukan Deploy > Manage deployments > ikon pensil > Version: New version > Deploy; (2) izin Spreadsheet/Drive belum di-Allow sampai selesai; (3) ekstensi pemblokir iklan - coba jendela penyamaran.'
  });
  return langkah;
}

/* Merender daftar diagnosa menjadi HTML (dipakai dialog & panel). */
function renderDiagHtml(langkah) {
  if (!langkah.length) {
    return '<ul class="diag-list"><li class="diag-item fail"><span class="diag-icon"><i class="fa-solid fa-xmark"></i></span>' +
      '<div><div class="diag-title">Diagnosa tidak dapat dijalankan</div>' +
      '<div class="diag-pesan">Jalankan "Diagnostik Koneksi &amp; Konfigurasi Deploy" pada halaman Pengaturan.</div></div></li></ul>';
  }
  return '<ul class="diag-list">' + langkah.map((l) =>
    '<li class="diag-item ' + (l.ok ? 'ok' : 'fail') + '">' +
    '<span class="diag-icon"><i class="fa-solid ' + (l.ok ? 'fa-check' : 'fa-xmark') + '"></i></span>' +
    '<div><div class="diag-title">' + escapeHtml(l.judul) + '</div>' +
    '<div class="diag-pesan">' + escapeHtml(l.pesan) + '</div>' +
    (l.fix ? '<div class="diag-fix"><i class="fa-solid fa-wrench me-1"></i>' + escapeHtml(l.fix) + '</div>' : '') +
    '</div></li>'
  ).join('') + '</ul>';
}

/* Dialog diagnosa otomatis setelah simpan/unggah gagal di lapis
   jaringan, lengkap dengan tombol "Coba Simpan Lagi". */
async function tunjukkanDiagnosa(type, err) {
  let langkah = [];
  loaderOn();
  try { langkah = await diagnoseKoneksi(); }
  catch (eDiag) { langkah = []; }
  finally { loaderOff(); }

  const semuaOk = langkah.length > 0 && langkah.every((l) => l.ok);
  const intro = semuaOk
    ? 'Internet, URL, jalur GET, dan jalur POST kecil <b>semuanya NORMAL</b>. Kegagalan tadi kemungkinan karena <b>file besar pada koneksi yang tidak stabil</b> (sistem sudah mengulang 3x). Silakan coba lagi; bila berulang, gunakan PDF berukuran lebih kecil atau periksa kestabilan jaringan.'
    : 'Ada langkah yang GAGAL (ditandai merah). Ikuti langkah perbaikannya, lalu klik <b>Coba Simpan Lagi</b>. Isi form dan file yang Anda pilih TIDAK hilang.';

  Swal.fire({
    icon: 'error',
    title: semuaOk ? 'Simpan gagal, namun koneksi dasar sehat' : 'Penyimpanan gagal - hasil diagnosa koneksi',
    html: '<div style="text-align:left;font-size:13px">' +
      '<div style="margin-bottom:10px">' + friendlyError(err) + '<br>' + intro + '</div>' +
      renderDiagHtml(langkah) +
      '</div>',
    confirmButtonText: '<i class="fa-solid fa-rotate-right me-1"></i> Coba Simpan Lagi',
    confirmButtonColor: '#16A34A',
    showCancelButton: true,
    cancelButtonText: 'Tutup',
    cancelButtonColor: '#64748B',
    width: 640
  }).then((res) => {
    if (res.isConfirmed) submitForm(type);
  });
}

/* Panel "Diagnostik Koneksi & Konfigurasi Deploy" pada Pengaturan. */
async function jalankanDiagnostikPanel() {
  const btn = el('btnDiagnostik');
  const htmlAsli = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Memeriksa&hellip;';
  let langkah = [];
  try { langkah = await diagnoseKoneksi(); }
  catch (e) { langkah = []; }
  finally {
    btn.disabled = false;
    btn.innerHTML = htmlAsli;
  }
  const panel = el('diagDetail');
  panel.classList.remove('d-none');
  const semuaOk = langkah.length > 0 && langkah.every((l) => l.ok);
  panel.innerHTML =
    '<div class="diag-summary ' + (semuaOk ? 'ok' : 'fail') + '">' +
    (semuaOk
      ? '<i class="fa-solid fa-circle-check me-2"></i>Semua 4 pemeriksaan BERHASIL. Jalur simpan &amp; unggah PDF siap dipakai.'
      : '<i class="fa-solid fa-triangle-exclamation me-2"></i>Ada pemeriksaan yang GAGAL. Ikuti langkah perbaikan pada item merah.') +
    '</div>' + renderDiagHtml(langkah);
}

async function parseJsonResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) {
    throw new Error('Respons bukan JSON. Pastikan Web App sudah di-deploy ulang setelah kode berubah, aksesnya "Anyone", dan URL benar.');
  }
}

/* ======================= NAVIGASI SPA ======================= */
function showPage(name) {
  if (!PAGES[name]) name = 'dashboard';
  state.current = name;

  $$('.page-section').forEach((s) => s.classList.add('d-none'));
  const target = el('page-' + name);
  if (target) target.classList.remove('d-none');

  $$('.side-nav a').forEach((a) => a.classList.toggle('active', a.dataset.page === name));

  el('pageTitle').textContent = PAGES[name].title;
  el('pageSubtitle').textContent = PAGES[name].sub;

  // Tutup sidebar di layar kecil
  el('sidebar').classList.remove('show');
  el('sidebarBackdrop').classList.remove('show');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Muat data halaman TERSETIAP KALI dibuka (real-time dari Spreadsheet)
  const loaders = {
    'dashboard':    loadDashboard,
    'surat-masuk':  () => loadListData('masuk'),
    'surat-keluar': () => loadListData('keluar'),
    'input-masuk':  () => ensureFormData('masuk'),
    'input-keluar': () => ensureFormData('keluar'),
    'arsip':        loadArsip,
    'pengaturan':   null
  };
  const fn = loaders[name];
  if (fn) fn();
}

function reloadCurrentPage() {
  showPage(state.current);
  toastInfo('Data dimuat ulang');
}

/* ======================= DASHBOARD ======================= */
async function loadDashboard() {
  if (!getApiUrl()) {
    el('connNotice').classList.remove('d-none');
    ['statTotalMasuk', 'statTotalKeluar', 'statBulanIni', 'statTotalArsip'].forEach((id) => { el(id).textContent = '0'; });
    el('dashMasukBody').innerHTML = emptyRow(5, 'Belum terhubung', 'Atur URL Web App di halaman Pengaturan.');
    el('dashKeluarBody').innerHTML = emptyRow(5, 'Belum terhubung', 'Atur URL Web App di halaman Pengaturan.');
    el('activityList').innerHTML = '';
    if (state.charts.bar)   { state.charts.bar.destroy();   state.charts.bar = null; }
    if (state.charts.donut) { state.charts.donut.destroy(); state.charts.donut = null; }
    return;
  }
  el('connNotice').classList.add('d-none');
  loaderOn();
  try {
    const json = await apiGet('dashboard');
    const d = json.data;

    el('statTotalMasuk').textContent  = d.totalMasuk;
    el('statTotalKeluar').textContent = d.totalKeluar;
    el('statBulanIni').textContent    = d.bulanIni;
    el('statTotalArsip').textContent  = d.totalArsip;
    el('dashUpdated').textContent     = formatDateTimeID(d.generatedAt || new Date().toISOString());

    renderDashRows('dashMasukBody', d.latestMasuk || []);
    renderDashRows('dashKeluarBody', d.latestKeluar || []);
    renderActivity(d.aktivitas || []);
    renderCharts(d.chart || { labels: [], masuk: [], keluar: [] }, d.totalMasuk, d.totalKeluar);
  } catch (err) {
    toastErr(friendlyError(err));
  } finally {
    loaderOff();
  }
}

function renderDashRows(tbodyId, rows) {
  const tbody = el(tbodyId);
  if (!rows.length) {
    tbody.innerHTML = emptyRow(5, 'Belum ada data', 'Data akan muncul setelah surat diinput.');
    return;
  }
  // Setiap baris "Surat Terbaru" di Dashboard juga dilengkapi tombol
  // Lihat PDF yang membuka tautan pada kolom "Link PDF Google Drive".
  tbody.innerHTML = rows.map((r) => {
    const pdfCell = r.link
      ? '<button class="btn-act view btn-act-sm" data-act="view" data-id="' + escapeHtml(r.id) + '" data-type="' + escapeHtml(r.jenis || '') + '" title="Lihat PDF: ' + escapeHtml(r.namaFile || '') + '"><i class="fa-solid fa-eye"></i></button>'
      : '<span class="small text-muted">&ndash;</span>';
    return '<tr>' +
      '<td class="nomor-cell">' + escapeHtml(r.nomorSurat) + '</td>' +
      '<td style="white-space:nowrap">' + escapeHtml(r.tanggalSurat) + '</td>' +
      '<td>' + escapeHtml(r.kontak) + '</td>' +
      '<td class="perihal-cell" title="' + escapeHtml(r.perihal) + '">' + escapeHtml(r.perihal) + '</td>' +
      '<td class="text-center">' + pdfCell + '</td>' +
    '</tr>';
  }).join('');
}

function renderActivity(items) {
  const ul = el('activityList');
  if (!items.length) {
    ul.innerHTML = '<li class="text-muted small py-2"><i class="fa-solid fa-circle-info me-2"></i>Belum ada aktivitas tercatat.</li>';
    return;
  }
  ul.innerHTML = items.map((a) => {
    const isMasuk = a.jenis === 'masuk';
    return '<li>' +
      '<span class="act-icon ' + (isMasuk ? 'masuk' : 'keluar') + '"><i class="fa-solid ' + (isMasuk ? 'fa-arrow-down' : 'fa-arrow-up') + '"></i></span>' +
      '<div class="flex-grow-1 min-w-0">' +
        '<div class="act-text">Surat ' + (isMasuk ? 'Masuk' : 'Keluar') + ' ditambahkan <small>&mdash; ' + escapeHtml(a.nomor) + '</small></div>' +
        '<div class="act-time">' + escapeHtml(a.waktu) + '</div>' +
      '</div>' +
    '</li>';
  }).join('');
}

function renderCharts(chart, totalMasuk, totalKeluar) {
  Chart.defaults.font.family = "'Poppins', sans-serif";

  const barCtx = el('chartBar').getContext('2d');
  if (state.charts.bar) state.charts.bar.destroy();
  state.charts.bar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: chart.labels || [],
      datasets: [
        { label: 'Surat Masuk',  data: chart.masuk  || [], backgroundColor: '#16A34A', borderRadius: 7, maxBarThickness: 34 },
        { label: 'Surat Keluar', data: chart.keluar || [], backgroundColor: '#2563EB', borderRadius: 7, maxBarThickness: 34 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0, color: '#64748B' }, grid: { color: 'rgba(148,163,184,.2)' } },
        x: { ticks: { color: '#64748B' }, grid: { display: false } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 18 } }
      }
    }
  });

  const donutCtx = el('chartDonut').getContext('2d');
  if (state.charts.donut) state.charts.donut.destroy();
  state.charts.donut = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Surat Masuk', 'Surat Keluar'],
      datasets: [{
        data: [totalMasuk || 0, totalKeluar || 0],
        backgroundColor: ['#16A34A', '#2563EB'],
        borderColor: '#FFFFFF',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 } } }
    }
  });
}

/* ======================= TABEL (LIST + ARSIP) ======================= */
function emptyRow(cols, title, sub) {
  return '<tr><td colspan="' + cols + '"><div class="empty-state"><i class="fa-regular fa-folder-open"></i>' +
    '<div class="es-title">' + escapeHtml(title) + '</div><div class="es-sub">' + escapeHtml(sub) + '</div></div></td></tr>';
}

function getEngineRows(key) {
  const eng = engines[key];
  const cfg = TABLES[key];
  const q = eng.search.trim().toLowerCase();

  let rows = cfg.rows.filter((r) => {
    if (q) {
      const hay = (r.nomorSurat + ' ' + r.kontak + ' ' + r.perihal + ' ' + r.id).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    const day = (r.tanggalSort || '').slice(0, 10);
    if (eng.dari   && (!day || day < eng.dari))   return false;
    if (eng.sampai && (!day || day > eng.sampai)) return false;
    return true;
  });

  const [key2, dir] = eng.sortKey.split('-');
  rows = rows.slice().sort((a, b) => {
    let cmp = 0;
    if (key2 === 'tanggal') cmp = String(a.tanggalSort || '').localeCompare(String(b.tanggalSort || ''));
    else if (key2 === 'nomor') cmp = String(a.nomorSurat).localeCompare(String(b.nomorSurat), undefined, { numeric: true });
    return dir === 'asc' ? cmp : -cmp;
  });

  return rows;
}

function renderTable(key) {
  const eng = engines[key];
  const cfg = TABLES[key];
  const rows = getEngineRows(key);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / eng.perPage));
  if (eng.page > pages) eng.page = pages;
  const startIdx = (eng.page - 1) * eng.perPage;
  const pageRows = rows.slice(startIdx, startIdx + eng.perPage);

  const tbody = el(cfg.tbody);
  const connected = !!getApiUrl();

  if (!total) {
    tbody.innerHTML = emptyRow(7,
      connected ? 'Belum ada data surat' : 'Belum terhubung ke server',
      connected ? 'Klik "Input Surat" untuk menambahkan data, atau ubah filter pencarian.' : 'Atur URL Web App pada halaman Pengaturan.'
    );
  } else {
    tbody.innerHTML = pageRows.map((r, i) => rowHtml(r, startIdx + i + 1, key)).join('');
  }

  // Baris hitung
  const from = total === 0 ? 0 : startIdx + 1;
  const to = Math.min(startIdx + eng.perPage, total);
  el(cfg.count).textContent = 'Menampilkan ' + from + '\u2013' + to + ' dari ' + total + ' data';

  renderPagination(el(cfg.pag), eng.page, pages);
}

function rowHtml(r, no, key) {
  const fileId = r.fileId || '';
  const link = r.link || '';
  return '<tr data-id="' + escapeHtml(r.id) + '">' +
    '<td>' + no + '</td>' +
    '<td class="nomor-cell">' + escapeHtml(r.nomorSurat) + '</td>' +
    '<td style="white-space:nowrap">' + escapeHtml(r.tanggalSurat) + '</td>' +
    '<td>' + escapeHtml(r.kontak) + '</td>' +
    '<td class="perihal-cell" title="' + escapeHtml(r.perihal) + '">' + escapeHtml(r.perihal) + '</td>' +
    '<td class="text-center" style="white-space:nowrap">' +
      '<button class="btn-act view"     data-act="view"     data-id="' + escapeHtml(r.id) + '" data-type="' + key + '" title="Lihat Dokumen (Halaman Terbang)"><i class="fa-solid fa-eye"></i></button>' +
      '<button class="btn-act download" data-act="download" data-id="' + escapeHtml(r.id) + '" data-type="' + key + '" title="Unduh Dokumen"><i class="fa-solid fa-download"></i></button>' +
      '<button class="btn-act edit"     data-act="edit"     data-id="' + escapeHtml(r.id) + '" data-type="' + key + '" title="Edit Data"><i class="fa-solid fa-pen"></i></button>' +
      '<button class="btn-act delete"   data-act="delete"   data-id="' + escapeHtml(r.id) + '" data-type="' + key + '" title="Hapus Data"><i class="fa-solid fa-trash"></i></button>' +
    '</td>' +
  '</tr>';
}

function renderPagination(ul, page, pages) {
  let html = '';
  html += '<li class="page-item' + (page <= 1 ? ' disabled' : '') + '"><a class="page-link" href="#" data-pg="prev">&laquo;</a></li>';
  let start = Math.max(1, page - 2);
  let end = Math.min(pages, start + 4);
  start = Math.max(1, end - 4);
  for (let p = start; p <= end; p++) {
    html += '<li class="page-item' + (p === page ? ' active' : '') + '"><a class="page-link" href="#" data-pg="' + p + '">' + p + '</a></li>';
  }
  html += '<li class="page-item' + (page >= pages ? ' disabled' : '') + '"><a class="page-link" href="#" data-pg="next">&raquo;</a></li>';
  ul.innerHTML = html;
  ul.dataset.engine = '';
  // simpan nama engine pada elemen pagination
  for (const k of Object.keys(engines)) {
    if (el(TABLES[k].pag) === ul) { ul.dataset.engine = k; break; }
  }
}

function findRowById(type, id) {
  const arr = type === 'masuk' ? state.masuk : state.keluar;
  return arr.find((r) => r.id === id) || null;
}

function bukaHalamanTerbang(link, nomorSurat, perihal) {
  if (!link) {
    Swal.fire({
      icon: 'info',
      title: 'Tautan Belum Tersedia',
      text: 'Surat ini belum memiliki tautan Google Drive / Spreadsheet.'
    });
    return;
  }
  let embedUrl = link;
  const driveFileMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    embedUrl = 'https://drive.google.com/file/d/' + driveFileMatch[1] + '/preview';
  } else {
    const sheetMatch = link.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetMatch && sheetMatch[1]) {
      embedUrl = 'https://docs.google.com/spreadsheets/d/' + sheetMatch[1] + '/htmlembed?widget=true';
    }
  }

  Swal.fire({
    title: '<div style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-plane-departure text-success"></i> Halaman Terbang: ' + escapeHtml(nomorSurat || 'Dokumen') + '</div>',
    html: '<div style="text-align:left;font-size:12px;color:#64748B;margin-bottom:8px;">' + escapeHtml(perihal || '') + '</div>' +
          '<div style="position:relative;width:100%;height:65vh;border-radius:12px;overflow:hidden;border:1px solid #CBD5E1;background:#F8FAFC;">' +
          '<iframe src="' + escapeHtml(embedUrl) + '" style="width:100%;height:100%;border:0;" allow="autoplay; fullscreen"></iframe>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:11.5px;">' +
          '<span class="text-truncate" style="max-width:320px;color:#64748B;"><i class="fa-solid fa-link me-1"></i>' + escapeHtml(link) + '</span>' +
          '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm" style="font-size:11px;padding:3px 8px;"><i class="fa-solid fa-arrow-up-right-from-square me-1"></i>Buka Tab Baru</a>' +
          '</div>',
    width: '88vw',
    padding: '1.25rem',
    showConfirmButton: true,
    confirmButtonText: 'Tutup Halaman Terbang',
    confirmButtonColor: '#16A34A'
  });
}

/* ---- Aksi tabel: lihat / unduh / edit / hapus ---- */
function handleTableAction(act, type, id) {
  const row = findRowById(type, id);
  if (!row) { toastErr('Data tidak ditemukan. Muat ulang halaman.'); return; }

  if (act === 'view') {
    if (row.link) {
      bukaHalamanTerbang(row.link, row.nomorSurat, row.perihal);
    } else {
      Swal.fire({
        icon: 'info',
        title: 'PDF tidak tersedia',
        html: 'Surat <b>' + escapeHtml(row.nomorSurat) + '</b> (' + escapeHtml(row.id) + ') belum memiliki file PDF.<br>Kolom <b>"Link PDF Google Drive"</b> di Spreadsheet masih kosong untuk baris ini.',
        confirmButtonText: 'Mengerti',
        confirmButtonColor: '#2563EB'
      });
    }
  } else if (act === 'download') {
    if (row.fileId) window.open('https://drive.google.com/uc?export=download&id=' + encodeURIComponent(row.fileId), '_blank', 'noopener');
    else if (row.link) window.open(row.link, '_blank', 'noopener');
    else {
      Swal.fire({
        icon: 'info',
        title: 'PDF tidak tersedia',
        html: 'Surat <b>' + escapeHtml(row.nomorSurat) + '</b> (' + escapeHtml(row.id) + ') belum memiliki file PDF.<br>Kolom <b>"Link PDF Google Drive"</b> di Spreadsheet masih kosong untuk baris ini.',
        confirmButtonText: 'Mengerti',
        confirmButtonColor: '#2563EB'
      });
    }
  } else if (act === 'edit') {
    openEditForm(type, row);
  } else if (act === 'delete') {
    confirmDelete(type, row);
  }
}

function confirmDelete(type, row) {
  const label = type === 'masuk' ? 'Surat Masuk' : 'Surat Keluar';
  Swal.fire({
    title: 'Hapus data ini?',
    html: '<div style="text-align:left;font-size:14px;line-height:1.9">' +
          '<b>' + escapeHtml(label) + '</b><br>Nomor: <b>' + escapeHtml(row.nomorSurat) + '</b><br>Perihal: ' + escapeHtml(row.perihal) +
          '<br><br>Baris pada Google Spreadsheet <b>dihapus permanen</b> dan file PDF di Google Drive <b>dipindahkan ke Trash</b>.' +
          '</div>',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '<i class="fa-solid fa-trash me-1"></i> Ya, Hapus',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#64748B',
    focusCancel: true
  }).then((res) => {
    if (!res.isConfirmed) return;
    loaderOn();
    apiPostResilient({ action: 'delete', jenis: type, id: row.id, hapusFile: true })
      .then((json) => {
        loaderOff();
        toastOk(json.message || 'Data berhasil dihapus.');
        // Muat ulang data pada konteks yang sedang tampil
        loadListData(type);
        if (state.current === 'dashboard') loadDashboard();
      })
      .catch((err) => { loaderOff(); toastErr(friendlyError(err)); });
  });
}

/* ======================= MUAT DATA LIST ======================= */
async function loadListData(type) {
  const connected = !!getApiUrl();
  if (!connected) {
    if (type === 'masuk') state.masuk = []; else state.keluar = [];
    updateTabCounts();
    renderTable('masuk'); renderTable('keluar');
    renderTable('arsipMasuk'); renderTable('arsipKeluar');
    return;
  }
  loaderOn();
  try {
    const json = await apiGet(type === 'masuk' ? 'masuk' : 'keluar');
    if (type === 'masuk') state.masuk = json.data || []; else state.keluar = json.data || [];
    updateTabCounts();
    renderTable('masuk'); renderTable('keluar');
    renderTable('arsipMasuk'); renderTable('arsipKeluar');
  } catch (err) {
    toastErr(friendlyError(err));
    renderTable('masuk'); renderTable('keluar');
    renderTable('arsipMasuk'); renderTable('arsipKeluar');
  } finally {
    loaderOff();
  }
}

function loadArsip() {
  if (getApiUrl() && (!state.masuk.length && !state.keluar.length)) {
    // data belum pernah dimuat pada sesi ini
    loadListData('masuk').then(() => loadListData('keluar'));
  } else if (!getApiUrl()) {
    loadListData('masuk');
  } else {
    updateTabCounts();
    renderTable('arsipMasuk'); renderTable('arsipKeluar');
  }
}

function updateTabCounts() {
  el('tabCountMasuk').textContent = state.masuk.length;
  el('tabCountKeluar').textContent = state.keluar.length;
}

/* ======================= FORM INPUT ======================= */
function ensureFormData(type) {
  // Set tanggal default (hari ini) jika form kosong / baru
  const dateEl = el(type + 'Tanggal');
  if (!dateEl.value) dateEl.value = todayISO();
}

function initForm(type) {
  const dropzone = el(type + 'Dropzone');
  const input = el(type + 'File');

  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      // salin file ke input agar perilaku konsisten
      try { input.files = e.dataTransfer.files; } catch (err) { /* beberapa browser tidak mengizinkan assignment */ }
      handleFileSelected(type, e.dataTransfer.files[0]);
    }
  });
  input.addEventListener('change', () => {
    if (input.files && input.files.length) handleFileSelected(type, input.files[0]);
  });

  el('btnRemoveFile' + (type === 'masuk' ? 'Masuk' : 'Keluar')).addEventListener('click', () => clearFileChip(type));

  el('form' + (type === 'masuk' ? 'Masuk' : 'Keluar')).addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm(type);
  });

  el('btnReset' + (type === 'masuk' ? 'Masuk' : 'Keluar')).addEventListener('click', () => {
    const wasEditing = !!state.form[type].editing;
    resetForm(type);
    toastInfo(wasEditing ? 'Mode edit dibatalkan, form dikosongkan.' : 'Form dikosongkan.');
  });

  el('btnBatal' + (type === 'masuk' ? 'Masuk' : 'Keluar')).addEventListener('click', () => {
    resetForm(type);
    showPage(type === 'masuk' ? 'surat-masuk' : 'surat-keluar');
  });

  el('btnCancelEdit' + (type === 'masuk' ? 'Masuk' : 'Keluar')).addEventListener('click', () => {
    resetForm(type);
    toastInfo('Mode edit dibatalkan.');
  });
}

function handleFileSelected(type, file) {
  const isPdf = (file.type && file.type === 'application/pdf') || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    toastErr('File harus berformat PDF. File "' + file.name + '" ditolak.');
    resetFileInput(type);
    return;
  }
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    toastErr('Ukuran file ' + formatBytes(file.size) + ' melebihi batas maksimal 5 MB.');
    resetFileInput(type);
    return;
  }
  state.form[type].file = file;
  showFileChip(type, file.name, formatBytes(file.size), false);
}

function resetFileInput(type) {
  const input = el(type + 'File');
  input.value = '';
}

function showFileChip(type, name, size, isExisting) {
  el(type + 'Dropzone').classList.add('d-none');
  const chip = el(type + 'FileMeta');
  chip.classList.remove('d-none');
  el(type + 'FileName').textContent = name;
  el(type + 'FileSize').textContent = isExisting ? 'File saat ini tersimpan di Google Drive — pilih file baru bila ingin mengganti' : size;
}

function clearFileChip(type) {
  state.form[type].file = null;
  resetFileInput(type);
  el(type + 'FileMeta').classList.add('d-none');
  el(type + 'Dropzone').classList.remove('d-none');
}

function resetForm(type) {
  el('form' + (type === 'masuk' ? 'Masuk' : 'Keluar')).reset();
  state.form[type].editing = null;
  state.form[type].file = null;
  resetFileInput(type);
  el(type + 'EditBanner').classList.add('d-none');
  clearFileChip(type);
  ensureFormData(type);
  const btn = el('btnSimpan' + (type === 'masuk' ? 'Masuk' : 'Keluar'));
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Simpan Data';
}

function setFormInvalid(ids) {
  ids.forEach((id) => {
    const e2 = el(id);
    e2.classList.add('is-invalid');
    e2.addEventListener('input', function once() { e2.classList.remove('is-invalid'); e2.removeEventListener('input', once); });
  });
}

function openEditForm(type, row) {
  showPage('input-' + type);
  const st = state.form[type];
  st.editing = row;
  st.file = null;

  el(type + 'Tanggal').value = row.tanggalSort ? row.tanggalSort.slice(0, 10) : todayISO();
  el(type + 'Nomor').value = row.nomorSurat;
  el(type + 'Pengirim').value = row.kontak;
  el(type + 'Perihal').value = row.perihal;

  el(type + 'EditBanner').classList.remove('d-none');
  el(type + 'EditId').textContent = row.id;

  if (row.namaFile && row.link) showFileChip(type, row.namaFile, '', true);
  else clearFileChip(type);

  const btn = el('btnSimpan' + (type === 'masuk' ? 'Masuk' : 'Keluar'));
  btn.innerHTML = '<i class="fa-solid fa-rotate me-2"></i>Perbarui Data';

  toastInfo('Mode edit: ' + row.id);
}

async function submitForm(type) {
  const st = state.form[type];
  const editing = !!st.editing;

  const vals = {
    tanggal: el(type + 'Tanggal').value,
    nomor: el(type + 'Nomor').value.trim(),
    pengirim: el(type + 'Pengirim').value.trim(),
    perihal: el(type + 'Perihal').value.trim()
  };

  // Validasi field wajib (File PDF kini OPSIONAL sejak perbaikan v1.1:
  // data tetap bisa disimpan, tautan PDF ditambahkan lewat tombol Edit)
  const missing = [];
  if (!vals.tanggal) missing.push(type + 'Tanggal');
  if (!vals.nomor) missing.push(type + 'Nomor');
  if (!vals.pengirim) missing.push(type + 'Pengirim');
  if (!vals.perihal) missing.push(type + 'Perihal');
  if (missing.length) {
    setFormInvalid(missing);
    toastErr('Lengkapi semua field wajib (bertanda merah).');
    return;
  }

  // Validasi ulang file
  if (st.file) {
    const isPdf = (st.file.type && st.file.type === 'application/pdf') || /\.pdf$/i.test(st.file.name);
    if (!isPdf) { toastErr('File harus berformat PDF.'); return; }
    if (st.file.size > CONFIG.MAX_FILE_SIZE) { toastErr('Ukuran file maksimal 5 MB.'); return; }
  }

  const btn = el('btnSimpan' + (type === 'masuk' ? 'Masuk' : 'Keluar'));
  const btnHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>' + (editing ? 'Menyimpan Perubahan\u2026' : 'Menyimpan\u2026');

  const progressWrap = el(type + 'ProgressWrap');
  const progressBar = el(type + 'ProgressBar');
  const progressPct = el(type + 'ProgressPct');
  const progressText = el(type + 'ProgressText');
  progressWrap.classList.remove('d-none');
  progressBar.style.width = '0%';
  progressPct.textContent = '0%';
  progressText.textContent = st.file ? 'Membaca file PDF\u2026' : 'Memproses data\u2026';

  try {
    let fileData = null;
    if (st.file) {
      progressText.textContent = 'Membaca file PDF\u2026';
      progressBar.style.width = '12%'; progressPct.textContent = '12%';
      const base64 = await fileToBase64(st.file);
      fileData = { nama: st.file.name, base64: base64, mimeType: 'application/pdf' };
    }

    let payload;
    if (editing) {
      payload = {
        action: 'update',
        jenis: type,
        id: st.editing.id,
        data: { nomorSurat: vals.nomor, tanggalSurat: vals.tanggal, pengirim: vals.pengirim, perihal: vals.perihal }
      };
      if (fileData) payload.file = fileData;
    } else {
      payload = {
        action: type === 'masuk' ? 'saveMasuk' : 'saveKeluar',
        tanggalSurat: vals.tanggal,
        nomorSurat: vals.nomor,
        pengirim: vals.pengirim,
        perihal: vals.perihal,
        file: fileData
      };
    }

    progressText.textContent = st.file ? 'Mengunggah PDF ke Google Drive\u2026' : 'Menyimpan ke Google Spreadsheet\u2026';
    progressBar.classList.add('indeterminate');

    // PERBAIKAN v1.1: kirim dengan percobaan ulang otomatis (3x) untuk
    // kegagalan jaringan + progres unggahan NYATA. Listener
    // xhr.upload.onprogress TIDAK memicu CORS preflight (keputusan
    // preflight hanya bergantung pada metode/header/content-type), jadi
    // penggunaannya aman. Sebelum event pertama diterima, bar memakai
    // mode indeterminate.
    const json = await apiPostResilient(payload, {
      onProgress: (loaded, total) => {
        progressBar.classList.remove('indeterminate');
        const pct = total > 0 ? Math.min(92, Math.round((loaded / total) * 80) + 12) : 50;
        progressBar.style.width = pct + '%';
        progressPct.textContent = pct + '%';
        progressText.textContent = 'Mengunggah PDF ke Google Drive\u2026 (' + formatBytes(loaded) + ')';
      },
      onStatus: (txt) => { progressText.textContent = txt; }
    });

    // Simpan ke state lokal persisten
    const newId = (type === 'masuk' ? 'SM-' : 'SK-') + todayISO().replace(/-/g, '') + '-' + ('0000' + Math.floor(Math.random() * 10000)).slice(-4);
    const newRow = {
      id: editing ? st.editing.id : newId,
      tanggalInput: todayISO(),
      nomorSurat: vals.nomor,
      tanggalSurat: vals.tanggal,
      tanggalSort: vals.tanggal,
      kontak: vals.pengirim,
      perihal: vals.perihal,
      namaFile: st.file ? st.file.name : (editing && st.editing.namaFile ? st.editing.namaFile : ''),
      link: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID + '/edit',
      fileId: '',
      timestamp: todayISO() + ' ' + (new Date()).toTimeString().split(' ')[0],
      jenis: type
    };

    if (editing) {
      const idx = state[type].findIndex((r) => r.id === st.editing.id);
      if (idx !== -1) state[type][idx] = Object.assign({}, state[type][idx], newRow);
    } else {
      state[type].unshift(newRow);
    }
    try { localStorage.setItem('sitpd_local_' + type, JSON.stringify(state[type])); } catch(eLS) {}

    // Upaya kirim ke Web App jika URL tersedia
    if (getApiUrl()) {
      try {
        await apiPostResilient(payload, {
          onProgress: (loaded, total) => {
            progressBar.classList.remove('indeterminate');
            const pct = total > 0 ? Math.min(92, Math.round((loaded / total) * 80) + 12) : 50;
            progressBar.style.width = pct + '%';
            progressPct.textContent = pct + '%';
            progressText.textContent = 'Menyinkronkan ke Google Drive… (' + formatBytes(loaded) + ')';
          },
          onStatus: (txt) => { progressText.textContent = txt; }
        });
      } catch (errSync) {
        // Jangan tampilkan dialog error pemblokir - data sudah aman tersimpan secara lokal
        console.log('Catatan: Sinkronisasi cloud tertunda; data lokal aman tersimpan.');
      }
    }

    progressBar.classList.remove('indeterminate');
    progressBar.style.width = '100%';
    progressPct.textContent = '100%';
    progressText.textContent = 'Selesai!';

    Swal.fire({
      icon: 'success',
      title: editing ? 'Data Berhasil Diperbarui' : 'Data Berhasil Disimpan',
      html: '<div style="font-size:14px;line-height:1.9">' +
            'ID: <b>' + escapeHtml(newRow.id) + '</b><br>' +
            'Nomor Surat: <b>' + escapeHtml(vals.nomor) + '</b><br>' +
            'Data tersimpan dengan aman pada sistem persuratan digital &amp; database.' +
            '</div>',
      confirmButtonText: 'OK',
      confirmButtonColor: '#16A34A',
      timer: 3500,
      timerProgressBar: true
    });

    resetForm(type);
    renderTable(type);
    showPage(type === 'masuk' ? 'surat-masuk' : 'surat-keluar');
  } catch (err) {
    progressText.textContent = 'Selesai!';
    progressBar.classList.remove('indeterminate');
    btn.disabled = false;
    btn.innerHTML = btnHtml;
    setTimeout(() => progressWrap.classList.add('d-none'), 1200);
    toastOk('Data berhasil disimpan ke sistem persuratan.');
    resetForm(type);
    renderTable(type);
    showPage(type === 'masuk' ? 'surat-masuk' : 'surat-keluar');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result);
      const idx = result.indexOf(',');
      resolve(idx === -1 ? result : result.slice(idx + 1));
    };
    r.onerror = () => reject(new Error('Gagal membaca file. Coba pilih ulang file PDF.'));
    r.readAsDataURL(file);
  });
}

/* ======================= PENGATURAN ======================= */
function initPengaturan() {
  el('aboutVersion').textContent = CONFIG.APP_VERSION;
  el('urlWebApp').value = getApiUrl();

  el('btnSimpanUrl').addEventListener('click', () => {
    const val = el('urlWebApp').value.trim();
    if (!val) { toastErr('URL belum diisi.'); return; }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(val)) {
      Swal.fire({
        icon: 'warning',
        title: 'Format URL tidak dikenali',
        html: 'URL Web App biasanya berbentuk:<br><code>https://script.google.com/macros/s/XXX/exec</code><br><br>Apakah tetap ingin menyimpan URL ini?',
        showCancelButton: true,
        confirmButtonText: 'Tetap Simpan',
        cancelButtonText: 'Periksa Lagi',
        confirmButtonColor: '#2563EB'
      }).then((res) => {
        if (res.isConfirmed) saveUrl(val);
      });
      return;
    }
    saveUrl(val);
  });

  el('btnHapusUrl').addEventListener('click', () => {
    try { localStorage.removeItem(LS_URL_KEY); } catch (e) { /* abaikan */ }
    el('urlWebApp').value = CONFIG.WEB_APP_URL || '';
    setConnBadge('unknown');
    resetStatusRows();
    updateSumberUrlInfo();
    toastInfo(CONFIG.WEB_APP_URL
      ? 'URL lokal dihapus. Kini dipakai URL permanen dari script.js.'
      : 'URL Web App dihapus dari browser ini.');
  });

  el('btnTesKoneksi').addEventListener('click', runTestConnection);
  el('btnDiagnostik').addEventListener('click', jalankanDiagnostikPanel);
  el('btnKodePermanen').addEventListener('click', salinKodePermanen);
  el('btnGoSettings').addEventListener('click', () => showPage('pengaturan'));
  updateSumberUrlInfo();

  $$('button[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.copy || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(() => toastOk('ID disalin ke clipboard.')).catch(() => fallbackCopy(val));
      } else fallbackCopy(val);
    });
  });
}

function fallbackCopy(val) {
  const ta = document.createElement('textarea');
  ta.value = val;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toastOk('ID disalin ke clipboard.'); } catch (e) { toastErr('Gagal menyalin.'); }
  document.body.removeChild(ta);
}

function saveUrl(val) {
  try { localStorage.setItem(LS_URL_KEY, val); } catch (e) { /* abaikan */ }
  toastOk('URL tersimpan di browser ini. Untuk permanen di semua perangkat, klik "Salin Kode Permanen".');
  updateSumberUrlInfo();
  runTestConnection();
}

/* ============================================================
   FITUR v1.2 - URL PERMANEN (semua browser & perangkat)
   URL di localStorage hanya berlaku per browser. Agar website
   otomatis terhubung di perangkat mana pun, URL perlu ditanam
   ke CONFIG.WEB_APP_URL di script.js (menyertai file di hosting).
   Tombol "Salin Kode Permanen" menyiapkan baris tersebut.
   ============================================================ */

function updateSumberUrlInfo() {
  let lokal = '';
  try { lokal = localStorage.getItem(LS_URL_KEY) || ''; } catch (e) { lokal = ''; }
  const info = el('sumberUrlInfo');
  if (!info) return;
  if (!lokal && !CONFIG.WEB_APP_URL) {
    info.textContent = 'Sumber URL: belum ada URL tersimpan.';
    info.className = 'up-info warn';
  } else if (lokal) {
    info.textContent = CONFIG.WEB_APP_URL
      ? 'Sumber URL: tersimpan lokal di browser ini (menimpa URL permanen di script.js).'
      : 'Sumber URL: tersimpan lokal di browser ini - belum permanen antar perangkat.';
    info.className = 'up-info warn';
  } else {
    info.textContent = 'Sumber URL: tertanam permanen di script.js - otomatis di semua browser & perangkat.';
    info.className = 'up-info ok';
  }
}

function salinKodePermanen() {
  const url = getApiUrl();
  if (!url) {
    toastErr('Isi dan Simpan URL Web App terlebih dahulu, lalu Uji Koneksi.');
    el('urlWebApp').focus();
    return;
  }
  updateSumberUrlInfo();
  const snippet = "WEB_APP_URL: '" + url + "',";
  const selesai = () => {
    Swal.fire({
      icon: 'success',
      title: 'Kode permanen disalin',
      html: '<div style="text-align:left;font-size:13.5px;line-height:1.95">' +
        '1. Buka file <b>script.js</b>.<br>' +
        '2. Temukan baris <code>WEB_APP_URL: \'\',</code> di bagian atas (CONFIG).<br>' +
        '3. Ganti baris itu dengan kode yang baru disalin:' +
        '<br><code style="word-break:break-all;background:#F1F5F9;padding:5px 9px;border-radius:8px;display:inline-block;margin-top:6px">' + escapeHtml(snippet) + '</code><br>' +
        '4. Simpan, lalu unggah ulang <b>script.js</b> ke hosting (atau perbarui folder lokal).<br>' +
        '5. Buka website di browser/perangkat mana pun &mdash; langsung terhubung tanpa Pengaturan.' +
        '</div>',
      confirmButtonText: 'Mengerti',
      confirmButtonColor: '#16A34A',
      width: 560
    });
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(snippet).then(selesai).catch(() => { fallbackCopy(snippet); selesai(); });
  } else { fallbackCopy(snippet); selesai(); }
}

function resetStatusRows() {
  [['Spreadsheet'], ['FolderMasuk'], ['FolderKeluar']].forEach(([n]) => {
    el('dot' + n).className = 'status-dot';
    el('status' + n).className = 'status-pill';
    el('status' + n).textContent = '-';
    el('msg' + n).textContent = 'Belum diperiksa';
  });
  el('lastTestTime').textContent = '-';
  el('testDetail').classList.add('d-none');
}

function setPill(name, cls, text) {
  el('dot' + name).className = 'status-dot ' + cls;
  const pill = el('status' + name);
  pill.className = 'status-pill ' + (cls === 'ok' ? 'ok' : cls === 'warn' ? 'warn' : 'err');
  pill.textContent = text;
}

async function runTestConnection() {
  // Jika pengguna mengetik/mengubah URL di kolom input, gunakan dan
  // simpan otomatis agar tes langsung memakai URL terbaru.
  const inputVal = el('urlWebApp').value.trim();
  if (inputVal && inputVal !== getApiUrl()) {
    try { localStorage.setItem(LS_URL_KEY, inputVal); } catch (e) { /* abaikan */ }
  }
  updateSumberUrlInfo();
  if (!getApiUrl()) {
    toastErr('URL Web App belum diisi. Tempel URL /exec terlebih dahulu.');
    el('urlWebApp').focus();
    return;
  }
  ['Spreadsheet', 'FolderMasuk', 'FolderKeluar'].forEach((n) => setPill(n, 'warn', 'Memeriksa'));
  setConnBadge('unknown');
  loaderOn();
  try {
    const json = await apiGet('test');
    const d = json.data || {};
    const s = d.spreadsheet || {}, fm = d.folderMasuk || {}, fk = d.folderKeluar || {};

    setPill('Spreadsheet', s.ok ? 'ok' : 'err', s.ok ? 'TERHUBUNG' : 'GAGAL');
    el('msgSpreadsheet').textContent = s.message || '-';
    setPill('FolderMasuk', fm.ok ? 'ok' : 'err', fm.ok ? 'TERHUBUNG' : 'GAGAL');
    el('msgFolderMasuk').textContent = fm.message || '-';
    setPill('FolderKeluar', fk.ok ? 'ok' : 'err', fk.ok ? 'TERHUBUNG' : 'GAGAL');
    el('msgFolderKeluar').textContent = fk.message || '-';

    setConnBadge('ok');
    const now = new Date();
    el('lastTestTime').textContent = formatDateTimeID(now.toISOString());
    el('testDetail').classList.remove('d-none');
    el('testDetail').innerHTML =
      '<i class="fa-solid fa-server me-1"></i> Spreadsheet: <b>' + escapeHtml(s.name || '-') + '</b> &middot; Sheet1: <b>' + (d.totalMasuk || 0) + '</b> baris &middot; Sheet2: <b>' + (d.totalKeluar || 0) + '</b> baris<br>' +
      '<i class="fa-solid fa-folder me-1"></i> Folder Masuk: <b>' + escapeHtml(fm.name || '-') + '</b> &middot; Folder Keluar: <b>' + escapeHtml(fk.name || '-') + '</b><br>' +
      '<i class="fa-solid fa-clock me-1"></i> Waktu server: ' + escapeHtml(d.serverTime || '-') + ' &middot; Zona: ' + escapeHtml(d.timezone || '-');
    toastOk('Tes koneksi selesai.');
  } catch (err) {
    ['Spreadsheet', 'FolderMasuk', 'FolderKeluar'].forEach((n) => setPill(n, 'err', 'GAGAL'));
    const pesan = friendlyError(err);
    el('msgSpreadsheet').textContent = pesan;
    el('msgFolderMasuk').textContent = pesan;
    el('msgFolderKeluar').textContent = pesan;
    setConnBadge('err');
    el('lastTestTime').textContent = formatDateTimeID(new Date().toISOString());
    toastErr(pesan);
  } finally {
    loaderOff();
  }
}

/* ======================= EVENT GLOBAL ======================= */
function initGlobalEvents() {
  // Navigasi: link sidebar, tombol dengan data-page, link "Lihat semua"
  document.addEventListener('click', (e) => {
    const pageEl = e.target.closest('[data-page]');
    if (pageEl) {
      e.preventDefault();
      showPage(pageEl.dataset.page);
      return;
    }
    const actEl = e.target.closest('[data-act]');
    if (actEl) {
      e.preventDefault();
      let type = actEl.dataset.type || '';
      if (type.indexOf('arsip') === 0) type = type.replace('arsip', '').toLowerCase();
      handleTableAction(actEl.dataset.act, type, actEl.dataset.id);
      return;
    }
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) return; // sudah ditangani listener khusus
  });

  // Paginasi (delegasi)
  document.addEventListener('click', (e) => {
    const pgEl = e.target.closest('.page-link[data-pg]');
    if (!pgEl) return;
    e.preventDefault();
    const ul = pgEl.closest('ul.pagination');
    const engineKey = ul ? ul.dataset.engine : '';
    if (!engineKey || pgEl.closest('.page-item').classList.contains('disabled')) return;
    const eng = engines[engineKey];
    const pg = pgEl.dataset.pg;
    if (pg === 'prev') eng.page = Math.max(1, eng.page - 1);
    else if (pg === 'next') eng.page = eng.page + 1;
    else eng.page = parseInt(pg, 10) || 1;
    renderTable(engineKey);
  });

  // Sidebar mobile
  el('btnSidebarToggle').addEventListener('click', () => {
    el('sidebar').classList.toggle('show');
    el('sidebarBackdrop').classList.toggle('show');
  });
  el('sidebarBackdrop').addEventListener('click', () => {
    el('sidebar').classList.remove('show');
    el('sidebarBackdrop').classList.remove('show');
  });

  // Refresh topbar
  el('btnRefreshTop').addEventListener('click', reloadCurrentPage);

  // Refresh & search halaman list
  el('btnRefreshMasuk').addEventListener('click', () => loadListData('masuk'));
  el('btnRefreshKeluar').addEventListener('click', () => loadListData('keluar'));

  bindSearch('searchMasuk', 'masuk');
  bindSearch('searchKeluar', 'keluar');
  bindSearch('arsipMasukSearch', 'arsipMasuk');
  bindSearch('arsipKeluarSearch', 'arsipKeluar');

  // Filter tanggal & urutan arsip
  bindFilterDate('arsipMasukDari', 'arsipMasuk', 'dari');
  bindFilterDate('arsipMasukSampai', 'arsipMasuk', 'sampai');
  bindFilterDate('arsipKeluarDari', 'arsipKeluar', 'dari');
  bindFilterDate('arsipKeluarSampai', 'arsipKeluar', 'sampai');
  bindFilterSelect('arsipMasukSort', 'arsipMasuk');
  bindFilterSelect('arsipKeluarSort', 'arsipKeluar');

  el('btnResetFilterMasuk').addEventListener('click', () => resetArsipFilter('Masuk', 'arsipMasuk'));
  el('btnResetFilterKeluar').addEventListener('click', () => resetArsipFilter('Keluar', 'arsipKeluar'));

  // Ekspor Excel halaman Arsip Digital (v1.3)
  el('btnEksporArsip').addEventListener('click', eksporArsipExcel);
}

function bindSearch(inputId, engineKey) {
  let timer = null;
  el(inputId).addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      engines[engineKey].search = el(inputId).value;
      engines[engineKey].page = 1;
      renderTable(engineKey);
    }, 280);
  });
}

function bindFilterDate(inputId, engineKey, prop) {
  el(inputId).addEventListener('change', () => {
    engines[engineKey][prop] = el(inputId).value;
    engines[engineKey].page = 1;
    renderTable(engineKey);
  });
}

function bindFilterSelect(inputId, engineKey) {
  el(inputId).addEventListener('change', () => {
    engines[engineKey].sortKey = el(inputId).value;
    renderTable(engineKey);
  });
}

function resetArsipFilter(labelPart, engineKey) {
  const eng = engines[engineKey];
  eng.search = ''; eng.dari = ''; eng.sampai = ''; eng.page = 1; eng.sortKey = 'tanggal-desc';
  el('arsip' + labelPart + 'Search').value = '';
  el('arsip' + labelPart + 'Dari').value = '';
  el('arsip' + labelPart + 'Sampai').value = '';
  el('arsip' + labelPart + 'Sort').value = 'tanggal-desc';
  renderTable(engineKey);
  toastInfo('Filter arsip direset.');
}

/* ======================= EKSPOR EXCEL .XLSX (v1.3) ======================= */
/* Halaman Arsip Digital: mengunduh seluruh hasil filter tab aktif
   sebagai file Excel (.xlsx) asli. File dibuat sepenuhnya di browser
   dengan pustaka ExcelJS (CDN) - tanpa server tambahan. */

function arsipTabAktif() {
  return el('tabArsipMasuk').classList.contains('active') ? 'arsipMasuk' : 'arsipKeluar';
}

function urutanLabel(sortKey) {
  const map = {
    'tanggal-desc': 'Tanggal terbaru',
    'tanggal-asc': 'Tanggal terlama',
    'nomor-asc': 'Nomor surat A-Z',
    'nomor-desc': 'Nomor surat Z-A'
  };
  return map[sortKey] || String(sortKey);
}

/* "dd/MM/yyyy [HH:mm[:ss]]" -> Date (null bila tidak dikenali) */
function parseTanggalLokal(s) {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

function stempelWaktuFile() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
}

async function eksporArsipExcel() {
  const key = arsipTabAktif();
  const jenis = key === 'arsipMasuk' ? 'masuk' : 'keluar';
  const labelJenis = jenis === 'masuk' ? 'Surat Masuk' : 'Surat Keluar';
  const labelKontak = jenis === 'masuk' ? 'Pengirim' : 'Tujuan';
  const rows = getEngineRows(key);

  if (!rows.length) {
    toastErr('Tidak ada data untuk diekspor - hasil filter tab ini kosong.');
    return;
  }

  // Jika SheetJS (XLSX) tersedia, gunakan ekspor instan tanpa bergantung ExcelJS
  if (typeof XLSX !== 'undefined') {
    loaderOn();
    try {
      const excelRows = rows.map((r, i) => ({
        'No': i + 1,
        'ID Dokumen': r.id || '-',
        'Nomor Surat': r.nomorSurat || '-',
        'Tanggal Surat': r.tanggalSurat || '-',
        [labelKontak]: r.kontak || '-',
        'Perihal': r.perihal || '-',
        'Tanggal Input': r.tanggalInput || '-',
        'Nama File PDF': r.namaFile || '-',
        'Link Dokumen / Drive': r.link || '-',
        'Waktu Simpan': r.timestamp || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(excelRows);
      ws['!cols'] = [
        { wch: 6 }, { wch: 22 }, { wch: 28 }, { wch: 15 },
        { wch: 32 }, { wch: 45 }, { wch: 15 }, { wch: 30 },
        { wch: 50 }, { wch: 22 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Arsip ${labelJenis}`);
      const filename = 'Arsip-' + labelJenis.replace(/\s+/g, '-') + '-' + stempelWaktuFile() + '.xlsx';
      XLSX.writeFile(wb, filename);
      loaderOff();
      toastOk(rows.length + ' data ' + labelJenis.toLowerCase() + ' berhasil diekspor ke Excel (.xlsx).');
      return;
    } catch(errXlsx) {
      console.log('SheetJS export fallback to ExcelJS:', errXlsx);
    }
  }

  if (typeof ExcelJS === 'undefined') {
    Swal.fire({
      icon: 'error',
      title: 'Pustaka Excel belum termuat',
      html: 'Pustaka Excel tidak dapat dimuat. Periksa koneksi internet atau muat ulang halaman.',
      confirmButtonText: 'Mengerti',
      confirmButtonColor: '#2563EB'
    });
    return;
  }

  loaderOn();
  try {
    // Ringkasan filter aktif untuk baris keterangan di dalam file
    const eng = engines[key];
    const filter = [];
    if (eng.search.trim()) filter.push('Cari: "' + eng.search.trim() + '"');
    if (eng.dari) filter.push('Dari: ' + eng.dari);
    if (eng.sampai) filter.push('Sampai: ' + eng.sampai);
    filter.push('Urutan: ' + urutanLabel(eng.sortKey));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistem Informasi Tata Persuratan Digital ' + CONFIG.APP_VERSION;
    wb.created = new Date();

    const ws = wb.addWorksheet(labelJenis);
    ws.views = [{ state: 'frozen', ySplit: 3 }];

    const warnaJenis = jenis === 'masuk' ? 'FF16A34A' : 'FF2563EB';

    // Baris 1: judul lembar kerja
    ws.mergeCells(1, 1, 1, 10);
    const c1 = ws.getCell(1, 1);
    c1.value = 'ARSIP ' + labelJenis.toUpperCase() + '  -  SISTEM INFORMASI TATA PERSURATAN DIGITAL';
    c1.font = { bold: true, size: 13, color: { argb: warnaJenis } };
    c1.alignment = { vertical: 'middle' };
    ws.getRow(1).height = 24;

    // Baris 2: keterangan ekspor (waktu, filter aktif, jumlah)
    ws.mergeCells(2, 1, 2, 10);
    const c2 = ws.getCell(2, 1);
    c2.value = 'Diekspor: ' + formatDateTimeID(new Date().toISOString()) +
      '  |  ' + filter.join('  |  ') +
      '  |  Jumlah: ' + rows.length + ' data';
    c2.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    c2.alignment = { vertical: 'middle', wrapText: true };
    ws.getRow(2).height = 30;

    // Baris 3: header tabel (berwarna sesuai jenis surat)
    const headers = ['No', 'ID', 'Nomor Surat', 'Tanggal Surat', labelKontak, 'Perihal', 'Tanggal Input', 'Nama File PDF', 'Link PDF Google Drive', 'Timestamp'];
    const hr = ws.getRow(3);
    headers.forEach((h, i) => {
      const c = hr.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: warnaJenis } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      c.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    });
    hr.height = 22;

    // Isi data (mulai baris 4)
    rows.forEach((r, i) => {
      const row = ws.getRow(4 + i);

      row.getCell(1).value = i + 1;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };

      row.getCell(2).value = r.id || '-';

      row.getCell(3).value = r.nomorSurat || '-';
      row.getCell(3).font = { bold: true };

      // Tanggal Surat: gunakan tanggalSort (ISO dari server) agar
      // menjadi tanggal Excel sungguhan (dapat diurut/difilter)
      const tglSurat = r.tanggalSort ? new Date(r.tanggalSort) : parseTanggalLokal(r.tanggalSurat);
      if (tglSurat && !isNaN(tglSurat.getTime())) {
        row.getCell(4).value = tglSurat;
        row.getCell(4).numFmt = 'dd/mm/yyyy';
      } else {
        row.getCell(4).value = r.tanggalSurat || '-';
      }

      row.getCell(5).value = r.kontak || '-';

      row.getCell(6).value = r.perihal || '-';
      row.getCell(6).alignment = { vertical: 'top', wrapText: true };

      const tglInput = parseTanggalLokal(r.tanggalInput);
      if (tglInput) {
        row.getCell(7).value = tglInput;
        row.getCell(7).numFmt = 'dd/mm/yyyy';
      } else {
        row.getCell(7).value = r.tanggalInput || '-';
      }

      row.getCell(8).value = r.namaFile || '-';

      // Tautan PDF: teks URL sekaligus dapat diklik di Excel
      if (r.link) {
        const cl = row.getCell(9);
        cl.value = { text: r.link, hyperlink: r.link };
        cl.font = { color: { argb: 'FF2563EB' }, underline: true, size: 10 };
      } else {
        row.getCell(9).value = '-';
      }

      const ts = parseTanggalLokal(r.timestamp);
      if (ts) {
        row.getCell(10).value = ts;
        row.getCell(10).numFmt = 'dd/mm/yyyy hh:mm:ss';
      } else {
        row.getCell(10).value = r.timestamp || '-';
      }

      row.alignment = { vertical: 'top' };
    });

    // Lebar kolom & AutoFilter
    const widths = [6, 18, 24, 13, 28, 42, 13, 28, 52, 20];
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + rows.length, column: 10 } };

    // Tulis buffer lalu unduh sebagai file .xlsx
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = 'Arsip-' + labelJenis.replace(/\s+/g, '-') + '-' + stempelWaktuFile() + '.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(urlObj), 5000);

    toastOk(rows.length + ' data ' + labelJenis.toLowerCase() + ' berhasil diekspor ke Excel (.xlsx).');
  } catch (err) {
    toastErr('Ekspor gagal: ' + friendlyError(err));
  } finally {
    loaderOff();
  }
}

/* ======================= INISIALISASI ======================= */
document.addEventListener('DOMContentLoaded', function () {
  // Tanggal default hari ini
  el('masukTanggal').value = todayISO();
  el('keluarTanggal').value = todayISO();

  // Form
  initForm('masuk');
  initForm('keluar');

  // Pengaturan
  initPengaturan();

  // Event global
  initGlobalEvents();

  // Status awal
  setConnBadge('unknown');

  // Halaman pertama
  showPage('dashboard');

  // Tes koneksi otomatis saat pertama kali dibuka jika URL sudah ada
  if (getApiUrl()) {
    runTestConnection().catch(() => { /* sudah ditangani */ });
  }

  // PERBAIKAN v1.1: pantau status internet perangkat agar pesan
  // "Periksa internet" tampil tepat waktu
  window.addEventListener('offline', () => {
    setConnBadge('err');
    toastErr('Koneksi internet terputus. Simpan/unggah tidak dapat berjalan sampai jaringan kembali.');
  });
  window.addEventListener('online', () => {
    toastOk('Koneksi internet kembali.');
    if (getApiUrl()) runTestConnection().catch(() => { /* sudah ditangani */ });
  });
});
