import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // `jsxRuntime` is pinned rather than left to the plugin default. The tycoon components
  // are .jsx, and which runtime they get was otherwise decided by tsconfig discovery and
  // the installed plugin version — get the classic runtime and every file that renders
  // JSX without importing React throws "React is not defined" at mount. Stating it here
  // removes that variable. (The components also import React explicitly now, so they
  // survive even if something bypasses this.)
  plugins: [react({ jsxRuntime: 'automatic' })],
  esbuild: {
    // Same reasoning for anything esbuild transforms directly rather than through Babel.
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  server: {
    // Localhost only by default. Vite 5's dev server carries a known advisory
    // (GHSA-67mh-4wv8-2f99) where any site you visit can talk to it, so binding to the
    // LAN is opt-in: `npm run dev:lan` when you want to test on a phone.
    port: 5173,
  },
});
