// src/components/CardTransitionWrapper.tsx
// CardTransitionWrapper: Phase 3 (audio-polish) enhancement that wraps the
// existing NearbyExhibitCard to add polished entrance and content-change
// transitions. It follows the wrapper/enhancement pattern — it does not modify
// the wrapped component's internals; it only animates the container.
//
// NOTE: Tailwind CSS is NOT installed in this project, so the visual behaviour
// described in the design (translate-y / opacity / duration utilities) is
// achieved with inline styles + native CSS transitions instead of Tailwind
// utility classes. No third-party animation library is used (Req 3.3).
//
// Responsibilities:
//  - Slide-in: when `isVisible` transitions false -> true, start translated
//    fully downward (translateY(100%)) with opacity 0, then transition to
//    translateY(0) with opacity 1 over ~300ms (Req 3.1, 3.4).
//  - Content-change fade: when `contentKey` changes while visible, momentarily
//    drop opacity to 0 then transition back to 1 over ~300ms (Req 3.2).
//  - Reduced motion: when `useReducedMotion()` is true, disable all
//    transitions and render the card immediately in its final state (Req 3.5).

import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Transition duration in milliseconds. Kept at 300ms so both the slide-in and
 * the content-change fade complete well within the 500ms budget (Req 3.4) and
 * the content-change fade completes within 300ms (Req 3.2).
 */
export const CARD_TRANSITION_DURATION_MS = 300;

export interface CardTransitionWrapperProps {
  /** true when an exhibit is nearby and the card should be shown. */
  isVisible: boolean;
  /**
   * Identifier for the currently displayed content (e.g. exhibit id). A change
   * in this value while visible triggers the content-change fade.
   */
  contentKey: string | null;
  children: React.ReactNode;
}

/**
 * Wraps card content with slide-in and content-change fade transitions built
 * entirely from inline styles / native CSS transitions.
 */
export function CardTransitionWrapper({
  isVisible,
  contentKey,
  children,
}: CardTransitionWrapperProps) {
  const prefersReducedMotion = useReducedMotion();

  // Whether the card is currently in its "settled" final position. Starts
  // false so the first appearance animates in from below.
  const [entered, setEntered] = useState<boolean>(false);
  // Drives the transient content-change fade (opacity dips to 0 then back).
  const [fading, setFading] = useState<boolean>(false);

  // Track the previous contentKey so we can detect a genuine change (rather
  // than the initial render) to trigger the fade.
  const previousContentKeyRef = useRef<string | null>(contentKey);
  // Initialised to false so that a card which mounts already visible still
  // animates in from below (treated as a false -> true appearance).
  const previousVisibleRef = useRef<boolean>(false);

  // Slide-in: when isVisible flips false -> true, begin off-screen then, on the
  // next frame, transition into the final position. When it flips back to
  // hidden, reset so a future appearance animates again.
  useEffect(() => {
    if (prefersReducedMotion) {
      // No animation: card is immediately in final state whenever visible.
      setEntered(isVisible);
      previousVisibleRef.current = isVisible;
      return;
    }

    if (isVisible && !previousVisibleRef.current) {
      // Just became visible: start from the off-screen state, then settle.
      setEntered(false);
      const frame = requestAnimationFrame(() => setEntered(true));
      previousVisibleRef.current = isVisible;
      return () => cancelAnimationFrame(frame);
    }

    if (!isVisible) {
      setEntered(false);
    } else {
      setEntered(true);
    }
    previousVisibleRef.current = isVisible;
    return undefined;
  }, [isVisible, prefersReducedMotion]);

  // Content-change fade: when contentKey changes while visible, dip opacity to
  // 0 then transition back to 1 on the next frame.
  useEffect(() => {
    const changed = previousContentKeyRef.current !== contentKey;
    previousContentKeyRef.current = contentKey;

    if (!changed || !isVisible || prefersReducedMotion) {
      return undefined;
    }

    setFading(true);
    const frame = requestAnimationFrame(() => setFading(false));
    return () => cancelAnimationFrame(frame);
  }, [contentKey, isVisible, prefersReducedMotion]);

  // Reduced motion (Req 3.5): render immediately in final state, no transition.
  if (prefersReducedMotion) {
    return (
      <div
        data-testid="card-transition-wrapper"
        data-reduced-motion="true"
        style={{
          transform: 'translateY(0)',
          opacity: 1,
          // No transition property at all — instant show/hide.
        }}
      >
        {children}
      </div>
    );
  }

  const settled = entered && !fading;

  return (
    <div
      data-testid="card-transition-wrapper"
      data-reduced-motion="false"
      style={{
        transform: entered ? 'translateY(0)' : 'translateY(100%)',
        opacity: settled ? 1 : 0,
        transition: `transform ${CARD_TRANSITION_DURATION_MS}ms ease-out, opacity ${CARD_TRANSITION_DURATION_MS}ms ease-out`,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
}

export default CardTransitionWrapper;
