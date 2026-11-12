import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { SuratListView } from './components/SuratListView';
import { SuratFormView } from './components/SuratFormView';
import { ArsipDigitalView } from './components/ArsipDigitalView';
import { PengaturanView } from './components/PengaturanView';
import { HalamanTerbangModal } from './components/HalamanTerbangModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ActivePage, SuratItem, FloatingPageDoc } from './types';
import { 
  CONFIG, 
  loadLocalData, 
  fetchLiveSpreadsheet,
  deleteSuratItem, 
  getStoredWebAppUrl 
} from './utils/storage';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [suratMasuk, setSuratMasuk] = useState<SuratItem[]>([]);
  const [suratKeluar, setSuratKeluar] = useState<SuratItem[]>([]);
  const [editingItem, setEditingItem] = useState<SuratItem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // State untuk Halaman Terbang (Floating Page Modal)
  const [flyingPageDoc, setFlyingPageDoc] = useState<FloatingPageDoc | null>(null);

  // State dialog konfirmasi hapus
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nomor: string; jenis: 'masuk' | 'keluar' } | null>(null);

  // Status koneksi
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'local_ready' | 'checking'>('connected');

  // Load data awal dan live sync dari Google Spreadsheet
  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    // Muat data resmi seketika
    const m = loadLocalData('masuk');
    const k = loadLocalData('keluar');
    setSuratMasuk(m);
    setSuratKeluar(k);
    setConnectionStatus('connected');

    // Sinkronkan data langsung dari Google Spreadsheet
    try {
      const [liveMasuk, liveKeluar] = await Promise.all([
        fetchLiveSpreadsheet('masuk'),
        fetchLiveSpreadsheet('keluar')
      ]);
      if (liveMasuk && liveMasuk.length > 0) setSuratMasuk(liveMasuk);
      if (liveKeluar && liveKeluar.length > 0) setSuratKeluar(liveKeluar);
    } catch (e) {
      console.warn('Gagal live sync spreadsheet:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Toast auto dismiss
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Navigasi ke halaman
  const handleNavigate = (page: ActivePage) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler Edit Surat
  const handleEdit = (item: SuratItem) => {
    setEditingItem(item);
    setActivePage(item.jenis === 'masuk' ? 'input-masuk' : 'input-keluar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Mode edit diaktifkan untuk surat ${item.nomorSurat}`, 'info');
  };

  // Handler Buka Dokumen di Halaman Terbang
  const handleOpenFlyingPage = (doc: FloatingPageDoc) => {
    setFlyingPageDoc(doc);
  };

  // Handler Buka Spreadsheet Database di Halaman Terbang
  const handleOpenSpreadsheetFlyingPage = () => {
    setFlyingPageDoc({
      isOpen: true,
      title: 'Database Google Spreadsheet Persuratan',
      nomorSurat: 'DATABASE SPREADSHEET (Sheet1 & Sheet2)',
      link: CONFIG.SPREADSHEET_URL,
      jenis: 'spreadsheet',
      perihal: 'Seluruh data surat masuk, keluar, dan arsip digital'
    });
  };

  // Handler Konfirmasi Hapus
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteSuratItem(deleteTarget.jenis, deleteTarget.id);
    setDeleteTarget(null);
    loadAllData();
    showToast(`Surat ${deleteTarget.nomor} berhasil dihapus dari sistem!`, 'success');
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Decorative Futuristic Blobs */}
      <span className="fixed -top-40 -left-32 w-96 h-96 rounded-full bg-emerald-300/30 blur-3xl pointer-events-none -z-10" />
      <span className="fixed -bottom-48 -right-32 w-[30rem] h-[30rem] rounded-full bg-blue-300/30 blur-3xl pointer-events-none -z-10" />
      <span className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-200/20 blur-3xl pointer-events-none -z-10" />

      {/* Sidebar Navigasi */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        counts={{
          masuk: suratMasuk.length,
          keluar: suratKeluar.length
        }}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* TopBar */}
        <TopBar
          activePage={activePage}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onRefresh={loadAllData}
          isRefreshing={isRefreshing}
          onOpenSpreadsheetInFlyingPage={handleOpenSpreadsheetFlyingPage}
          connectionStatus={connectionStatus}
        />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary>
            {activePage === 'dashboard' && (
              <DashboardView
                suratMasuk={suratMasuk}
                suratKeluar={suratKeluar}
                onNavigate={handleNavigate}
                onOpenFlyingPage={handleOpenFlyingPage}
              />
            )}

            {activePage === 'surat-masuk' && (
              <SuratListView
                jenis="masuk"
                items={suratMasuk}
                onNavigate={handleNavigate}
                onOpenFlyingPage={handleOpenFlyingPage}
                onEdit={handleEdit}
                onDelete={(id, nomor) => setDeleteTarget({ id, nomor, jenis: 'masuk' })}
                onRefresh={loadAllData}
              />
            )}

            {activePage === 'input-masuk' && (
              <SuratFormView
                jenis="masuk"
                editingItem={editingItem && editingItem.jenis === 'masuk' ? editingItem : null}
                onCancelEdit={() => setEditingItem(null)}
                onNavigate={handleNavigate}
                onSuccess={(msg) => {
                  showToast(msg, 'success');
                  loadAllData();
                }}
              />
            )}

            {activePage === 'surat-keluar' && (
              <SuratListView
                jenis="keluar"
                items={suratKeluar}
                onNavigate={handleNavigate}
                onOpenFlyingPage={handleOpenFlyingPage}
                onEdit={handleEdit}
                onDelete={(id, nomor) => setDeleteTarget({ id, nomor, jenis: 'keluar' })}
                onRefresh={loadAllData}
              />
            )}

            {activePage === 'input-keluar' && (
              <SuratFormView
                jenis="keluar"
                editingItem={editingItem && editingItem.jenis === 'keluar' ? editingItem : null}
                onCancelEdit={() => setEditingItem(null)}
                onNavigate={handleNavigate}
                onSuccess={(msg) => {
                  showToast(msg, 'success');
                  loadAllData();
                }}
              />
            )}

            {activePage === 'arsip' && (
              <ArsipDigitalView
                suratMasuk={suratMasuk}
                suratKeluar={suratKeluar}
                onOpenFlyingPage={handleOpenFlyingPage}
                onEdit={handleEdit}
                onDelete={(id, nomor, jenis) => setDeleteTarget({ id, nomor, jenis })}
                onShowToast={(msg) => showToast(msg, 'success')}
              />
            )}

            {activePage === 'pengaturan' && (
              <PengaturanView
                onOpenFlyingPage={handleOpenFlyingPage}
                onShowToast={(msg) => showToast(msg, 'success')}
              />
            )}
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-200/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl w-full mx-auto">
          <div>
            SISTEM INFORMASI TATA PERSURATAN DIGITAL &middot; {CONFIG.APP_VERSION}
          </div>
          <div>
            Data tersimpan aman di Google Spreadsheet &amp; Google Drive
          </div>
        </footer>
      </div>

      {/* MODAL HALAMAN TERBANG (Flying Page Modal Viewer) */}
      <HalamanTerbangModal
        doc={flyingPageDoc}
        onClose={() => setFlyingPageDoc(null)}
      />

      {/* Modal Dialog Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Data Surat?
                </h3>
                <p className="text-xs text-slate-500">
                  Tindakan ini akan menghapus data dari sistem persuratan.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <div className="font-semibold text-slate-500">Nomor Surat:</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{deleteTarget.nomor}</div>
              <div className="text-[11px] text-slate-400 mt-1">ID: {deleteTarget.id}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-colors"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs sm:text-sm font-medium shadow-2xl border border-slate-700 animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="max-w-sm">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
