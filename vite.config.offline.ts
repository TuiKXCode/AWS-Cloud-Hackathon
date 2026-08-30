import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build config for the single-file offline bundle (`npm run build:offline`).
//
// The normal build assumes a web server. This one has to survive being opened straight
// off disk with a file:// URL — a judge downloading one file out of Google Drive and
// double-clicking it — which rules out three things the default build relies on:
//
//   * ES module scripts. `<script type="module">` is fetched with CORS, and file:// has
//     an opaque origin, so the browser refuses it. Rollup emits a classic IIFE instead.
//   * Code splitting. A second chunk would be another blocked fetch, so dynamic imports
//     are inlined into the one bundle.
//   * Absolute asset URLs. `/assets/...` resolves to the filesystem root off a file://
//     page. Everything is inlined as a data URI so there is nothing left to resolve.
//
// scripts/build-offline.mjs then folds the CSS and JS into the HTML and rewrites the
// sprite paths, leaving exactly one file.
export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  base: './',
  build: {
    outDir: 'dist-offline',
    emptyOutDir: true,
    // Inline every asset rather than emitting files alongside the HTML.
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    sourcemap: false,
    // A 1MB single file is already the point of the exercise; the warning is noise here.
    chunkSizeWarningLimit: 100_000,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
});
