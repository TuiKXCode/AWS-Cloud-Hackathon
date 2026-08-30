// src/main.tsx
// Entry point: mounts the App component into the #root element.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Tailwind's entry stylesheet (PRD §2 — Tailwind is the styling system). Imported here
// so the utility classes used by the Phase 7 game are present on every route.
import './index.css';

import { App } from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
