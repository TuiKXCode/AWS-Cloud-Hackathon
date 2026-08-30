// src/engine/__tests__/playerState.test.ts
// Tests for the shared player-state gateway (PRD §2, §3) and, most importantly,
// the seam between Phase 4/5 (photo capture + questline) and Phase 7 (the
// tycoon game) — the two halves of the app that write the same localStorage key
// from different React trees.
//
// The invariant under test:
//   points === (points from distinct photographed exhibits) + tycoon.earnedPoints
//
// Neither writer recomputes the whole total; each adjusts only its own
// component. These tests pin that down, because a regression here is silent —
// it shows up as a questline bar that quietly drops or double-counts progress.

import { describe, it, expect, afterEach, vi } from 'vitest';

import {
  PLAYER_STATE_EVENT,
  STORAGE_KEY,
  createEmptyPlayerState,
  readPlayerState,
  updatePlayerState,
  writePlayerState,
} from '../playerState.js';
import { readRawCollection, writeCollection } from '../storage';
import { readVoucherRedeemed, writeVoucherRedeemed } from '../voucherStorage';
import { parseCollection } from '../collection';
import type { CollectedRecord } from '../../types';

const tigerPhoto: CollectedRecord = {
  photo: 'data:image/jpeg;base64,AAAA',
  exhibitId: 'malayan-tiger', // worth 20 points in the dataset
  recognizedVia: 'classifier',
  timestamp: 1_724_832_000_000,
};

const pandaPhoto: CollectedRecord = {
  photo: 'data:image/jpeg;base64,BBBB',
  exhibitId: 'giant-panda', // worth 20 points in the dataset
  recognizedVia: 'location-fallback',
  timestamp: 1_724_918_400_000,
};

/** Stand in for the game banking a finished day, as usePlayerState.addPoints does. */
function bankTycoonDay(gain: number): void {
  updatePlayerState((current) => ({
    ...current,
    points: Math.max(0, current.points + gain),
    tycoon: {
      ...current.tycoon,
      earnedPoints: Math.max(0, current.tycoon.earnedPoints + gain),
      bestDay: Math.max(current.tycoon.bestDay, gain),
    },
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  try {
    localStorage.clear();
  } catch {
    // ignore if a prior test left a throwing stub in place
  }
});

describe('the single storage key', () => {
  it('uses exactly the key the PRD fixes', () => {
    expect(STORAGE_KEY).toBe('mandaiEchoes.playerState');
  });

  it('writes nothing outside that one key', () => {
    writeCollection(JSON.stringify([tigerPhoto]));
    writeVoucherRedeemed(true);
    bankTycoonDay(15);

    expect(Object.keys(localStorage)).toEqual([STORAGE_KEY]);
  });

  it('persists the PRD-documented field names', () => {
    writeCollection(JSON.stringify([tigerPhoto]));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
    expect(Object.keys(stored).sort()).toEqual(
      ['collectedAnimals', 'points', 'tycoon', 'voucherCode', 'voucherRedeemed'].sort(),
    );
    expect(Object.keys(stored.collectedAnimals[0]).sort()).toEqual(
      ['capturedAt', 'exhibitId', 'photoDataUrl', 'recognizedVia', 'spriteDataUrl'].sort(),
    );
  });
});

describe('reading damaged or absent state', () => {
  it('returns an empty state when nothing is saved', () => {
    expect(readPlayerState()).toEqual(createEmptyPlayerState());
  });

  it.each(['{not json', 'null', '"a string"', '[]', '42'])(
    'returns an empty state for the unusable payload %j',
    (raw) => {
      localStorage.setItem(STORAGE_KEY, raw);
      expect(readPlayerState()).toEqual(createEmptyPlayerState());
    },
  );

  it('drops only the corrupt entries, keeping the player the rest of their progress', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        points: 40,
        collectedAnimals: [
          null,
          { exhibitId: 'malayan-tiger' }, // no photo
          { photoDataUrl: 'data:image/jpeg;base64,AAAA' }, // no exhibit id
          {
            exhibitId: 'giant-panda',
            photoDataUrl: 'data:image/jpeg;base64,BBBB',
            spriteDataUrl: null,
            recognizedVia: 'classifier',
            capturedAt: '2026-08-28T10:15:00.000Z',
          },
        ],
        voucherRedeemed: false,
        tycoon: { day: 3, funds: 12, upgrades: { extraTable: true }, bestDay: 20, earnedPoints: 20 },
      }),
    );

    const state = readPlayerState();
    expect(state.collectedAnimals).toHaveLength(1);
    expect(state.collectedAnimals[0].exhibitId).toBe('giant-panda');
    expect(state.points).toBe(40);
    expect(state.tycoon).toEqual({
      day: 3,
      funds: 12,
      upgrades: { extraTable: true },
      bestDay: 20,
      earnedPoints: 20,
    });
  });

  it('never throws when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => readPlayerState()).not.toThrow();
    expect(readPlayerState()).toEqual(createEmptyPlayerState());
    expect(writePlayerState(createEmptyPlayerState())).toBe(false);
  });
});

describe('the points invariant across Phase 4/5 and Phase 7', () => {
  it('adds a photo capture and a banked tycoon day to the same total', () => {
    writeCollection(JSON.stringify([tigerPhoto])); // +20 from the photo
    expect(readPlayerState().points).toBe(20);

    bankTycoonDay(35); // +35 from a finished shift
    expect(readPlayerState().points).toBe(55);
    expect(readPlayerState().tycoon.earnedPoints).toBe(35);
  });

  it('keeps game points when a capture is written afterwards', () => {
    bankTycoonDay(35);
    writeCollection(JSON.stringify([tigerPhoto]));

    // The capture recomputes only its own half and re-adds the game's.
    expect(readPlayerState().points).toBe(55);
    expect(readPlayerState().tycoon.earnedPoints).toBe(35);
  });

  it('keeps capture points when a day is banked afterwards', () => {
    writeCollection(JSON.stringify([tigerPhoto, pandaPhoto])); // 20 + 20
    bankTycoonDay(35);

    expect(readPlayerState().points).toBe(75);
  });

  it('never double-counts a re-photographed exhibit, even across banked days', () => {
    writeCollection(JSON.stringify([tigerPhoto]));
    bankTycoonDay(10);
    // Same exhibit photographed again — a second record, but no new points.
    const again: CollectedRecord = { ...tigerPhoto, timestamp: tigerPhoto.timestamp + 5000 };
    writeCollection(JSON.stringify([tigerPhoto, again]));

    expect(readPlayerState().points).toBe(30); // 20 capture + 10 game
    expect(readPlayerState().collectedAnimals).toHaveLength(2);
  });

  it('only ever moves the total up when the game banks a day', () => {
    writeCollection(JSON.stringify([tigerPhoto]));
    const before = readPlayerState().points;

    bankTycoonDay(0);
    bankTycoonDay(5);

    expect(readPlayerState().points).toBeGreaterThanOrEqual(before);
    expect(readPlayerState().points).toBe(25);
  });
});

describe('interleaved writes from the two halves of the app', () => {
  it('a voucher write does not revert a capture or a banked day', () => {
    writeCollection(JSON.stringify([tigerPhoto]));
    bankTycoonDay(35);
    writeVoucherRedeemed(true);

    const state = readPlayerState();
    expect(state.voucherRedeemed).toBe(true);
    expect(state.points).toBe(55);
    expect(state.collectedAnimals).toHaveLength(1);
    expect(state.tycoon.earnedPoints).toBe(35);
  });

  it('a banked day does not revert the collection or the voucher flag', () => {
    writeCollection(JSON.stringify([tigerPhoto]));
    writeVoucherRedeemed(true);
    bankTycoonDay(35);

    expect(readVoucherRedeemed()).toBe(true);
    expect(parseCollection(readRawCollection())).toHaveLength(1);
  });

  it('the game sees photos taken by the capture flow', () => {
    writeCollection(JSON.stringify([tigerPhoto, pandaPhoto]));

    // This is what usePlayerState builds its roster and portraits from.
    const collected = readPlayerState().collectedAnimals;
    expect(collected.map((entry) => entry.exhibitId)).toEqual([
      'malayan-tiger',
      'giant-panda',
    ]);
    expect(collected[0].photoDataUrl).toBe(tigerPhoto.photo);
  });
});

describe('same-tab change notification', () => {
  it('announces every successful write so the other half can re-read', () => {
    const listener = vi.fn();
    window.addEventListener(PLAYER_STATE_EVENT, listener);

    bankTycoonDay(10);
    writeCollection(JSON.stringify([tigerPhoto]));

    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(PLAYER_STATE_EVENT, listener);
  });

  it('carries the new state on the event, so listeners need not re-read', () => {
    let seen: { points: number } | null = null;
    const listener = ((event: CustomEvent) => {
      seen = event.detail;
    }) as EventListener;
    window.addEventListener(PLAYER_STATE_EVENT, listener);

    bankTycoonDay(10);

    expect(seen).not.toBeNull();
    expect(seen!.points).toBe(10);
    window.removeEventListener(PLAYER_STATE_EVENT, listener);
  });

  it('does not announce a write that failed', () => {
    const listener = vi.fn();
    window.addEventListener(PLAYER_STATE_EVENT, listener);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    expect(writePlayerState(createEmptyPlayerState())).toBe(false);
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(PLAYER_STATE_EVENT, listener);
  });
});
