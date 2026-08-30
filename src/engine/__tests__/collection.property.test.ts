// src/engine/__tests__/collection.property.test.ts
// Property-based tests for the pure collection engine (Phase 4,
// checkpoint-photo-capture). Validates design correctness properties 6-9.
// Each test runs a minimum of 100 iterations via fast-check.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  parseCollection,
  appendRecord,
  computePlayerTotal,
} from '../collection';
import type { CollectedRecord, Exhibit, RecognitionMethod } from '../../types';

const RECOGNITION_METHODS: readonly RecognitionMethod[] = [
  'classifier',
  'location-fallback',
];

/**
 * Build an exhibit stub. Only `id` and `points` carry meaning for the
 * collection engine; the rest are filled with harmless defaults.
 */
function makeExhibit(id: string, points: number): Exhibit {
  return {
    id,
    name: `Exhibit ${id}`,
    lat: 0,
    lng: 0,
    iucnStatus: 'Least Concern',
    funFact: '',
    feedingTimes: [],
    diet: '',
    dietTags: [],
    trophicRole: '',
    dependsOn: [],
    predatorOf: [],
    ecosystemImpactIfRemoved: '',
    imagenetLabels: [],
    spriteBodyAsset: '',
    points,
  };
}

// A generator for a single valid CollectedRecord.
const validRecordArb: fc.Arbitrary<CollectedRecord> = fc.record({
  photo: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `photo-${s}`),
  exhibitId: fc.string({ minLength: 1, maxLength: 8 }).map((s) => `ex-${s}`),
  recognizedVia: fc.constantFrom(...RECOGNITION_METHODS),
  timestamp: fc.integer({ min: 0, max: 4_000_000_000_000 }),
});

// A generator for values that are NOT valid records (missing/invalid fields).
const invalidRecordArb: fc.Arbitrary<unknown> = fc.oneof(
  // Missing photo.
  fc.record({
    exhibitId: fc.constant('ex-x'),
    recognizedVia: fc.constant('classifier'),
    timestamp: fc.constant(1),
  }),
  // Empty photo string.
  fc.record({
    photo: fc.constant(''),
    exhibitId: fc.constant('ex-x'),
    recognizedVia: fc.constant('classifier'),
    timestamp: fc.constant(1),
  }),
  // Missing exhibitId.
  fc.record({
    photo: fc.constant('photo-x'),
    recognizedVia: fc.constant('classifier'),
    timestamp: fc.constant(1),
  }),
  // Empty exhibitId.
  fc.record({
    photo: fc.constant('photo-x'),
    exhibitId: fc.constant(''),
    recognizedVia: fc.constant('classifier'),
    timestamp: fc.constant(1),
  }),
  // Out-of-enum recognizedVia.
  fc.record({
    photo: fc.constant('photo-x'),
    exhibitId: fc.constant('ex-x'),
    recognizedVia: fc.constantFrom('nope', 'gps', ''),
    timestamp: fc.constant(1),
  }),
  // Missing recognizedVia.
  fc.record({
    photo: fc.constant('photo-x'),
    exhibitId: fc.constant('ex-x'),
    timestamp: fc.constant(1),
  }),
  // Non-finite / non-number timestamp.
  fc.record({
    photo: fc.constant('photo-x'),
    exhibitId: fc.constant('ex-x'),
    recognizedVia: fc.constant('classifier'),
    timestamp: fc.constantFrom('not-a-number', null, undefined),
  }),
  // Non-object primitives.
  fc.constantFrom(null, 42, 'string', true),
);

describe('collection engine property tests', () => {
  // Feature: checkpoint-photo-capture, Property 6: Player_Total equals the sum
  // of points over the DISTINCT awardable exhibit ids present in the
  // collection (known exhibit + points within 0..999999). Unknown ids and
  // missing/out-of-range points contribute 0.
  // Validates: Requirements 5.1, 5.3, 5.4, 7.3
  it('Property 6: computePlayerTotal sums points over distinct awardable exhibits', () => {
    // A points value that may be awardable (0..999999) or out of range.
    const pointsArb = fc.oneof(
      fc.integer({ min: 0, max: 999_999 }), // awardable
      fc.integer({ min: 1_000_000, max: 5_000_000 }), // above range
      fc.integer({ min: -5000, max: -1 }), // below range
    );

    // Build a pool of exhibits with unique ids, each paired with a points value.
    const exhibitsArb = fc
      .uniqueArray(
        fc.string({ minLength: 1, maxLength: 6 }).map((s) => `ex-${s}`),
        { minLength: 1, maxLength: 10 },
      )
      .chain((ids) =>
        fc
          .tuple(...ids.map(() => pointsArb))
          .map((pointsList) =>
            ids.map((id, i) => makeExhibit(id, pointsList[i])),
          ),
      );

    fc.assert(
      fc.property(
        exhibitsArb.chain((exhibits) => {
          const idPool = [...exhibits.map((e) => e.id), 'unknown-A', 'unknown-B'];
          // Records reference known or unknown ids, with possible repeats.
          const collectionArb = fc.array(
            fc.record({
              photo: fc.constant('photo-x'),
              exhibitId: fc.constantFrom(...idPool),
              recognizedVia: fc.constantFrom(...RECOGNITION_METHODS),
              timestamp: fc.integer({ min: 0, max: 1_000_000 }),
            }),
            { maxLength: 20 },
          );
          return fc.tuple(fc.constant(exhibits), collectionArb);
        }),
        ([exhibits, collection]) => {
          const total = computePlayerTotal(collection, exhibits);

          // Recompute the expected value independently.
          const distinct = new Set(collection.map((r) => r.exhibitId));
          const byId = new Map(exhibits.map((e) => [e.id, e]));
          let expected = 0;
          for (const id of distinct) {
            const ex = byId.get(id);
            if (
              ex &&
              Number.isFinite(ex.points) &&
              ex.points >= 0 &&
              ex.points <= 999_999
            ) {
              expected += ex.points;
            }
          }
          expect(total).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: checkpoint-photo-capture, Property 7: Re-tagging an
  // already-collected exhibit does not change computePlayerTotal, while the
  // collection length increases by exactly one.
  // Validates: Requirements 5.2
  it('Property 7: re-tagging an existing exhibit leaves Player_Total unchanged', () => {
    fc.assert(
      fc.property(
        // An exhibit with an awardable points value.
        fc.integer({ min: 0, max: 999_999 }),
        // Additional exhibits (unique ids) with arbitrary points.
        fc.array(fc.integer({ min: 0, max: 999_999 }), { maxLength: 5 }),
        validRecordArb,
        (points, otherPoints, extraRecord) => {
          const targetId = 'ex-target';
          const exhibits: Exhibit[] = [
            makeExhibit(targetId, points),
            ...otherPoints.map((p, i) => makeExhibit(`ex-other-${i}`, p)),
          ];

          // A collection that already contains a record for targetId.
          const existing: CollectedRecord = {
            photo: 'photo-existing',
            exhibitId: targetId,
            recognizedVia: 'classifier',
            timestamp: 100,
          };
          const collection: CollectedRecord[] = [existing, extraRecord];

          // A new record for the SAME target id.
          const dupRecord: CollectedRecord = {
            ...extraRecord,
            exhibitId: targetId,
          };

          const before = computePlayerTotal(collection, exhibits);
          const appended = appendRecord(collection, dupRecord);
          const after = computePlayerTotal(appended, exhibits);

          expect(after).toBe(before);
          expect(appended.length).toBe(collection.length + 1);
          // Original collection is not mutated.
          expect(collection.length).toBe(2);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: checkpoint-photo-capture, Property 8: Parsing keeps exactly the
  // valid records in original order and drops the rest; null and
  // non-array-JSON return [].
  // Validates: Requirements 7.4, 7.5, 7.6
  it('Property 8: parseCollection keeps exactly the valid sublist in order', () => {
    fc.assert(
      fc.property(
        // An array formed by interleaving valid and invalid entries.
        fc.array(
          fc.oneof(
            validRecordArb.map((r) => ({ valid: true as const, value: r })),
            invalidRecordArb.map((v) => ({ valid: false as const, value: v })),
          ),
          { maxLength: 25 },
        ),
        (entries) => {
          const raw = JSON.stringify(entries.map((e) => e.value));
          const result = parseCollection(raw);

          // Expected: valid entries in original order. Note JSON round-trips
          // drop `undefined` fields, but valid records have no undefined
          // required fields, so the valid ones survive intact.
          const expected = entries
            .filter((e) => e.valid)
            .map((e) => e.value as CollectedRecord);

          expect(result).toEqual(expected);
        },
      ),
      { numRuns: 200 },
    );

    // null and non-array JSON return [].
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<string | null>(null),
          fc.integer().map((n) => JSON.stringify(n)),
          fc.string().map((s) => JSON.stringify(s)),
          fc.boolean().map((b) => JSON.stringify(b)),
          fc.constant('{"not":"an array"}'),
          fc.constant('not valid json at all {'),
        ),
        (raw) => {
          expect(parseCollection(raw)).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: checkpoint-photo-capture, Property 9: Valid records survive a
  // serialize/parse round-trip unchanged.
  // Validates: Requirements 7.1
  it('Property 9: valid records survive a JSON serialize/parse round-trip', () => {
    fc.assert(
      fc.property(fc.array(validRecordArb, { maxLength: 25 }), (records) => {
        const result = parseCollection(JSON.stringify(records));
        expect(result).toEqual(records);
      }),
      { numRuns: 200 },
    );
  });
});
