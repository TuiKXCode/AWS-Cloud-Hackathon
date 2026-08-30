// src/engine/__tests__/spriteUpdate.property.test.ts
// Property-based tests for the pure sprite-generation record updater
// (Phase 6). Validates design correctness Property 4. Each test runs a
// minimum of 100 iterations via fast-check.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { recordKey, setSpriteDataUrl } from '../spriteSelection';
import type { CollectedRecord, RecognitionMethod } from '../../types';

const RECOGNITION_METHODS: readonly RecognitionMethod[] = [
  'classifier',
  'location-fallback',
];

const recordArb: fc.Arbitrary<CollectedRecord> = fc.record(
  {
    photo: fc.string({ minLength: 1, maxLength: 8 }).map((s) => `photo-${s}`),
    exhibitId: fc.string({ minLength: 1, maxLength: 6 }).map((s) => `ex-${s}`),
    recognizedVia: fc.constantFrom(...RECOGNITION_METHODS),
    timestamp: fc.integer({ min: 0, max: 1_000_000 }),
    spriteDataUrl: fc.oneof(
      fc.constant(undefined),
      fc.string({ minLength: 1, maxLength: 10 }).map((s) => `data:old-${s}`),
    ),
  },
  { requiredKeys: ['photo', 'exhibitId', 'recognizedVia', 'timestamp'] },
);

describe('spriteUpdate property tests', () => {
  // Feature: sprite-generation, Property 4: setSpriteDataUrl returns a
  // collection identical to the original except that the target record's
  // spriteDataUrl equals the supplied value; every other field of the target
  // record (photo, exhibitId, recognizedVia, timestamp) and every other
  // record are unchanged, and the length is unchanged.
  // Validates: Requirements 3.4
  it('Property 4: sets only the target spriteDataUrl and preserves the rest', () => {
    fc.assert(
      fc.property(
        fc.array(recordArb, { maxLength: 25 }),
        // Index into the collection to pick a target key (when non-empty),
        // plus a flag to sometimes use a key that matches no record.
        fc.integer({ min: 0, max: 100 }),
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 16 }).map((s) => `data:new-${s}`),
        (collection, idxSeed, useMissingKey, newUrl) => {
          const useExisting = collection.length > 0 && !useMissingKey;
          const targetKey = useExisting
            ? recordKey(collection[idxSeed % collection.length])
            : 'NO-SUCH-KEY-∅';

          const result = setSpriteDataUrl(collection, targetKey, newUrl);

          // Length is always preserved.
          expect(result.length).toBe(collection.length);

          for (let i = 0; i < collection.length; i++) {
            const before = collection[i];
            const after = result[i];
            const isTarget = recordKey(before) === targetKey;

            // Non-sprite fields never change.
            expect(after.photo).toBe(before.photo);
            expect(after.exhibitId).toBe(before.exhibitId);
            expect(after.recognizedVia).toBe(before.recognizedVia);
            expect(after.timestamp).toBe(before.timestamp);

            if (isTarget) {
              expect(after.spriteDataUrl).toBe(newUrl);
            } else {
              expect(after.spriteDataUrl).toBe(before.spriteDataUrl);
            }
          }

          // The original collection is not mutated.
          expect(collection.length).toBe(result.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});
