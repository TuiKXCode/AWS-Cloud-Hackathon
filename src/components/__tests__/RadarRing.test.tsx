// src/components/__tests__/RadarRing.test.tsx
// Unit tests for the RadarRing component (audio-polish, Phase 3).
//
// Covers acceptance criteria:
//  - Req 2.1: renders a pulse animation while visible (reduced motion off).
//  - Req 2.3: removed from the DOM when visible is false.
//  - Req 2.4: sits behind card content (lower z-index).
//  - Req 2.5: size constrained (min 48px, max 50% of smallest card dimension).
//  - Reduced motion: pulse animation omitted when prefers-reduced-motion is on.

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the reduced-motion hook so we control the branch under test.
const { mockUseReducedMotion } = vi.hoisted(() => ({
  mockUseReducedMotion: vi.fn<() => boolean>(),
}));

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

import { RadarRing } from '../RadarRing';

afterEach(() => {
  cleanup();
  // Remove any injected keyframes style tag between tests for isolation.
  document.getElementById('radar-ring-keyframes')?.remove();
});

describe('RadarRing', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders a repeating pulse animation when visible and reduced motion is off (Req 2.1)', () => {
    render(<RadarRing visible={true} />);

    const ring = screen.getByTestId('radar-ring');
    expect(ring).toBeInTheDocument();
    // Animation shorthand present with an infinite loop.
    expect(ring.style.animation).toContain('radar-ring-pulse');
    expect(ring.style.animation).toContain('infinite');

    // The @keyframes must be injected into the document.
    const styleTag = document.getElementById('radar-ring-keyframes');
    expect(styleTag).not.toBeNull();
    expect(styleTag?.textContent).toContain('@keyframes radar-ring-pulse');
  });

  it('renders nothing (removed from DOM) when visible is false (Req 2.3)', () => {
    const { container } = render(<RadarRing visible={false} />);

    expect(screen.queryByTestId('radar-ring')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('omits the pulse animation when prefers-reduced-motion is enabled', () => {
    mockUseReducedMotion.mockReturnValue(true);

    render(<RadarRing visible={true} />);

    const ring = screen.getByTestId('radar-ring');
    expect(ring).toBeInTheDocument();
    // No animation applied.
    expect(ring.style.animation).toBe('');
    // Keyframes should not be injected when animation is skipped.
    expect(document.getElementById('radar-ring-keyframes')).toBeNull();
  });

  it('renders behind card content with a lower z-index (Req 2.4)', () => {
    render(<RadarRing visible={true} />);

    const ring = screen.getByTestId('radar-ring');
    expect(ring.style.zIndex).toBe('-1');
    expect(ring.style.position).toBe('absolute');
    // Should not intercept interactions with the content above it.
    expect(ring.style.pointerEvents).toBe('none');
  });

  it('applies a 48px minimum and a percentage cap when no card dimensions are provided (Req 2.5)', () => {
    render(<RadarRing visible={true} />);

    const ring = screen.getByTestId('radar-ring');
    expect(ring.style.minWidth).toBe('48px');
    expect(ring.style.minHeight).toBe('48px');
    // Default cap is 50% of the card.
    expect(ring.style.maxWidth).toBe('50%');
    expect(ring.style.maxHeight).toBe('50%');
  });

  it('caps size at 50% of the smallest card dimension when cardDimensions are provided (Req 2.5)', () => {
    render(
      <RadarRing visible={true} cardDimensions={{ width: 400, height: 200 }} />
    );

    const ring = screen.getByTestId('radar-ring');
    // Smallest dimension is 200 -> 50% -> 100px.
    expect(ring.style.width).toBe('100px');
    expect(ring.style.height).toBe('100px');
    expect(ring.style.maxWidth).toBe('100px');
    expect(ring.style.maxHeight).toBe('100px');
    // Minimum still enforced.
    expect(ring.style.minWidth).toBe('48px');
    expect(ring.style.minHeight).toBe('48px');
  });

  it('never renders smaller than the 48px minimum even for a tiny card (Req 2.5)', () => {
    render(
      <RadarRing visible={true} cardDimensions={{ width: 40, height: 30 }} />
    );

    const ring = screen.getByTestId('radar-ring');
    // 50% of 30 = 15px, which is below the 48px floor -> clamp to 48px.
    expect(ring.style.width).toBe('48px');
    expect(ring.style.height).toBe('48px');
  });
});
