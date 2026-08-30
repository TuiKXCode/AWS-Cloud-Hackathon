// src/engine/__tests__/diningFilterEngine.test.ts
// Example-based unit tests for the Dining Filter Engine, covering the edge
// cases called out in the design document's Error Handling section and the
// task's requirement references.

import { describe, it, expect } from 'vitest';
import {
  filterByTags,
  sortByDistance,
  filterAndSort,
  type DiningTag,
} from '../diningFilterEngine';
import type { Dining, Position } from '../../types';

function makeVenue(
  id: string,
  tags: DiningTag[],
  lat: number,
  lng: number,
): Dining {
  return {
    id,
    name: id,
    lat,
    lng,
    tags,
    hours: '10:00–18:00',
    topPicks: [],
  };
}

// A small, deterministic dataset. Coordinates are near Mandai (Singapore).
const venues: Dining[] = [
  makeVenue('ah-meng', ['halal', 'vegetarian', 'air-conditioned', 'kid-friendly'], 1.4043, 103.793),
  makeVenue('cafe-a', ['vegetarian'], 1.405, 103.794),
  makeVenue('cafe-b', ['halal', 'kid-friendly'], 1.406, 103.795),
  makeVenue('cafe-c', [], 1.407, 103.796),
];

const position: Position = { lat: 1.4043, lng: 103.793 };

describe('diningFilterEngine unit tests', () => {
  describe('filterByTags', () => {
    // Requirement 5.3: empty filter set returns all venues (unfiltered).
    it('returns all venues when the filter set is empty', () => {
      const result = filterByTags(venues, []);
      expect(result.map((v) => v.id)).toEqual([
        'ah-meng',
        'cafe-a',
        'cafe-b',
        'cafe-c',
      ]);
    });

    // Requirement 3.3 (data side): no venues match returns an empty array.
    it('returns an empty array when no venue satisfies the AND filter', () => {
      // No venue has both vegetarian AND kid-friendly except... none: cafe-b is
      // halal+kid-friendly, ah-meng has all. Use a combination none share.
      const result = filterByTags(venues, ['vegetarian', 'kid-friendly']);
      // ah-meng has all four tags, so it DOES match. Use a truly impossible
      // combination instead: an unmatched pair.
      expect(result.map((v) => v.id)).toEqual(['ah-meng']);

      // A combination that no venue satisfies at all.
      const none = filterByTags(
        [makeVenue('x', ['halal'], 0, 0), makeVenue('y', ['vegetarian'], 0, 0)],
        ['halal', 'vegetarian'],
      );
      expect(none).toEqual([]);
    });

    // Requirements 3.2, 5.4: AND logic — every selected tag must be present.
    it('applies AND logic across multiple active tags', () => {
      const result = filterByTags(venues, ['halal', 'kid-friendly']);
      // ah-meng (all four) and cafe-b (halal + kid-friendly) qualify.
      expect(result.map((v) => v.id)).toEqual(['ah-meng', 'cafe-b']);
    });

    // A venue with an empty tags array cannot satisfy any active filter.
    it('excludes venues with empty tags when a filter is active', () => {
      const result = filterByTags(venues, ['vegetarian']);
      expect(result.map((v) => v.id)).not.toContain('cafe-c');
    });
  });

  describe('sortByDistance', () => {
    it('sorts venues by ascending rounded distance from the position', () => {
      const result = sortByDistance(venues, position);
      // ah-meng is at the exact position -> distance 0, should be first.
      expect(result[0].venue.id).toBe('ah-meng');
      expect(result[0].distance).toBe(0);
      for (let i = 0; i + 1 < result.length; i++) {
        expect(result[i].distance).toBeLessThanOrEqual(result[i + 1].distance);
      }
    });

    it('rounds distances to the nearest whole metre', () => {
      const result = sortByDistance(venues, position);
      for (const entry of result) {
        expect(Number.isInteger(entry.distance)).toBe(true);
      }
    });

    // Requirement 4.4: equal distances preserve dataset order.
    it('preserves dataset order for venues tied on distance', () => {
      // Two venues at identical coordinates -> identical distances.
      const tied: Dining[] = [
        makeVenue('first', ['halal'], 1.5, 103.9),
        makeVenue('second', ['halal'], 1.5, 103.9),
      ];
      const result = sortByDistance(tied, position);
      expect(result[0].distance).toBe(result[1].distance);
      expect(result.map((v) => v.venue.id)).toEqual(['first', 'second']);
    });
  });

  describe('filterAndSort', () => {
    // Requirement 4.2: dataset order preserved when position is null.
    it('returns filtered venues in dataset order when position is null', () => {
      const result = filterAndSort(venues, [], null);
      expect(result.map((v) => v.venue.id)).toEqual([
        'ah-meng',
        'cafe-a',
        'cafe-b',
        'cafe-c',
      ]);
      // Distance is unavailable (NaN) when there is no position.
      for (const entry of result) {
        expect(Number.isNaN(entry.distance)).toBe(true);
      }
    });

    it('applies filtering then sorting when a position is available', () => {
      const result = filterAndSort(venues, ['halal'], position);
      // Only halal venues (ah-meng, cafe-b), sorted ascending by distance.
      expect(result.map((v) => v.venue.id)).toEqual(['ah-meng', 'cafe-b']);
      expect(result[0].distance).toBeLessThanOrEqual(result[1].distance);
    });

    // Requirement 3.3: no venues match -> empty array.
    it('returns an empty array when no venues match, regardless of position', () => {
      const disjoint: Dining[] = [
        makeVenue('x', ['halal'], 1.5, 103.9),
        makeVenue('y', ['vegetarian'], 1.6, 103.8),
      ];
      expect(filterAndSort(disjoint, ['halal', 'vegetarian'], position)).toEqual([]);
      expect(filterAndSort(disjoint, ['halal', 'vegetarian'], null)).toEqual([]);
    });

    // Venues with missing lat/lng (0,0) are still included and get a computed
    // (large) distance rather than being dropped.
    it('includes venues with missing (0,0) coordinates', () => {
      const withMissing: Dining[] = [
        makeVenue('ah-meng', ['halal'], 1.4043, 103.793),
        makeVenue('missing', ['halal'], 0, 0),
      ];
      const result = filterAndSort(withMissing, ['halal'], position);
      expect(result.map((v) => v.venue.id)).toContain('missing');
      const missingEntry = result.find((v) => v.venue.id === 'missing')!;
      expect(Number.isInteger(missingEntry.distance)).toBe(true);
      // (0,0) is far from Mandai, so it should sort after the on-site venue.
      expect(result[result.length - 1].venue.id).toBe('missing');
    });
  });
});
