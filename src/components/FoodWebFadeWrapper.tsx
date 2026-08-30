// src/components/FoodWebFadeWrapper.tsx
//
// Phase 3 (audio-polish) — Food Web Fade Effects.
//
// Provides a fade envelope around the Food_Web_View (and a documented per-element
// fade API). Because Tailwind CSS is NOT installed in this project, all fade
// behaviour is implemented with inline styles / CSS transitions
// (`transition: opacity <duration>ms`) rather than Tailwind utility classes.
// No third-party animation library is used.
//
// Behaviour:
// - Fade-in: children mount at opacity 0 and transition to opacity 1 over 400ms.
// - Fade-out: when `visible` becomes false, opacity transitions 1 -> 0 over 400ms,
//   and the children are removed from the DOM only after the transition completes
//   (transitionend, with a setTimeout backup so removal always happens).
// - Interruption: if a fade is reversed mid-flight, the new transition starts from
//   the element's current (computed) opacity without delay — the browser handles
//   this automatically because we only change the opacity target on a persistent
//   node, and any pending removal timers/listeners are cleared.
// - Reduced motion: when `useReducedMotion()` is true, transition duration is 0ms,
//   so elements show/hide instantly.
//
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5

import React, { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '../hooks/useReducedMotion';

/** Fade duration in milliseconds when motion is enabled (Req 4.1, 4.2). */
export const FOOD_WEB_FADE_DURATION_MS = 400;

/**
 * Backup timeout (ms) after which the exit removal fires regardless of whether
 * the `transitionend` event was received. Slightly longer than the fade so a
 * normally-completing transition wins the race (Req 4.2 error handling).
 */
const EXIT_REMOVAL_BACKUP_MS = 500;

export interface FoodWebFadeWrapperProps {
  /**
   * Whether the wrapped content should be shown. Transitioning false -> true
   * fades in; true -> false fades out and then unmounts the children.
   * Defaults to `true` (fade in on mount).
   */
  visible?: boolean;

  /**
   * Optional set of currently-visible node IDs. Documented per-element fade API
   * from the design; the wrapper does not diff these itself (the FoodWebSimulator
   * owns its nodes), but they are accepted so callers can key the wrapper or drive
   * envelope-level fades when the visible set changes.
   */
  nodeIds?: string[];

  /** Previous node ID set, for callers implementing their own diffing. */
  previousNodeIds?: string[];

  children: React.ReactNode;
}

/**
 * Wraps children in a fade-in / fade-out envelope implemented with inline styles.
 */
export function FoodWebFadeWrapper({
  visible = true,
  children,
}: FoodWebFadeWrapperProps): React.ReactElement | null {
  const reducedMotion = useReducedMotion();
  const durationMs = reducedMotion ? 0 : FOOD_WEB_FADE_DURATION_MS;

  // Whether the children are present in the DOM. Stays true through the fade-out
  // so the exit transition is visible; flips to false once fade-out completes.
  const [mounted, setMounted] = useState<boolean>(visible);

  // Target opacity the element transitions toward. Kept in state so the initial
  // render can start at 0 (enabling the fade-in transition on the next frame).
  const [opacity, setOpacity] = useState<number>(0);

  const removalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // Latest exit intent, read inside the transitionend handler to avoid a stale
  // closure removing (or failing to remove) the element based on old state.
  const exitingRef = useRef<boolean>(false);
  exitingRef.current = !visible;

  const clearRemovalTimer = () => {
    if (removalTimerRef.current !== null) {
      clearTimeout(removalTimerRef.current);
      removalTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (visible) {
      // Entering (or re-entering mid fade-out): cancel any pending removal so the
      // new fade-in starts from the element's current opacity without delay (Req 4.4).
      clearRemovalTimer();
      setMounted(true);
      // Kick opacity toward 1. If reduced motion, duration is 0ms -> instant.
      setOpacity(1);
    } else if (mounted) {
      // Exiting: fade toward 0, then remove from the DOM once the transition
      // completes (Req 4.2). A backup timer guarantees removal even if the
      // transitionend event never fires.
      setOpacity(0);
      clearRemovalTimer();
      removalTimerRef.current = setTimeout(() => {
        removalTimerRef.current = null;
        setMounted(false);
      }, durationMs + (EXIT_REMOVAL_BACKUP_MS - FOOD_WEB_FADE_DURATION_MS));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, durationMs]);

  // Ensure the fade-in transition actually runs: on first mount the element is
  // rendered at opacity 0, then we set the target to 1 on the next tick.
  useEffect(() => {
    if (visible) {
      // Reading the DOM node forces layout so the 0 -> 1 change animates.
      // (No-op in jsdom, but harmless.)
      void nodeRef.current?.offsetHeight;
      setOpacity(1);
    }
    // Run once on mount for the initial fade-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      clearRemovalTimer();
    };
  }, []);

  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    // jsdom's synthetic transitionend may omit propertyName; only bail when a
    // property is explicitly reported and it is not opacity.
    if (event.propertyName && event.propertyName !== 'opacity') {
      return;
    }
    // Fade-out finished before the backup timer — remove immediately (Req 4.2).
    if (exitingRef.current) {
      clearRemovalTimer();
      setMounted(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      ref={nodeRef}
      data-testid="food-web-fade-wrapper"
      onTransitionEnd={handleTransitionEnd}
      style={{
        opacity,
        transition: `opacity ${durationMs}ms ease-in-out`,
        willChange: 'opacity',
      }}
    >
      {children}
    </div>
  );
}

export default FoodWebFadeWrapper;
