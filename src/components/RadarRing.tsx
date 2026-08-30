// src/components/RadarRing.tsx
// RadarRing: a pulsing circular indicator rendered behind the Nearby Exhibit
// Card content to draw the visitor's attention when an exhibit is nearby.
// Part of the audio-polish feature (Phase 3).
//
// Implementation note:
//   Tailwind CSS is NOT installed in this project, so the visual effect that
//   the spec describes as Tailwind's `animate-ping` (a repeating outward pulse:
//   scale up + fade out, infinite) is implemented here with a plain CSS
//   @keyframes animation injected once via a module-level <style> tag and inline
//   styles. No third-party animation library is used (Req 2.2).
//
// Responsibilities / acceptance criteria:
//  - Render a circular, semi-transparent green element with a repeating
//    outward-pulse animation while visible (Req 2.1).
//  - Use no third-party animation library — CSS only (Req 2.2).
//  - Render nothing (removed from DOM) when `visible` is false (Req 2.3).
//  - Sit behind card content via a lower z-index so text/badges remain visible
//    and interactive (Req 2.4).
//  - Constrain size: minimum 48px, maximum 50% of the card's smallest
//    dimension (Req 2.5).
//  - Respect `prefers-reduced-motion` by omitting the pulse animation.

import { useReducedMotion } from '../hooks/useReducedMotion';

export interface RadarRingProps {
  /** True when the nearest exhibit is displayed on the card. */
  visible: boolean;
  /** Optional card dimensions used to bound the ring to 50% of the smallest side. */
  cardDimensions?: { width: number; height: number };
}

// Unique keyframes name to avoid collisions with any other styles.
const PULSE_ANIMATION_NAME = 'radar-ring-pulse';
const STYLE_ELEMENT_ID = 'radar-ring-keyframes';

// Equivalent to Tailwind's `animate-ping`: scale outward while fading to
// transparent, looping infinitely.
const KEYFRAMES_CSS = `
@keyframes ${PULSE_ANIMATION_NAME} {
  0% {
    transform: scale(1);
    opacity: 0.75;
  }
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
`;

/**
 * Injects the pulse @keyframes into the document head exactly once. Guarded so
 * repeated renders / multiple instances don't create duplicate style tags. Runs
 * lazily at module scope on first render; a no-op in non-DOM environments.
 */
function ensureKeyframesInjected(): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (document.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = KEYFRAMES_CSS;
  document.head.appendChild(style);
}

const MIN_SIZE_PX = 48;

export function RadarRing({ visible, cardDimensions }: RadarRingProps) {
  const prefersReducedMotion = useReducedMotion();

  // Req 2.3: when no exhibit is nearby, remove the ring entirely from the DOM.
  if (!visible) {
    return null;
  }

  // Only inject animation styles when we actually render an animated ring.
  if (!prefersReducedMotion) {
    ensureKeyframesInjected();
  }

  // Req 2.5: size is at least 48px and at most 50% of the card's smallest
  // dimension. When cardDimensions is provided we can compute an explicit px
  // cap; otherwise fall back to a percentage-based cap.
  const style: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    // Center the ring on the card.
    transform: 'translate(-50%, -50%)',
    borderRadius: '9999px',
    backgroundColor: 'rgba(74, 222, 128, 0.3)', // green-400 @ 30% opacity
    // Req 2.4: sit behind card content.
    zIndex: -1,
    // Ring shouldn't intercept pointer events meant for the card.
    pointerEvents: 'none',
    minWidth: `${MIN_SIZE_PX}px`,
    minHeight: `${MIN_SIZE_PX}px`,
  };

  if (cardDimensions) {
    const smallest = Math.min(cardDimensions.width, cardDimensions.height);
    // Half of the smallest dimension, but never below the 48px minimum.
    const cap = Math.max(MIN_SIZE_PX, Math.floor(smallest / 2));
    style.width = `${cap}px`;
    style.height = `${cap}px`;
    style.maxWidth = `${cap}px`;
    style.maxHeight = `${cap}px`;
  } else {
    // Sensible default: fill toward but no more than 50% of the card.
    style.width = '50%';
    style.height = '50%';
    style.maxWidth = '50%';
    style.maxHeight = '50%';
  }

  // Omit the pulse animation when the user prefers reduced motion.
  if (!prefersReducedMotion) {
    style.animation = `${PULSE_ANIMATION_NAME} 1.5s cubic-bezier(0, 0, 0.2, 1) infinite`;
  }

  return (
    <div
      className="radar-ring"
      role="presentation"
      aria-hidden="true"
      data-testid="radar-ring"
      style={style}
    />
  );
}

export default RadarRing;
