import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Send, 
  FilePlus, 
  FileOutput, 
  Save, 
  RotateCcw, 
  X, 
  FileUp, 
  FileText, 
  CheckCircle2, 
  Info, 
  FolderTree, 
  ListChecks, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SuratItem, ActivePage } from '../types';
import { CONFIG, todayISO, saveSuratItem } from '../utils/storage';

interface SuratFormViewProps {
  jenis: 'masuk' | 'keluar';
  editingItem: SuratItem | null;
  onCancelEdit: () => void;
  onNavigate: (page: ActivePage) => void;
  onSuccess: (message: string) => void;
}

export const SuratFormView: React.FC<SuratFormViewProps> = ({
  jenis,
  editingItem,
  onCancelEdit,
  onNavigate,
  onSuccess
}) => {
  const isEditing = Boolean(editingItem);
  const labelJenis = jenis === 'masuk' ? 'Surat Masuk' : 'Surat Keluar';
  const labelKontak = jenis === 'masuk' ? 'Pengirim' : 'Tujuan / Pengirim';

  const [tanggalSurat, setTanggalSurat] = useState(todayISO());
  const [nomorSurat, setNomorSurat] = useState('');
  const [kontak, setKontak] = useState('');
  const [perihal, setPerihal] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; base64: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sinkronkan data jika dalam mode edit
  useEffect(() => {
    if (editingItem) {
      setTanggalSurat(editingItem.tanggalSort || todayISO());
      setNomorSurat(editingItem.nomorSurat || '');
      setKontak(editingItem.kontak || '');
      setPerihal(editingItem.perihal || '');
      if (editingItem.namaFile) {
        setSelectedFile({
          name: editingItem.namaFile,
          base64: '',
          size: 'Tersimpan di sistem'
        });
      }
    } else {
      setTanggalSurat(todayISO());
      setNomorSurat('');
      setKontak('');
      setPerihal('');
      setSelectedFile(null);
    }
    setErrorMessage('');
  }, [editingItem, jenis]);

  const handleFileChange = (file: File) => {
    setErrorMessage('');
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('File harus berformat PDF (.pdf). File lain ditolak.');
      return;
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
      setErrorMessage(`Ukuran file ${(file.size / (1024 * 1024)).toFixed(2)} MB melebihi batas 5 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setSelectedFile({
        name: file.name,
        base64,
        size: `${(file.size / 1024).toFixed(1)} KB`
      });
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setTanggalSurat(todayISO());
    setNomorSurat('');
    setKontak('');
    setPerihal('');
    setSelectedFile(null);
    setErrorMessage('');
    if (isEditing) {
      onCancelEdit();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validasi field wajib
    if (!tanggalSurat) {
      setErrorMessage('Tanggal surat wajib diisi.');
      return;
    }
    if (!nomorSurat.trim()) {
      setErrorMessage('Nomor surat wajib diisi.');
      return;
    }
    if (!kontak.trim()) {
      setErrorMessage(`Field ${labelKontak} wajib diisi.`);
      return;
    }
    if (!perihal.trim()) {
      setErrorMessage('Perihal surat wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simpan data (menggunakan sistem persisten yang anti-error koneksi)
      const res = await saveSuratItem(
        jenis,
        {
          tanggalSurat,
          nomorSurat,
          kontak,
          perihal
        },
        selectedFile && selectedFile.base64 ? { name: selectedFile.name, base64: selectedFile.base64 } : null,
        editingItem ? editingItem.id : null
      );

      setIsSubmitting(false);
      handleReset();
      onSuccess(res.message);
      // Alihkan langsung ke daftar surat agar data baru langsung terlihat
      onNavigate(jenis === 'masuk' ? 'surat-masuk' : 'surat-keluar');
    } catch (err: any) {
      setIsSubmitting(false);
      // Tangani error dengan elegan tanpa notifikasi deploy yang membingungkan
      setErrorMessage(err?.message || 'Terjadi kesalahan saat memproses data. Silakan coba kembali.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Mode Edit jika aktif */}
      {isEditing && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-amber-900">
              <span className="font-bold">Mode Edit:</span> Mengubah data surat dengan ID{' '}
              <code className="px-2 py-0.5 rounded-md bg-amber-100 font-mono font-bold text-amber-800">
                {editingItem?.id}
              </code>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
          >
            Batal Edit
          </button>
        </div>
      )}

      {/* Grid Form & Info Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Form Input (2 Kolom) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200/80">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
              jenis === 'masuk' 
                ? 'bg-gradient-to-br from-emerald-600 to-green-600 shadow-emerald-500/25' 
                : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25'
            }`}>
              {jenis === 'masuk' ? <FilePlus className="w-5 h-5" /> : <FileOutput className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Form Input {labelJenis}
              </h2>
              <p className="text-xs text-slate-500">
                Isi data surat di bawah ini &mdash; data otomatis disimpan aman
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tanggal Surat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tanggal Surat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggalSurat}
                  onChange={(e) => setTanggalSurat(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>

              {/* Nomor Surat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor Surat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  placeholder={jenis === 'masuk' ? 'cth: 001/SM/PSD/2026' : 'cth: 045/SK/KUA-PSD/2026'}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>

              {/* Pengirim / Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {jenis === 'masuk' ? 'Pengirim Surat' : 'Tujuan Surat'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={kontak}
                  onChange={(e) => setKontak(e.target.value)}
                  placeholder={jenis === 'masuk' ? 'cth: Dinas Pendidikan Provinsi' : 'cth: Kantor Kementerian Agama Kabupaten'}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
                {jenis === 'keluar' && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nilai field ini disimpan sebagai penerima/tujuan surat keluar
                  </p>
                )}
              </div>

              {/* Perihal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Perihal Surat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                  placeholder="cth: Undangan Rapat Koordinasi Tata Persuratan"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Dropzone File PDF Surat (Opsional) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  File Dokumen PDF
                </label>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Opsional
                </span>
              </div>

              {!selectedFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('pdf-file-input')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/60'
                      : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60 hover:bg-emerald-50/20'
                  }`}
                >
                  <input
                    id="pdf-file-input"
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  <FileUp className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">
                    Klik untuk memilih file PDF <span className="text-emerald-700 font-bold">atau seret file ke sini</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Format .pdf &middot; Maksimal 5 MB &middot; Boleh dilewati dan ditambahkan kemudian
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100/80 border border-slate-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-6 h-6 text-rose-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {selectedFile.size}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                    title="Hapus file terpilih"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Tombol Form Aksi */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200/80 flex-wrap">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md flex items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                  jenis === 'masuk'
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/30'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : isEditing ? 'Perbarui Data' : 'Simpan Data'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate(jenis === 'masuk' ? 'surat-masuk' : 'surat-keluar')}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>

        {/* Kolom Info Penyimpanan & Panduan Cepat (1 Kolom) */}
        <div className="space-y-6">
          {/* Info Tujuan Penyimpanan */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-emerald-600" />
              Tujuan Database &amp; Storage
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100/70">
                <span className="text-slate-500 font-medium">Spreadsheet Sheet</span>
                <code className="font-bold text-emerald-800">
                  {jenis === 'masuk' ? 'Sheet1' : 'Sheet2'}
                </code>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100/70">
                <span className="text-slate-500 font-medium">Folder Drive</span>
                <code className="font-bold text-blue-800 truncate max-w-[140px]">
                  {jenis === 'masuk' ? 'Surat Masuk (PDF)' : 'Surat Keluar (PDF)'}
                </code>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100/70">
                <span className="text-slate-500 font-medium">Metode Simpan</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  Anti-Gagal (Auto Sync)
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              Saat disimpan, data langsung tercatat di database sistem dan disinkronkan ke Google Spreadsheet.
            </p>
          </div>

          {/* Panduan Cepat */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-600" />
              Panduan Cepat
            </h3>

            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
              <li>
                Isi <b>Tanggal Surat</b>, <b>Nomor Surat</b>, <b>{labelKontak}</b>, dan <b>Perihal</b>.
              </li>
              <li>
                Pilih file PDF <i>(opsional)</i> &mdash; surat tetap dapat disimpan meskipun tanpa melampirkan file PDF saat ini.
              </li>
              <li>
                Klik <b>Simpan Data</b> &mdash; data otomatis masuk ke arsip digital.
              </li>
              <li>
                Gunakan tombol <b>Batal</b> untuk kembali ke daftar surat.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
