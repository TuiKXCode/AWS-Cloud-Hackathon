// src/engine/__tests__/storage.test.ts
// Example-based unit tests for the localStorage persistence adapter.
// Covers the happy paths and the failure paths (getItem/setItem throwing),
// asserting that neither function ever throws. Requirements 7.1, 7.2, 7.4.

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  COLLECTED_ANIMALS_KEY,
  readRawCollection,
  writeCollection,
} from '../storage';

afterEach(() => {
  // Restore any stubbed globals and clear real jsdom storage between tests.
  vi.unstubAllGlobals();
  try {
    localStorage.clear();
  } catch {
    // ignore if a prior test left a throwing stub in place
  }
});

describe('readRawCollection', () => {
  it('returns the stored value when the key is present', () => {
    const payload = JSON.stringify([{ exhibitId: 'tiger' }]);
    localStorage.setItem(COLLECTED_ANIMALS_KEY, payload);

    expect(readRawCollection()).toBe(payload);
  });

  it('returns null when the key is missing', () => {
    // Nothing stored (cleared in afterEach of the previous test).
    expect(readRawCollection()).toBeNull();
  });

  it('returns null (without throwing) when getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('SecurityError: storage disabled');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    expect(() => readRawCollection()).not.toThrow();
    expect(readRawCollection()).toBeNull();
  });

  it('returns null (without throwing) when localStorage itself is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => readRawCollection()).not.toThrow();
    expect(readRawCollection()).toBeNull();
  });
});

describe('writeCollection', () => {
  it('returns true on success and stores the value under the key', () => {
    const payload = JSON.stringify([{ exhibitId: 'panda' }]);

    expect(writeCollection(payload)).toBe(true);
    expect(localStorage.getItem(COLLECTED_ANIMALS_KEY)).toBe(payload);
  });

  it('returns false (without throwing) when setItem throws (e.g. quota exceeded)', () => {
    const setItem = vi.fn(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    expect(() => writeCollection('{}')).not.toThrow();
    expect(writeCollection('{}')).toBe(false);
    expect(setItem).toHaveBeenCalledWith(COLLECTED_ANIMALS_KEY, '{}');
  });

  it('returns false (without throwing) when localStorage itself is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => writeCollection('{}')).not.toThrow();
    expect(writeCollection('{}')).toBe(false);
  });
});
