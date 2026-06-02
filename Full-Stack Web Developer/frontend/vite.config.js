import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Konfigurasi Vite untuk frontend React Foreca.
// Plugin React mengaktifkan Fast Refresh + transform JSX.
export default defineConfig({
  plugins: [react()],
});
