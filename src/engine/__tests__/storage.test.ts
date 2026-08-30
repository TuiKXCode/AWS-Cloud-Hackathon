// src/engine/__tests__/storage.test.ts
// Example-based unit tests for the collection persistence adapter.
//
// The adapter no longer owns a key of its own: the PRD (§2, §3) fixes all player
// state to the single `mandaiEchoes.playerState` object, and `collectedAnimals`
// is one field on it. These tests therefore assert the adapter's *behaviour* —
// round-trips, the persisted PRD field names, and the never-throws contract —
// rather than a literal stored string.
//
// Requirements 7.1, 7.2, 7.4.

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  PLAYER_STATE_KEY,
  readRawCollection,
  writeCollection,
} from '../storage';
import type { CollectedRecord } from '../../types';

/** A representative in-memory record, using a real exhibit id from the dataset. */
const record: CollectedRecord = {
  photo: 'data:image/jpeg;base64,AAAA',
  exhibitId: 'malayan-tiger',
  recognizedVia: 'classifier',
  timestamp: 1_724_832_000_000,
};

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

describe('readRawCollection', () => {
  it('round-trips a written collection', () => {
    expect(writeCollection(JSON.stringify([record]))).toBe(true);

    const raw = readRawCollection();
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual([record]);
  });

  it('returns null when nothing has been collected yet', () => {
    // Nothing stored (cleared in afterEach of the previous test).
    expect(readRawCollection()).toBeNull();
  });

  it('returns null when a saved state holds an empty collection', () => {
    expect(writeCollection(JSON.stringify([]))).toBe(true);
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

  it('returns null (without throwing) when the stored value is not JSON', () => {
    localStorage.setItem(PLAYER_STATE_KEY, '{not json');

    expect(() => readRawCollection()).not.toThrow();
    expect(readRawCollection()).toBeNull();
  });
});

describe('writeCollection', () => {
  it('persists entries under the single PRD key, in the PRD field names', () => {
    expect(writeCollection(JSON.stringify([record]))).toBe(true);

    expect(storedState().collectedAnimals).toEqual([
      {
        exhibitId: 'malayan-tiger',
        photoDataUrl: 'data:image/jpeg;base64,AAAA',
        spriteDataUrl: null,
        recognizedVia: 'classifier',
        capturedAt: new Date(record.timestamp).toISOString(),
      },
    ]);
  });

  it('derives `points` from the distinct exhibits collected', () => {
    expect(writeCollection(JSON.stringify([record]))).toBe(true);
    // malayan-tiger is worth 20 points, and nothing has been earned in the game.
    expect(storedState().points).toBe(20);
  });

  it('counts a repeated exhibit only once', () => {
    const second: CollectedRecord = { ...record, timestamp: record.timestamp + 1000 };
    expect(writeCollection(JSON.stringify([record, second]))).toBe(true);

    expect(storedState().points).toBe(20);
  });

  it('preserves points banked by the tycoon game', () => {
    // Simulate a finished shift having already banked 35 points.
    localStorage.setItem(
      PLAYER_STATE_KEY,
      JSON.stringify({
        points: 35,
        collectedAnimals: [],
        voucherRedeemed: false,
        voucherCode: null,
        tycoon: { day: 2, funds: 10, upgrades: {}, bestDay: 35, earnedPoints: 35 },
      }),
    );

    expect(writeCollection(JSON.stringify([record]))).toBe(true);

    // 20 from the photo + 35 already earned in the game.
    expect(storedState().points).toBe(55);
    // ...and the game's own progress is untouched.
    expect(storedState().tycoon).toMatchObject({ day: 2, funds: 10, earnedPoints: 35 });
  });

  it('carries an existing spriteDataUrl across the round-trip', () => {
    const withSprite: CollectedRecord = {
      ...record,
      spriteDataUrl: 'data:image/png;base64,BBBB',
    };
    expect(writeCollection(JSON.stringify([withSprite]))).toBe(true);

    const raw = readRawCollection();
    expect(JSON.parse(raw as string)).toEqual([withSprite]);
  });

  it('returns false for a payload that is not a JSON array', () => {
    expect(writeCollection('{}')).toBe(false);
    expect(writeCollection('{not json')).toBe(false);
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

    const payload = JSON.stringify([record]);
    expect(() => writeCollection(payload)).not.toThrow();
    expect(writeCollection(payload)).toBe(false);
    expect(setItem).toHaveBeenCalledWith(PLAYER_STATE_KEY, expect.any(String));
  });

  it('returns false (without throwing) when localStorage itself is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => writeCollection(JSON.stringify([record]))).not.toThrow();
    expect(writeCollection(JSON.stringify([record]))).toBe(false);
  });
});
