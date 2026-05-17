import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, 'assets');

export default defineConfig({
  root: __dirname,
  // Serve everything under assets/ at the site root:
  //   /maps/WelcomeZone.json
  //   /tilesets/Modern_Office_16x16.png
  //   /tilesets/ModernOffice.tsj
  publicDir: assetsDir,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'public/index.html'),
    },
    copyPublicDir: true,
  },
  server: {
    open: '/public/index.html',
    fs: {
      allow: [__dirname, assetsDir],
    },
  },
});
