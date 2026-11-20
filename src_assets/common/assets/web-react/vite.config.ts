import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolveBuildPaths } from './vite-plugins/build-paths.js';
import { heliosPageRoutes, PAGE_NAMES } from './vite-plugins/helios-page-routes.ts';

const appDir = fileURLToPath(new URL('.', import.meta.url));
const { root, outDir } = resolveBuildPaths(process.env, appDir);

export default defineConfig({
  root,
  base: './',
  plugins: [react(), tailwindcss(), heliosPageRoutes()],
  resolve: {
    alias: { '@': resolve(root, 'src') },
  },
  build: {
    outDir,
    emptyOutDir: true,
    assetsDir: 'assets',
    // Every emitted file must be servable from /assets/... (whitelist in src/confighttp.cpp).
    assetsInlineLimit: 0,
    rolldownOptions: {
      input: Object.fromEntries(PAGE_NAMES.map((page) => [page, resolve(root, `${page}.html`)])),
    },
  },
  server: {
    proxy: {
      '/api': { target: 'https://localhost:47990', secure: false, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
