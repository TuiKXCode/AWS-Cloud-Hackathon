// src/engine/storage.ts
// Persistence adapter for the checkpoint-photo-capture feature (Phase 4).
//
// The PRD (§2, §3) fixes ALL runtime player state to a single namespaced key,
// `mandaiEchoes.playerState`, so this module no longer owns a key of its own:
// it delegates to the shared gateway in `playerState.js` and translates between
// the two record shapes on the way through.
//
//   persisted (PRD §3)  { exhibitId, photoDataUrl, spriteDataUrl, recognizedVia, capturedAt }
//   in-memory           { photo, exhibitId, recognizedVia, timestamp, spriteDataUrl? }
//
// The in-memory shape is deliberately left alone. The PRD constrains what lands
// in localStorage, not what the capture flow calls its fields, and keeping
// `CollectedRecord` stable means `collection.ts`, `spriteSelection.ts` and
// `CaptureContext` — and their tests — carry on unchanged. The translation is
// lossless: `timestamp` (ms) round-trips through `capturedAt` (ISO-8601).
//
// Both functions stay defensive, exactly as before: a read failure normalizes to
// `null`, which the caller parses as an empty collection (Req 7.4); a write
// failure is reported as `false` so the UI can surface a save warning without
// discarding the in-memory record (Req 7.2). Neither ever throws.

import { STORAGE_KEY, readPlayerState, updatePlayerState } from './playerState.js';
import { computePlayerTotal } from './collection';
import { exhibits as rawExhibits } from '../data/mandaiData.js';
import type { CollectedRecord, Exhibit, RecognitionMethod } from '../types';

const exhibits = rawExhibits as Exhibit[];

/**
 * One entry of `collectedAnimals` as it is persisted (PRD §3). Declared here
 * rather than imported from the JSDoc-annotated `playerState.js`, so the
 * translation contract is stated in TypeScript at the boundary that owns it.
 */
interface CollectedAnimal {
  exhibitId: string;
  photoDataUrl: string;
  spriteDataUrl: string | null;
  recognizedVia: RecognitionMethod;
  capturedAt: string;
}

/**
 * The localStorage key backing the collection. Re-exported from the shared
 * gateway so there is exactly one definition of it in the codebase.
 */
export const PLAYER_STATE_KEY = STORAGE_KEY;

/** Persisted (PRD) entry -> in-memory record. */
function toRecord(animal: CollectedAnimal): CollectedRecord {
  const record: CollectedRecord = {
    photo: animal.photoDataUrl,
    exhibitId: animal.exhibitId,
    recognizedVia: animal.recognizedVia,
    timestamp: Date.parse(animal.capturedAt),
  };
  // `spriteDataUrl` is optional in memory and nullable on disk; only a real
  // value is carried across, so `isValidRecord` never sees a null (Req 3.4).
  if (typeof animal.spriteDataUrl === 'string' && animal.spriteDataUrl.length > 0) {
    record.spriteDataUrl = animal.spriteDataUrl;
  }
  return record;
}

/** In-memory record -> persisted (PRD) entry. */
function toAnimal(record: CollectedRecord): CollectedAnimal {
  const timestamp = Number.isFinite(record.timestamp) ? record.timestamp : 0;
  return {
    exhibitId: record.exhibitId,
    photoDataUrl: record.photo,
    spriteDataUrl:
      typeof record.spriteDataUrl === 'string' && record.spriteDataUrl.length > 0
        ? record.spriteDataUrl
        : null,
    recognizedVia: record.recognizedVia,
    capturedAt: new Date(timestamp).toISOString(),
  };
}

/**
 * Read the collected-animals records as the JSON string the caller expects.
 *
 * Returns a JSON array of in-memory {@link CollectedRecord}s, or `null` when
 * nothing has been collected yet or when reading fails for ANY reason
 * (localStorage unavailable, security restrictions, malformed payload). Never
 * throws (Req 7.1, 7.4).
 *
 * @returns The serialized collection, or `null` if absent/unreadable.
 */
export function readRawCollection(): string | null {
  try {
    const { collectedAnimals } = readPlayerState();
    if (collectedAnimals.length === 0) {
      // No entries is indistinguishable from no saved state, and both parse to
      // an empty collection upstream (Req 7.4).
      return null;
    }
    return JSON.stringify(collectedAnimals.map(toRecord));
  } catch {
    return null;
  }
}

/**
 * Persist the given collection, serialized as a JSON array of in-memory
 * {@link CollectedRecord}s.
 *
 * The write is read-modify-write against the shared key: only `collectedAnimals`
 * and the derived `points` total are replaced, so a tycoon day banked between
 * this read and this write is preserved. `points` is recomputed as the capture
 * component (distinct photographed exhibits) plus whatever the game has
 * contributed, which is the invariant documented in `playerState.js`.
 *
 * Returns `true` on a successful write, or `false` when the write fails for ANY
 * reason (quota exceeded, storage unavailable, malformed input). Never throws,
 * so a failed persist does not discard the in-memory record (Req 7.2).
 *
 * @param json The serialized collection to persist.
 * @returns `true` if the value was stored, `false` otherwise.
 */
export function writeCollection(json: string): boolean {
  let records: CollectedRecord[];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return false;
    records = parsed as CollectedRecord[];
  } catch {
    return false;
  }

  try {
    const { saved } = updatePlayerState((current) => ({
      ...current,
      collectedAnimals: records.map(toAnimal),
      points: computePlayerTotal(records, exhibits) + current.tycoon.earnedPoints,
    }));
    return saved;
  } catch {
    return false;
  }
}
