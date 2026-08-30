// src/engine/__tests__/locationEngine.property.test.ts
// Property-based tests for the Location Engine, validating the design
// document's correctness properties 2-5. Each test runs a minimum of 100
// iterations via fast-check.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  findNearestExhibit,
  hasMovedBeyondThreshold,
  isValidPosition,
  computeFacilityDistances,
} from '../locationEngine';
import { haversine } from '../../utils/haversine';
import type { Exhibit, ExhibitWithDistance, Facility, Position } from '../../types';

// Generators constrained to the valid coordinate input space.
const latArb = fc.float({ min: Math.fround(-90), max: Math.fround(90), noNaN: true });
const lngArb = fc.float({ min: Math.fround(-180), max: Math.fround(180), noNaN: true });
const positionArb: fc.Arbitrary<Position> = fc.record({ lat: latArb, lng: lngArb });

// A minimal exhibit stub is sufficient for engine logic; only distance matters
// for nearest selection, so we build ExhibitWithDistance entries directly.
function makeExhibit(id: string): Exhibit {
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
    imagenetLabels: [],
    spriteBodyAsset: '',
    points: 0,
  };
}

function makeFacility(id: string, lat: number, lng: number): Facility {
  return {
    id,
    type: 'restroom',
    name: id,
    lat,
    lng,
    nearestLandmark: '',
  };
}

describe('locationEngine property tests', () => {
  // Feature: location-aware-exhibit-discovery, Property 2: Nearest exhibit
  // selection correctness — findNearestExhibit returns the exhibit with the
  // minimum distance within the radius, breaking ties by first-in-array, and
  // returns null when no exhibit is within the radius.
  it('Property 2: findNearestExhibit returns min-distance-within-radius, ties by array order, else null', () => {
    const entriesArb = fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 6 }),
        distance: fc.float({ min: 0, max: Math.fround(2000), noNaN: true }),
      }),
      { minLength: 1, maxLength: 20 },
    );
    fc.assert(
      fc.property(
        entriesArb,
        fc.float({ min: 0, max: Math.fround(2000), noNaN: true }),
        (raw, radius) => {
          const entries: ExhibitWithDistance[] = raw.map((r, i) => ({
            exhibit: makeExhibit(`${r.id}-${i}`),
            distance: r.distance,
          }));

          const result = findNearestExhibit(entries, radius);

          const within = entries.filter((e) => e.distance <= radius);
          if (within.length === 0) {
            expect(result).toBeNull();
            return;
          }

          const minDistance = Math.min(...within.map((e) => e.distance));
          // Expected is the FIRST entry (by original array order) achieving the
          // minimum distance within the radius.
          const expected = entries.find(
            (e) => e.distance <= radius && e.distance === minDistance,
          );

          expect(result).not.toBeNull();
          expect(result!.distance).toBe(minDistance);
          expect(result!.exhibit.id).toBe(expected!.exhibit.id);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: location-aware-exhibit-discovery, Property 3: Movement threshold
  // consistency — hasMovedBeyondThreshold(prev, current, T) returns true iff
  // haversine(prev, current) >= T.
  it('Property 3: hasMovedBeyondThreshold is true iff haversine(prev,current) >= T', () => {
    fc.assert(
      fc.property(
        positionArb,
        positionArb,
        fc.float({ min: 0, max: Math.fround(1_000_000), noNaN: true }),
        (prev, current, threshold) => {
          const distance = haversine(prev.lat, prev.lng, current.lat, current.lng);
          const expected = distance >= threshold;
          expect(hasMovedBeyondThreshold(prev, current, threshold)).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: location-aware-exhibit-discovery, Property 4: Invalid coordinate
  // rejection — isValidPosition returns false for any position where latitude
  // is outside [-90, 90] or longitude is outside [-180, 180].
  it('Property 4: isValidPosition returns false for out-of-range lat/lng', () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true }),
        fc.float({ noNaN: true }),
        (lat, lng) => {
          const outOfRange = lat < -90 || lat > 90 || lng < -180 || lng > 180;
          fc.pre(outOfRange);
          expect(isValidPosition({ lat, lng })).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: location-aware-exhibit-discovery, Property 5: Facilities sorted by
  // ascending distance — computeFacilityDistances returns a list where each
  // distance is <= the next.
  it('Property 5: computeFacilityDistances returns list sorted by ascending distance', () => {
    const facilitiesArb = fc.array(
      fc.record({ lat: latArb, lng: lngArb }),
      { minLength: 0, maxLength: 25 },
    );
    fc.assert(
      fc.property(positionArb, facilitiesArb, (position, coords) => {
        const facilities: Facility[] = coords.map((c, i) =>
          makeFacility(`f-${i}`, c.lat, c.lng),
        );
        const sorted = computeFacilityDistances(position, facilities);
        for (let i = 0; i + 1 < sorted.length; i++) {
          expect(sorted[i].distance).toBeLessThanOrEqual(sorted[i + 1].distance);
        }
      }),
      { numRuns: 200 },
    );
  });
});
