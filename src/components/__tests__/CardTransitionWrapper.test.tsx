// src/components/__tests__/CardTransitionWrapper.test.tsx
// Unit tests for the Phase 3 (audio-polish) CardTransitionWrapper.
//
// jsdom does not execute real CSS transitions/animations, so these tests assert
// on the applied inline style props (transform, opacity, transition) and on the
// presence/absence of a transition rather than on visual output.
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CARD_TRANSITION_DURATION_MS,
  CardTransitionWrapper,
} from '../CardTransitionWrapper';

// Mock the reduced-motion hook so each test controls the preference directly.
const { mockUseReducedMotion } = vi.hoisted(() => ({
  mockUseReducedMotion: vi.fn(() => false),
}));

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

// Deterministically flush requestAnimationFrame callbacks so we can advance the
// wrapper's internal "settle" step without depending on real frame timing.
let rafCallbacks: FrameRequestCallback[] = [];

beforeEach(() => {
  mockUseReducedMotion.mockReturnValue(false);
  rafCallbacks = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Runs any queued rAF callbacks (simulating the next animation frame). */
function flushFrames() {
  act(() => {
    const queued = rafCallbacks;
    rafCallbacks = [];
    queued.forEach((cb) => cb(performance.now()));
  });
}

function getWrapper() {
  return screen.getByTestId('card-transition-wrapper');
}

describe('CardTransitionWrapper', () => {
  it('starts translated off-screen with opacity 0 when it first becomes visible (Req 3.1)', () => {
    render(
      <CardTransitionWrapper isVisible={true} contentKey="a">
        <div>card content</div>
      </CardTransitionWrapper>,
    );

    const wrapper = getWrapper();
    // Before the next frame settles it, the card starts translated fully down.
    expect(wrapper.style.transform).toBe('translateY(100%)');
    expect(wrapper.style.opacity).toBe('0');
  });

  it('applies a slide-in transition (transform + opacity) with duration <= 500ms (Req 3.1, 3.3, 3.4)', () => {
    render(
      <CardTransitionWrapper isVisible={true} contentKey="a">
        <div>card content</div>
      </CardTransitionWrapper>,
    );

    // Advance a frame so the wrapper settles into its final position.
    flushFrames();

    const wrapper = getWrapper();
    expect(wrapper.style.transform).toBe('translateY(0)');
    expect(wrapper.style.opacity).toBe('1');

    // A CSS transition is present and covers both transform and opacity.
    expect(wrapper.style.transition).toContain('transform');
    expect(wrapper.style.transition).toContain('opacity');

    // Duration is within the 500ms budget (Req 3.4).
    expect(CARD_TRANSITION_DURATION_MS).toBeLessThanOrEqual(500);
    const durations = Array.from(
      wrapper.style.transition.matchAll(/(\d+)ms/g),
    ).map((m) => Number(m[1]));
    expect(durations.length).toBeGreaterThan(0);
    durations.forEach((ms) => expect(ms).toBeLessThanOrEqual(500));
  });

  it('uses only inline styles with no third-party animation library classes (Req 3.3)', () => {
    render(
      <CardTransitionWrapper isVisible={true} contentKey="a">
        <div>card content</div>
      </CardTransitionWrapper>,
    );
    flushFrames();

    const wrapper = getWrapper();
    // The wrapper drives animation via inline style, not className utilities.
    expect(wrapper.className).toBe('');
    expect(wrapper.getAttribute('style')).toBeTruthy();
  });

  it('triggers an opacity fade when contentKey changes while visible (Req 3.2)', () => {
    const { rerender } = render(
      <CardTransitionWrapper isVisible={true} contentKey="a">
        <div>card content</div>
      </CardTransitionWrapper>,
    );

    // Settle the initial slide-in.
    flushFrames();
    expect(getWrapper().style.opacity).toBe('1');

    // Change the content key -> opacity should dip to 0 (fade start).
    rerender(
      <CardTransitionWrapper isVisible={true} contentKey="b">
        <div>new card content</div>
      </CardTransitionWrapper>,
    );

    let wrapper = getWrapper();
    expect(wrapper.style.opacity).toBe('0');
    // Transition still applies to opacity for a smooth fade within 300ms.
    expect(wrapper.style.transition).toContain('opacity');
    const durations = Array.from(
      wrapper.style.transition.matchAll(/(\d+)ms/g),
    ).map((m) => Number(m[1]));
    durations.forEach((ms) => expect(ms).toBeLessThanOrEqual(300));

    // Next frame settles the fade back to fully visible.
    flushFrames();
    wrapper = getWrapper();
    expect(wrapper.style.opacity).toBe('1');
  });

  it('does not fade on initial render (no spurious content-change) (Req 3.2)', () => {
    render(
      <CardTransitionWrapper isVisible={true} contentKey="a">
        <div>card content</div>
      </CardTransitionWrapper>,
    );
    flushFrames();
    // Settled at full opacity, no lingering fade state.
    expect(getWrapper().style.opacity).toBe('1');
  });

  describe('reduced motion (Req 3.5)', () => {
    beforeEach(() => {
      mockUseReducedMotion.mockReturnValue(true);
    });

    it('renders in final state immediately with no transition when visible', () => {
      render(
        <CardTransitionWrapper isVisible={true} contentKey="a">
          <div>card content</div>
        </CardTransitionWrapper>,
      );

      const wrapper = getWrapper();
      expect(wrapper.getAttribute('data-reduced-motion')).toBe('true');
      expect(wrapper.style.transform).toBe('translateY(0)');
      expect(wrapper.style.opacity).toBe('1');
      // No transition is applied.
      expect(wrapper.style.transition).toBe('');
    });

    it('does not animate a fade when contentKey changes', () => {
      const { rerender } = render(
        <CardTransitionWrapper isVisible={true} contentKey="a">
          <div>card content</div>
        </CardTransitionWrapper>,
      );

      rerender(
        <CardTransitionWrapper isVisible={true} contentKey="b">
          <div>new content</div>
        </CardTransitionWrapper>,
      );

      const wrapper = getWrapper();
      // Stays fully visible with no transition — instant content swap.
      expect(wrapper.style.opacity).toBe('1');
      expect(wrapper.style.transition).toBe('');
    });
  });
});
