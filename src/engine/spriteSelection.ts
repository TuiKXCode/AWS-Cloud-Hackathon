// src/engine/spriteSelection.ts
// Pure, deterministic helpers for sprite-generation (Phase 6) orchestration.
// No React, no I/O, no Canvas. These functions decide which Collected_Records
// are eligible for Sprite_Generation and immutably set a record's
// spriteDataUrl. All correctness properties P1 (selection) and P4 (updater)
// target this module.

import type { CollectedRecord } from '../types';

/**
 * Max in-memory generation attempts per record before it is no longer
 * selected, so generation cannot loop indefinitely (Req 4.4).
 */
export const MAX_SPRITE_ATTEMPTS = 3;

/**
 * A stable key for a Collected_Record, used to track attempts and to target
 * a specific record for updates. Two records that share an exhibitId and
 * timestamp collide by design (they are the "same" collected moment).
 */
export function recordKey(record: CollectedRecord): string {
  return `${record.exhibitId}-${record.timestamp}`;
}

/**
 * True when a record has no usable spriteDataUrl yet (absent or empty).
 */
function lacksSprite(record: CollectedRecord): boolean {
  return record.spriteDataUrl === undefined || record.spriteDataUrl === '';
}

/**
 * Select exactly the records eligible for Sprite_Generation, preserving the
 * original collection order. A record is eligible iff ALL hold:
 *   (a) its exhibitId resolves to a known exhibit in `exhibits` (Req 1.3),
 *   (b) it has no spriteDataUrl yet — idempotence (Req 3.2), and
 *   (c) its attempt count (default 0) is strictly below MAX_SPRITE_ATTEMPTS —
 *       boundedness (Req 4.4).
 *
 * @param collection the current Collected_Records
 * @param exhibits   the exhibits dataset (only `id` is consulted)
 * @param attempts   per-record attempt counts keyed by recordKey()
 */
export function selectRecordsForGeneration(
  collection: CollectedRecord[],
  exhibits: { id: string }[],
  attempts: Map<string, number>,
): CollectedRecord[] {
  const knownIds = new Set(exhibits.map((e) => e.id));

  return collection.filter((record) => {
    if (!knownIds.has(record.exhibitId)) return false; // (a) Req 1.3
    if (!lacksSprite(record)) return false; // (b) Req 3.2
    const count = attempts.get(recordKey(record)) ?? 0;
    return count < MAX_SPRITE_ATTEMPTS; // (c) Req 4.4
  });
}

/**
 * Return a NEW collection where the record whose recordKey === `key` has its
 * spriteDataUrl set to `spriteDataUrl`. All other fields of that record, all
 * other records, and the collection length are unchanged (Req 3.4). If no
 * record matches, an equivalent new array is returned (no change).
 */
export function setSpriteDataUrl(
  collection: CollectedRecord[],
  key: string,
  spriteDataUrl: string,
): CollectedRecord[] {
  return collection.map((record) =>
    recordKey(record) === key ? { ...record, spriteDataUrl } : record,
  );
}
