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
    // The default 5s budgets are tuned for small unit tests. This suite also runs
    // property tests that mount React a hundred times over, and the first run after a
    // cold cache pays for transforming every module on top of that — which is exactly
    // when a fresh clone runs `npm test` and sees a false failure. These are ceilings,
    // not waits: a healthy run still finishes in well under a minute.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: [resolve(rootDir, 'src/test/setup.ts')],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.property.{test,spec}.{ts,tsx}',
    ],
  },
});
