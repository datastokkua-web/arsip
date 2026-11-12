import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  Inbox, 
  Send, 
  Search, 
  Calendar, 
  FileSpreadsheet, 
  FilterX, 
  Eye, 
  Download, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  FolderOpen,
  CheckCircle2
} from 'lucide-react';
import { SuratItem, FloatingPageDoc, ActivePage } from '../types';
import { formatDateID, triggerDownloadSuratPdf, extractSuratPdfLink } from '../utils/storage';
import { eksporArsipToExcel } from '../utils/excel';

interface ArsipDigitalViewProps {
  suratMasuk: SuratItem[];
  suratKeluar: SuratItem[];
  onOpenFlyingPage: (doc: FloatingPageDoc) => void;
  onEdit: (item: SuratItem) => void;
  onDelete: (id: string, nomor: string, jenis: 'masuk' | 'keluar') => void;
  onShowToast: (msg: string) => void;
}

export const ArsipDigitalView: React.FC<ArsipDigitalViewProps> = ({
  suratMasuk,
  suratKeluar,
  onOpenFlyingPage,
  onEdit,
  onDelete,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'masuk' | 'keluar'>('masuk');
  const [searchTerm, setSearchTerm] = useState('');
  const [dariTanggal, setDariTanggal] = useState('');
  const [sampaiTanggal, setSampaiTanggal] = useState('');
  const [sortKey, setSortKey] = useState<'tanggal-desc' | 'tanggal-asc' | 'nomor-asc' | 'nomor-desc'>('tanggal-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const itemsPerPage = 10;
  const currentSourceItems = activeTab === 'masuk' ? suratMasuk : suratKeluar;
  const labelJenis = activeTab === 'masuk' ? 'Surat Masuk' : 'Surat Keluar';
  const labelKontak = activeTab === 'masuk' ? 'Pengirim' : 'Tujuan';

  // Filter & Urutkan
  const filteredItems = useMemo(() => {
    let result = currentSourceItems.filter((item) => {
      // Pencarian teks
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hay = `${item.nomorSurat} ${item.kontak} ${item.perihal} ${item.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // Filter Dari Tanggal
      if (dariTanggal && item.tanggalSort && item.tanggalSort < dariTanggal) {
        return false;
      }

      // Filter Sampai Tanggal
      if (sampaiTanggal && item.tanggalSort && item.tanggalSort > sampaiTanggal) {
        return false;
      }

      return true;
    });

    // Pengurutan
    result = [...result].sort((a, b) => {
      if (sortKey === 'tanggal-desc') {
        return (b.tanggalSort || '').localeCompare(a.tanggalSort || '');
      }
      if (sortKey === 'tanggal-asc') {
        return (a.tanggalSort || '').localeCompare(b.tanggalSort || '');
      }
      if (sortKey === 'nomor-asc') {
        return (a.nomorSurat || '').localeCompare(b.nomorSurat || '', undefined, { numeric: true });
      }
      if (sortKey === 'nomor-desc') {
        return (b.nomorSurat || '').localeCompare(a.nomorSurat || '', undefined, { numeric: true });
      }
      return 0;
    });

    return result;
  }, [currentSourceItems, searchTerm, dariTanggal, sampaiTanggal, sortKey]);

  // Reset Filter
  const handleResetFilter = () => {
    setSearchTerm('');
    setDariTanggal('');
    setSampaiTanggal('');
    setSortKey('tanggal-desc');
    setCurrentPage(1);
  };

  // Ekspor Excel .xlsx yang berfungsi 100%
  const handleEksporExcel = () => {
    if (filteredItems.length === 0) {
      onShowToast('Tidak ada data untuk diekspor pada filter aktif saat ini.');
      return;
    }

    setIsExporting(true);
    try {
      const res = eksporArsipToExcel(filteredItems, activeTab, {
        search: searchTerm,
        dari: dariTanggal,
        sampai: sampaiTanggal
      });
      setIsExporting(false);
      onShowToast(`${res.count} data ${labelJenis.toLowerCase()} berhasil diekspor ke file Excel (${res.filename})!`);
    } catch (err: any) {
      setIsExporting(false);
      onShowToast(err?.message || 'Gagal mengekspor file Excel.');
    }
  };

  // Paginasi
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(startIdx, startIdx + itemsPerPage);

  const fromCount = totalItems === 0 ? 0 : startIdx + 1;
  const toCount = Math.min(startIdx + itemsPerPage, totalItems);

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      {/* Header Arsip Digital & Tombol Ekspor Excel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/25">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Arsip Digital Terpadu
            </h2>
            <p className="text-xs text-slate-500">
              Pencarian, filter rentang tanggal, urutan, dan ekspor format Excel (.xlsx)
            </p>
          </div>
        </div>

        {/* Tombol Ekspor Excel Utama */}
        <button
          type="button"
          onClick={handleEksporExcel}
          disabled={isExporting}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
          <span>{isExporting ? 'Mengekspor...' : 'Ekspor Excel (.xlsx)'}</span>
        </button>
      </div>

      {/* Tabs Pilihan: Surat Masuk vs Surat Keluar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/80 w-fit">
        <button
          type="button"
          onClick={() => {
            setActiveTab('masuk');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'masuk'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Surat Masuk</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'masuk' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
          }`}>
            {suratMasuk.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('keluar');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'keluar'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Surat Keluar</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'keluar' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
          }`}>
            {suratKeluar.length}
          </span>
        </button>
      </div>

      {/* Filter Bar Lengkap */}
      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Pencarian */}
        <div className="lg:col-span-2">
          <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Pencarian
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Cari nomor, ${labelKontak.toLowerCase()}, perihal...`}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Dari Tanggal */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={dariTanggal}
            onChange={(e) => {
              setDariTanggal(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
          />
        </div>

        {/* Sampai Tanggal */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={sampaiTanggal}
            onChange={(e) => {
              setSampaiTanggal(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
          />
        </div>

        {/* Urutkan & Reset */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Urutkan
            </label>
            <select
              value={sortKey}
              onChange={(e: any) => setSortKey(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
            >
              <option value="tanggal-desc">Tanggal Terbaru</option>
              <option value="tanggal-asc">Tanggal Terlama</option>
              <option value="nomor-asc">Nomor Surat A&rarr;Z</option>
              <option value="nomor-desc">Nomor Surat Z&rarr;A</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleResetFilter}
            title="Reset Filter"
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Tabel Data Arsip Digital (KOLOM FILE PDF SUDAH DISEMBUNYIKAN) */}
      <div className="overflow-hidden border border-slate-200/80 rounded-xl bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-4">Nomor Surat</th>
                <th className="py-3 px-4 whitespace-nowrap">Tanggal Surat</th>
                <th className="py-3 px-4">{labelKontak}</th>
                <th className="py-3 px-4">Perihal</th>
                {/* Kolom File PDF disembunyikan sesuai instruksi pengguna */}
                <th className="py-3 px-4 text-center w-40">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FolderOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak ada arsip yang cocok</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Silakan sesuaikan rentang tanggal atau kata kunci pencarian.
                    </p>
                  </td>
                </tr>
              ) : (
                currentItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-amber-50/25 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-medium">
                      {startIdx + index + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{item.nomorSurat}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">{item.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatDateID(item.tanggalSurat)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-[180px] truncate" title={item.kontak}>
                      {item.kontak}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[280px] truncate" title={item.perihal}>
                      {item.perihal}
                    </td>
                    {/* Kolom Aksi dengan Tombol Halaman Terbang */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Tombol Lihat File PDF (dari kolom link PDF spreadsheet) */}
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
                              jenis: item.jenis,
                              kontak: item.kontak,
                              perihal: item.perihal,
                              isPdf: true
                            });
                          }}
                          title={extractSuratPdfLink(item) ? `Lihat File PDF: ${item.namaFile || item.nomorSurat}` : 'File PDF belum tersedia di spreadsheet'}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition-all shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Tombol Unduh File PDF Google Drive */}
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
                                jenis: item.jenis,
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

                        {/* Tombol Edit */}
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          title="Edit Data Surat"
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white transition-all shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Tombol Hapus */}
                        <button
                          type="button"
                          onClick={() => onDelete(item.id, item.nomorSurat, item.jenis)}
                          title="Hapus Data Surat"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white transition-all shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Footer Paginasi */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
        <div>
          Menampilkan <span className="font-bold text-slate-800">{fromCount}&ndash;{toCount}</span> dari <span className="font-bold text-slate-800">{totalItems}</span> arsip
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`min-w-[32px] h-8 rounded-lg text-xs font-semibold transition-all ${
                  page === safePage
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
