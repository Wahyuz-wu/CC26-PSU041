// Panel proses — murni presentasional. Status tiap langkah dikendalikan
// oleh Dashboard lewat prop `steps` (id, label, sub, state, icon, pct).
export default function ProcessPanel({ steps }) {
  return (
    <div className="step-panel active">
      <div className="process-wrap">
        <div className="process-anim">
          <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="18" stroke="rgba(198,241,53,.25)" strokeWidth="3" />
            <path d="M22 4 A18 18 0 0 1 40 22" stroke="#c6f135" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="step-title" style={{ textAlign: 'center' }}>
          Sedang Memproses...
        </h2>
        <p className="step-sub" style={{ textAlign: 'center' }}>
          Foreca sedang menganalisis data penjualanmu lewat model AI.
          <br />
          Proses ini biasanya selesai dalam 15–30 detik.
        </p>

        <div className="process-steps-list">
          {steps.map((s) => (
            <div className={`process-step-row ${s.state}`} key={s.id}>
              <div className={`process-step-icon ${s.state}`}>{s.icon}</div>
              <div>
                <div className="process-step-lbl">{s.label}</div>
                <div className="process-step-sub">{s.sub}</div>
              </div>
              <div className="process-pct">{s.pct}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
