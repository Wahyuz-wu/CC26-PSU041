import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Arahkan backend ke mock ML server SEBELUM modul config/app diimpor.
process.env.ML_API_BASE_URL = 'http://localhost:7899';
process.env.NODE_ENV = 'test';

const { createMockMlServer } = await import('./helpers/mockMlServer.js');
const { createApp } = await import('../src/app.js');
const request = (await import('supertest')).default;
const { makeSalesRows, rowsToCsv } = await import('./helpers/sampleData.js');

let mlServer;
let app;

before(async () => {
  mlServer = createMockMlServer();
  await new Promise((res) => mlServer.listen(7899, res));
  app = createApp();
});

after(async () => {
  await new Promise((res) => mlServer.close(res));
});

test('GET /api/health mengembalikan status ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.ml.reachable, true);
});

test('POST /api/inspect mengembalikan kolom & preview', async () => {
  const csv = rowsToCsv(makeSalesRows(40));
  const res = await request(app)
    .post('/api/inspect')
    .attach('file', Buffer.from(csv), 'sales.csv');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.columns.sort(), ['Produk', 'Tanggal', 'Total'].sort());
  assert.ok(res.body.rowCount > 0);
});

test('POST /api/analyze mengembalikan forecast + analitik', async () => {
  const csv = rowsToCsv(makeSalesRows(45));
  const res = await request(app)
    .post('/api/analyze')
    .field('mapping', JSON.stringify({ tanggal: 'Tanggal', jumlah: 'Total', produk: 'Produk' }))
    .attach('file', Buffer.from(csv), 'sales.csv');

  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'success');
  assert.equal(res.body.analysis.forecast.length, 7);
  assert.ok(res.body.analysis.kpis.forecastNext7 > 0);
  assert.ok(Array.isArray(res.body.analysis.insights));
  assert.ok(Array.isArray(res.body.analysis.recommendations));
  assert.ok(res.body.analysis.chart.length >= 7);
});

test('POST /api/analyze menolak data kurang dari 30 hari (422)', async () => {
  const csv = rowsToCsv(makeSalesRows(10));
  const res = await request(app)
    .post('/api/analyze')
    .field('mapping', JSON.stringify({ tanggal: 'Tanggal', jumlah: 'Total' }))
    .attach('file', Buffer.from(csv), 'sales.csv');
  assert.equal(res.status, 422);
  assert.equal(res.body.status, 'error');
});

test('POST /api/analyze menolak tanpa file (422)', async () => {
  const res = await request(app)
    .post('/api/analyze')
    .field('mapping', JSON.stringify({ tanggal: 'Tanggal', jumlah: 'Total' }));
  assert.equal(res.status, 422);
});

test('POST /api/inspect menolak format tidak didukung', async () => {
  const res = await request(app)
    .post('/api/inspect')
    .attach('file', Buffer.from('halo'), 'catatan.txt');
  assert.equal(res.status, 422);
});

test('GET /endpoint-ngawur mengembalikan 404', async () => {
  const res = await request(app).get('/tidak-ada');
  assert.equal(res.status, 404);
});
