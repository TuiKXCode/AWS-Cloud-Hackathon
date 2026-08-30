// src/engine/__tests__/spriteSelection.property.test.ts
// Property-based tests for the pure sprite-generation selection predicate
// (Phase 6). Validates design correctness Property 1. Each test runs a
// minimum of 100 iterations via fast-check.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  MAX_SPRITE_ATTEMPTS,
  recordKey,
  selectRecordsForGeneration,
} from '../spriteSelection';
import type { CollectedRecord, RecognitionMethod } from '../../types';

const RECOGNITION_METHODS: readonly RecognitionMethod[] = [
  'classifier',
  'location-fallback',
];

// A generator for a CollectedRecord whose exhibitId is drawn from a supplied
// pool (mix of known / unknown) and whose spriteDataUrl may be absent, empty,
// or a real value.
function recordArb(idPool: string[]): fc.Arbitrary<CollectedRecord> {
  return fc.record(
    {
      photo: fc.string({ minLength: 1, maxLength: 8 }).map((s) => `photo-${s}`),
      exhibitId: fc.constantFrom(...idPool),
      recognizedVia: fc.constantFrom(...RECOGNITION_METHODS),
      timestamp: fc.integer({ min: 0, max: 1_000_000 }),
      spriteDataUrl: fc.oneof(
        fc.constant(undefined),
        fc.constant(''),
        fc.string({ minLength: 1, maxLength: 12 }).map((s) => `data:${s}`),
      ),
    },
    { requiredKeys: ['photo', 'exhibitId', 'recognizedVia', 'timestamp'] },
  );
}

describe('spriteSelection property tests', () => {
  // Feature: sprite-generation, Property 1: selectRecordsForGeneration selects
  // EXACTLY the records that simultaneously (a) resolve to a known exhibit,
  // (b) have no spriteDataUrl, and (c) have attempts < MAX_SPRITE_ATTEMPTS;
  // preserving original order. Records with an unknown exhibitId are never
  // selected (Req 1.3); records that already have a spriteDataUrl are never
  // selected (Req 3.2); records at/over the attempt cap are never selected
  // (Req 4.4).
  // Validates: Requirements 1.3, 3.2, 4.4
  it('Property 1: selects exactly the eligible records, in order', () => {
    fc.assert(
      fc.property(
        // Known exhibit ids (unique).
        fc.uniqueArray(
          fc.string({ minLength: 1, maxLength: 5 }).map((s) => `ex-${s}`),
          { minLength: 1, maxLength: 6 },
        ),
        (knownIds) => {
          // The id pool blends known ids with ids guaranteed to be unknown.
          const idPool = [...knownIds, 'UNKNOWN-1', 'UNKNOWN-2'];

          return fc.assert(
            fc.property(
              fc.array(recordArb(idPool), { maxLength: 25 }),
              // A random attempt map: for each candidate key we may assign a
              // count spanning below, at, and above the cap.
              fc.dictionary(
                fc.string({ minLength: 1, maxLength: 12 }),
                fc.integer({ min: 0, max: MAX_SPRITE_ATTEMPTS + 2 }),
              ),
              (collection, attemptsObj) => {
                const attempts = new Map<string, number>(
                  Object.entries(attemptsObj),
                );
                // Ensure some records' keys land in the map with varied counts,
                // so condition (c) is genuinely exercised.
                collection.forEach((r, i) => {
                  if (i % 3 === 0) {
                    attempts.set(recordKey(r), i % (MAX_SPRITE_ATTEMPTS + 2));
                  }
                });

                const exhibits = knownIds.map((id) => ({ id }));
                const selected = selectRecordsForGeneration(
                  collection,
                  exhibits,
                  attempts,
                );

                const knownSet = new Set(knownIds);
                const isEligible = (r: CollectedRecord): boolean => {
                  const known = knownSet.has(r.exhibitId);
                  const noSprite =
                    r.spriteDataUrl === undefined || r.spriteDataUrl === '';
                  const count = attempts.get(recordKey(r)) ?? 0;
                  return known && noSprite && count < MAX_SPRITE_ATTEMPTS;
                };

                const expected = collection.filter(isEligible);

                // Exact membership + order + no extras.
                expect(selected).toEqual(expected);

                // Reinforce the individual guarantees.
                for (const r of selected) {
                  expect(knownSet.has(r.exhibitId)).toBe(true); // Req 1.3
                  expect(
                    r.spriteDataUrl === undefined || r.spriteDataUrl === '',
                  ).toBe(true); // Req 3.2
                  expect(attempts.get(recordKey(r)) ?? 0).toBeLessThan(
                    MAX_SPRITE_ATTEMPTS,
                  ); // Req 4.4
                }
                // Nothing eligible was dropped.
                for (const r of collection) {
                  if (isEligible(r)) {
                    expect(selected).toContain(r);
                  }
                }
              },
            ),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 3 },
    );
  });
});
