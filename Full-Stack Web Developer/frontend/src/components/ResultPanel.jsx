import { useEffect, useState } from 'react';
import { rupiahShort, TONE_DOT, REK_STYLE, CAUSE_COLORS } from '../utils/format.js';

function Delta({ pct }) {
  if (pct == null || Number.isNaN(pct)) {
    return <div className="kpi-delta d-flat">—</div>;
  }
  const up = pct >= 0;
  return (
    <div className={`kpi-delta ${up ? 'd-up' : 'd-down'}`}>
      {up ? '▲' : '▼'} {up ? '+' : ''}
      {pct}%
    </div>
  );
}

export default function ResultPanel({ result, onReset }) {
  const a = result.analysis;
  const k = a.kpis;
  const chart = a.chart || [];
  const maxVal = Math.max(1, ...chart.map((b) => b.val));

  // Bar kontribusi produk dianimasikan dari 0% → target setelah render pertama.
  const [barsReady, setBarsReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="step-panel active">
      <h2 className="step-title">Hasil Analisis</h2>
      <p className="step-sub" style={{ marginBottom: 24 }}>
        Analisis selesai · File asli telah dihapus dari memori ·{' '}
        <strong style={{ color: 'var(--forest)' }}>{result.filename || 'data'}</strong> ·{' '}
        {result.meta?.dateRange?.from} s/d {result.meta?.dateRange?.to}
      </p>

      <div className="kpi-row">
        <div className="kpi-box">
          <div className="kpi-lbl">Total 7 Hari Terakhir</div>
          <div className="kpi-val">{rupiahShort(k.total7)}</div>
          <Delta pct={k.weeklyGrowthPct} />
        </div>
        <div className="kpi-box">
          <div className="kpi-lbl">Forecast 7 Hari ke Depan</div>
          <div className="kpi-val">{rupiahShort(k.forecastNext7)}</div>
          <Delta pct={k.forecastGrowthPct} />
        </div>
        <div className="kpi-box">
          <div className="kpi-lbl">Rata-rata Harian (Forecast)</div>
          <div className="kpi-val">{rupiahShort(k.avgDaily)}</div>
          <div className="kpi-delta d-flat">per hari</div>
        </div>
        <div className="kpi-box">
          <div className="kpi-lbl">MAE Model</div>
          <div className="kpi-val">{rupiahShort(k.mae_rupiah)}</div>
          <div className="kpi-delta d-flat">v{k.model_version || '—'}</div>
        </div>
      </div>

      <div className="hasil-grid">
        {/* FORECAST CHART */}
        <div className="hasil-card full">
          <div className="hasil-card-chip">Fitur 1 — Forecast Penjualan</div>
          <div className="hasil-card-title">Proyeksi 7 Hari ke Depan</div>
          <div className="forecast-bars">
            {chart.map((b, i) => (
              <div className="fc-bar-wrap" key={i}>
                <div className="fc-bar-track">
                  <div
                    className="fc-bar"
                    style={{
                      height: `${Math.max((b.val / maxVal) * 100, 2)}%`,
                      background: b.fc ? 'var(--lime)' : 'var(--sage)',
                      animationDelay: `${i * 0.04}s`,
                    }}
                    title={`${b.tanggal}: ${rupiahShort(b.val)}`}
                  />
                </div>
                <span className="fc-label">{b.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mist)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--sage)' }} />
              Aktual historis (7 hari)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mist)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--lime)' }} />
              Forecast prediksi (7 hari)
            </div>
          </div>
        </div>

        {/* INSIGHT TREN */}
        <div className="hasil-card">
          <div className="hasil-card-chip">Fitur 2 — Insight Tren</div>
          <div className="hasil-card-title">Pola & Anomali Terdeteksi</div>
          <div className="insight-list">
            {a.insights.length ? (
              a.insights.map((ins, i) => (
                <div className="insight-row" key={i}>
                  <div className="i-dot" style={{ background: TONE_DOT[ins.tone] || 'var(--blue)' }} />
                  <div>
                    <h5>{ins.title}</h5>
                    <p>{ins.body}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="step-sub">Belum ada pola signifikan yang terdeteksi pada periode ini.</p>
            )}
          </div>
        </div>

        {/* ANALISIS PENYEBAB */}
        <div className="hasil-card">
          <div className="hasil-card-chip">Fitur 3 — Analisis Penyebab</div>
          <div className="hasil-card-title">Kontribusi Produk terhadap Penjualan</div>
          {a.causes.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {a.causes.map((p, i) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} key={i}>
                  <div style={{ fontSize: 12, color: 'var(--mist)', minWidth: 90 }}>{p.name}</div>
                  <div style={{ flex: 1, height: 8, background: 'var(--sand)', borderRadius: 100, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: barsReady ? `${p.pct}%` : '0%',
                        height: '100%',
                        background: CAUSE_COLORS[i % CAUSE_COLORS.length],
                        borderRadius: 100,
                        transition: 'width 1s cubic-bezier(.22,1,.36,1)',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', minWidth: 36, textAlign: 'right' }}>
                    {p.pct}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="step-sub">
              Tambahkan kolom Produk saat upload untuk melihat analisis kontribusi produk.
            </p>
          )}
        </div>

        {/* REKOMENDASI */}
        <div className="hasil-card full">
          <div className="hasil-card-chip">Fitur 4 — Rekomendasi Tindakan</div>
          <div className="hasil-card-title" style={{ marginBottom: 14 }}>
            Prioritas Tindakan Berbasis Data
          </div>
          <div className="rek-list">
            {a.recommendations.map((r, i) => {
              const st = REK_STYLE[r.color] || REK_STYLE.blue;
              return (
                <div className="rek-card" style={{ borderLeftColor: st.border }} key={i}>
                  <span className="rek-pri" style={{ background: st.bg, color: st.color }}>
                    {st.emoji} {r.priority}
                  </span>
                  <h5>{r.title}</h5>
                  <p>{r.body}</p>
                  <div className="rek-impact">📈 {r.impact}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODEL INFO */}
        <div className="hasil-card full">
          <div className="api-placeholder">
            <div className="api-placeholder-icon">🤖</div>
            <h4>Ditenagai Model AI Foreca</h4>
            <p>
              Forecast di atas dihasilkan oleh model <strong>CNN-LSTM</strong> (v
              {k.model_version || '—'}) melalui ML service, lalu insight & rekomendasi dihitung dari
              data historismu.{' '}
              {result.persisted?.stored
                ? 'Ringkasan analisis disimpan ke cloud.'
                : 'Data mentah tidak disimpan di server.'}
            </p>
            <div className="api-badge" style={{ background: 'var(--forest)', color: '#fff' }}>
              TERINTEGRASI · {result.meta?.nDaysContinuous} HARI DATA
            </div>
          </div>
        </div>
      </div>

      <div className="hasil-actions">
        <button className="btn-reset" onClick={onReset}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 105.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 015.51 15" />
          </svg>
          Analisis Data Baru
        </button>
        <div className="privacy-footer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          File asli sudah dihapus dari memori
        </div>
      </div>
    </div>
  );
}
