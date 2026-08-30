import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from '../useReducedMotion';

type ChangeHandler = (event: MediaQueryListEvent) => void;

/**
 * Creates a controllable matchMedia mock. Returns the mock plus an `emit`
 * helper to simulate runtime media query changes.
 */
function createMatchMediaMock(initialMatches: boolean) {
  const listeners = new Set<ChangeHandler>();
  let matches = initialMatches;

  const matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_event: string, handler: ChangeHandler) => {
      listeners.add(handler);
    },
    removeEventListener: (_event: string, handler: ChangeHandler) => {
      listeners.delete(handler);
    },
    // Legacy API (unused by hook but kept for MediaQueryList shape).
    addListener: (handler: ChangeHandler) => listeners.add(handler),
    removeListener: (handler: ChangeHandler) => listeners.delete(handler),
    dispatchEvent: () => true,
  }));

  const emit = (nextMatches: boolean) => {
    matches = nextMatches;
    listeners.forEach((handler) =>
      handler({ matches: nextMatches } as MediaQueryListEvent)
    );
  };

  return { matchMedia, emit };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useReducedMotion', () => {
  it('returns true when reduced motion is enabled', () => {
    const { matchMedia } = createMatchMediaMock(true);
    vi.stubGlobal('matchMedia', matchMedia);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it('returns false when reduced motion is disabled', () => {
    const { matchMedia } = createMatchMediaMock(false);
    vi.stubGlobal('matchMedia', matchMedia);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it('responds to runtime media query change events', () => {
    const { matchMedia, emit } = createMatchMediaMock(false);
    vi.stubGlobal('matchMedia', matchMedia);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      emit(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      emit(false);
    });
    expect(result.current).toBe(false);
  });

  it('defaults to false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});
