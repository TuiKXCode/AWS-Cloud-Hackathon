// src/engine/__tests__/collectionSprite.test.ts
// Phase 6 (sprite-generation) persistence unit tests (Task 5.5).
//
// Covers the parseCollection / isValidRecord extension that preserves an
// optional `spriteDataUrl` field, and the CaptureContext `updateSpriteDataUrl`
// behavior of keeping the in-memory update when the localStorage write fails.
// Requirements: 3.1, 3.3, 3.4.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';

import { isValidRecord, parseCollection } from '../collection';
import { recordKey } from '../spriteSelection';
// Records live inside the single `mandaiEchoes.playerState` object the PRD fixes
// (§2, §3), and the adapter translates between the persisted and in-memory shapes,
// so these tests seed and assert through it rather than touching a key directly.
import { PLAYER_STATE_KEY, readRawCollection, writeCollection } from '../storage';
import {
  CaptureProvider,
  useCapture,
  type CaptureContextValue,
} from '../../context/CaptureContext';
import { LocationProvider } from '../../context/LocationContext';
import type { CollectedRecord } from '../../types';

const baseRecord: CollectedRecord = {
  photo: 'data:image/png;base64,AAAA',
  exhibitId: 'pygmy-hippo',
  recognizedVia: 'classifier',
  timestamp: 1_700_000_000_000,
};

afterEach(() => {
  vi.unstubAllGlobals();
  try {
    localStorage.clear();
  } catch {
    // ignore if a prior test left a throwing stub in place
  }
});

describe('isValidRecord — spriteDataUrl handling (Phase 6)', () => {
  it('accepts a record with a valid non-empty spriteDataUrl', () => {
    const record = { ...baseRecord, spriteDataUrl: 'data:image/png;base64,SPRITE' };
    expect(isValidRecord(record)).toBe(true);
  });

  it('accepts a legacy record without a spriteDataUrl', () => {
    expect(isValidRecord(baseRecord)).toBe(true);
  });

  it('accepts a record whose spriteDataUrl is explicitly undefined', () => {
    const record = { ...baseRecord, spriteDataUrl: undefined };
    expect(isValidRecord(record)).toBe(true);
  });

  it('rejects a record whose spriteDataUrl is an empty string', () => {
    const record = { ...baseRecord, spriteDataUrl: '' };
    expect(isValidRecord(record)).toBe(false);
  });

  it('rejects a record whose spriteDataUrl is a non-string (number)', () => {
    const record = { ...baseRecord, spriteDataUrl: 123 };
    expect(isValidRecord(record)).toBe(false);
  });

  it('rejects a record whose spriteDataUrl is null', () => {
    const record = { ...baseRecord, spriteDataUrl: null };
    expect(isValidRecord(record)).toBe(false);
  });
});

describe('parseCollection — spriteDataUrl round-trip (Phase 6)', () => {
  it('round-trips a record WITH spriteDataUrl, keeping the field intact', () => {
    const record = { ...baseRecord, spriteDataUrl: 'data:image/png;base64,SPRITE' };
    const raw = JSON.stringify([record]);

    const parsed = parseCollection(raw);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].spriteDataUrl).toBe('data:image/png;base64,SPRITE');
    // All Phase 4 fields preserved (Req 3.4).
    expect(parsed[0].photo).toBe(record.photo);
    expect(parsed[0].exhibitId).toBe(record.exhibitId);
    expect(parsed[0].recognizedVia).toBe(record.recognizedVia);
    expect(parsed[0].timestamp).toBe(record.timestamp);
  });

  it('accepts a legacy record without spriteDataUrl (field stays absent)', () => {
    const raw = JSON.stringify([baseRecord]);

    const parsed = parseCollection(raw);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].spriteDataUrl).toBeUndefined();
  });

  it('drops a record whose spriteDataUrl is present-but-invalid', () => {
    const good = { ...baseRecord, spriteDataUrl: 'data:image/png;base64,SPRITE' };
    const bad = { ...baseRecord, exhibitId: 'tiger', spriteDataUrl: '' };
    const raw = JSON.stringify([good, bad]);

    const parsed = parseCollection(raw);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].exhibitId).toBe('pygmy-hippo');
  });
});

// ---------------------------------------------------------------------------
// CaptureContext.updateSpriteDataUrl — persistence behavior (Req 3.1, 3.3)
// ---------------------------------------------------------------------------

/**
 * Test harness that captures the live CaptureContext value so tests can invoke
 * updateSpriteDataUrl and inspect the resulting collection.
 */
function captureHarness(): { current: CaptureContextValue | null } {
  const ref: { current: CaptureContextValue | null } = { current: null };

  function Probe() {
    ref.current = useCapture();
    return null;
  }

  render(
    <LocationProvider>
      <CaptureProvider>
        <Probe />
      </CaptureProvider>
    </LocationProvider>,
  );

  return ref;
}

describe('CaptureContext.updateSpriteDataUrl (Phase 6)', () => {
  it('sets spriteDataUrl on the matching record and persists it', () => {
    const record = { ...baseRecord };
    writeCollection(JSON.stringify([record]));

    const ctx = captureHarness();
    expect(ctx.current).not.toBeNull();
    expect(ctx.current!.collection).toHaveLength(1);

    const key = recordKey(record);
    act(() => {
      ctx.current!.updateSpriteDataUrl(key, 'data:image/png;base64,SPRITE');
    });

    // In-memory update.
    expect(ctx.current!.collection[0].spriteDataUrl).toBe(
      'data:image/png;base64,SPRITE',
    );
    // Persisted to localStorage.
    const persisted = parseCollection(readRawCollection());
    expect(persisted[0].spriteDataUrl).toBe('data:image/png;base64,SPRITE');
    // Other fields preserved (Req 3.4).
    expect(ctx.current!.collection[0].photo).toBe(record.photo);
    expect(ctx.current!.collection[0].exhibitId).toBe(record.exhibitId);
    expect(ctx.current!.collection[0].timestamp).toBe(record.timestamp);
  });

  it('keeps the in-memory update and discards no records when the write fails (Req 3.3)', () => {
    const record = { ...baseRecord };
    // Seed via a working localStorage, then swap in a stub whose setItem throws
    // so the initial mount restore succeeds but the subsequent write fails.
    writeCollection(JSON.stringify([record]));

    const ctx = captureHarness();
    expect(ctx.current!.collection).toHaveLength(1);

    // The stub must serve the same persisted state the real storage now holds, so
    // the read half of the read-modify-write still succeeds.
    const seeded = localStorage.getItem(PLAYER_STATE_KEY) as string;
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => seeded),
      setItem: vi.fn(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    const key = recordKey(record);
    expect(() =>
      act(() => {
        ctx.current!.updateSpriteDataUrl(key, 'data:image/png;base64,SPRITE');
      }),
    ).not.toThrow();

    // The in-memory collection keeps the update and drops nothing (Req 3.3).
    expect(ctx.current!.collection).toHaveLength(1);
    expect(ctx.current!.collection[0].spriteDataUrl).toBe(
      'data:image/png;base64,SPRITE',
    );
  });
});
