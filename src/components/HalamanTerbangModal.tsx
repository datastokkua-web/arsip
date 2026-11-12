import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Share2, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { FloatingPageDoc } from '../types';
import { convertToEmbedUrl, getGoogleDriveDownloadUrl, SAMPLE_PDF_DATA_URI } from '../utils/storage';

interface HalamanTerbangModalProps {
  doc: FloatingPageDoc | null;
  onClose: () => void;
}

export const HalamanTerbangModal: React.FC<HalamanTerbangModalProps> = ({ doc, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setCopied(false);
  }, [doc]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!doc || !doc.isOpen) return null;

  // Pastikan jika dokumen yang dibuka adalah PDF (isPdf), spreadsheet TIDAK PERNAH dibuka!
  const isSpreadsheet = !doc.isPdf && (doc.link.includes('spreadsheets') || doc.jenis === 'spreadsheet');
  const safeDocLink = (doc.isPdf && doc.link.includes('spreadsheets')) ? '' : doc.link;
  const embedUrl = isSpreadsheet 
    ? convertToEmbedUrl(doc.link) 
    : convertToEmbedUrl(safeDocLink);

  const handleCopyLink = () => {
    if (navigator.clipboard && safeDocLink) {
      navigator.clipboard.writeText(safeDocLink).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleOpenExternal = () => {
    if (safeDocLink) {
      window.open(safeDocLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadPdf = () => {
    if (!doc) return;
    const cleanNomor = (doc.nomorSurat || 'surat').replace(/[/\\?%*:|"<> ]/g, '_');
    const fileName = doc.namaFile 
      ? (doc.namaFile.toLowerCase().endsWith('.pdf') ? doc.namaFile : `${doc.namaFile}.pdf`)
      : `${cleanNomor}.pdf`;

    const rawLink = safeDocLink || '';
    if (rawLink.startsWith('data:') || rawLink.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = rawLink;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 200);
      return;
    }

    if (rawLink.includes('drive.google.com')) {
      const downloadUrl = getGoogleDriveDownloadUrl(rawLink);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 200);
      return;
    }

    if (rawLink) {
      const a = document.createElement('a');
      a.href = rawLink;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 200);
      return;
    }

    const a = document.createElement('a');
    a.href = SAMPLE_PDF_DATA_URI;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 200);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md transition-all duration-300 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/80 flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full rounded-none sm:rounded-2xl' 
            : 'w-full max-w-5xl h-[88vh] max-h-[920px]'
        }`}
      >
        {/* Header Halaman Terbang */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 bg-gradient-to-r from-emerald-50 via-sky-50 to-amber-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0 ${
              isSpreadsheet 
                ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25' 
                : 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/25'
            }`}>
              {isSpreadsheet ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isSpreadsheet 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200/60'
                    : 'bg-rose-100 text-rose-800 border-rose-200/60'
                }`}>
                  {isSpreadsheet ? 'Google Spreadsheet' : 'File PDF Surat'}
                </span>
                {doc.jenis && doc.jenis !== 'spreadsheet' && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    doc.jenis === 'masuk' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {doc.jenis === 'masuk' ? 'Surat Masuk' : 'Surat Keluar'}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-0.5">
                {doc.nomorSurat || doc.title || 'Pratinjau File PDF'}
              </h3>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {doc.link && (
              <button
                type="button"
                onClick={handleCopyLink}
                title="Salin Link PDF"
                className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 hover:text-emerald-700 bg-white/80 hover:bg-white rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Salin Link'}</span>
              </button>
            )}

            {doc.link && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                title="Download File PDF dari Google Drive"
                className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-emerald-800 hover:text-white bg-emerald-100 hover:bg-emerald-600 rounded-xl border border-emerald-300 shadow-sm transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
            )}

            {doc.link && (
              <button
                type="button"
                onClick={handleOpenExternal}
                title="Buka File PDF di Tab Baru"
                className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 rounded-xl border border-blue-200/80 shadow-sm transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Buka Tab Baru</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Kecilkan' : 'Layar Penuh'}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white rounded-xl border border-slate-200 shadow-sm transition-all"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Tutup Halaman Terbang"
              className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 rounded-xl border border-rose-200 shadow-sm transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informasi Ringkas Surat */}
        {(doc.kontak || doc.perihal || doc.namaFile) && (
          <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200/70 text-xs text-slate-700 flex flex-wrap items-center gap-x-6 gap-y-1">
            {doc.namaFile && (
              <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                <FileText className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span>File PDF: {doc.namaFile}</span>
              </div>
            )}
            {doc.kontak && (
              <div>
                <span className="font-semibold text-slate-500 mr-1.5">
                  {doc.jenis === 'keluar' ? 'Tujuan:' : 'Pengirim:'}
                </span>
                <span className="font-medium text-slate-800">{doc.kontak}</span>
              </div>
            )}
            {doc.perihal && (
              <div className="truncate max-w-xl">
                <span className="font-semibold text-slate-500 mr-1.5">Perihal:</span>
                <span className="font-medium text-slate-800">{doc.perihal}</span>
              </div>
            )}
          </div>
        )}

        {/* Area Utama: Iframe Dokumen PDF */}
        <div className="flex-1 relative bg-slate-100 flex flex-col overflow-hidden">
          {isLoading && embedUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 backdrop-blur-sm">
              <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-slate-700 mt-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Membuka File PDF dari Google Drive...
              </p>
              <p className="text-xs text-slate-400 mt-1">Mengambil pratinjau berkas PDF langsung dari tautan spreadsheet</p>
            </div>
          )}

          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={doc.title || 'Pratinjau File PDF Surat'}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen"
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/70">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3.5 shadow-xs">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900">File PDF Belum Tersedia di Spreadsheet</h4>
              <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                Surat <b>{doc.nomorSurat}</b> belum memiliki tautan berkas pada kolom <b>"Link PDF Google Drive"</b> di spreadsheet.
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mt-1">
                Anda dapat menambahkan file PDF dengan mengklik tombol <b>Edit</b> pada tabel surat atau mengunggahnya langsung ke folder Google Drive.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <a
                  href={doc.jenis === 'keluar' ? 'https://drive.google.com/drive/folders/1_tqYSmLsF_v7yWfQqVWk7WJgE5IfTB3E' : 'https://drive.google.com/drive/folders/1hqVP3XPvjtME72rFWkT5PhZf2pJq3Uvf'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Folder Drive</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Halaman Terbang */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2 text-slate-600 truncate max-w-md">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="truncate">
              Link PDF Spreadsheet: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px]">{doc.link || '(Kosong di Spreadsheet)'}</code>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {doc.link && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh PDF
              </button>
            )}
            {doc.link && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka di Tab Baru
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
