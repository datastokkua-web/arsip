import React from 'react';
import { Menu, RotateCw, FileSpreadsheet, Sparkles } from 'lucide-react';
import { ActivePage } from '../types';
import { CONFIG } from '../utils/storage';

interface TopBarProps {
  activePage: ActivePage;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenSpreadsheetInFlyingPage: () => void;
  connectionStatus: 'connected' | 'local_ready' | 'checking';
}

const PAGE_META: Record<ActivePage, { title: string; subtitle: string }> = {
  'dashboard': {
    title: 'Dashboard Persuratan',
    subtitle: 'Ringkasan data surat masuk, keluar, dan arsip secara real-time'
  },
  'surat-masuk': {
    title: 'Daftar Surat Masuk',
    subtitle: 'Seluruh arsip surat masuk dinas resmi'
  },
  'input-masuk': {
    title: 'Input Surat Masuk',
    subtitle: 'Form penambahan surat masuk dengan penyimpanan otomatis'
  },
  'surat-keluar': {
    title: 'Daftar Surat Keluar',
    subtitle: 'Seluruh arsip surat dinas yang diterbitkan ke instansi/tujuan'
  },
  'input-keluar': {
    title: 'Input Surat Keluar',
    subtitle: 'Form penambahan surat keluar dengan penyimpanan otomatis'
  },
  'arsip': {
    title: 'Arsip Digital & Ekspor',
    subtitle: 'Pencarian arsip lengkap, filter tanggal, dan ekspor Excel format .xlsx'
  },
  'pengaturan': {
    title: 'Pengaturan & Integrasi',
    subtitle: 'Konfigurasi Web App Google Apps Script, folder Drive, dan tes koneksi'
  }
};

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  onToggleSidebar,
  onRefresh,
  isRefreshing,
  onOpenSpreadsheetInFlyingPage,
  connectionStatus
}) => {
  const meta = PAGE_META[activePage] || PAGE_META.dashboard;

  return (
    <header className="sticky top-0 z-30 px-4 sm:px-6 py-3.5 bg-white/75 backdrop-blur-md border-b border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
      {/* Kiri: Toggle menu & Judul */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 lg:hidden transition-colors"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
            {meta.title}
          </h1>
          <p className="text-xs text-slate-500 truncate hidden sm:block">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Kanan: Quick Actions & Status */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Tombol buka Spreadsheet di Halaman Terbang */}
        <button
          type="button"
          onClick={onOpenSpreadsheetInFlyingPage}
          title="Buka Database Spreadsheet di Halaman Terbang"
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 text-xs font-semibold border border-emerald-200/80 shadow-xs transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Buka Spreadsheet</span>
          <span className="px-1.5 py-0.2 rounded-md bg-emerald-200/80 text-[10px] text-emerald-900">
            Halaman Terbang
          </span>
        </button>

        {/* Badge Status Koneksi */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border bg-emerald-50/80 text-emerald-800 border-emerald-200/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden sm:inline">
            {connectionStatus === 'connected' 
              ? 'Terhubung Google' 
              : 'Penyimpanan Siap'}
          </span>
          <span className="sm:hidden">Aktif</span>
        </div>

        {/* Tombol Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Muat ulang data"
          className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 bg-white/80 hover:bg-white border border-slate-200 shadow-xs transition-all disabled:opacity-60"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
