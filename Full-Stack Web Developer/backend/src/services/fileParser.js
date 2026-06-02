import * as XLSX from 'xlsx';
import { ValidationError } from '../utils/logger.js';

const SUPPORTED = ['csv', 'xlsx', 'xls', 'json'];

export function extensionOf(filename = '') {
  const parts = String(filename).toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

/**
 * Parse buffer file menjadi array of objects (baris transaksi).
 * Mendukung CSV, XLSX/XLS, dan JSON. Mengembalikan { columns, rows }.
 */
export function parseFile(buffer, filename) {
  const ext = extensionOf(filename);
  if (!SUPPORTED.includes(ext)) {
    throw new ValidationError(
      `Format file ".${ext}" tidak didukung. Gunakan CSV, XLSX, XLS, atau JSON.`
    );
  }

  let rows;
  if (ext === 'json') {
    rows = parseJson(buffer);
  } else {
    // SheetJS membaca CSV maupun Excel dengan API yang sama.
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) throw new ValidationError('File tidak memiliki sheet/data.');
    rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: null, raw: true });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError('File kosong atau tidak berisi baris data.');
  }

  // Kumpulan nama kolom dari union semua baris (lebih aman daripada hanya baris pertama).
  const columnSet = new Set();
  for (const r of rows.slice(0, 50)) {
    if (r && typeof r === 'object') Object.keys(r).forEach((k) => columnSet.add(k));
  }
  const columns = [...columnSet];
  if (columns.length === 0) {
    throw new ValidationError('Tidak ada kolom yang terdeteksi pada file.');
  }

  return { columns, rows };
}

function parseJson(buffer) {
  let data;
  try {
    data = JSON.parse(buffer.toString('utf-8'));
  } catch {
    throw new ValidationError('File JSON tidak valid / gagal di-parse.');
  }
  // Dukung dua bentuk: array langsung, atau { data: [...] }.
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  throw new ValidationError('Struktur JSON harus berupa array objek atau { "data": [...] }.');
}

/**
 * Parser angka tahan-banting untuk data Indonesia.
 * Menangani: "Rp 1.500.000", "1.500.000,50", "1,500,000.50", "15000", 15000.
 */
export function parseNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  if (typeof value === 'number') return value;

  let s = String(value).trim();
  // Buang simbol mata uang, spasi, dan karakter non-numerik di tepi.
  s = s.replace(/[^0-9.,-]/g, '');
  if (s === '' || s === '-' || s === '.' || s === ',') return NaN;

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    // Pemisah desimal = simbol yang muncul paling akhir.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Format ID: titik = ribuan, koma = desimal -> "1.500.000,50"
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Format EN: koma = ribuan, titik = desimal -> "1,500,000.50"
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Hanya koma. Jika tampak seperti desimal ("1500,5") jadikan titik,
    // jika seperti ribuan ("1,500") buang.
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length !== 3) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Hanya titik. Beberapa titik = ribuan ("1.500.000").
    // Satu titik dengan 3 digit di belakang juga dianggap ribuan ("1.500").
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
    // selain itu dianggap desimal ("12.5", "100.00") -> biarkan.
  }
  // Angka murni -> parseFloat menangani langsung.

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Parser tanggal sederhana yang mengembalikan string ISO "YYYY-MM-DD".
 * Mendukung "YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY" (best effort),
 * serial date Excel, dan Date object.
 */
export function parseDateISO(value) {
  if (value === null || value === undefined || value === '') return null;

  // Serial date Excel (angka). Epoch Excel: 1899-12-30.
  if (typeof value === 'number' && value > 59 && value < 60000) {
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  const s = String(value).trim();

  // Sudah ISO-like: YYYY-MM-DD atau YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }

  // DD/MM/YYYY atau DD-MM-YYYY (umum di ID). Ambil asumsi day-first.
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }

  // Fallback ke Date parser bawaan.
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function pad(v) {
  return String(v).padStart(2, '0');
}
