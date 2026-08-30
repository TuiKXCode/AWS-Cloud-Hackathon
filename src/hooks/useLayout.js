// src/hooks/useLayout.js
//
// Picks the portrait or landscape arrangement of the restaurant from the shape of the window.

import { useEffect, useState } from 'react';
import { LANDSCAPE, PORTRAIT } from '../game/layouts.js';

/**
 * Portrait below a 1:1 viewport aspect. Keyed on shape rather than width so a rotated tablet
 * gets the tall board and a short-but-wide desktop window keeps the wide one, which is what
 * actually matters — the layouts differ because the space differs, not because of device class.
 */
const PORTRAIT_QUERY = '(max-aspect-ratio: 1/1)';

function currentLayout() {
  if (typeof window === 'undefined' || !window.matchMedia) return LANDSCAPE;
  return window.matchMedia(PORTRAIT_QUERY).matches ? PORTRAIT : LANDSCAPE;
}

export function useLayout() {
  const [layout, setLayout] = useState(currentLayout);

  useEffect(() => {
    const media = window.matchMedia(PORTRAIT_QUERY);
    const onChange = () => setLayout(media.matches ? PORTRAIT : LANDSCAPE);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return layout;
}
