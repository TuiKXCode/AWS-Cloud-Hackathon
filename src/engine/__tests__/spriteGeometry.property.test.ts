// src/engine/__tests__/spriteGeometry.property.test.ts
// Property-based tests for the pure sprite geometry, validating the design
// document's correctness properties 2 and 3. Each test runs a minimum of
// 100 iterations via fast-check.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { cropRegion, headRect, HEAD_POSITION } from '../spriteGeometry';

describe('spriteGeometry property tests', () => {
  // Feature: sprite-generation, Property 2: Crop region is a centered square
  // within the photo bounds — for any photo width w >= 0 and height h >= 0,
  // cropRegion(w, h) returns a square whose width === height === min(w, h),
  // centered (x = (w - side) / 2, y = (h - side) / 2), fully contained within
  // the photo, and with side 0 when either dimension is 0.
  // Validates: Requirements 2.1, 2.2
  it('Property 2: cropRegion is a centered square within the photo bounds', () => {
    const dimArb = fc.integer({ min: 0, max: 4000 });
    fc.assert(
      fc.property(dimArb, dimArb, (w, h) => {
        const rect = cropRegion(w, h);
        const side = Math.min(w, h);

        // Square whose side equals min(w, h).
        expect(rect.width).toBe(rect.height);
        expect(rect.width).toBe(side);

        // Centered.
        expect(rect.x).toBe((w - side) / 2);
        expect(rect.y).toBe((h - side) / 2);

        // Fully contained within the photo bounds.
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(w);
        expect(rect.y + rect.height).toBeLessThanOrEqual(h);

        // Side is 0 when either dimension is 0.
        if (w === 0 || h === 0) {
          expect(rect.width).toBe(0);
          expect(rect.height).toBe(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  // Feature: sprite-generation, Property 3: Head rectangle is a deterministic
  // function of the fixed Head_Position — for any positive body width bw and
  // height bh, headRect(bw, bh, HEAD_POSITION) is deterministic and equals the
  // bounding box of the circle centered at (cx*bw, cy*bh) with diameter
  // diameter*bw: width === height === diameter*bw, x = cx*bw - width/2,
  // y = cy*bh - height/2.
  // Validates: Requirements 2.5
  it('Property 3: headRect is a deterministic function of the fixed Head_Position', () => {
    const posArb = fc.integer({ min: 1, max: 4000 });
    fc.assert(
      fc.property(posArb, posArb, (bw, bh) => {
        const a = headRect(bw, bh);
        const b = headRect(bw, bh);

        // Deterministic: two calls with identical inputs produce equal rects.
        expect(a).toEqual(b);

        const expectedSize = HEAD_POSITION.diameter * bw;
        expect(a.width).toBe(a.height);
        expect(a.width).toBe(expectedSize);
        expect(a.x).toBe(HEAD_POSITION.cx * bw - expectedSize / 2);
        expect(a.y).toBe(HEAD_POSITION.cy * bh - expectedSize / 2);
      }),
      { numRuns: 200 },
    );
  });
});
