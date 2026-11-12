import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Inbox, 
  Send, 
  Calendar, 
  Layers, 
  ArrowUpRight, 
  Activity, 
  Award,
  Sparkles
} from 'lucide-react';
import { SuratItem, ActivePage } from '../types';

interface StatistikRingkasanBulananProps {
  suratMasuk: SuratItem[];
  suratKeluar: SuratItem[];
  onNavigate: (page: ActivePage) => void;
}

export const StatistikRingkasanBulanan: React.FC<StatistikRingkasanBulananProps> = ({
  suratMasuk,
  suratKeluar,
  onNavigate
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const namaBulanLengkap = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Hitung data untuk 12 bulan pada tahun yang dipilih
  const monthlyStats = namaBulanLengkap.map((nama, idx) => {
    const monthNum = idx + 1;
    const ym = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
    
    const masuk = suratMasuk.filter(s => (s.tanggalSort || '').startsWith(ym)).length;
    const keluar = suratKeluar.filter(s => (s.tanggalSort || '').startsWith(ym)).length;
    const total = masuk + keluar;

    return {
      monthIdx: idx,
      monthName: nama,
      monthShort: nama.slice(0, 3),
      year: selectedYear,
      ym,
      masuk,
      keluar,
      total,
      masukPct: total > 0 ? Math.round((masuk / total) * 100) : 0,
      keluarPct: total > 0 ? Math.round((keluar / total) * 100) : 0
    };
  });

  // Filter hanya bulan-bulan yang memiliki surat atau 6 bulan terakhir jika kosong
  const activeMonths = monthlyStats.filter(m => m.total > 0);
  const displayMonths = activeMonths.length > 0 
    ? activeMonths 
    : monthlyStats.slice(Math.max(0, new Date().getMonth() - 5), new Date().getMonth() + 1);

  // Perhitungan KPI Ringkasan
  const totalTahunIni = monthlyStats.reduce((sum, m) => sum + m.total, 0);
  const totalMasukTahunIni = monthlyStats.reduce((sum, m) => sum + m.masuk, 0);
  const totalKeluarTahunIni = monthlyStats.reduce((sum, m) => sum + m.keluar, 0);
  
  const bulanBerisiCount = monthlyStats.filter(m => m.total > 0).length || 1;
  const rataRataPerBulan = (totalTahunIni / bulanBerisiCount).toFixed(1);

  // Cari bulan tersibuk (Peak Month)
  const peakMonth = [...monthlyStats].sort((a, b) => b.total - a.total)[0];
  const maxMonthTotal = Math.max(1, ...displayMonths.map(m => m.total));

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      {/* Header Komponen Statistik */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 flex-shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Statistik Ringkasan Surat per Bulan
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Performa Visual
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis performa volume surat masuk &amp; surat keluar tahun {selectedYear}
            </p>
          </div>
        </div>

        {/* Kontrol Mode Tampilan & Tahun */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value={2026}>Tahun 2026</option>
            <option value={2025}>Tahun 2025</option>
            <option value={2027}>Tahun 2027</option>
          </select>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'card' 
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Kartu Visual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'table' 
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tabel Rincian
            </button>
          </div>
        </div>
      </div>

      {/* 4 Kartu KPI Metrik Ringkasan Performa */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Rata-rata per Bulan */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/70">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
            <span>Rata-Rata Bulanan</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {rataRataPerBulan}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Surat per bulan aktif
          </div>
        </div>

        {/* Bulan Puncak (Peak Month) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-amber-50/80 to-yellow-50/50 border border-amber-200/70">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1">
            <span>Bulan Tersibuk</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 truncate">
            {peakMonth.total > 0 ? peakMonth.monthShort : '-'}
          </div>
          <div className="text-[11px] text-amber-800 font-medium mt-0.5">
            {peakMonth.total > 0 ? `${peakMonth.total} surat tercatat` : 'Belum ada data'}
          </div>
        </div>

        {/* Rasio Masuk : Keluar */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-blue-50/80 to-sky-50/50 border border-blue-200/70">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold mb-1">
            <span>Rasio Masuk : Keluar</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {totalMasukTahunIni}:{totalKeluarTahunIni}
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-0.5">
            {totalTahunIni > 0 
              ? `${Math.round((totalMasukTahunIni / totalTahunIni) * 100)}% : ${Math.round((totalKeluarTahunIni / totalTahunIni) * 100)}%` 
              : '0% : 0%'}
          </div>
        </div>

        {/* Total Akumulasi Tahun Ini */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
            <span>Total Tahun {selectedYear}</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {totalTahunIni}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Surat terarsip lengkap
          </div>
        </div>
      </div>

      {/* TAMPILAN 1: KARTU VISUAL PER BULAN (Default) */}
      {viewMode === 'card' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayMonths.map((m) => {
              const relativePct = Math.round((m.total / maxMonthTotal) * 100);

              return (
                <div 
                  key={m.ym}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3"
                >
                  {/* Atas: Nama Bulan & Total */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{m.monthName} {m.year}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Volume surat bulan ini
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-sm shadow-2xs">
                        {m.total}
                      </span>
                    </div>
                  </div>

                  {/* Tengah: Visual Progress Bar Ganda */}
                  <div className="space-y-1.5">
                    {/* Progress Bar Gabungan */}
                    <div className="h-3 rounded-full bg-slate-100 flex overflow-hidden border border-slate-200/60">
                      {m.total > 0 ? (
                        <>
                          <div 
                            style={{ width: `${m.masukPct}%` }}
                            className="bg-emerald-600 transition-all duration-500 hover:brightness-110"
                            title={`Surat Masuk: ${m.masuk} (${m.masukPct}%)`}
                          />
                          <div 
                            style={{ width: `${m.keluarPct}%` }}
                            className="bg-blue-600 transition-all duration-500 hover:brightness-110"
                            title={`Surat Keluar: ${m.keluar} (${m.keluarPct}%)`}
                          />
                        </>
                      ) : (
                        <div className="w-full bg-slate-100" />
                      )}
                    </div>

                    {/* Breakdown Masuk vs Keluar */}
                    <div className="flex items-center justify-between text-xs pt-1 font-semibold">
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <Inbox className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Masuk: <b>{m.masuk}</b></span>
                        <span className="text-[10px] text-slate-400 font-normal">({m.masukPct}%)</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-blue-700">
                        <Send className="w-3.5 h-3.5 text-blue-600" />
                        <span>Keluar: <b>{m.keluar}</b></span>
                        <span className="text-[10px] text-slate-400 font-normal">({m.keluarPct}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Bawah: Tombol Cepat ke Arsip Bulan Ini */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">
                      Intensitas: {relativePct}%
                    </span>

                    <button
                      type="button"
                      onClick={() => onNavigate('arsip')}
                      className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                    >
                      Buka Arsip <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAMPILAN 2: TABEL RINCIAN LENGKAP */}
      {viewMode === 'table' && (
        <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10.5px] border-b border-slate-200">
                  <th className="py-3 px-4">Bulan</th>
                  <th className="py-3 px-4 text-center">Surat Masuk</th>
                  <th className="py-3 px-4 text-center">Surat Keluar</th>
                  <th className="py-3 px-4 text-center">Total Surat</th>
                  <th className="py-3 px-4">Distribusi Arus Persuratan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayMonths.map((m) => (
                  <tr key={m.ym} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {m.monthName} {m.year}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-emerald-700">
                      {m.masuk} berkas
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-blue-700">
                      {m.keluar} berkas
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-slate-900">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                        {m.total}
                      </span>
                    </td>
                    <td className="py-3 px-4 min-w-[180px]">
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-slate-100 flex overflow-hidden">
                          {m.total > 0 && (
                            <>
                              <div style={{ width: `${m.masukPct}%` }} className="bg-emerald-600" />
                              <div style={{ width: `${m.keluarPct}%` }} className="bg-blue-600" />
                            </>
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>{m.masukPct}% Masuk</span>
                          <span>{m.keluarPct}% Keluar</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onNavigate('arsip')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <span>Arsip</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
