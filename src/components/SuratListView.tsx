import React, { useState, useMemo } from 'react';
import { 
  Inbox, 
  Send, 
  Search, 
  Plus, 
  RotateCw, 
  Eye, 
  Download, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  FolderOpen, 
  Sparkles, 
  X, 
  Filter, 
  Calendar, 
  CalendarRange, 
  FilterX 
} from 'lucide-react';
import { SuratItem, FloatingPageDoc, ActivePage } from '../types';
import { formatDateID, triggerDownloadSuratPdf, extractSuratPdfLink } from '../utils/storage';

interface SuratListViewProps {
  jenis: 'masuk' | 'keluar';
  items: SuratItem[];
  onNavigate: (page: ActivePage) => void;
  onOpenFlyingPage: (doc: FloatingPageDoc) => void;
  onEdit: (item: SuratItem) => void;
  onDelete: (id: string, nomor: string) => void;
  onRefresh: () => void;
}

export const SuratListView: React.FC<SuratListViewProps> = ({
  jenis,
  items,
  onNavigate,
  onOpenFlyingPage,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTarget, setSearchTarget] = useState<'all' | 'nomor' | 'perihal'>('all');
  const [dariTanggal, setDariTanggal] = useState('');
  const [sampaiTanggal, setSampaiTanggal] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_month' | 'this_year' | 'custom'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const labelJenis = jenis === 'masuk' ? 'Surat Masuk' : 'Surat Keluar';
  const labelKontak = jenis === 'masuk' ? 'Pengirim' : 'Tujuan';

  // Handler Preset Rentang Tanggal Cepat
  const handleApplyDatePreset = (preset: 'all' | 'today' | 'this_month' | 'this_year') => {
    setDatePreset(preset);
    setCurrentPage(1);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;

    if (preset === 'all') {
      setDariTanggal('');
      setSampaiTanggal('');
    } else if (preset === 'today') {
      setDariTanggal(today);
      setSampaiTanggal(today);
    } else if (preset === 'this_month') {
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setDariTanggal(`${y}-${m}-01`);
      setSampaiTanggal(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'this_year') {
      setDariTanggal(`${y}-01-01`);
      setSampaiTanggal(`${y}-12-31`);
    }
  };

  // Reset Semua Filter (Pencarian Teks & Rentang Tanggal)
  const handleResetFilters = () => {
    setSearchTerm('');
    setSearchTarget('all');
    setDariTanggal('');
    setSampaiTanggal('');
    setDatePreset('all');
    setCurrentPage(1);
  };

  // Filter gabungan teks dan rentang tanggal
  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return items.filter(item => {
      // 1. Filter Pencarian Teks
      if (q) {
        const nomor = (item.nomorSurat || '').toLowerCase();
        const perihal = (item.perihal || '').toLowerCase();
        const kontak = (item.kontak || '').toLowerCase();
        const id = (item.id || '').toLowerCase();

        if (searchTarget === 'nomor') {
          if (!nomor.includes(q)) return false;
        } else if (searchTarget === 'perihal') {
          if (!perihal.includes(q)) return false;
        } else {
          // 'all'
          if (!nomor.includes(q) && !perihal.includes(q) && !kontak.includes(q) && !id.includes(q)) {
            return false;
          }
        }
      }

      // 2. Filter Pemilih Rentang Tanggal (Date Range Picker)
      const tgl = (item.tanggalSort || '').slice(0, 10);
      if (dariTanggal && tgl && tgl < dariTanggal) {
        return false;
      }
      if (sampaiTanggal && tgl && tgl > sampaiTanggal) {
        return false;
      }

      return true;
    });
  }, [items, searchTerm, searchTarget, dariTanggal, sampaiTanggal]);

  // Paginasi
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(startIdx, startIdx + itemsPerPage);

  const fromCount = totalItems === 0 ? 0 : startIdx + 1;
  const toCount = Math.min(startIdx + itemsPerPage, totalItems);

  const isFilterActive = Boolean(searchTerm || dariTanggal || sampaiTanggal);

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-5">
      {/* Header Halaman & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ${
            jenis === 'masuk' 
              ? 'bg-gradient-to-br from-emerald-600 to-green-600 shadow-emerald-500/25' 
              : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25'
          }`}>
            {jenis === 'masuk' ? <Inbox className="w-6 h-6" /> : <Send className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Daftar {labelJenis}
            </h2>
            <p className="text-xs text-slate-500">
              Pengelolaan &amp; arsip persuratan digital terintegrasi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white/80 hover:bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-all"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Muat Ulang</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate(jenis === 'masuk' ? 'input-masuk' : 'input-keluar')}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:-translate-y-0.5 ${
              jenis === 'masuk'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 shadow-emerald-600/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Input {labelJenis}</span>
          </button>
        </div>
      </div>

      {/* Panel Pencarian Teks & Pemilih Rentang Tanggal (Date Range Picker) */}
      <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3.5">
        {/* Baris 1: Input Pencarian Teks & Target Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Input Pencarian Teks */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Ketik kata kunci untuk mencari nomor surat atau perihal ${labelJenis.toLowerCase()}...`}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Opsi Target Filter: Nomor Surat / Perihal / Semua */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-2xs self-start md:self-auto flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-600" /> Kolom:
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTarget('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                searchTarget === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTarget('nomor');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                searchTarget === 'nomor'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Nomor Surat
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTarget('perihal');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                searchTarget === 'perihal'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Perihal
            </button>
          </div>
        </div>

        {/* Baris 2: Pemilih Rentang Tanggal (Date Range Picker) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2.5 border-t border-slate-200/60">
          {/* Input Dari & Sampai Tanggal */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <CalendarRange className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Rentang Tanggal:</span>
            </div>

            {/* Dari Tanggal */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase">Dari:</span>
              <input
                type="date"
                value={dariTanggal}
                onChange={(e) => {
                  setDariTanggal(e.target.value);
                  setDatePreset('custom');
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
              {dariTanggal && (
                <button
                  type="button"
                  onClick={() => {
                    setDariTanggal('');
                    setDatePreset('custom');
                    setCurrentPage(1);
                  }}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700"
                  title="Hapus tanggal mulai"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <span className="text-xs font-bold text-slate-400">&ndash;</span>

            {/* Sampai Tanggal */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase">Sampai:</span>
              <input
                type="date"
                value={sampaiTanggal}
                onChange={(e) => {
                  setSampaiTanggal(e.target.value);
                  setDatePreset('custom');
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
              {sampaiTanggal && (
                <button
                  type="button"
                  onClick={() => {
                    setSampaiTanggal('');
                    setDatePreset('custom');
                    setCurrentPage(1);
                  }}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700"
                  title="Hapus tanggal akhir"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Opsi Preset Cepat & Tombol Reset Filter */}
          <div className="flex items-center gap-1.5 self-start lg:self-auto flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 px-1">Periode:</span>

            <button
              type="button"
              onClick={() => handleApplyDatePreset('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                datePreset === 'all' && !dariTanggal && !sampaiTanggal
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua
            </button>

            <button
              type="button"
              onClick={() => handleApplyDatePreset('today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                datePreset === 'today'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Hari Ini
            </button>

            <button
              type="button"
              onClick={() => handleApplyDatePreset('this_month')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                datePreset === 'this_month'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Bulan Ini
            </button>

            <button
              type="button"
              onClick={() => handleApplyDatePreset('this_year')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                datePreset === 'this_year'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tahun Ini
            </button>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 flex items-center gap-1 transition-colors ml-1"
                title="Reset seluruh filter pencarian dan tanggal"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Baris 3: Status Indikator Filter Aktif & Jumlah Data */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2 flex-wrap">
            {searchTerm && (
              <span className="flex items-center gap-1.5 text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                <span>Kata Kunci: <i>"{searchTerm}"</i></span>
                <span className="text-[10px] text-slate-400">({searchTarget === 'nomor' ? 'di Nomor' : searchTarget === 'perihal' ? 'di Perihal' : 'semua kolom'})</span>
              </span>
            )}

            {(dariTanggal || sampaiTanggal) && (
              <span className="flex items-center gap-1.5 text-blue-800 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                <Calendar className="w-3 h-3 text-blue-600" />
                <span>
                  Periode: {dariTanggal ? formatDateID(dariTanggal) : 'Awal'} &ndash; {sampaiTanggal ? formatDateID(sampaiTanggal) : 'Sekarang'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDariTanggal('');
                    setSampaiTanggal('');
                    setDatePreset('all');
                  }}
                  className="p-0.5 rounded text-blue-600 hover:text-blue-900"
                  title="Hapus filter periode tanggal"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {!isFilterActive && (
              <span>Menampilkan seluruh arsip {labelJenis.toLowerCase()} aktif</span>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            Ditemukan: <b className="text-slate-800">{totalItems}</b> dari {items.length} berkas
          </div>
        </div>
      </div>

      {/* Tabel Data Surat (KOLOM FILE PDF SUDAH DISEMBUNYIKAN) */}
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
                    <p className="font-bold text-slate-600 text-sm">Tidak ada data {labelJenis.toLowerCase()} yang cocok</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isFilterActive ? 'Coba sesuaikan kata kunci pencarian atau rentang tanggal yang dipilih.' : `Klik tombol "Input ${labelJenis}" untuk menambahkan data.`}
                    </p>
                  </td>
                </tr>
              ) : (
                currentItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-medium">
                      {startIdx + index + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{item.nomorSurat}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.id}</div>
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
                          onClick={() => onDelete(item.id, item.nomorSurat)}
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
          Menampilkan <span className="font-bold text-slate-800">{fromCount}&ndash;{toCount}</span> dari <span className="font-bold text-slate-800">{totalItems}</span> data
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
                    ? 'bg-emerald-600 text-white shadow-xs'
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
