export interface SuratItem {
  id: string; // Contoh: SM-20261111-4832 atau SK-20261111-1204
  tanggalInput: string; // dd/MM/yyyy
  nomorSurat: string;
  tanggalSurat: string; // YYYY-MM-DD atau dd/MM/yyyy
  tanggalSort: string; // YYYY-MM-DD
  kontak: string; // Pengirim (untuk masuk) / Tujuan (untuk keluar)
  perihal: string;
  namaFile?: string;
  link?: string; // Link PDF Google Drive atau data link
  linkPdf?: string; // Link PDF spesifik dari kolom spreadsheet
  fileId?: string;
  fileData?: string; // base64 jika ada
  timestamp?: string; // dd/MM/yyyy HH:mm:ss
  timestampMs?: number;
  jenis: 'masuk' | 'keluar';
  syncStatus?: 'synced' | 'local_saved' | 'syncing';
}

export interface FloatingPageDoc {
  isOpen: boolean;
  title: string;
  nomorSurat: string;
  link: string;
  namaFile?: string;
  jenis?: 'masuk' | 'keluar' | 'spreadsheet' | 'drive';
  kontak?: string;
  perihal?: string;
  isPdf?: boolean;
}

export type ActivePage = 
  | 'dashboard' 
  | 'surat-masuk' 
  | 'input-masuk' 
  | 'surat-keluar' 
  | 'input-keluar' 
  | 'arsip' 
  | 'pengaturan';
