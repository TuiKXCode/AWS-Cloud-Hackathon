// src/theme.ts
// Shared visual theme tokens for the "Mandai Echoes" wildlife-reserve refresh.
//
// This module is pure data: plain objects and values consumed by inline styles
// (React.CSSProperties) throughout the app. It intentionally contains NO React,
// NO JSX, and NO logic — Tailwind / CSS files are not used in this project, so
// components import these tokens and spread them into `style={...}`.
//
// The palette evokes a lush Singapore wildlife reserve: deep forest greens,
// warm leaf/lime accents, earthy bark browns, and soft cream/sand surfaces.
//
// NOTE: IUCN status → color mapping lives in IUCNBadge and is deliberately NOT
// duplicated or overridden here.

/** Core brand palette. */
export const colors = {
  // Greens (primary brand).
  forestGreen: '#1b5e20',
  green: '#2e7d32',
  leaf: '#66bb6a',
  lime: '#aed581',

  // Earth.
  bark: '#5d4037',

  // Surfaces / backgrounds.
  sand: '#f4efe6', // page background
  cream: '#fffdf7', // card / surface background
  sky: '#e3f2fd', // soft accent background

  // Text.
  textDark: '#213027',
  textMuted: '#5b6b60',

  // Neutrals.
  white: '#ffffff',

  // Accent tints (soft washes for chips, headers, hovers).
  leafTint: '#e8f5e9', // very light green
  limeTint: '#f1f8e9', // very light lime
  sandDark: '#e7dfce', // slightly deeper sand for borders
  barkTint: '#efe7e2', // soft warm brown wash
} as const;

/** Corner radii. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999,
} as const;

/** Soft, natural drop shadows. */
export const shadow = {
  soft: '0 2px 8px rgba(27, 94, 32, 0.08)',
  card: '0 4px 16px rgba(33, 48, 39, 0.10)',
  raised: '0 6px 20px rgba(33, 48, 39, 0.14)',
} as const;

/** Spacing scale (px). */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Typography. */
export const font = {
  family:
    "'Nunito', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
} as const;

/** A green gradient used for the header banner and progress fill. */
export const gradients = {
  forest: `linear-gradient(135deg, ${colors.forestGreen} 0%, ${colors.green} 55%, ${colors.leaf} 100%)`,
  fill: `linear-gradient(90deg, ${colors.green} 0%, ${colors.leaf} 100%)`,
} as const;

/** Small reusable style helpers. */
export const card = {
  backgroundColor: colors.cream,
  borderRadius: radius.lg,
  boxShadow: shadow.card,
  border: `1px solid ${colors.sandDark}`,
} as const;

export const sectionTitle = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: colors.forestGreen,
  margin: 0,
} as const;
