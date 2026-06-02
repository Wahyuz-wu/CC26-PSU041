// Indikator langkah: Upload → Proses → Hasil.
const STEPS = [
  { id: 'upload', label: 'Upload Data' },
  { id: 'proses', label: 'Proses' },
  { id: 'hasil', label: 'Hasil Analisis' },
];

export default function Stepper({ active }) {
  const idx = STEPS.findIndex((s) => s.id === active);

  return (
    <div className="stepper" id="stepper">
      {STEPS.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : 'pending';
        const icon = state === 'done' ? '✓' : i + 1;
        return (
          <div className="stepper-item-group" key={s.id} style={{ display: 'contents' }}>
            <div className="stepper-item">
              <div className={`stepper-bubble ${state}`}>{icon}</div>
              <span className={`stepper-label ${state}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`stepper-line ${i < idx ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
