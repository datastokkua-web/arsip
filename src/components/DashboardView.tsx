import React from 'react';
import { 
  Inbox, 
  Send, 
  Calendar, 
  Archive, 
  Eye, 
  Download,
  ArrowUpRight, 
  PlusCircle, 
  Clock, 
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { SuratItem, FloatingPageDoc, ActivePage } from '../types';
import { formatDateID, triggerDownloadSuratPdf, extractSuratPdfLink } from '../utils/storage';
import { StatistikRingkasanBulanan } from './StatistikRingkasanBulanan';
import { RechartsMonthlyBarChart } from './RechartsMonthlyBarChart';

interface DashboardViewProps {
  suratMasuk: SuratItem[];
  suratKeluar: SuratItem[];
  onNavigate: (page: ActivePage) => void;
  onOpenFlyingPage: (doc: FloatingPageDoc) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  suratMasuk,
  suratKeluar,
  onNavigate,
  onOpenFlyingPage
}) => {
  const totalMasuk = suratMasuk.length;
  const totalKeluar = suratKeluar.length;
  const totalArsip = totalMasuk + totalKeluar;

  // Hitung surat bulan ini
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const masukBulanIni = suratMasuk.filter(s => (s.tanggalSort || '').startsWith(currentYm)).length;
  const keluarBulanIni = suratKeluar.filter(s => (s.tanggalSort || '').startsWith(currentYm)).length;
  const totalBulanIni = masukBulanIni + keluarBulanIni;

  // 5 Data terbaru
  const latestMasuk = suratMasuk.slice(0, 5);
  const latestKeluar = suratKeluar.slice(0, 5);

  // Komposisi Donat
  const masukPct = totalArsip > 0 ? Math.round((totalMasuk / totalArsip) * 100) : 50;
  const keluarPct = totalArsip > 0 ? 100 - masukPct : 50;

  // 6 Bulan terakhir untuk grafik batang
  const monthsData = [];
  const namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mCount = suratMasuk.filter(s => (s.tanggalSort || '').startsWith(ym)).length;
    const kCount = suratKeluar.filter(s => (s.tanggalSort || '').startsWith(ym)).length;
    monthsData.push({
      label: namaBulan[d.getMonth()],
      masuk: mCount,
      keluar: kCount,
      total: mCount + kCount
    });
  }

  const maxMonthValue = Math.max(1, ...monthsData.map(m => Math.max(m.masuk, m.keluar)));

  // Gabungkan aktivitas terbaru
  const allActivity = [
    ...suratMasuk.map(s => ({ ...s, jenisLabel: 'Surat Masuk' })),
    ...suratKeluar.map(s => ({ ...s, jenisLabel: 'Surat Keluar' }))
  ]
    .sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 4 Kartu Statistik Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Surat Masuk */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25 flex-shrink-0">
            <Inbox className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {totalMasuk}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              Total Surat Masuk
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">
              +{masukBulanIni} bulan ini
            </div>
          </div>
        </div>

        {/* Total Surat Keluar */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 flex-shrink-0">
            <Send className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {totalKeluar}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              Total Surat Keluar
            </div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1">
              +{keluarBulanIni} bulan ini
            </div>
          </div>
        </div>

        {/* Surat Bulan Ini */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-900 shadow-md shadow-amber-400/25 flex-shrink-0">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {totalBulanIni}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              Surat Bulan Ini
            </div>
            <div className="text-[11px] text-amber-700 font-semibold mt-1">
              Periode {namaBulan[now.getMonth()]} {now.getFullYear()}
            </div>
          </div>
        </div>

        {/* Total Arsip Digital */}
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-md shadow-slate-600/25 flex-shrink-0">
            <Archive className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {totalArsip}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">
              Total Arsip Digital
            </div>
            <div className="text-[11px] text-slate-600 font-semibold mt-1">
              Tersimpan & Siap Ekspor
            </div>
          </div>
        </div>
      </div>

      {/* Baris Grafik & Komposisi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Batang Recharts 6 Bulan */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Grafik Tren Surat Masuk &amp; Keluar per Bulan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Visualisasi interaktif Recharts periode 6 bulan terakhir</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Recharts
              </span>
            </div>
          </div>

          <RechartsMonthlyBarChart data={monthsData} />
        </div>

        {/* Komposisi Donat */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Komposisi Arsip Digital</h3>
            <p className="text-xs text-slate-400">Rasio perbandingan surat masuk & keluar</p>
          </div>

          <div className="py-6 flex flex-col items-center justify-center">
            {/* Donut Visual */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#E2E8F0"
                  strokeWidth="5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#16A34A"
                  strokeWidth="5"
                  strokeDasharray={`${masukPct} 100`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="transparent"
                  stroke="#2563EB"
                  strokeWidth="5"
                  strokeDasharray={`${keluarPct} 100`}
                  strokeDashoffset={`-${masukPct}`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900">{totalArsip}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
              </div>
            </div>

            {/* Keterangan */}
            <div className="w-full grid grid-cols-2 gap-3 mt-6">
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100 text-center">
                <div className="text-xs font-bold text-emerald-800">Surat Masuk</div>
                <div className="text-base font-extrabold text-emerald-700">{masukPct}%</div>
                <div className="text-[10px] text-slate-500 font-medium">{totalMasuk} berkas</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-center">
                <div className="text-xs font-bold text-blue-800">Surat Keluar</div>
                <div className="text-base font-extrabold text-blue-700">{keluarPct}%</div>
                <div className="text-[10px] text-slate-500 font-medium">{totalKeluar} berkas</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('arsip')}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Buka Arsip Digital</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Komponen Statistik Ringkasan Surat Bulanan (Performa Visual) */}
      <StatistikRingkasanBulanan
        suratMasuk={suratMasuk}
        suratKeluar={suratKeluar}
        onNavigate={onNavigate}
      />

      {/* Tabel Surat Masuk Terbaru & Surat Keluar Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Surat Masuk Terbaru */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-emerald-600" />
              Surat Masuk Terbaru
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('surat-masuk')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-2">Nomor Surat</th>
                  <th className="py-2 px-2">Tanggal</th>
                  <th className="py-2 px-2">Pengirim</th>
                  <th className="py-2 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestMasuk.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">Belum ada data surat masuk</td>
                  </tr>
                ) : (
                  latestMasuk.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-2 font-bold text-slate-900">{item.nomorSurat}</td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">{formatDateID(item.tanggalSurat)}</td>
                      <td className="py-2.5 px-2 text-slate-600 max-w-[140px] truncate" title={item.kontak}>
                        {item.kontak}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const pdfLink = extractSuratPdfLink(item);
                              onOpenFlyingPage({
                                isOpen: true,
                                title: item.namaFile ? `File PDF: ${item.namaFile}` : `Dokumen PDF: ${item.nomorSurat}`,
                                nomorSurat: item.nomorSurat,
                                link: pdfLink,
                                namaFile: item.namaFile,
                                jenis: 'masuk',
                                kontak: item.kontak,
                                perihal: item.perihal,
                                isPdf: true
                              });
                            }}
                            title={extractSuratPdfLink(item) ? `Lihat File PDF: ${item.namaFile || item.nomorSurat}` : 'File PDF belum tersedia'}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition-all shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerDownloadSuratPdf(item, () => {
                                onOpenFlyingPage({
                                  isOpen: true,
                                  title: item.namaFile ? `File PDF: ${item.namaFile}` : `Dokumen PDF: ${item.nomorSurat}`,
                                  nomorSurat: item.nomorSurat,
                                  link: '',
                                  namaFile: item.namaFile,
                                  jenis: 'masuk',
                                  kontak: item.kontak,
                                  perihal: item.perihal,
                                  isPdf: true
                                });
                              });
                            }}
                            title={`Download File PDF dari Google Drive: ${item.namaFile || item.nomorSurat}`}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition-all shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Surat Keluar Terbaru */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              Surat Keluar Terbaru
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('surat-keluar')}
              className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-2">Nomor Surat</th>
                  <th className="py-2 px-2">Tanggal</th>
                  <th className="py-2 px-2">Tujuan</th>
                  <th className="py-2 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestKeluar.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">Belum ada data surat keluar</td>
                  </tr>
                ) : (
                  latestKeluar.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-2 font-bold text-slate-900">{item.nomorSurat}</td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">{formatDateID(item.tanggalSurat)}</td>
                      <td className="py-2.5 px-2 text-slate-600 max-w-[140px] truncate" title={item.kontak}>
                        {item.kontak}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const pdfLink = extractSuratPdfLink(item);
                              onOpenFlyingPage({
                                isOpen: true,
                                title: item.namaFile ? `File PDF: ${item.namaFile}` : `Dokumen PDF: ${item.nomorSurat}`,
                                nomorSurat: item.nomorSurat,
                                link: pdfLink,
                                namaFile: item.namaFile,
                                jenis: 'keluar',
                                kontak: item.kontak,
                                perihal: item.perihal,
                                isPdf: true
                              });
                            }}
                            title={extractSuratPdfLink(item) ? `Lihat File PDF: ${item.namaFile || item.nomorSurat}` : 'File PDF belum tersedia'}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition-all shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerDownloadSuratPdf(item, () => {
                                onOpenFlyingPage({
                                  isOpen: true,
                                  title: item.namaFile ? `File PDF: ${item.namaFile}` : `Dokumen PDF: ${item.nomorSurat}`,
                                  nomorSurat: item.nomorSurat,
                                  link: '',
                                  namaFile: item.namaFile,
                                  jenis: 'keluar',
                                  kontak: item.kontak,
                                  perihal: item.perihal,
                                  isPdf: true
                                });
                              });
                            }}
                            title={`Download File PDF dari Google Drive: ${item.namaFile || item.nomorSurat}`}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition-all shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Aktivitas Terbaru */}
      <div className="glass-panel p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Aktivitas Tata Persuratan Terbaru
          </h3>
          <span className="text-[11px] text-slate-400">
            Pembaruan sistem &amp; input data
          </span>
        </div>

        <div className="space-y-3">
          {allActivity.map((act) => (
            <div key={act.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs ${
                  act.jenis === 'masuk' ? 'bg-emerald-600' : 'bg-blue-600'
                }`}>
                  {act.jenis === 'masuk' ? <Inbox className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {act.jenisLabel}: <span className="font-semibold text-slate-600">{act.nomorSurat}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-md">
                    {act.perihal} &middot; {act.kontak}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {act.timestamp}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const pdfLink = extractSuratPdfLink(act);
                    onOpenFlyingPage({
                      isOpen: true,
                      title: act.namaFile ? `File PDF: ${act.namaFile}` : `Dokumen PDF: ${act.nomorSurat}`,
                      nomorSurat: act.nomorSurat,
                      link: pdfLink,
                      namaFile: act.namaFile,
                      jenis: act.jenis,
                      kontak: act.kontak,
                      perihal: act.perihal,
                      isPdf: true
                    });
                  }}
                  title={extractSuratPdfLink(act) ? `Lihat File PDF: ${act.namaFile || act.nomorSurat}` : 'File PDF belum tersedia'}
                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>Lihat PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerDownloadSuratPdf(act, () => {
                      onOpenFlyingPage({
                        isOpen: true,
                        title: act.namaFile ? `File PDF: ${act.namaFile}` : `Dokumen PDF: ${act.nomorSurat}`,
                        nomorSurat: act.nomorSurat,
                        link: '',
                        namaFile: act.namaFile,
                        jenis: act.jenis,
                        kontak: act.kontak,
                        perihal: act.perihal,
                        isPdf: true
                      });
                    });
                  }}
                  title={`Download File PDF dari Google Drive: ${act.namaFile || act.nomorSurat}`}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
