import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'renderer',
  base: './',
  build: {
    outDir: '../dist-renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'renderer/src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
