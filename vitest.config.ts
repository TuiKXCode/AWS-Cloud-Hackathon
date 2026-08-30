import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Pin the root and setup file to ABSOLUTE paths derived from this config's own
// location, so they resolve within this project even when it is nested inside
// another git working tree (which can otherwise confuse Vite's root discovery).
const rootDir = dirname(fileURLToPath(import.meta.url));

// https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],
  root: rootDir,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(rootDir, 'src/test/setup.ts')],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.property.{test,spec}.{ts,tsx}',
    ],
  },
});
