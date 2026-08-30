// src/engine/__tests__/recognition.property.test.ts
// Property-based tests for the recognition/tagging logic, validating the
// design document's correctness properties 1-5. Each test runs a minimum of
// 100 iterations via fast-check.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  matchExhibitByLabel,
  resolveTag,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from '../recognition';
import type { Exhibit, ExhibitWithDistance, Prediction } from '../../types';

// A minimal exhibit stub; only id and imagenetLabels matter for recognition.
function makeExhibit(id: string, imagenetLabels: string[]): Exhibit {
  return {
    id,
    name: id,
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
    imagenetLabels,
    spriteBodyAsset: '',
    points: 0,
  };
}

const probArb = fc.float({ min: 0, max: Math.fround(1), noNaN: true });

// A pool of distinct label strings used to build exhibits and predictions.
const labelPool = ['tiger', 'hippo', 'panda', 'zebra', 'lion', 'otter', 'sloth'];

// Generate a set of exhibits, each owning one distinct label from the pool
// (so a given label maps to exactly one exhibit, keeping the expected model
// simple while still exercising dataset-order tiebreaks via duplicates below).
const exhibitsArb: fc.Arbitrary<Exhibit[]> = fc
  .uniqueArray(fc.constantFrom(...labelPool), { minLength: 1, maxLength: labelPool.length })
  .map((labels) => labels.map((label, i) => makeExhibit(`ex-${i}-${label}`, [label])));

// A prediction whose className is either a known label (matching) or random
// noise (non-matching), optionally case-mutated / comma-wrapped.
const predictionArb: fc.Arbitrary<Prediction> = fc.record({
  className: fc.oneof(
    fc.constantFrom(...labelPool),
    fc.constantFrom(...labelPool).map((l) => l.toUpperCase()),
    fc.constantFrom(...labelPool).map((l) => `${l}, some-synonym`),
    fc.string(),
  ),
  probability: probArb,
});

const predictionsArb = fc.array(predictionArb, { minLength: 0, maxLength: 12 });

const nearestArb: fc.Arbitrary<ExhibitWithDistance | null> = fc.oneof(
  fc.constant(null),
  fc.record({
    exhibit: fc.constant(makeExhibit('nearest', ['nearest-label'])),
    distance: fc.float({ min: 0, max: Math.fround(500), noNaN: true }),
  }),
);

// Reference implementation of "does any part of className match label".
function classNameMatchesLabel(className: string, label: string): boolean {
  const parts = className.split(',').map((p) => p.trim().toLowerCase());
  return parts.includes(label.toLowerCase());
}

// Compute the expected match against exhibits (earliest-exhibit label owner).
function expectedMatch(
  predictions: Prediction[],
  exhibits: Exhibit[],
): { exhibitIndex: number; probability: number } | null {
  let best: { exhibitIndex: number; probability: number } | null = null;
  for (const p of predictions) {
    let matchedIndex: number | null = null;
    for (let i = 0; i < exhibits.length; i++) {
      const owns = exhibits[i].imagenetLabels.some((lbl) =>
        classNameMatchesLabel(p.className, lbl),
      );
      if (owns) {
        matchedIndex = i;
        break; // earliest exhibit owning any matching label
      }
    }
    if (matchedIndex === null) continue;
    if (
      best === null ||
      p.probability > best.probability ||
      (p.probability === best.probability && matchedIndex < best.exhibitIndex)
    ) {
      best = { exhibitIndex: matchedIndex, probability: p.probability };
    }
  }
  return best;
}

describe('recognition property tests', () => {
  // Feature: checkpoint-photo-capture, Property 1: matchExhibitByLabel is
  // argmax over matching labels with dataset-order tiebreak.
  it('Property 1: matchExhibitByLabel returns argmax matching prob, earliest exhibit on ties, else null', () => {
    fc.assert(
      fc.property(predictionsArb, exhibitsArb, (predictions, exhibits) => {
        const result = matchExhibitByLabel(predictions, exhibits);
        const expected = expectedMatch(predictions, exhibits);

        if (expected === null) {
          expect(result).toBeNull();
          return;
        }
        expect(result).not.toBeNull();
        expect(result!.probability).toBe(expected.probability);
        expect(result!.exhibit.id).toBe(exhibits[expected.exhibitIndex].id);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: checkpoint-photo-capture, Property 2: a confident match
  // (probability >= threshold) produces a classifier tag to the owning exhibit.
  it('Property 2: confident match yields classifier tag to the owning exhibit', () => {
    const thresholdArb = fc.float({ min: 0, max: Math.fround(1), noNaN: true });
    fc.assert(
      fc.property(
        predictionsArb,
        exhibitsArb,
        nearestArb,
        thresholdArb,
        (predictions, exhibits, nearest, threshold) => {
          const match = matchExhibitByLabel(predictions, exhibits);
          fc.pre(match !== null && match.probability >= threshold);

          const result = resolveTag(predictions, exhibits, nearest, threshold);
          expect(result).not.toBeNull();
          expect(result!.recognizedVia).toBe('classifier');
          expect(result!.exhibit.id).toBe(match!.exhibit.id);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: checkpoint-photo-capture, Property 3: null predictions behave
  // identically to an empty prediction list.
  it('Property 3: resolveTag(null, ...) equals resolveTag([], ...)', () => {
    const thresholdArb = fc.float({ min: 0, max: Math.fround(1), noNaN: true });
    fc.assert(
      fc.property(exhibitsArb, nearestArb, thresholdArb, (exhibits, nearest, threshold) => {
        const withNull = resolveTag(null, exhibits, nearest, threshold);
        const withEmpty = resolveTag([], exhibits, nearest, threshold);
        expect(withNull).toEqual(withEmpty);
      }),
      { numRuns: 200 },
    );
  });

  // Feature: checkpoint-photo-capture, Property 4: absent a confident match,
  // with a non-null nearestExhibit, tagging falls back to the nearest exhibit.
  it('Property 4: no confident match + non-null nearest yields location-fallback to nearest', () => {
    const thresholdArb = fc.float({ min: 0, max: Math.fround(1), noNaN: true });
    const nonNullNearestArb: fc.Arbitrary<ExhibitWithDistance> = fc.record({
      exhibit: fc.constant(makeExhibit('nearest', ['nearest-label'])),
      distance: fc.float({ min: 0, max: Math.fround(500), noNaN: true }),
    });
    fc.assert(
      fc.property(
        predictionsArb,
        exhibitsArb,
        nonNullNearestArb,
        thresholdArb,
        (predictions, exhibits, nearest, threshold) => {
          const match = matchExhibitByLabel(predictions, exhibits);
          fc.pre(match === null || match.probability < threshold);

          const result = resolveTag(predictions, exhibits, nearest, threshold);
          expect(result).not.toBeNull();
          expect(result!.recognizedVia).toBe('location-fallback');
          expect(result!.exhibit.id).toBe(nearest.exhibit.id);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: checkpoint-photo-capture, Property 5: no confident match and a
  // null nearestExhibit yields null.
  it('Property 5: no confident match + null nearest yields null', () => {
    const thresholdArb = fc.float({ min: 0, max: Math.fround(1), noNaN: true });
    fc.assert(
      fc.property(predictionsArb, exhibitsArb, thresholdArb, (predictions, exhibits, threshold) => {
        const match = matchExhibitByLabel(predictions, exhibits);
        fc.pre(match === null || match.probability < threshold);

        const result = resolveTag(predictions, exhibits, null, threshold);
        expect(result).toBeNull();
      }),
      { numRuns: 200 },
    );
  });

  // Sanity: default threshold is 0.6 as specified.
  it('DEFAULT_CONFIDENCE_THRESHOLD is 0.6', () => {
    expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.6);
  });
});
