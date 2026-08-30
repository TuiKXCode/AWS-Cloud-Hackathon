// src/engine/__tests__/voucherStorage.test.ts
// Example-based unit tests for the questline-progress persistence adapter.
//
// The redeemed flag and the voucher code are two fields on the single
// `mandaiEchoes.playerState` object the PRD fixes (§2, §3), not two keys of
// their own. These tests assert the adapter's behaviour — round-trips, safe
// defaults for absent/corrupt state, and the never-throws contract — against
// that layout.
//
// Requirements 2.4, 2.5, 3.1, 3.3, 3.4.

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  PLAYER_STATE_KEY,
  readVoucherRedeemed,
  writeVoucherRedeemed,
  readVoucherCode,
  writeVoucherCode,
} from '../voucherStorage';

/** Seed the shared key with an arbitrary payload. */
function seed(state: unknown): void {
  localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
}

/** Read the persisted state object back out of jsdom storage. */
function storedState(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(PLAYER_STATE_KEY) ?? '{}');
}

afterEach(() => {
  // Restore any stubbed globals and clear real jsdom storage between tests.
  vi.unstubAllGlobals();
  try {
    localStorage.clear();
  } catch {
    // ignore if a prior test left a throwing stub in place
  }
});

describe('readVoucherRedeemed', () => {
  it('returns true only for the boolean true', () => {
    seed({ voucherRedeemed: true });
    expect(readVoucherRedeemed()).toBe(true);
  });

  it('returns false for the boolean false', () => {
    seed({ voucherRedeemed: false });
    expect(readVoucherRedeemed()).toBe(false);
  });

  it.each([1, 'yes', '', 'true', null, {}])(
    'returns false for the non-boolean value %j',
    (value) => {
      seed({ voucherRedeemed: value });
      expect(readVoucherRedeemed()).toBe(false);
    },
  );

  it('returns false when no state has been saved', () => {
    expect(readVoucherRedeemed()).toBe(false);
  });

  it('returns false when the stored value is not JSON', () => {
    localStorage.setItem(PLAYER_STATE_KEY, '{not json');
    expect(readVoucherRedeemed()).toBe(false);
  });

  it('returns false (without throwing) when getItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('SecurityError: storage disabled');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    expect(() => readVoucherRedeemed()).not.toThrow();
    expect(readVoucherRedeemed()).toBe(false);
  });

  it('returns false (without throwing) when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => readVoucherRedeemed()).not.toThrow();
    expect(readVoucherRedeemed()).toBe(false);
  });
});

describe('writeVoucherRedeemed', () => {
  it('round-trips: writing true then reading returns true', () => {
    expect(writeVoucherRedeemed(true)).toBe(true);
    expect(storedState().voucherRedeemed).toBe(true);
    expect(readVoucherRedeemed()).toBe(true);
  });

  it('round-trips: writing false then reading returns false', () => {
    expect(writeVoucherRedeemed(false)).toBe(true);
    expect(storedState().voucherRedeemed).toBe(false);
    expect(readVoucherRedeemed()).toBe(false);
  });

  it('leaves the rest of the player state untouched', () => {
    seed({
      points: 40,
      collectedAnimals: [
        {
          exhibitId: 'giant-panda',
          photoDataUrl: 'data:image/jpeg;base64,AAAA',
          spriteDataUrl: null,
          recognizedVia: 'classifier',
          capturedAt: '2026-08-28T10:15:00.000Z',
        },
      ],
      voucherRedeemed: false,
      voucherCode: 'ABC123',
      tycoon: { day: 3, funds: 15, upgrades: { extraTable: true }, bestDay: 20, earnedPoints: 20 },
    });

    expect(writeVoucherRedeemed(true)).toBe(true);

    const state = storedState();
    expect(state.points).toBe(40);
    expect(state.voucherCode).toBe('ABC123');
    expect(state.collectedAnimals).toHaveLength(1);
    expect(state.tycoon).toMatchObject({ day: 3, funds: 15, earnedPoints: 20 });
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

    expect(() => writeVoucherRedeemed(true)).not.toThrow();
    expect(writeVoucherRedeemed(true)).toBe(false);
    expect(setItem).toHaveBeenCalledWith(PLAYER_STATE_KEY, expect.any(String));
  });

  it('returns false (without throwing) when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => writeVoucherRedeemed(true)).not.toThrow();
    expect(writeVoucherRedeemed(true)).toBe(false);
  });
});

describe('readVoucherCode', () => {
  it('returns the stored code when present', () => {
    seed({ voucherCode: 'ABC123' });
    expect(readVoucherCode()).toBe('ABC123');
  });

  it('returns null when no state has been saved', () => {
    expect(readVoucherCode()).toBeNull();
  });

  it('returns null when the stored code is empty', () => {
    seed({ voucherCode: '' });
    expect(readVoucherCode()).toBeNull();
  });

  it('returns null when the stored code is not a string', () => {
    seed({ voucherCode: 12345 });
    expect(readVoucherCode()).toBeNull();
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

    expect(() => readVoucherCode()).not.toThrow();
    expect(readVoucherCode()).toBeNull();
  });

  it('returns null (without throwing) when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => readVoucherCode()).not.toThrow();
    expect(readVoucherCode()).toBeNull();
  });
});

describe('writeVoucherCode', () => {
  it('round-trips: writing a code then reading returns the same code', () => {
    expect(writeVoucherCode('ABC123')).toBe(true);
    expect(storedState().voucherCode).toBe('ABC123');
    expect(readVoucherCode()).toBe('ABC123');
  });

  it('returns false (without throwing) when setItem throws', () => {
    const setItem = vi.fn(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    expect(() => writeVoucherCode('ABC123')).not.toThrow();
    expect(writeVoucherCode('ABC123')).toBe(false);
    expect(setItem).toHaveBeenCalledWith(PLAYER_STATE_KEY, expect.any(String));
  });

  it('returns false (without throwing) when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => writeVoucherCode('ABC123')).not.toThrow();
    expect(writeVoucherCode('ABC123')).toBe(false);
  });
});
