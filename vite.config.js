import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Root-relative assets work at the Vercel domain root and Capacitor's
  // https://localhost origin, including after a browser route refresh.
  base: '/',
  resolve: { preserveSymlinks: true },
  build: { target: 'es2022' }
});
