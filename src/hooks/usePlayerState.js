// src/hooks/usePlayerState.js
//
// The one and only bridge to persisted player state (PRD §3): a single localStorage key,
// `mandaiEchoes.playerState`, holding { points, collectedAnimals, voucherRedeemed }.
//
// Phase 7's contract with the rest of the app:
//   READS  `collectedAnimals` — which animals can walk in, and which photo to use as
//          their portrait. Empty (Phases 4/6 not built yet) falls back to every exhibit
//          with drawn placeholder faces, so the game is playable standalone.
//   WRITES `points` — the questline total. This only ever goes UP: a finished day adds
//          what it earned. Upgrades are bought from a separate spendable balance so
//          shopping can never eat into questline progress.
//
// `tycoon: { day, funds, upgrades, bestDay }` is an additive field under the same key.
// Readers that destructure the three documented keys are unaffected by it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { exhibits } from '../data/mandaiData.js';

export const STORAGE_KEY = 'mandaiEchoes.playerState';

const EMPTY_TYCOON = { day: 1, funds: 0, upgrades: {}, bestDay: 0 };

const EMPTY_STATE = {
  points: 0,
  collectedAnimals: [],
  voucherRedeemed: false,
  tycoon: EMPTY_TYCOON,
};

function safeStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    // Private mode / blocked storage. The game still runs, it just won't persist.
    return null;
  }
}

export function readPlayerState() {
  const storage = safeStorage();
  if (!storage) return { ...EMPTY_STATE };

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_STATE,
      ...parsed,
      points: Number.isFinite(parsed?.points) ? parsed.points : 0,
      collectedAnimals: Array.isArray(parsed?.collectedAnimals) ? parsed.collectedAnimals : [],
      tycoon: {
        ...EMPTY_TYCOON,
        ...(parsed?.tycoon ?? {}),
        upgrades: { ...(parsed?.tycoon?.upgrades ?? {}) },
      },
    };
  } catch (error) {
    console.warn('[mandaiEchoes] could not read player state, starting fresh', error);
    return { ...EMPTY_STATE };
  }
}

function writePlayerState(next) {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('[mandaiEchoes] could not persist player state', error);
  }
}

export function usePlayerState() {
  const [playerState, setPlayerState] = useState(readPlayerState);

  // Keep in step if another tab (or another phase of the app) touches the same key.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setPlayerState(readPlayerState());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((mutator) => {
    setPlayerState((current) => {
      const next = mutator(current);
      if (next === current) return current;
      writePlayerState(next);
      return next;
    });
  }, []);

  /**
   * End of day: add what was earned to the questline total. This only ever adds, so the
   * game can contribute to Phase 5 progress but never claw it back.
   */
  const addPoints = useCallback(
    (pointsEarned) => {
      const gain = Math.max(0, Math.round(pointsEarned ?? 0));
      if (gain === 0) return;
      update((current) => ({
        ...current,
        points: Math.max(0, current.points + gain),
        tycoon: {
          ...current.tycoon,
          bestDay: Math.max(current.tycoon.bestDay ?? 0, gain),
        },
      }));
    },
    [update]
  );

  /** Mid-day persistence for the shop: funds spent, upgrades owned. */
  const syncTycoon = useCallback(
    (patch) => {
      update((current) => {
        const nextTycoon = { ...current.tycoon, ...patch };
        const unchanged =
          nextTycoon.day === current.tycoon.day &&
          nextTycoon.funds === current.tycoon.funds &&
          JSON.stringify(nextTycoon.upgrades) === JSON.stringify(current.tycoon.upgrades);
        if (unchanged) return current;
        return { ...current, tycoon: nextTycoon };
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
      update((current) => {
        const existing = current.collectedAnimals.find((entry) => entry.exhibitId === exhibitId);
        const entry = {
          exhibitId,
          photoDataUrl,
          spriteDataUrl: existing?.spriteDataUrl ?? null,
          recognizedVia: existing?.recognizedVia ?? 'location-fallback',
          capturedAt: new Date().toISOString(),
        };
        const collectedAnimals = existing
          ? current.collectedAnimals.map((item) => (item.exhibitId === exhibitId ? entry : item))
          : [...current.collectedAnimals, entry];
        return { ...current, collectedAnimals };
      });
    },
    [update]
  );

  const clearAnimalPhoto = useCallback(
    (exhibitId) => {
      update((current) => ({
        ...current,
        collectedAnimals: current.collectedAnimals.filter((entry) => entry.exhibitId !== exhibitId),
      }));
    },
    [update]
  );

  /**
   * Who can walk in. Once Phases 4/6 exist this narrows to animals the player actually
   * photographed; until then every exhibit is fair game.
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
