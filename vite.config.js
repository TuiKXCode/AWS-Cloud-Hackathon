import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Localhost only by default. Vite 5's dev server carries a known advisory
    // (GHSA-67mh-4wv8-2f99) where any site you visit can talk to it, so binding to the
    // LAN is opt-in: `npm run dev:lan` when you want to test on a phone.
    port: 5173,
  },
});
