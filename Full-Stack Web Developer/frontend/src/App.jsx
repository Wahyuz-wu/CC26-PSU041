import { Routes, Route, Navigate } from 'react-router-dom';

import Nav from './components/Nav.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Struktur halaman: navbar persisten + area konten yang berganti per-route.
// Toast dirender oleh ToastProvider (lihat context/ToastContext.jsx).
export default function App() {
  return (
    <>
      <Nav />
      <div id="main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
