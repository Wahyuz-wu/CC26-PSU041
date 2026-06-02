import { useRef, useState } from 'react';

import Stepper from '../components/Stepper.jsx';
import UploadPanel from '../components/UploadPanel.jsx';
import ProcessPanel from '../components/ProcessPanel.jsx';
import ResultPanel from '../components/ResultPanel.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { inspectFile, analyzeFile } from '../services/api.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ALLOWED_EXT = ['csv', 'xlsx', 'xls', 'json'];

// Tebakan otomatis pemetaan kolom berdasarkan nama kolom.
const HINTS = {
  tanggal: ['tanggal', 'date', 'tgl', 'waktu', 'time'],
  produk: ['produk', 'product', 'item', 'barang', 'nama', 'kategori', 'category'],
  jumlah: ['total', 'jumlah', 'revenue', 'sales', 'amount', 'harga', 'qty', 'nilai'],
};
function autoMatch(cols) {
  const pick = (key) =>
    cols.find((c) => HINTS[key].some((h) => c.toLowerCase().includes(h))) || '';
  return { tanggal: pick('tanggal'), produk: pick('produk'), jumlah: pick('jumlah') };
}

const PROC_DEFS = [
  { id: 'p1', label: 'Membaca & membersihkan data', sub: 'Parsing file, agregasi harian' },
  { id: 'p2', label: 'Rekayasa fitur (feature engineering)', sub: 'Lag, rolling mean/std, indikator' },
  { id: 'p3', label: 'Menjalankan model forecast (CNN-LSTM)', sub: 'Prediksi 7 hari ke depan' },
  { id: 'p4', label: 'Menyusun insight & rekomendasi', sub: 'Identifikasi pola, penyebab, tindakan' },
  { id: 'p5', label: 'Menunggu respons server', sub: 'Mengambil hasil dari ML service' },
];
const initialProcSteps = () =>
  PROC_DEFS.map((s) => ({ ...s, state: 'pending', icon: ' ', pct: '' }));

const emptyMap = () => ({ tanggal: '', produk: '', jumlah: '' });

export default function Dashboard() {
  const toast = useToast();

  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [colMap, setColMap] = useState(emptyMap());
  const [mapperVisible, setMapperVisible] = useState(false);
  const [mapperTitle, setMapperTitle] = useState('Petakan Kolom Data');
  const [result, setResult] = useState(null);
  const [procSteps, setProcSteps] = useState(initialProcSteps);

  // Token untuk mengabaikan respons inspect yang sudah usang (file diganti/dihapus).
  const reqIdRef = useRef(0);

  const ready = Boolean(file && colMap.tanggal && colMap.jumlah);

  /* ── UPLOAD ── */
  async function handleFile(f) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      toast('Format file tidak didukung. Gunakan CSV, Excel, atau JSON.', 'error');
      return;
    }

    const reqId = ++reqIdRef.current;
    setFile(f);
    setColumns([]);
    setColMap(emptyMap());
    setMapperVisible(true);
    setMapperTitle('Membaca kolom file...');

    try {
      const info = await inspectFile(f);
      if (reqId !== reqIdRef.current) return; // file sudah diganti/dihapus saat menunggu
      const cols = info.columns || [];
      setColumns(cols);
      setColMap(autoMatch(cols));
      setMapperTitle(`Petakan Kolom Data (${info.rowCount} baris terdeteksi)`);
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      toast(err.message || 'Gagal membaca file di server.', 'error');
      handleRemove();
    }
  }

  function handleRemove() {
    reqIdRef.current++;
    setFile(null);
    setColumns([]);
    setColMap(emptyMap());
    setMapperVisible(false);
    setMapperTitle('Petakan Kolom Data');
  }

  function handleColChange(key, value) {
    setColMap((m) => ({ ...m, [key]: value }));
  }

  /* ── PROSES ── */
  const setProc = (id, patch) =>
    setProcSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  async function handleProses() {
    if (!file) return;
    if (!colMap.tanggal || !colMap.jumlah) {
      toast('Pilih kolom Tanggal dan Jumlah terlebih dahulu', 'error');
      return;
    }

    setProcSteps(initialProcSteps());
    setStep('proses');

    // Request asli ke backend, berjalan paralel dengan animasi langkah.
    const pending = analyzeFile(file, colMap)
      .then((r) => ({ ok: true, r }))
      .catch((e) => ({ ok: false, e }));

    const anim = [
      { id: 'p1', dur: 600 },
      { id: 'p2', dur: 700 },
      { id: 'p3', dur: 900 },
      { id: 'p4', dur: 700 },
    ];
    for (const s of anim) {
      setProc(s.id, { state: 'running', icon: '⟳' });
      await sleep(s.dur);
      setProc(s.id, { state: 'done', icon: '✓', pct: '100%' });
    }

    setProc('p5', { state: 'running', icon: '⟳' });
    const res = await pending;
    setProc('p5', { state: 'done', icon: '✓', pct: '✓' });

    if (!res.ok) {
      toast(res.e?.message || 'Analisis gagal. Coba lagi.', 'error');
      await sleep(500);
      setStep('upload');
      return;
    }

    setResult(res.r);
    setStep('hasil');
  }

  /* ── RESET ── */
  function handleReset() {
    reqIdRef.current++;
    setStep('upload');
    setFile(null);
    setColumns([]);
    setColMap(emptyMap());
    setMapperVisible(false);
    setMapperTitle('Petakan Kolom Data');
    setResult(null);
    setProcSteps(initialProcSteps());
    toast('Siap untuk analisis baru. File lama sudah dihapus. ✓');
  }

  return (
    <div className="page active">
      <div className="dash-wrap">
        <Stepper active={step} />

        {step === 'upload' && (
          <UploadPanel
            file={file}
            columns={columns}
            colMap={colMap}
            mapperVisible={mapperVisible}
            mapperTitle={mapperTitle}
            ready={ready}
            onFile={handleFile}
            onRemove={handleRemove}
            onColChange={handleColChange}
            onProses={handleProses}
          />
        )}

        {step === 'proses' && <ProcessPanel steps={procSteps} />}

        {step === 'hasil' && result && <ResultPanel result={result} onReset={handleReset} />}
      </div>
    </div>
  );
}
