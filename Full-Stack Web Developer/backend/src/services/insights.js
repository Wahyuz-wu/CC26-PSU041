/**
 * Lapisan analitik berbasis aturan (rule-based) di atas forecast model.
 * Model hanya memberi angka prediksi 7 hari; modul ini menurunkan
 * KPI, insight tren, analisis penyebab, dan rekomendasi tindakan
 * dari data historis + hasil forecast. Semua dihitung dari data nyata,
 * bukan nilai mock.
 */

const DOW_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function pct(numerator, denominator) {
  if (!denominator) return 0;
  return round2((numerator / denominator) * 100);
}
function sum(arr) {
  return arr.reduce((s, v) => s + v, 0);
}
function dowOf(iso) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0=Min..6=Sab
}

export function buildAnalysis({ dailySeries, productTotals, forecast, modelInfo }) {
  const totals = dailySeries.map((d) => d.Total);
  const n = totals.length;

  const last7 = totals.slice(-7);
  const prev7 = totals.slice(-14, -7);
  const last7Sum = sum(last7);
  const prev7Sum = sum(prev7);

  const forecastVals = forecast.map((f) => f.prediksi_total);
  const forecastSum = sum(forecastVals);

  // ── KPI ──
  const kpis = {
    total7: round2(last7Sum),
    forecastNext7: round2(forecastSum),
    avgDaily: round2(forecastSum / (forecastVals.length || 1)),
    weeklyGrowthPct: prev7Sum > 0 ? pct(last7Sum - prev7Sum, prev7Sum) : null,
    forecastGrowthPct: last7Sum > 0 ? pct(forecastSum - last7Sum, last7Sum) : null,
    mae_rupiah: modelInfo?.mae_rupiah ?? null,
    model_version: modelInfo?.version ?? null,
  };

  // ── INSIGHT TREN ──
  const insights = [];

  if (prev7Sum > 0) {
    const g = kpis.weeklyGrowthPct;
    const up = g >= 0;
    const daysUp = last7.filter((v, i) => prev7[i] != null && v >= prev7[i]).length;
    insights.push({
      tone: up ? 'positive' : 'warning',
      title: up ? 'Tren Mingguan Positif' : 'Tren Mingguan Menurun',
      body: `Penjualan ${up ? 'naik' : 'turun'} ${Math.abs(g)}% dibanding 7 hari sebelumnya` +
        (daysUp ? `. ${daysUp} dari 7 hari mencatat pertumbuhan.` : '.'),
    });
  }

  // Weekend gap
  const weekdayVals = totals.filter((_, i) => {
    const dow = dowOf(dailySeries[i].Tanggal);
    return dow >= 1 && dow <= 5;
  });
  const weekendVals = totals.filter((_, i) => {
    const dow = dowOf(dailySeries[i].Tanggal);
    return dow === 0 || dow === 6;
  });
  const wdAvg = weekdayVals.length ? sum(weekdayVals) / weekdayVals.length : 0;
  const weAvg = weekendVals.length ? sum(weekendVals) / weekendVals.length : 0;
  let weekendGapPct = null;
  if (wdAvg > 0 && weekendVals.length) {
    weekendGapPct = pct(weAvg - wdAvg, wdAvg);
    if (weekendGapPct < -10) {
      insights.push({
        tone: 'warning',
        title: 'Weekend Gap Signifikan',
        body: `Akhir pekan ${Math.abs(weekendGapPct)}% lebih rendah dari rata-rata hari kerja.`,
      });
    } else if (weekendGapPct > 10) {
      insights.push({
        tone: 'positive',
        title: 'Akhir Pekan Kuat',
        body: `Akhir pekan ${weekendGapPct}% lebih tinggi dari hari kerja — momentum yang bisa dimaksimalkan.`,
      });
    }
  }

  // Hari terbaik (day-of-week dengan rata-rata tertinggi)
  const dowSum = Array(7).fill(0);
  const dowCount = Array(7).fill(0);
  dailySeries.forEach((d) => {
    const dow = dowOf(d.Tanggal);
    dowSum[dow] += d.Total;
    dowCount[dow] += 1;
  });
  const dowAvg = dowSum.map((s, i) => (dowCount[i] ? s / dowCount[i] : 0));
  const bestDow = dowAvg.indexOf(Math.max(...dowAvg));
  if (dowAvg[bestDow] > 0) {
    const share = pct(dowSum[bestDow], sum(totals));
    insights.push({
      tone: 'info',
      title: `Puncak Penjualan: Hari ${DOW_ID[bestDow]}`,
      body: `Hari ${DOW_ID[bestDow]} menyumbang sekitar ${share}% dari total penjualan secara konsisten.`,
    });
  }

  // Konsentrasi produk
  const grandTotal = sum(productTotals.map((p) => p.total)) || sum(totals);
  let topShare = null;
  if (productTotals.length > 0 && grandTotal > 0) {
    topShare = pct(productTotals[0].total, grandTotal);
    if (topShare >= 30) {
      insights.push({
        tone: 'purple',
        title: `Produk "${productTotals[0].name}" Mendominasi`,
        body: `${topShare}% revenue berasal dari satu produk — potensi risiko ketergantungan single item.`,
      });
    }
  }

  // ── ANALISIS PENYEBAB (kontribusi produk) ──
  const causes = [];
  if (productTotals.length > 0 && grandTotal > 0) {
    const top = productTotals.slice(0, 3);
    top.forEach((p) => causes.push({ name: p.name, pct: pct(p.total, grandTotal) }));
    const othersTotal = grandTotal - sum(top.map((p) => p.total));
    if (othersTotal > 0) causes.push({ name: 'Lainnya', pct: pct(othersTotal, grandTotal) });
  }

  // ── REKOMENDASI TINDAKAN (dipicu kondisi nyata) ──
  const recommendations = [];
  if (weekendGapPct != null && weekendGapPct < -10) {
    recommendations.push({
      priority: 'SEGERA — Minggu Ini',
      color: 'green',
      title: 'Aktifkan Campaign Akhir Pekan',
      body: `Akhir pekan ${Math.abs(weekendGapPct)}% di bawah hari kerja. Buat promo spesifik Sabtu–Minggu untuk menutup gap.`,
      impact: `Estimasi dampak: +${Math.min(Math.round(Math.abs(weekendGapPct) / 2), 25)}% revenue akhir pekan`,
    });
  }
  if (dowAvg[bestDow] > 0) {
    recommendations.push({
      priority: 'MINGGU DEPAN',
      color: 'amber',
      title: `Optimalkan Hari Puncak (${DOW_ID[bestDow]})`,
      body: `Hari ${DOW_ID[bestDow]} konsisten jadi penyumbang terbesar. Pastikan stok, SDM, dan kapasitas siap; pertimbangkan upsell.`,
      impact: 'Estimasi dampak: +10–15% revenue pada hari puncak',
    });
  }
  if (topShare != null && topShare >= 30) {
    recommendations.push({
      priority: 'BULAN INI',
      color: 'blue',
      title: 'Diversifikasi Portofolio Produk',
      body: `Ketergantungan ${topShare}% pada satu produk berisiko. Identifikasi produk potensial & buat bundling.`,
      impact: 'Target: turunkan ketergantungan ke <25%',
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'MINGGU INI',
      color: 'green',
      title: 'Pertahankan Momentum',
      body: 'Pola penjualan relatif stabil. Fokus pada konsistensi layanan dan pantau forecast minggu depan.',
      impact: 'Jaga pertumbuhan tetap positif',
    });
  }

  // ── Data untuk chart: gabungan historis (untuk konteks) + forecast ──
  const historyTail = dailySeries.slice(-7).map((d) => ({
    label: DOW_ID[dowOf(d.Tanggal)],
    tanggal: d.Tanggal,
    val: d.Total,
    fc: false,
  }));
  const forecastBars = forecast.map((f) => ({
    label: `${DOW_ID[dowOf(f.tanggal)]}*`,
    tanggal: f.tanggal,
    val: f.prediksi_total,
    fc: true,
  }));

  return {
    kpis,
    insights,
    causes,
    recommendations,
    chart: [...historyTail, ...forecastBars],
    forecast,
  };
}
