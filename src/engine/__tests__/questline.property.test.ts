// src/engine/__tests__/questline.property.test.ts
// Property-based tests for the pure questline engine (Phase 5,
// questline-progress). Validates design correctness properties 1-4.
// Each test runs a minimum of 100 iterations via fast-check.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  computeProgressRatio,
  isComplete,
  resolvePrizeLabel,
  generateVoucherCode,
  PLACEHOLDER_PRIZE_LABEL,
  VOUCHER_CODE_MIN_LENGTH,
  VOUCHER_CODE_MAX_LENGTH,
} from '../questline';

describe('questline engine property tests', () => {
  // Feature: questline-progress, Property 1: For any finite playerTotal >= 0
  // and finite total > 0, computeProgressRatio is always within [0, 100];
  // equals (playerTotal / total) * 100 when 0 <= playerTotal <= total; and
  // equals exactly 100 when playerTotal >= total.
  // Validates: Requirements 1.3, 1.4
  it('Property 1: computeProgressRatio is the clamped percentage in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({
          min: Number.MIN_VALUE,
          max: 1_000_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (playerTotal, total) => {
          const ratio = computeProgressRatio(playerTotal, total);

          // (a) Always within [0, 100].
          expect(ratio).toBeGreaterThanOrEqual(0);
          expect(ratio).toBeLessThanOrEqual(100);

          if (playerTotal >= total) {
            // (c) Exactly 100 at/above the goal.
            expect(ratio).toBe(100);
          } else {
            // (b) In-range value equals the raw percentage (within tolerance).
            const expected = (playerTotal / total) * 100;
            expect(ratio).toBeCloseTo(expected, 6);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: questline-progress, Property 2: For any finite playerTotal and
  // finite total, isComplete(playerTotal, total) === (playerTotal >= total).
  // Validates: Requirements 2.1, 2.6, 2.7
  it('Property 2: isComplete holds exactly when playerTotal >= total', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (playerTotal, total) => {
          expect(isComplete(playerTotal, total)).toBe(playerTotal >= total);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: questline-progress, Property 3: resolvePrizeLabel returns the
  // placeholder for null/undefined/empty/whitespace-only inputs, and returns
  // the input unchanged for any string with at least one non-whitespace char.
  // Validates: Requirements 2.2
  it('Property 3: resolvePrizeLabel returns configured label or placeholder', () => {
    // Non-whitespace strings pass through unchanged.
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 40 })
          .filter((s) => s.trim().length > 0),
        (label) => {
          expect(resolvePrizeLabel(label)).toBe(label);
        },
      ),
      { numRuns: 200 },
    );

    // null / undefined / empty / whitespace-only -> placeholder.
    const whitespaceArb = fc
      .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), {
        minLength: 0,
        maxLength: 10,
      })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant<string | undefined | null>(null),
          fc.constant<string | undefined | null>(undefined),
          whitespaceArb,
        ),
        (input) => {
          expect(resolvePrizeLabel(input)).toBe(PLACEHOLDER_PRIZE_LABEL);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: questline-progress, Property 4: For any timestamp (including 0,
  // negatives, fractional, and very large numbers), generateVoucherCode
  // produces a string with length in [6, 32], matching /^[A-Z0-9]+$/, and is
  // deterministic: gen(t) === gen(t).
  // Validates: Requirements 2.4
  it('Property 4: voucher codes are alphanumeric, length-bounded, deterministic', () => {
    const timestampArb = fc.oneof(
      fc.integer(),
      fc.integer({ min: -10_000_000_000_000, max: 10_000_000_000_000 }),
      fc.double({ noDefaultInfinity: true, noNaN: true }),
      fc.constantFrom(0, -1, -0, 1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
    );

    fc.assert(
      fc.property(timestampArb, (timestamp) => {
        const code = generateVoucherCode(timestamp);

        expect(code.length).toBeGreaterThanOrEqual(VOUCHER_CODE_MIN_LENGTH);
        expect(code.length).toBeLessThanOrEqual(VOUCHER_CODE_MAX_LENGTH);
        expect(code).toMatch(/^[A-Z0-9]+$/);
        // Deterministic for the same input.
        expect(generateVoucherCode(timestamp)).toBe(code);
      }),
      { numRuns: 200 },
    );
  });
});
