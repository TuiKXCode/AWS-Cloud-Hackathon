// src/hooks/useSpriteGeneration.ts
//
// Orchestration hook for Phase 6 (sprite-generation). Drives lazy, independent,
// non-blocking, bounded Sprite_Generation over the current collection.
//
// It consumes the Phase 4 capture context for the persisted `collection` and
// the `updateSpriteDataUrl` updater, resolves each record's Exhibit (via
// mandaiData.js), and calls the effectful `generateSprite` compositor. All of the
// eligibility logic (unknown exhibitId skipped, already-generated skipped,
// bounded reattempts) lives in the pure `selectRecordsForGeneration` helper.
//
// Design guarantees:
//  - Lazy & automatic: records lacking a spriteDataUrl are generated from their
//    existing photo, no re-capture (Req 1.1, 1.2).
//  - Unknown exhibitId skipped and not retried (Req 1.3) — enforced by the
//    selector.
//  - One generation runs at a time via a "busy" ref, so the main thread stays
//    free between records and the gallery stays responsive (Req 6.1).
//  - Each record is processed independently: a failure just leaves the record
//    without a spriteDataUrl, and the selector moves to the next eligible one
//    (Req 6.2).
//  - On success, updateSpriteDataUrl persists and updates the collection, which
//    re-runs this effect and re-renders the gallery entry (Req 3.1, 6.3).
//  - Idempotent: a record with a spriteDataUrl is never re-selected (Req 3.2).
//  - Bounded: after MAX_SPRITE_ATTEMPTS the selector excludes a record, so
//    generation cannot loop indefinitely (Req 4.4).

import { useEffect, useRef, useState } from 'react';

import { useCapture } from '../context/CaptureContext';
import { generateSprite } from '../engine/spriteCompositor';
import {
  recordKey,
  selectRecordsForGeneration,
} from '../engine/spriteSelection';

import { exhibits as rawExhibits } from '../data/mandaiData.js';

import type { Exhibit } from '../types';

const exhibits = rawExhibits as Exhibit[];

/**
 * Lazily generate a Sprite_Data_Url for every Collected_Record that lacks one,
 * one at a time, without blocking the interface.
 *
 * @returns `{ generating }` — true while a generation is in flight, so the UI
 *          can surface a lightweight progress hint.
 */
export function useSpriteGeneration(): { generating: boolean } {
  const { collection, updateSpriteDataUrl } = useCapture();

  const [generating, setGenerating] = useState(false);

  // A monotonic counter bumped after each completed attempt. On the success
  // path `collection` changes and re-runs the effect; on the failure path the
  // collection is unchanged, so bumping this tick is what forces the effect to
  // re-scan for the next eligible record (or a retry within budget).
  const [tick, setTick] = useState(0);

  // Per-record attempt counts keyed by recordKey. Held in a ref so counts
  // survive re-renders; they reset on a fresh reload, which is acceptable for
  // a demo (Req 4.4).
  const attemptsRef = useRef<Map<string, number>>(new Map());

  // Ensures only ONE generation runs at a time (Req 6.1). Set synchronously
  // before awaiting so overlapping effect runs cannot double-start.
  const busyRef = useRef(false);

  // Guards against setState / updates after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Stable lookup of exhibit by id (only `id` and `spriteBodyAsset` are used).
  const exhibitsByIdRef = useRef<Map<string, Exhibit>>(
    new Map(exhibits.map((e) => [e.id, e])),
  );

  useEffect(() => {
    // If a generation is already in flight, let it finish; its completion will
    // bump `tick` (and, on success, change `collection`) to re-run this effect
    // and pick the next record.
    if (busyRef.current) return;

    const eligible = selectRecordsForGeneration(
      collection,
      exhibits,
      attemptsRef.current,
    );

    if (eligible.length === 0) {
      // Nothing left to do.
      if (mountedRef.current) setGenerating(false);
      return;
    }

    // Pick the first eligible record. The selector guarantees its exhibitId is
    // known, so the lookup below is present.
    const record = eligible[0];
    const exhibit = exhibitsByIdRef.current.get(record.exhibitId);
    if (!exhibit) {
      // Defensive: should not happen given the selector; never loop on it.
      return;
    }

    const key = recordKey(record);

    // Claim the single in-flight slot and record the attempt up front so a
    // permanently-failing record is eventually excluded (Req 4.4).
    busyRef.current = true;
    attemptsRef.current.set(key, (attemptsRef.current.get(key) ?? 0) + 1);
    if (mountedRef.current) setGenerating(true);

    let cancelled = false;

    void (async () => {
      let result: string | null = null;
      try {
        // Compositor never throws; normalizes all failures to null.
        result = await generateSprite(record.photo, exhibit.spriteBodyAsset);
      } finally {
        // Always release the slot so the effect can re-scan for the next
        // record, whether this attempt succeeded or failed.
        busyRef.current = false;
      }

      if (cancelled || !mountedRef.current) return;

      if (result !== null) {
        // Persist + update collection -> effect re-runs, this record now has a
        // spriteDataUrl and is excluded, next eligible record is picked
        // (Req 3.1, 6.3).
        updateSpriteDataUrl(key, result);
      }

      // Bump the tick to force a re-scan. On success this coincides with the
      // collection change; on failure (Compositing_Failure) it is the sole
      // trigger that moves us to the next eligible record or a bounded retry
      // (Req 4.4, 6.2).
      setTick((t) => t + 1);
    })();

    return () => {
      cancelled = true;
    };
    // Re-run when the collection changes (success path) or the tick advances
    // (failure path / next-record scan).
  }, [collection, tick, updateSpriteDataUrl]);

  return { generating };
}
