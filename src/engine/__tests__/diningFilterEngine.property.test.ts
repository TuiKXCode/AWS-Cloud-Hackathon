// src/engine/__tests__/diningFilterEngine.property.test.ts
// Property-based tests for the Dining Filter Engine, validating the design
// document's correctness properties 6 and 7. Each test runs a minimum of 100
// iterations via fast-check.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  filterByTags,
  sortByDistance,
  type DiningTag,
} from '../diningFilterEngine';
import type { Dining, Position } from '../../types';

const ALL_TAGS: DiningTag[] = [
  'halal',
  'vegetarian',
  'air-conditioned',
  'kid-friendly',
];

// Generators constrained to the valid input space.
const latArb = fc.float({ min: Math.fround(-90), max: Math.fround(90), noNaN: true });
const lngArb = fc.float({ min: Math.fround(-180), max: Math.fround(180), noNaN: true });
const positionArb: fc.Arbitrary<Position> = fc.record({ lat: latArb, lng: lngArb });

// A random subset of the four defined dining tags (may be empty).
const tagSubsetArb: fc.Arbitrary<DiningTag[]> = fc.subarray(ALL_TAGS);

function makeVenue(id: string, tags: DiningTag[], lat: number, lng: number): Dining {
  return {
    id,
    name: id,
    lat,
    lng,
    tags,
    hours: '',
    topPicks: [],
  };
}

// Build venues with unique ids so we can reason about identity/order.
const venuesArb: fc.Arbitrary<Dining[]> = fc
  .array(
    fc.record({ tags: tagSubsetArb, lat: latArb, lng: lngArb }),
    { minLength: 0, maxLength: 25 },
  )
  .map((rows) => rows.map((r, i) => makeVenue(`v-${i}`, r.tags, r.lat, r.lng)));

describe('diningFilterEngine property tests', () => {
  // Feature: food-web-dining, Property 6: AND-logic tag filtering —
  // filterByTags returns only venues whose tags contain every active filter
  // tag; when the active filter set is empty, it returns all venues.
  // Validates: Requirements 3.2, 5.3, 5.4
  it('Property 6: filterByTags returns only venues containing every active tag; empty filters returns all', () => {
    fc.assert(
      fc.property(venuesArb, tagSubsetArb, (venues, activeFilters) => {
        const result = filterByTags(venues, activeFilters);

        if (activeFilters.length === 0) {
          // Empty filters: all venues returned, same order.
          expect(result.map((v) => v.id)).toEqual(venues.map((v) => v.id));
          return;
        }

        // Every returned venue must contain ALL active filter tags.
        for (const venue of result) {
          for (const tag of activeFilters) {
            expect(venue.tags).toContain(tag);
          }
        }

        // Completeness: every venue satisfying the AND condition must be
        // present in the result (no false exclusions).
        const expected = venues.filter((v) =>
          activeFilters.every((t) => v.tags.includes(t)),
        );
        expect(result.map((v) => v.id)).toEqual(expected.map((v) => v.id));
      }),
      { numRuns: 200 },
    );
  });

  // Feature: food-web-dining, Property 7: Distance sort ascending with stable
  // tie-breaking — sortByDistance returns venues in ascending order of rounded
  // Haversine distance; venues with equal rounded distance preserve their
  // original dataset order.
  // Validates: Requirements 3.1, 4.1, 4.4
  it('Property 7: sortByDistance is ascending with stable tie-breaking', () => {
    fc.assert(
      fc.property(positionArb, venuesArb, (position, venues) => {
        const sorted = sortByDistance(venues, position);

        // Same set of venues, none lost or duplicated.
        expect(sorted.length).toBe(venues.length);

        // Ascending order.
        for (let i = 0; i + 1 < sorted.length; i++) {
          expect(sorted[i].distance).toBeLessThanOrEqual(sorted[i + 1].distance);
        }

        // Stable tie-breaking: among entries with equal rounded distance, the
        // original dataset order (index in `venues`) is preserved.
        const indexOf = new Map(venues.map((v, i) => [v.id, i]));
        for (let i = 0; i + 1 < sorted.length; i++) {
          if (sorted[i].distance === sorted[i + 1].distance) {
            expect(indexOf.get(sorted[i].venue.id)!).toBeLessThan(
              indexOf.get(sorted[i + 1].venue.id)!,
            );
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
