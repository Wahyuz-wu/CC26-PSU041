/**
 * Generator data penjualan sintetis untuk testing.
 */
export function makeSalesRows(days = 40) {
  const rows = [];
  const products = ['Kopi', 'Teh', 'Roti'];
  const start = new Date('2024-01-01T00:00:00Z');
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    const weekendFactor = dow === 0 || dow === 6 ? 0.6 : 1.0;
    // 1–3 transaksi per hari
    const txCount = 1 + (i % 3);
    for (let t = 0; t < txCount; t++) {
      rows.push({
        Tanggal: iso,
        Produk: products[(i + t) % products.length],
        Total: Math.round((100000 + i * 1500 + t * 25000) * weekendFactor),
      });
    }
  }
  return rows;
}

export function rowsToCsv(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => r[h]).join(','));
  return lines.join('\n');
}
