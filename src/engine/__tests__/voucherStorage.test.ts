// src/engine/__tests__/voucherStorage.test.ts
// Example-based unit tests for the questline-progress localStorage adapter.
// Covers happy-path round-trips, defensive parsing of the redeemed flag, and
// the failure paths (getItem/setItem throwing / storage unavailable),
// asserting that neither read nor write ever throws.
// Requirements 2.4, 2.5, 3.1, 3.3, 3.4.

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  VOUCHER_REDEEMED_KEY,
  VOUCHER_CODE_KEY,
  readVoucherRedeemed,
  writeVoucherRedeemed,
  readVoucherCode,
  writeVoucherCode,
} from '../voucherStorage';

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
  it('returns true only for the JSON boolean "true"', () => {
    localStorage.setItem(VOUCHER_REDEEMED_KEY, 'true');
    expect(readVoucherRedeemed()).toBe(true);
  });

  it('returns false for "false"', () => {
    localStorage.setItem(VOUCHER_REDEEMED_KEY, 'false');
    expect(readVoucherRedeemed()).toBe(false);
  });

  it.each(['1', 'yes', '', 'TRUE', '"true"', '{not json'])(
    'returns false for the unparseable/non-true value %j',
    (raw) => {
      localStorage.setItem(VOUCHER_REDEEMED_KEY, raw);
      expect(readVoucherRedeemed()).toBe(false);
    },
  );

  it('returns false when the key is absent', () => {
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
    expect(localStorage.getItem(VOUCHER_REDEEMED_KEY)).toBe('true');
    expect(readVoucherRedeemed()).toBe(true);
  });

  it('round-trips: writing false then reading returns false', () => {
    expect(writeVoucherRedeemed(false)).toBe(true);
    expect(localStorage.getItem(VOUCHER_REDEEMED_KEY)).toBe('false');
    expect(readVoucherRedeemed()).toBe(false);
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
    expect(setItem).toHaveBeenCalledWith(VOUCHER_REDEEMED_KEY, 'true');
  });

  it('returns false (without throwing) when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => writeVoucherRedeemed(true)).not.toThrow();
    expect(writeVoucherRedeemed(true)).toBe(false);
  });
});

describe('readVoucherCode', () => {
  it('returns the stored code when present', () => {
    localStorage.setItem(VOUCHER_CODE_KEY, 'ABC123');
    expect(readVoucherCode()).toBe('ABC123');
  });

  it('returns null when the key is absent', () => {
    expect(readVoucherCode()).toBeNull();
  });

  it('returns null when the stored value is empty', () => {
    localStorage.setItem(VOUCHER_CODE_KEY, '');
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
    expect(localStorage.getItem(VOUCHER_CODE_KEY)).toBe('ABC123');
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
    expect(setItem).toHaveBeenCalledWith(VOUCHER_CODE_KEY, 'ABC123');
  });

  it('returns false (without throwing) when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => writeVoucherCode('ABC123')).not.toThrow();
    expect(writeVoucherCode('ABC123')).toBe(false);
  });
});
