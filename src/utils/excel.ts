import * as XLSX from 'xlsx';
import { SuratItem } from '../types';
import { formatDateTimeID } from './storage';

export function eksporArsipToExcel(
  items: SuratItem[],
  jenis: 'masuk' | 'keluar',
  filterInfo?: { search?: string; dari?: string; sampai?: string }
): { success: boolean; count: number; filename: string } {
  if (!items || items.length === 0) {
    throw new Error('Tidak ada data surat untuk diekspor. Hasil filter kosong.');
  }

  const labelJenis = jenis === 'masuk' ? 'Surat Masuk' : 'Surat Keluar';
  const labelKontak = jenis === 'masuk' ? 'Pengirim' : 'Tujuan';

  // Format baris data untuk Excel
  const excelRows = items.map((item, index) => ({
    'No': index + 1,
    'ID Dokumen': item.id || '-',
    'Nomor Surat': item.nomorSurat || '-',
    'Tanggal Surat': item.tanggalSurat || '-',
    [labelKontak]: item.kontak || '-',
    'Perihal': item.perihal || '-',
    'Tanggal Input': item.tanggalInput || '-',
    'Nama File PDF': item.namaFile || '-',
    'Link Dokumen / Drive': item.link || '-',
    'Waktu Simpan': item.timestamp || '-'
  }));

  // Buat worksheet dari JSON
  const worksheet = XLSX.utils.json_to_sheet(excelRows);

  // Atur lebar kolom yang pas dan rapi
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 22 }, // ID Dokumen
    { wch: 28 }, // Nomor Surat
    { wch: 15 }, // Tanggal Surat
    { wch: 32 }, // Pengirim/Tujuan
    { wch: 45 }, // Perihal
    { wch: 15 }, // Tanggal Input
    { wch: 30 }, // Nama File PDF
    { wch: 50 }, // Link Dokumen / Drive
    { wch: 22 }  // Waktu Simpan
  ];

  // Buat workbook baru
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Arsip ${labelJenis}`);

  // Buat nama file dengan timestamp
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fileTimestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filename = `Arsip-${labelJenis.replace(/\s+/g, '-')}-${fileTimestamp}.xlsx`;

  // Tulis workbook ke format XLSX binary array
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Buat Blob dan unduh file di browser
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  
  // Bersihkan DOM dan revoke URL
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);

  return {
    success: true,
    count: items.length,
    filename
  };
}
