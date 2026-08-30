// src/utils/__tests__/haversine.test.ts
// Example-based unit tests for the Haversine distance function.

import { describe, it, expect } from 'vitest';
import { haversine } from '../haversine';

describe('haversine unit tests', () => {
  it('returns 0 for identical points', () => {
    expect(haversine(1.4043, 103.7930, 1.4043, 103.7930)).toBe(0);
  });

  it('returns 0 for another identical point (equator/prime meridian)', () => {
    expect(haversine(0, 0, 0, 0)).toBe(0);
  });

  it('computes ~20,015 km for antipodal points (half Earth circumference)', () => {
    // From (0, 0) to (0, 180): half the great circle.
    const distance = haversine(0, 0, 0, 180);
    // Half circumference = pi * R = pi * 6_371_000 ~= 20,015,086 m.
    expect(distance).toBeCloseTo(Math.PI * 6_371_000, 0);
    expect(distance / 1000).toBeCloseTo(20015, 0);
  });

  it('computes ~20,015 km between the poles (antipodal via latitude)', () => {
    const distance = haversine(-90, 0, 90, 0);
    expect(distance / 1000).toBeCloseTo(20015, 0);
  });

  it('accepts decimal-degree format and returns a plausible short distance', () => {
    // Two points ~111m apart: 0.001 degree of latitude ~= 111.19 m.
    const distance = haversine(1.4043, 103.793, 1.4053, 103.793);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);
  });

  it('computes a known reference distance (Singapore landmarks)', () => {
    // Mandai area to Singapore city centre is roughly ~15-20 km.
    const distance = haversine(1.4043, 103.793, 1.2834, 103.8607);
    expect(distance).toBeGreaterThan(10_000);
    expect(distance).toBeLessThan(25_000);
  });

  it('is symmetric for a concrete pair', () => {
    const ab = haversine(1.4043, 103.793, 1.2834, 103.8607);
    const ba = haversine(1.2834, 103.8607, 1.4043, 103.793);
    expect(ab).toBeCloseTo(ba, 9);
  });
});
