import { useNavigate } from 'react-router-dom';

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

// Data batang mini-chart pada hero (kosmetik — contoh output).
const HERO_BARS = [
  { h: 52, fc: false },
  { h: 65, fc: false },
  { h: 58, fc: false },
  { h: 75, fc: false },
  { h: 82, fc: false },
  { h: 40, fc: false },
  { h: 35, fc: false },
  { h: 70, fc: true },
  { h: 78, fc: true },
  { h: 74, fc: true },
  { h: 88, fc: true },
  { h: 92, fc: true },
  { h: 50, fc: true },
  { h: 44, fc: true },
];

const FLOW_STEPS = [
  {
    n: 'n1',
    num: '1',
    title: 'Upload Data',
    body: 'Unggah file yang berisi data penjualanmu. Pastikan formatnya sesuai template yang disediakan untuk hasil terbaik.',
  },
  {
    n: 'n2',
    num: '2',
    title: 'Proses AI',
    body: 'Engine kami membersihkan data, mendeteksi pola, dan menjalankan model forecast dalam hitungan detik.',
  },
  {
    n: 'n3',
    num: '3',
    title: 'Lihat Hasil',
    body: 'Forecast 7 hari, insight tren, analisis penyebab, dan rekomendasi tindakan muncul di dashboard.',
  },
  {
    n: 'n4',
    num: '4',
    title: 'Selesai',
    body: 'Ambil insight, bagikan ke tim, dan eksekusi. Data aslimu otomatis terhapus dari sistem.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const goDashboard = () => navigate('/dashboard');

  return (
    <div className="page active">
      {/* ══ HERO ══ */}
      <section className="hero">
        <div className="hero-eyebrow">Strategi UMKM</div>

        <h1 className="hero-title">
          Ubah Data Penjualanmu
          <br />
          Jadi <em>Keputusan Cerdas</em>
        </h1>

        <p className="hero-sub">
          Foreca menganalisis data penjualanmu secara otomatis - menghasilkan forecast akurat,
          insight tren, dan rekomendasi tindakan nyata. Cukup upload, lalu tunggu hasilnya.
        </p>

        <button className="hero-btn" onClick={goDashboard}>
          Mulai Analisis Sekarang
          <ArrowIcon />
        </button>

        <div className="hero-visual">
          <div className="hero-chart-card">
            <div className="chart-header">
              <div className="chart-header-left">
                <h4>Forecast Penjualan — 7 Hari ke Depan</h4>
                <p>Contoh output analisis Foreca</p>
              </div>
              <div className="chart-header-right">
                <div className="big">Rp 3,21 jt</div>
                <div className="delta">▲ +12.7% projected</div>
              </div>
            </div>
            <div className="mini-chart">
              {HERO_BARS.map((b, i) => (
                <div
                  key={i}
                  className="mini-bar"
                  style={{
                    height: `${b.h}%`,
                    background: b.fc ? 'var(--lime)' : 'var(--sage)',
                    opacity: b.fc ? 0.85 : 1,
                    animationDelay: `${i * 0.04}s`,
                  }}
                />
              ))}
            </div>
            <div className="chart-footer">
              <span className="chart-tag tag-green">▲ Tren Mingguan +14.2%</span>
              <span className="chart-tag tag-amber">⚠ Weekend Gap -34%</span>
              <span className="chart-tag tag-blue">● Akurasi Model 91.3%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TENTANG FORECA ══ */}
      <section className="about-section">
        <div className="about-inner">
          <div>
            <div className="about-label">Tentang Foreca</div>
            <h2 className="about-title">Analitik penjualan Untuk Pelaku UMKM</h2>

            <p className="about-body">
              Foreca adalah solusi khusus untuk UMKM Indonesia yang ingin memaksimalkan data
              penjualan mereka. Dengan algoritma canggih, Foreca mengolah data mentah menjadi insight
              yang mudah dimengerti dan siap digunakan tanpa memerlukan keahlian teknis. Cukup upload
              data penjualan, dan Foreca akan mengurus sisanya.
            </p>
            <p className="about-body" style={{ marginBottom: 24 }}>
              Dengan Foreca, UMKM bisa memprediksi tren penjualan, mengenali produk populer, dan
              mendapatkan rekomendasi stok yang tepat. Semua fitur ini dirancang untuk membantu UMKM
              mengambil keputusan lebih tepat, meningkatkan efisiensi, dan mempercepat pertumbuhan di
              pasar yang kompetitif.
            </p>
            <div className="about-pills">
              <span className="about-pill">📊 Forecast 7 Hari</span>
              <span className="about-pill">🔍 Insight Tren</span>
              <span className="about-pill">🔬 Analisis Penyebab</span>
              <span className="about-pill">🎯 Rekomendasi Tindakan</span>
            </div>
            <div className="about-stats">
              <div className="about-stat">
                <div className="about-stat-num">7 Hari</div>
                <div className="about-stat-lbl">
                  Window forecast ke depan dengan confidence interval
                </div>
              </div>
              <div className="about-stat">
                <div className="about-stat-num">&lt; 30 dtk</div>
                <div className="about-stat-lbl">
                  Waktu proses dari upload hingga hasil analisis keluar
                </div>
              </div>
              <div className="about-stat">
                <div className="about-stat-num">0 DB</div>
                <div className="about-stat-lbl">
                  Data kamu tidak disimpan di server manapun setelah proses selesai
                </div>
              </div>
              <div className="about-stat">
                <div className="about-stat-num">3 Output</div>
                <div className="about-stat-lbl">
                  Forecast, insight tren, dan rekomendasi tindakan berbasis data
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ ALUR PENGGUNAAN ══ */}
      <section className="flow-section">
        <div className="flow-header">
          <div className="flow-label">Cara Kerja</div>
          <h2 className="flow-title">Empat Langkah, Satu Klik</h2>
          <p className="flow-sub">
            Dari data mentah ke insight yang actionable — prosesnya sesederhana ini.
          </p>
        </div>

        <div className="flow-steps">
          {FLOW_STEPS.map((s) => (
            <div className="flow-step" key={s.num}>
              <div className={`flow-step-num ${s.n}`}>{s.num}</div>
              <div className="flow-step-title">{s.title}</div>
              <div className="flow-step-body">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="privacy-note">
          <div className="privacy-note-icon">🔒</div>
          <div>
            <div className="privacy-note-title">Data kamu aman — dan tidak disimpan</div>
            <div className="privacy-note-body">
              Foreca memproses datamu hanya untuk sesi analisis ini. Begitu hasil keluar, file asli
              dihapus otomatis dari memori sistem.
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA BAWAH ══ */}
      <div className="landing-cta">
        <h2>Siap coba sekarang?</h2>
        <p>Upload data penjualanmu dan lihat hasilnya.</p>
        <button className="hero-btn" onClick={goDashboard}>
          Mulai Analisis Gratis
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}
