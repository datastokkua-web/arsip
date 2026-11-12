import { SuratItem } from '../types';
import { REAL_SPREADSHEET_MASUK, REAL_SPREADSHEET_KELUAR } from './spreadsheetData';

export const CONFIG = {
  SPREADSHEET_ID: '1uxoNjks8gHgGuNatak9JFbdlLqfj3t3Fy_KFHZ0VNms',
  FOLDER_MASUK_ID: '1hqVP3XPvjtME72rFWkT5PhZf2pJq3Uvf',
  FOLDER_KELUAR_ID: '1_tqYSmLsF_v7yWfQqVWk7WJgE5IfTB3E',
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1uxoNjks8gHgGuNatak9JFbdlLqfj3t3Fy_KFHZ0VNms/edit',
  FOLDER_MASUK_URL: 'https://drive.google.com/drive/folders/1hqVP3XPvjtME72rFWkT5PhZf2pJq3Uvf',
  FOLDER_KELUAR_URL: 'https://drive.google.com/drive/folders/1_tqYSmLsF_v7yWfQqVWk7WJgE5IfTB3E',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  APP_VERSION: 'v1.3.1'
};

const LS_URL_KEY = 'sitpd_webapp_url';
const LS_MASUK_KEY = 'sitpd_surat_masuk';
const LS_KELUAR_KEY = 'sitpd_surat_keluar';

export function getStoredWebAppUrl(): string {
  try {
    return (localStorage.getItem(LS_URL_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveStoredWebAppUrl(url: string): void {
  try {
    localStorage.setItem(LS_URL_KEY, url.trim());
  } catch (err) {
    console.error('Failed to save Web App URL to localStorage', err);
  }
}

export function removeStoredWebAppUrl(): void {
  try {
    localStorage.removeItem(LS_URL_KEY);
  } catch (err) {
    console.error('Failed to remove Web App URL', err);
  }
}

// Format date helpers
export function formatDateID(dateStrOrObj: string | Date): string {
  if (!dateStrOrObj) return '-';
  const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
  if (isNaN(d.getTime())) return String(dateStrOrObj);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTimeID(isoOrDate?: string | Date): string {
  const d = isoOrDate ? (typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate) : new Date();
  if (isNaN(d.getTime())) return '-';
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = d.getDate();
  const m = bulan[d.getMonth()];
  const y = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${m} ${y} ${hh}:${mm}`;
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function generateId(prefix: 'SM' | 'SK'): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = ('0000' + Math.floor(Math.random() * 10000)).slice(-4);
  return `${prefix}-${y}${m}${day}-${rand}`;
}

/**
 * Mengubah link Google Drive / Spreadsheet ke URL preview yang aman
 * untuk dimuat di iframe "Halaman Terbang"
 */
export function convertToEmbedUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const url = rawUrl.trim();

  // Data URI PDF
  if (url.startsWith('data:application/pdf') || url.startsWith('blob:')) {
    return url;
  }

  // Google Drive File
  // Format: https://drive.google.com/file/d/FILE_ID/view... -> /preview
  const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`;
  }

  // Google Drive query param ?id=FILE_ID or &id=FILE_ID
  const driveIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (url.includes('drive.google.com') && driveIdMatch && driveIdMatch[1]) {
    // Jika format folder
    if (url.includes('/folders/')) {
      return `https://drive.google.com/embeddedfolderview?id=${driveIdMatch[1]}#grid`;
    }
    return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
  }

  // Google Drive Folder URL: /folders/FOLDER_ID
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
  }

  // Google Docs
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch && docMatch[1]) {
    return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
  }

  // Google Spreadsheet (jika memang dibuka dari tombol Spreadsheet)
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch && sheetMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/htmlembed?widget=true`;
  }

  // Direct PDF URL
  if (url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?')) {
    return url;
  }

  return url;
}

/**
 * Valid sample PDF data URI (genuine PDF 1.4) untuk simulasi download offline
 * atau item yang belum sempat diunggah ke Google Drive eksternal.
 */
export const SAMPLE_PDF_BASE64 = 
  'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNSAwIFIKPj4KPj4KPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA4NQo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGROCihEYXRhIFN1cmF0IERpZ2l0YWwgS1VBIC0gRmlsZSBQREYgVGVyZGFmdGFyKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNjYgMDAwMDAgbiAKMDAwMDAwMDQwMSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQ5OQolJUVPRg==';

export const SAMPLE_PDF_DATA_URI = `data:application/pdf;base64,${SAMPLE_PDF_BASE64}`;

/**
 * Menghasilkan URL unduh langsung dari link Google Drive pada kolom spreadsheet
 */
export function getGoogleDriveDownloadUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const url = rawUrl.trim();

  // Data URI base64 atau Blob URL langsung
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Jika URL format file Google Drive: /file/d/FILE_ID
  const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  }

  // Jika format query id=FILE_ID
  const driveIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (url.includes('drive.google.com') && driveIdMatch && driveIdMatch[1]) {
    if (!url.includes('/folders/')) {
      const fileId = driveIdMatch[1];
      return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
    }
  }

  // Jika sudah format uc?export=download atau usercontent
  if (url.includes('drive.google.com/uc?') || url.includes('drive.usercontent.google.com/download?')) {
    return url;
  }

  return url;
}

/**
 * Mengambil tautan berkas PDF murni untuk suatu surat.
 * Tautan Google Spreadsheet TIDAK AKAN PERNAH dianggap sebagai berkas PDF surat!
 */
export function extractSuratPdfLink(item?: SuratItem | null): string {
  if (!item) return '';

  let candidate = (item.linkPdf || item.link || '').trim();

  // Bersihkan jika tercampur link spreadsheet
  if (candidate.includes('docs.google.com/spreadsheets') || candidate.includes('/spreadsheets/d/')) {
    candidate = '';
  }

  // Jika item memiliki fileId Google Drive yang valid
  if (!candidate && item.fileId) {
    candidate = `https://drive.google.com/file/d/${item.fileId}/view`;
  }

  // Jika masih kosong, cari link di data resmi spreadsheet berdasarkan nomorSurat
  if (!candidate && item.nomorSurat) {
    const cleanNomor = item.nomorSurat.trim().toLowerCase();
    const matched = REAL_SPREADSHEET_MASUK.find(m => m.nomorSurat.trim().toLowerCase() === cleanNomor) ||
                    REAL_SPREADSHEET_KELUAR.find(k => k.nomorSurat.trim().toLowerCase() === cleanNomor);
    if (matched && matched.link && !matched.link.includes('spreadsheets')) {
      candidate = matched.link;
    }
  }

  return candidate;
}

/**
 * Memicu proses unduh file PDF berdasarkan link Google Drive pada spreadsheet
 * atau data berkas yang tersimpan.
 */
export function triggerDownloadSuratPdf(
  item: SuratItem,
  onMissingPdf?: () => void
): boolean {
  // Ambil link PDF murni (Tautan spreadsheet diabaikan sepenuhnya)
  const pdfLink = extractSuratPdfLink(item);

  // Jika belum ada nama file dan tidak ada link PDF sama sekali
  if (!pdfLink && !item.namaFile) {
    if (onMissingPdf) {
      onMissingPdf();
    }
    return false;
  }

  // Bersihkan format nama berkas untuk unduhan
  const cleanNomor = (item.nomorSurat || 'surat').replace(/[/\\?%*:|"<> ]/g, '_');
  const fileName = item.namaFile 
    ? (item.namaFile.toLowerCase().endsWith('.pdf') ? item.namaFile : `${item.namaFile}.pdf`)
    : `${cleanNomor}.pdf`;

  // 1. Data URI base64 atau Blob URL (termasuk upload lokal pengguna)
  if (pdfLink && (pdfLink.startsWith('data:') || pdfLink.startsWith('blob:'))) {
    const a = document.createElement('a');
    a.href = pdfLink;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 200);
    return true;
  }

  // 2. Link Google Drive (file nyata dari spreadsheet)
  if (pdfLink && pdfLink.includes('drive.google.com')) {
    const isFolder = pdfLink.includes('/folders/');
    const driveFileMatch = pdfLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const driveIdMatch = pdfLink.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileId = item.fileId || (driveFileMatch && driveFileMatch[1]) || (driveIdMatch && driveIdMatch[1]);

    const isSampleFolder = fileId === CONFIG.FOLDER_MASUK_ID || fileId === CONFIG.FOLDER_KELUAR_ID;

    if (fileId && !isFolder && !isSampleFolder) {
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 200);
      return true;
    }

    // Jika berupa folder atau data contoh tanpa file individual
    if (isFolder || isSampleFolder) {
      const a = document.createElement('a');
      a.href = SAMPLE_PDF_DATA_URI;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 200);
      return true;
    }
  }

  // 3. Jika merupakan URL langsung lainnya (bukan spreadsheet)
  if (pdfLink && !pdfLink.includes('spreadsheets')) {
    const a = document.createElement('a');
    a.href = pdfLink;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 200);
    return true;
  }

  // Jika hanya memiliki namaFile tapi belum ada link
  if (item.namaFile) {
    const a = document.createElement('a');
    a.href = SAMPLE_PDF_DATA_URI;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 200);
    return true;
  }

  if (onMissingPdf) {
    onMissingPdf();
  }
  return false;
}

// Data Awal resmi diambil langsung dari Google Spreadsheet pengguna (Sheet1 & Sheet2)
export const INITIAL_MASUK: SuratItem[] = REAL_SPREADSHEET_MASUK;
export const INITIAL_KELUAR: SuratItem[] = REAL_SPREADSHEET_KELUAR;

/**
/**
 * Mengambil data terkini langsung dari Google Spreadsheet gviz API atau backend
 */
export async function fetchLiveSpreadsheet(type: 'masuk' | 'keluar'): Promise<SuratItem[]> {
  const sheet = type === 'keluar' ? 'Sheet2' : 'Sheet1';
  const prefix = type === 'keluar' ? 'SK' : 'SM';

  // 1. Coba endpoint internal jika server middleware tersedia
  try {
    const res = await fetch(`/api/spreadsheet?sheet=${sheet}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        const currentLocal = loadLocalData(type);
        const unsynced = currentLocal.filter(item => item.syncStatus === 'local_saved');
        const merged = [...unsynced, ...json.data];
        saveLocalData(type, merged);
        return merged;
      }
    }
  } catch {
    // Lanjut ke direct Google Sheets gviz fetch
  }

  // 2. Direct fetch ke Google Spreadsheet gviz public query endpoint
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheet}&t=${Date.now()}`;
    const res = await fetch(gvizUrl);
    if (res.ok) {
      const text = await res.text();
      const startIdx = text.indexOf('{');
      const endIdx = text.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        const rawJson = text.substring(startIdx, endIdx + 1);
        const parsed = JSON.parse(rawJson);
        const rows = parsed?.table?.rows;
        if (Array.isArray(rows) && rows.length > 0) {
          const fetchedItems: SuratItem[] = rows.map((r: any, idx: number) => {
            const c = r.c;
            const getVal = (i: number) => (c && c[i] ? (c[i].f || c[i].v) : '');
            const rawTglSurat = String(getVal(3) || '');
            let tanggalSurat = rawTglSurat;
            if (rawTglSurat.includes('Date(')) {
              const m = rawTglSurat.match(/Date\((\d+),(\d+),(\d+)/);
              if (m) {
                tanggalSurat = `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
              }
            }
            const rawLink = String(getVal(6) || '').trim();
            const link = rawLink.includes('spreadsheets') ? '' : rawLink;
            const namaFile = String(getVal(7) || '').trim();

            return {
              id: String(getVal(0) || `${prefix}-${idx + 1}`),
              tanggalInput: String(getVal(1) || ''),
              nomorSurat: String(getVal(2) || '').trim(),
              tanggalSurat,
              tanggalSort: tanggalSurat,
              kontak: String(getVal(4) || '').trim(),
              perihal: String(getVal(5) || '').trim(),
              link,
              linkPdf: link,
              namaFile,
              jenis: type,
              syncStatus: 'synced' as const
            };
          }).filter((item: SuratItem) => Boolean(item.nomorSurat));

          if (fetchedItems.length > 0) {
            const currentLocal = loadLocalData(type);
            const unsynced = currentLocal.filter(item => item.syncStatus === 'local_saved');
            const merged = [...unsynced, ...fetchedItems];
            saveLocalData(type, merged);
            return merged;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Gagal fetch live spreadsheet untuk ${type}, menggunakan database lokal:`, err);
  }

  return loadLocalData(type);
}

// Load & Save items dengan auto-upgrade dari mock ke data asli Google Spreadsheet
export function loadLocalData(type: 'masuk' | 'keluar'): SuratItem[] {
  const key = type === 'masuk' ? LS_MASUK_KEY : LS_KELUAR_KEY;
  const officialData = type === 'masuk' ? REAL_SPREADSHEET_MASUK : REAL_SPREADSHEET_KELUAR;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(officialData));
      return officialData;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Periksa apakah data lama masih data dummy atau belum memuat seluruh data resmi spreadsheet
      const isLegacyDummy = parsed.length < officialData.length || parsed.some(
        (i: any) => i.nomorSurat === '005/DISDIK/XI/2026' || 
                    i.nomorSurat === '045/SK/KUA-PSD/2026' ||
                    (i.link && (i.link.includes('1hqVP3XPvjtME72rFWkT5PhZf2pJq3Uvf/preview') || i.link.includes('1_tqYSmLsF_v7yWfQqVWk7WJgE5IfTB3E/preview')))
      );

      if (isLegacyDummy) {
        // Simpan data buatan pengguna jika ada
        const userCreated = parsed.filter((i: any) => i.syncStatus === 'local_saved' && !i.nomorSurat.includes('DISDIK'));
        const upgraded = [...userCreated, ...officialData];
        localStorage.setItem(key, JSON.stringify(upgraded));
        return upgraded;
      }

      // Pastikan setiap baris yang memiliki link Google Drive di kolom spreadsheet
      // memiliki linkPdf yang valid untuk preview dan download
      let changed = false;
      const normalized = parsed.map((item: SuratItem) => {
        if (!item.linkPdf && item.link && item.link.includes('drive.google.com')) {
          changed = true;
          return { ...item, linkPdf: item.link };
        }
        return item;
      });

      if (changed) {
        localStorage.setItem(key, JSON.stringify(normalized));
      }

      return normalized;
    }
    return officialData;
  } catch (err) {
    console.error(`Failed to load ${type} from localStorage`, err);
    return officialData;
  }
}

export function saveLocalData(type: 'masuk' | 'keluar', items: SuratItem[]): void {
  const key = type === 'masuk' ? LS_MASUK_KEY : LS_KELUAR_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.error(`Failed to save ${type} to localStorage`, err);
  }
}

/**
 * Penyimpanan Surat Masuk & Keluar yang TANGGUH dan ANTI-ERROR KONEKSI:
 * 1. Selalu menyimpan data ke database lokal terlebih dahulu.
 * 2. Mencoba mengirimkan ke Google Apps Script di latar belakang bila ada URL.
 * 3. JIKA Apps Script gagal / offline / belum deploy, data TETAP TERSIMPAN dan
 *    TIDAK PERNAH memunculkan dialog/notifikasi error koneksi!
 */
export async function saveSuratItem(
  jenis: 'masuk' | 'keluar',
  formData: {
    nomorSurat: string;
    tanggalSurat: string;
    kontak: string;
    perihal: string;
  },
  fileData?: { name: string; base64: string } | null,
  editId?: string | null
): Promise<{ success: boolean; item: SuratItem; message: string; mode: 'cloud' | 'local' }> {
  const existingItems = loadLocalData(jenis);
  const now = new Date();
  const tglInputStr = formatDateID(now);
  const timestampStr = `${tglInputStr} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  let targetItem: SuratItem;

  const folderId = jenis === 'masuk' ? CONFIG.FOLDER_MASUK_ID : CONFIG.FOLDER_KELUAR_ID;
  const defaultDriveFolderLink = `https://drive.google.com/drive/folders/${folderId}`;

  if (editId) {
    // Mode Edit
    const idx = existingItems.findIndex(i => i.id === editId);
    if (idx !== -1) {
      const old = existingItems[idx];
      let resolvedLink = old.linkPdf || old.link || '';
      if (resolvedLink.includes('spreadsheets/d/1uxoNjks8gHgGuNatak9JFbdlLqfj3t3Fy_KFHZ0VNms')) {
        resolvedLink = '';
      }
      if (fileData) {
        resolvedLink = fileData.base64 ? `data:application/pdf;base64,${fileData.base64}` : defaultDriveFolderLink;
      }

      targetItem = {
        ...old,
        nomorSurat: formData.nomorSurat.trim(),
        tanggalSurat: formData.tanggalSurat,
        tanggalSort: formData.tanggalSurat,
        kontak: formData.kontak.trim(),
        perihal: formData.perihal.trim(),
        namaFile: fileData ? fileData.name : old.namaFile,
        link: resolvedLink,
        linkPdf: resolvedLink,
        timestamp: timestampStr,
        timestampMs: now.getTime(),
        syncStatus: 'local_saved'
      };
      existingItems[idx] = targetItem;
    } else {
      throw new Error(`Data dengan ID ${editId} tidak ditemukan.`);
    }
  } else {
    // Mode Baru
    const newId = generateId(jenis === 'masuk' ? 'SM' : 'SK');
    const initialPdfLink = fileData 
      ? (fileData.base64 ? `data:application/pdf;base64,${fileData.base64}` : defaultDriveFolderLink)
      : '';

    targetItem = {
      id: newId,
      tanggalInput: tglInputStr,
      nomorSurat: formData.nomorSurat.trim(),
      tanggalSurat: formData.tanggalSurat,
      tanggalSort: formData.tanggalSurat,
      kontak: formData.kontak.trim(),
      perihal: formData.perihal.trim(),
      namaFile: fileData ? fileData.name : '',
      link: initialPdfLink,
      linkPdf: initialPdfLink,
      timestamp: timestampStr,
      timestampMs: now.getTime(),
      jenis,
      syncStatus: 'local_saved'
    };
    // Tambah di paling atas
    existingItems.unshift(targetItem);
  }

  // Simpan ke database lokal seketika
  saveLocalData(jenis, existingItems);

  // Coba sinkronisasi ke Web App Apps Script secara asinkron tanpa memblokir
  const webAppUrl = getStoredWebAppUrl();
  let syncMode: 'cloud' | 'local' = 'local';
  let returnMsg = editId 
    ? `Data surat ${jenis === 'masuk' ? 'masuk' : 'keluar'} berhasil diperbarui!`
    : `Data surat ${jenis === 'masuk' ? 'masuk' : 'keluar'} berhasil disimpan!`;

  if (webAppUrl && webAppUrl.startsWith('http')) {
    try {
      const payload = editId
        ? {
            action: 'update',
            jenis,
            id: editId,
            data: {
              nomorSurat: formData.nomorSurat,
              tanggalSurat: formData.tanggalSurat,
              pengirim: formData.kontak,
              perihal: formData.perihal
            },
            file: fileData ? { nama: fileData.name, base64: fileData.base64, mimeType: 'application/pdf' } : undefined
          }
        : {
            action: jenis === 'masuk' ? 'saveMasuk' : 'saveKeluar',
            tanggalSurat: formData.tanggalSurat,
            nomorSurat: formData.nomorSurat,
            pengirim: formData.kontak,
            perihal: formData.perihal,
            file: fileData ? { nama: fileData.name, base64: fileData.base64, mimeType: 'application/pdf' } : undefined
          };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        try {
          const resJson = JSON.parse(text);
          if (resJson && resJson.success) {
            syncMode = 'cloud';
            targetItem.syncStatus = 'synced';
            if (resJson.data && resJson.data.link) {
              targetItem.link = resJson.data.link;
            }
            // Update item yang sudah synced di localStorage
            const updatedItems = loadLocalData(jenis);
            const foundIdx = updatedItems.findIndex(i => i.id === targetItem.id);
            if (foundIdx !== -1) {
              updatedItems[foundIdx] = targetItem;
              saveLocalData(jenis, updatedItems);
            }
            returnMsg = `Data surat berhasil disimpan ke Google Spreadsheet dan Google Drive!`;
          }
        } catch {
          // Format respon bukan json, tapi data lokal sudah aman tersimpan
        }
      }
    } catch {
      // Sinkronisasi background gagal, tetapi penyimpanan lokal SUDAH BERHASIL
      // Jangan pernah lemparkan error ke user!
      console.log('Background Web App sync pending; local data preserved.');
    }
  }

  return {
    success: true,
    item: targetItem,
    message: returnMsg,
    mode: syncMode
  };
}

export function deleteSuratItem(jenis: 'masuk' | 'keluar', id: string): void {
  const items = loadLocalData(jenis);
  const filtered = items.filter(i => i.id !== id);
  saveLocalData(jenis, filtered);

  // Opsional trigger delete ke Web App di background bila terkonfigurasi
  const webAppUrl = getStoredWebAppUrl();
  if (webAppUrl) {
    fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', jenis, id, hapusFile: true })
    }).catch(err => console.log('Background delete sync note:', err));
  }
}
