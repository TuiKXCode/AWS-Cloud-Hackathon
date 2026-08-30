// src/hooks/usePlayerState.js
//
// The tycoon game's view onto persisted player state. The state itself lives behind
// `src/engine/playerState.js`, the single gateway to the one localStorage key the PRD
// allows (`mandaiEchoes.playerState`, §2/§3) — this hook only adds the React binding and
// the game-shaped selectors on top.
//
// Phase 7's contract with the rest of the app:
//   READS  `collectedAnimals` — which animals can walk in, and which photo to use as
//          their portrait. Empty (nothing photographed yet) falls back to every exhibit
//          with drawn placeholder faces, so the game is playable standalone.
//   WRITES `points` — the questline total. This only ever goes UP: a finished day adds
//          what it earned. Upgrades are bought from a separate spendable balance
//          (`tycoon.funds`) so shopping can never eat into questline progress.
//
// Every write is read-modify-write via `updatePlayerState`, because the Phase 4 capture
// flow owns `collectedAnimals` on the same key and the two can interleave — the player
// can photograph an animal and then open the game without a reload.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { exhibits } from '../data/mandaiData.js';
import {
  STORAGE_KEY,
  readPlayerState,
  updatePlayerState,
} from '../engine/playerState.js';

export { STORAGE_KEY, readPlayerState };

export function usePlayerState() {
  const [playerState, setPlayerState] = useState(readPlayerState);

  // Keep in step if another tab — or another phase of the app — touches the same key.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setPlayerState(readPlayerState());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /**
   * Apply a mutator to whatever is in storage right now, persist it, and adopt the
   * result. Reading fresh rather than trusting our own React snapshot is what keeps a
   * capture made since our last render from being reverted.
   */
  const update = useCallback((mutator) => {
    setPlayerState((current) => {
      const { state } = updatePlayerState((stored) => mutator(stored, current));
      return state;
    });
  }, []);

  /**
   * End of day: add what was earned to the questline total. This only ever adds, so the
   * game can contribute to Phase 5 progress but never claw it back.
   *
   * `points` and `tycoon.earnedPoints` move together by the same delta, which is what
   * preserves the invariant documented in playerState.js — the capture component of the
   * total is left untouched, so Phase 4 can still recompute its own half independently.
   */
  const addPoints = useCallback(
    (pointsEarned) => {
      const gain = Math.max(0, Math.round(pointsEarned ?? 0));
      if (gain === 0) return;
      update((stored) => ({
        ...stored,
        points: Math.max(0, stored.points + gain),
        tycoon: {
          ...stored.tycoon,
          earnedPoints: Math.max(0, stored.tycoon.earnedPoints + gain),
          bestDay: Math.max(stored.tycoon.bestDay ?? 0, gain),
        },
      }));
    },
    [update]
  );

  /** Mid-day persistence for the shop: funds spent, upgrades owned. */
  const syncTycoon = useCallback(
    (patch) => {
      update((stored) => {
        const nextTycoon = { ...stored.tycoon, ...patch };
        const unchanged =
          nextTycoon.day === stored.tycoon.day &&
          nextTycoon.funds === stored.tycoon.funds &&
          JSON.stringify(nextTycoon.upgrades) === JSON.stringify(stored.tycoon.upgrades);
        if (unchanged) return stored;
        return { ...stored, tycoon: nextTycoon };
      });
    },
    [update]
  );

  /**
   * Attach a photo to a collected animal so its portrait becomes the real thing.
   * Phase 4 writes these entries itself; here it backs the "use a photo" control.
   */
  const setAnimalPhoto = useCallback(
    (exhibitId, photoDataUrl) => {
      update((stored) => {
        const existing = stored.collectedAnimals.find((item) => item.exhibitId === exhibitId);
        const entry = {
          exhibitId,
          photoDataUrl,
          spriteDataUrl: existing?.spriteDataUrl ?? null,
          recognizedVia: existing?.recognizedVia ?? 'location-fallback',
          capturedAt: new Date().toISOString(),
        };
        const collectedAnimals = existing
          ? stored.collectedAnimals.map((item) => (item.exhibitId === exhibitId ? entry : item))
          : [...stored.collectedAnimals, entry];
        return { ...stored, collectedAnimals };
      });
    },
    [update]
  );

  const clearAnimalPhoto = useCallback(
    (exhibitId) => {
      update((stored) => ({
        ...stored,
        collectedAnimals: stored.collectedAnimals.filter(
          (entry) => entry.exhibitId !== exhibitId
        ),
      }));
    },
    [update]
  );

  /**
   * Who can walk in. Narrows to animals the player actually photographed; until they
   * have photographed any, every exhibit is fair game so the game is never empty.
   *
   * Deliberately free of image data so its identity only changes when the cast changes —
   * the reducer re-seeds itself when this array changes.
   */
  const roster = useMemo(() => {
    const collectedIds = new Set(playerState.collectedAnimals.map((entry) => entry.exhibitId));
    const collected = exhibits.filter((exhibit) => collectedIds.has(exhibit.id));
    return collected.length > 0 ? collected : exhibits;
  }, [playerState.collectedAnimals]);

  /**
   * exhibitId -> best available portrait, in order of preference:
   * composited sprite (Phase 6) > raw capture (Phase 4) > bundled asset > null (draw it).
   */
  const headSources = useMemo(() => {
    const sources = {};
    for (const exhibit of exhibits) {
      const entry = playerState.collectedAnimals.find((item) => item.exhibitId === exhibit.id);
      sources[exhibit.id] =
        entry?.spriteDataUrl || entry?.photoDataUrl || exhibit.spriteHeadAsset || null;
    }
    return sources;
  }, [playerState.collectedAnimals]);

  return {
    playerState,
    tycoon: playerState.tycoon,
    roster,
    headSources,
    addPoints,
    syncTycoon,
    setAnimalPhoto,
    clearAnimalPhoto,
  };
}
