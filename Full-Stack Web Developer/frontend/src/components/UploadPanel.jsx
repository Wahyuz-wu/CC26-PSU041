import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FILE_ICONS = { csv: '📊', xlsx: '📗', xls: '📗', json: '📋' };

const COL_FIELDS = [
  { key: 'tanggal', label: 'Kolom Tanggal *', optional: false },
  { key: 'produk', label: 'Kolom Produk / Kategori', optional: true },
  { key: 'jumlah', label: 'Kolom Jumlah / Revenue *', optional: false },
];

export default function UploadPanel({
  file,
  columns,
  colMap,
  mapperVisible,
  mapperTitle,
  ready,
  onFile,
  onRemove,
  onColChange,
  onProses,
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const ext = file ? file.name.split('.').pop().toLowerCase() : '';

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div className="step-panel active">
      <h2 className="step-title">Upload Data Penjualan</h2>
      <p className="step-sub">
        Upload file data transaksi penjualanmu. Foreca mendukung CSV, Excel (.xlsx), dan JSON.
        <br />
        Data kamu <strong>tidak akan disimpan</strong> — hanya diproses untuk sesi ini.
      </p>

      <div
        className={`upload-zone${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
        onClick={(e) => {
          if (!e.target.closest('.upload-browse')) fileInputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <span className="upload-icon">📂</span>
        <div className="upload-title">Seret file ke sini, atau klik untuk pilih</div>
        <div className="upload-sub">
          Data penjualan: transaksi harian, mingguan, atau bulanan
          <br />
          File akan dihapus otomatis setelah analisis selesai
        </div>
        <button className="upload-browse" onClick={() => fileInputRef.current?.click()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Pilih File
        </button>
        <div className="upload-formats">
          <span className="upload-format">.CSV</span>
          <span className="upload-format">.XLSX</span>
          <span className="upload-format">.XLS</span>
          <span className="upload-format">.JSON</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="upload-file-input"
          accept=".csv,.xlsx,.xls,.json"
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
      </div>

      <div className={`file-preview${file ? ' show' : ''}`}>
        <div className="file-icon">{FILE_ICONS[ext] || '📄'}</div>
        <div className="file-info">
          <div className="file-name">{file ? file.name : '—'}</div>
          <div className="file-meta">
            {file ? `${(file.size / 1024).toFixed(1)} KB · ${ext.toUpperCase()}` : '—'}
          </div>
        </div>
        <button className="file-remove" title="Hapus file" onClick={onRemove}>
          ✕
        </button>
      </div>

      {mapperVisible && (
        <div className="col-mapper">
          <div className="col-mapper-title">{mapperTitle}</div>
          <div className="col-grid">
            {COL_FIELDS.map((f) => (
              <div className="col-field" key={f.key}>
                <label>{f.label}</label>
                <select value={colMap[f.key]} onChange={(e) => onColChange(f.key, e.target.value)}>
                  <option value="">— Pilih kolom{f.optional ? ' (opsional)' : ''} —</option>
                  {columns.map((c) => (
                    <option value={c} key={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="btn-outline" onClick={() => navigate('/')}>
          ← Kembali
        </button>
        <button className="btn-primary" disabled={!ready} onClick={onProses}>
          Proses Data
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
