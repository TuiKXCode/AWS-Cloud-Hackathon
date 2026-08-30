// src/engine/__tests__/locationEngine.test.ts
// Example-based unit tests for the Location Engine, covering edge cases and
// specific known-coordinate scenarios.

import { describe, it, expect } from 'vitest';
import {
  computeExhibitDistances,
  findNearestExhibit,
  computeFacilityDistances,
  hasMovedBeyondThreshold,
  isValidPosition,
} from '../locationEngine';
import { haversine } from '../../utils/haversine';
import type { Exhibit, Facility, Position } from '../../types';

function makeExhibit(id: string, lat: number, lng: number): Exhibit {
  return {
    id,
    name: id,
    lat,
    lng,
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
  return { id, type: 'restroom', name: id, lat, lng, nearestLandmark: '' };
}

const REFERENCE: Position = { lat: 1.4043, lng: 103.793 };

describe('computeExhibitDistances', () => {
  it('returns one distance entry per exhibit (Req 1.1)', () => {
    const exhibits = [
      makeExhibit('a', 1.4043, 103.793),
      makeExhibit('b', 1.41, 103.8),
    ];
    const result = computeExhibitDistances(REFERENCE, exhibits);
    expect(result).toHaveLength(2);
    expect(result[0].exhibit.id).toBe('a');
    expect(result[0].distance).toBeCloseTo(0, 5);
    expect(result[1].distance).toBeGreaterThan(0);
  });

  it('returns an empty array for an empty exhibits array', () => {
    expect(computeExhibitDistances(REFERENCE, [])).toEqual([]);
  });

  it('skips exhibits with invalid coordinates', () => {
    const exhibits = [
      makeExhibit('valid', 1.4043, 103.793),
      // @ts-expect-error deliberately invalid coordinate for robustness test
      makeExhibit('invalid', null, undefined),
    ];
    const result = computeExhibitDistances(REFERENCE, exhibits);
    expect(result).toHaveLength(1);
    expect(result[0].exhibit.id).toBe('valid');
  });
});

describe('findNearestExhibit (Req 1.2, 3.4)', () => {
  it('returns null when the exhibit list is empty', () => {
    expect(findNearestExhibit([])).toBeNull();
  });

  it('returns null when all exhibits are beyond the 500m radius', () => {
    // A point ~1.1km away from the reference.
    const far = makeExhibit('far', 1.4143, 103.793);
    const withDistance = computeExhibitDistances(REFERENCE, [far]);
    expect(withDistance[0].distance).toBeGreaterThan(500);
    expect(findNearestExhibit(withDistance)).toBeNull();
  });

  it('returns the closest exhibit within radius', () => {
    const exhibits = [
      makeExhibit('near', 1.4044, 103.793), // ~11m
      makeExhibit('mid', 1.405, 103.793), // ~78m
    ];
    const withDistance = computeExhibitDistances(REFERENCE, exhibits);
    const nearest = findNearestExhibit(withDistance);
    expect(nearest).not.toBeNull();
    expect(nearest!.exhibit.id).toBe('near');
  });

  it('breaks exact ties by choosing the first in array order', () => {
    const withDistance = [
      { exhibit: makeExhibit('first', 0, 0), distance: 42 },
      { exhibit: makeExhibit('second', 0, 0), distance: 42 },
      { exhibit: makeExhibit('third', 0, 0), distance: 100 },
    ];
    const nearest = findNearestExhibit(withDistance);
    expect(nearest!.exhibit.id).toBe('first');
  });

  it('respects a custom radius', () => {
    const withDistance = [{ exhibit: makeExhibit('e', 0, 0), distance: 300 }];
    expect(findNearestExhibit(withDistance, 200)).toBeNull();
    expect(findNearestExhibit(withDistance, 400)!.exhibit.id).toBe('e');
  });
});

describe('computeFacilityDistances (Req 4.1)', () => {
  it('sorts facilities by ascending distance with known coordinates', () => {
    // Reference at (0,0). Facilities placed at increasing longitudes so their
    // distances strictly increase, but provided out of order.
    const pos: Position = { lat: 0, lng: 0 };
    const facilities = [
      makeFacility('far', 0, 0.03),
      makeFacility('near', 0, 0.01),
      makeFacility('mid', 0, 0.02),
    ];
    const sorted = computeFacilityDistances(pos, facilities);
    expect(sorted.map((f) => f.facility.id)).toEqual(['near', 'mid', 'far']);
    expect(sorted[0].distance).toBeLessThan(sorted[1].distance);
    expect(sorted[1].distance).toBeLessThan(sorted[2].distance);
  });

  it('returns an empty array for no facilities', () => {
    expect(computeFacilityDistances({ lat: 0, lng: 0 }, [])).toEqual([]);
  });
});

describe('hasMovedBeyondThreshold (Req 1.4)', () => {
  it('returns false when the position has not changed', () => {
    expect(hasMovedBeyondThreshold(REFERENCE, REFERENCE)).toBe(false);
  });

  it('returns true for movement at exactly the 5m threshold (>= boundary)', () => {
    // Find a longitude offset producing exactly-at-or-just-past 5m, then assert
    // the >= boundary behavior at the computed distance.
    const prev: Position = { lat: 0, lng: 0 };
    // ~5m east at the equator.
    const current: Position = { lat: 0, lng: 0.0000449 };
    const distance = haversine(prev.lat, prev.lng, current.lat, current.lng);
    // Use the actual computed distance as the threshold to hit the exact
    // boundary: distance >= distance is always true.
    expect(hasMovedBeyondThreshold(prev, current, distance)).toBe(true);
    // Just above the distance should be false.
    expect(hasMovedBeyondThreshold(prev, current, distance + 0.001)).toBe(false);
  });

  it('returns false for sub-threshold movement (< 5m)', () => {
    const prev: Position = { lat: 0, lng: 0 };
    const current: Position = { lat: 0, lng: 0.00001 }; // ~1.1m
    expect(hasMovedBeyondThreshold(prev, current)).toBe(false);
  });

  it('returns true for movement well beyond 5m', () => {
    const prev: Position = { lat: 0, lng: 0 };
    const current: Position = { lat: 0, lng: 0.001 }; // ~111m
    expect(hasMovedBeyondThreshold(prev, current)).toBe(true);
  });
});

describe('isValidPosition (Req 1.5)', () => {
  it('accepts in-range coordinates', () => {
    expect(isValidPosition({ lat: 1.4043, lng: 103.793 })).toBe(true);
    expect(isValidPosition({ lat: -90, lng: -180 })).toBe(true);
    expect(isValidPosition({ lat: 90, lng: 180 })).toBe(true);
  });

  it('rejects null/undefined', () => {
    expect(isValidPosition(null)).toBe(false);
    expect(isValidPosition(undefined)).toBe(false);
  });

  it('rejects out-of-range latitude', () => {
    expect(isValidPosition({ lat: 90.1, lng: 0 })).toBe(false);
    expect(isValidPosition({ lat: -91, lng: 0 })).toBe(false);
  });

  it('rejects out-of-range longitude', () => {
    expect(isValidPosition({ lat: 0, lng: 180.5 })).toBe(false);
    expect(isValidPosition({ lat: 0, lng: -181 })).toBe(false);
  });

  it('rejects NaN coordinates', () => {
    expect(isValidPosition({ lat: NaN, lng: 0 })).toBe(false);
    expect(isValidPosition({ lat: 0, lng: NaN })).toBe(false);
  });
});
