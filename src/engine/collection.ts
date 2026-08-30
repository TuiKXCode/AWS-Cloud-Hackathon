// src/engine/collection.ts
// Pure collection logic for the checkpoint-photo-capture feature (Phase 4).
//
// This module contains NO React and NO localStorage access. It is a set of
// deterministic, side-effect-free functions over plain data so the behavior
// can be fully property-tested. The localStorage adapter lives separately in
// storage.ts.
//
// Requirements covered: 5.1, 5.2, 5.3, 5.4, 7.3, 7.4, 7.5
// Phase 6 (sprite-generation) extends isValidRecord/parseCollection to preserve
// an optional `spriteDataUrl` string field (Req 3.4).

import type { Exhibit, CollectedRecord, RecognitionMethod } from '../types';

/** The recognition methods that count as valid for a stored record (Req 7.6). */
const VALID_RECOGNITION_METHODS: readonly RecognitionMethod[] = [
  'classifier',
  'location-fallback',
];

/** Inclusive lower bound for an awardable points value (Req 5.4). */
const MIN_POINTS = 0;
/** Inclusive upper bound for an awardable points value (Req 5.4). */
const MAX_POINTS = 999_999;

/**
 * Type guard: true iff `value` is a well-formed CollectedRecord (Req 7.5).
 *  - `photo` is a non-empty string
 *  - `exhibitId` is a non-empty string
 *  - `recognizedVia` is 'classifier' or 'location-fallback'
 *  - `timestamp` is a finite number
 *  - `spriteDataUrl` is either absent (undefined) OR a non-empty string
 *    (Phase 6). A present-but-invalid value — an empty string, null, a number,
 *    etc. — makes the whole record invalid. Absence is normal and marks a
 *    record whose sprite has not been generated yet (backward compatible with
 *    Phase 4 records that predate this field).
 */
export function isValidRecord(value: unknown): value is CollectedRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;

  if (typeof record.photo !== 'string' || record.photo.length === 0) {
    return false;
  }
  if (typeof record.exhibitId !== 'string' || record.exhibitId.length === 0) {
    return false;
  }
  if (
    typeof record.recognizedVia !== 'string' ||
    !VALID_RECOGNITION_METHODS.includes(record.recognizedVia as RecognitionMethod)
  ) {
    return false;
  }
  if (typeof record.timestamp !== 'number' || !Number.isFinite(record.timestamp)) {
    return false;
  }
  // Phase 6: `spriteDataUrl` is optional. When present it MUST be a non-empty
  // string; anything else (empty string, null, non-string) is invalid.
  if (record.spriteDataUrl !== undefined) {
    if (typeof record.spriteDataUrl !== 'string' || record.spriteDataUrl.length === 0) {
      return false;
    }
  }
  return true;
}

/**
 * Parse the raw localStorage string into a list of valid records.
 *  - `null`, non-JSON, or JSON that is not an array → `[]` (Req 7.4).
 *  - Otherwise, keep the valid records (isValidRecord) in their original order
 *    and drop the invalid ones (Req 7.5).
 */
export function parseCollection(raw: string | null): CollectedRecord[] {
  if (raw === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isValidRecord);
}

/**
 * Append a record, returning a NEW array. The input collection is not mutated.
 */
export function appendRecord(
  collection: CollectedRecord[],
  record: CollectedRecord,
): CollectedRecord[] {
  return [...collection, record];
}

/**
 * True iff the exhibit's points value is present and within 0..999999 (Req 5.4).
 * Returns false when the exhibit is undefined or its points is missing/out of
 * range.
 */
export function isPointsAwardable(exhibit: Exhibit | undefined): boolean {
  if (exhibit === undefined || exhibit === null) {
    return false;
  }
  const { points } = exhibit;
  if (typeof points !== 'number' || !Number.isFinite(points)) {
    return false;
  }
  return points >= MIN_POINTS && points <= MAX_POINTS;
}

/**
 * Player_Total = sum of `points` over the set of DISTINCT exhibit ids present
 * in the collection that both (a) correspond to a known exhibit and (b) have a
 * points value that is present and within 0..999999. Each distinct exhibit is
 * counted at most once; unknown ids or missing/out-of-range points contribute 0
 * (Req 5.1, 5.3, 5.4, 7.3).
 */
export function computePlayerTotal(
  collection: CollectedRecord[],
  exhibits: Exhibit[],
): number {
  const exhibitsById = new Map<string, Exhibit>();
  for (const exhibit of exhibits) {
    exhibitsById.set(exhibit.id, exhibit);
  }

  const distinctIds = new Set<string>();
  for (const record of collection) {
    distinctIds.add(record.exhibitId);
  }

  let total = 0;
  for (const id of distinctIds) {
    const exhibit = exhibitsById.get(id);
    if (isPointsAwardable(exhibit)) {
      total += exhibit!.points;
    }
  }
  return total;
}

/**
 * Whether tagging `exhibitId` would be a first tag: true when the id is NOT
 * already present among the collection's records (Req 5.1, 5.2, 5.3).
 */
export function isFirstTag(
  collection: CollectedRecord[],
  exhibitId: string,
): boolean {
  return !collection.some((record) => record.exhibitId === exhibitId);
}
