// src/components/__tests__/FoodWebFadeWrapper.test.tsx
//
// Unit tests for the Phase 3 (audio-polish) FoodWebFadeWrapper.
//
// jsdom does not run CSS transitions, so we assert on the inline style props
// (opacity, transition) and DOM presence rather than on animated visual output.
//
// Covers: Requirements 4.1 (fade-in 400ms), 4.2 (fade-out then DOM removal),
// 4.3 (inline styles only — no library), 4.5 (reduced motion -> 0ms).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FoodWebFadeWrapper,
  FOOD_WEB_FADE_DURATION_MS,
} from '../FoodWebFadeWrapper';

// Mock the reduced-motion hook so each test can control its return value.
const { mockUseReducedMotion } = vi.hoisted(() => ({
  mockUseReducedMotion: vi.fn(() => false),
}));

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockUseReducedMotion.mockReturnValue(false);
});

describe('FoodWebFadeWrapper', () => {
  it('renders children inside the fade wrapper on mount', () => {
    render(
      <FoodWebFadeWrapper>
        <span>food web content</span>
      </FoodWebFadeWrapper>,
    );

    expect(screen.getByTestId('food-web-fade-wrapper')).toBeInTheDocument();
    expect(screen.getByText('food web content')).toBeInTheDocument();
  });

  it('applies an opacity transition of 400ms and settles at opacity 1 (Req 4.1)', () => {
    render(
      <FoodWebFadeWrapper>
        <span>content</span>
      </FoodWebFadeWrapper>,
    );

    const wrapper = screen.getByTestId('food-web-fade-wrapper');

    expect(wrapper.style.transition).toContain(`opacity ${FOOD_WEB_FADE_DURATION_MS}ms`);
    // After mount effects run, the target opacity is 1 (fade-in complete target).
    expect(wrapper.style.opacity).toBe('1');
  });

  it('sets transition duration to 0ms when reduced motion is preferred (Req 4.5)', () => {
    mockUseReducedMotion.mockReturnValue(true);

    render(
      <FoodWebFadeWrapper>
        <span>content</span>
      </FoodWebFadeWrapper>,
    );

    const wrapper = screen.getByTestId('food-web-fade-wrapper');
    expect(wrapper.style.transition).toContain('opacity 0ms');
    expect(wrapper.style.opacity).toBe('1');
  });

  it('uses only inline styles — no class-based (Tailwind/library) styling (Req 4.3)', () => {
    render(
      <FoodWebFadeWrapper>
        <span>content</span>
      </FoodWebFadeWrapper>,
    );

    const wrapper = screen.getByTestId('food-web-fade-wrapper');
    // No CSS classes applied; styling is entirely inline.
    expect(wrapper.className).toBe('');
    expect(wrapper.getAttribute('style')).toMatch(/opacity/);
    expect(wrapper.getAttribute('style')).toMatch(/transition/);
  });

  describe('fade-out and DOM removal (Req 4.2)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('fades out to opacity 0 then removes children from the DOM after the transition', () => {
      const { rerender } = render(
        <FoodWebFadeWrapper visible={true}>
          <span>content</span>
        </FoodWebFadeWrapper>,
      );

      expect(screen.getByTestId('food-web-fade-wrapper')).toBeInTheDocument();

      // Trigger fade-out.
      act(() => {
        rerender(
          <FoodWebFadeWrapper visible={false}>
            <span>content</span>
          </FoodWebFadeWrapper>,
        );
      });

      // Still present during fade-out, now transitioning toward opacity 0.
      const wrapper = screen.getByTestId('food-web-fade-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.style.opacity).toBe('0');

      // A transitionend on opacity removes it immediately.
      act(() => {
        fireEvent.transitionEnd(wrapper, { propertyName: 'opacity' });
      });

      expect(screen.queryByTestId('food-web-fade-wrapper')).not.toBeInTheDocument();
    });

    it('removes children via the backup timer even without a transitionend event', () => {
      const { rerender } = render(
        <FoodWebFadeWrapper visible={true}>
          <span>content</span>
        </FoodWebFadeWrapper>,
      );

      act(() => {
        rerender(
          <FoodWebFadeWrapper visible={false}>
            <span>content</span>
          </FoodWebFadeWrapper>,
        );
      });

      expect(screen.getByTestId('food-web-fade-wrapper')).toBeInTheDocument();

      // Advance past the backup removal timeout without firing transitionend.
      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(screen.queryByTestId('food-web-fade-wrapper')).not.toBeInTheDocument();
    });

    it('re-entering during fade-out cancels removal and returns to opacity 1 (Req 4.4)', () => {
      const { rerender } = render(
        <FoodWebFadeWrapper visible={true}>
          <span>content</span>
        </FoodWebFadeWrapper>,
      );

      // Begin fade-out.
      act(() => {
        rerender(
          <FoodWebFadeWrapper visible={false}>
            <span>content</span>
          </FoodWebFadeWrapper>,
        );
      });
      expect(screen.getByTestId('food-web-fade-wrapper').style.opacity).toBe('0');

      // Interrupt: become visible again before removal fires.
      act(() => {
        rerender(
          <FoodWebFadeWrapper visible={true}>
            <span>content</span>
          </FoodWebFadeWrapper>,
        );
      });

      // Advance well past the removal timeout — element must NOT be removed.
      act(() => {
        vi.advanceTimersByTime(600);
      });

      const wrapper = screen.getByTestId('food-web-fade-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.style.opacity).toBe('1');
    });
  });
});
