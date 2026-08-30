import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Detects whether the user has requested reduced motion via the
 * `prefers-reduced-motion: reduce` media query.
 *
 * - Evaluates the media query on mount.
 * - Subscribes to `change` events so runtime toggling is reflected.
 * - Defaults to `false` when `matchMedia` is unavailable (older browsers /
 *   non-DOM test environments), meaning animations are enabled by default.
 *
 * Requirements: 3.5, 4.5
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() =>
    getInitialPreference()
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);

    // Sync in case the value changed between initial render and effect run.
    setPrefersReducedMotion(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

function getInitialPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
