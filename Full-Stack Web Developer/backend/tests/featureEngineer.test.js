import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber, parseDateISO } from '../src/services/fileParser.js';
import { buildFeatures, FEATURE_COLUMNS } from '../src/services/featureEngineer.js';
import { makeSalesRows } from './helpers/sampleData.js';

test('parseNumber menangani format Indonesia & Inggris', () => {
  assert.equal(parseNumber('Rp 1.500.000'), 1500000);
  assert.equal(parseNumber('1.500.000,50'), 1500000.5);
  assert.equal(parseNumber('1,500,000.50'), 1500000.5);
  assert.equal(parseNumber('15000'), 15000);
  assert.equal(parseNumber(15000), 15000);
  assert.equal(parseNumber('1500,5'), 1500.5);
  assert.ok(Number.isNaN(parseNumber('')));
  assert.ok(Number.isNaN(parseNumber(null)));
});

test('parseDateISO menangani beberapa format', () => {
  assert.equal(parseDateISO('2024-01-05'), '2024-01-05');
  assert.equal(parseDateISO('2024/01/05'), '2024-01-05');
  assert.equal(parseDateISO('05/01/2024'), '2024-01-05'); // day-first
  assert.equal(parseDateISO(''), null);
});

test('buildFeatures menghasilkan 12 fitur model dengan urutan benar', () => {
  const rows = makeSalesRows(40);
  const { records, meta } = buildFeatures(rows, {
    tanggal: 'Tanggal',
    jumlah: 'Total',
    produk: 'Produk',
  });
  assert.ok(records.length >= 30);
  const r = records[records.length - 1];
  for (const col of FEATURE_COLUMNS) {
    assert.ok(col in r, `fitur ${col} harus ada`);
  }
  assert.equal(r.y, r.Total);
  assert.equal(typeof r.Hari_Ke, 'number');
  assert.equal(meta.hasProduct, true);
});

test('buildFeatures menolak data < lookback hari', () => {
  const rows = makeSalesRows(10);
  assert.throws(
    () => buildFeatures(rows, { tanggal: 'Tanggal', jumlah: 'Total' }),
    /minimal 30 hari/i
  );
});

test('buildFeatures menolak mapping tanpa kolom wajib', () => {
  const rows = makeSalesRows(40);
  assert.throws(() => buildFeatures(rows, { tanggal: 'Tanggal' }), /wajib/i);
});

test('buildFeatures mengisi hari kosong (kontinuitas deret)', () => {
  // Buat data dengan gap: hari 1 dan hari 35 (jarak > 30) -> harus kontinu terisi
  const rows = [
    { Tanggal: '2024-01-01', Total: 100000 },
    { Tanggal: '2024-02-10', Total: 200000 },
  ];
  const { records } = buildFeatures(rows, { tanggal: 'Tanggal', jumlah: 'Total' });
  // 2024-01-01 s/d 2024-02-10 = 41 hari
  assert.equal(records.length, 41);
  // Hari di tengah harus is_zero_day = 1
  const middle = records[10];
  assert.equal(middle.is_zero_day, 1);
});
