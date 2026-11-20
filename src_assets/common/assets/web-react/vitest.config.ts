import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const appDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(appDir, 'src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/shared/testing/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'vite-plugins/**/*.test.ts', 'tests/**/*.test.ts'],
    css: false,
    restoreMocks: true,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/features/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', 'src/shared/testing/**', '**/index.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 80, branches: 80, functions: 80 },
    },
  },
});
