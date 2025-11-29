
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [react()],
  // Important for GitHub Pages: Use relative path so it works on subdirectories
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
