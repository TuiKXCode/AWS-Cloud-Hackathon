// src/utils/__tests__/haversine.property.test.ts
// Property-based tests for the Haversine distance function.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { haversine } from '../haversine';

// Generators constrained to the valid coordinate input space.
const latArb = fc.float({ min: Math.fround(-90), max: Math.fround(90), noNaN: true });
const lngArb = fc.float({ min: Math.fround(-180), max: Math.fround(180), noNaN: true });

describe('haversine property tests', () => {
  // Feature: location-aware-exhibit-discovery, Property 1: Haversine distance
  // completeness and non-negativity — for any two valid coordinate pairs the
  // computed distance is a finite number that is always >= 0.
  it('Property 1: distance is always non-negative for any two valid coordinate pairs', () => {
    fc.assert(
      fc.property(latArb, lngArb, latArb, lngArb, (lat1, lng1, lat2, lng2) => {
        const distance = haversine(lat1, lng1, lat2, lng2);
        expect(Number.isFinite(distance)).toBe(true);
        expect(distance).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: location-aware-exhibit-discovery, Property 7: Haversine symmetry —
  // for any two valid positions A and B, haversine(A, B) equals haversine(B, A).
  it('Property 7: distance is symmetric — haversine(A,B) equals haversine(B,A)', () => {
    fc.assert(
      fc.property(latArb, lngArb, latArb, lngArb, (latA, lngA, latB, lngB) => {
        const ab = haversine(latA, lngA, latB, lngB);
        const ba = haversine(latB, lngB, latA, lngA);
        expect(ab).toBeCloseTo(ba, 6);
      }),
      { numRuns: 100 },
    );
  });
});
