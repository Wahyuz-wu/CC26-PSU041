import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import './styles/tokens.css';
import './styles/main.css';

import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

// Hash-based routing dipertahankan agar URL tetap berbentuk #/… seperti versi sebelumnya.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </HashRouter>
  </StrictMode>,
);
