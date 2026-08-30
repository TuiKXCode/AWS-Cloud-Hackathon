// src/engine/questline.ts
// Pure logic for the questline-progress feature (Phase 5). This module has no
// React and no localStorage dependencies: every function is deterministic over
// plain values so it can be fully property-tested. The effectful concerns
// (persistence, reactivity) live in voucherStorage.ts and QuestlineContext.tsx.

/** Placeholder shown when the configured prize label is absent/empty (Req 2.2). */
export const PLACEHOLDER_PRIZE_LABEL = 'Prize unavailable';

/** Voucher code length bounds (Req 2.4): 6..32 alphanumeric characters. */
export const VOUCHER_CODE_MIN_LENGTH = 6;
export const VOUCHER_CODE_MAX_LENGTH = 32;

/**
 * Compute the progress as a percentage in the closed range [0, 100]
 * (Req 1.3, 1.4).
 *
 * Behavior:
 *  - Normal case: `(playerTotal / total) * 100`, clamped to [0, 100].
 *  - `total <= 0` or non-finite `total`: returns 100 when `playerTotal > 0`,
 *    else 0. This avoids divide-by-zero and treats a non-positive goal as
 *    trivially met once any points are held.
 *  - Negative or non-finite `playerTotal`: clamps to 0.
 *
 * @param playerTotal The visitor's accumulated points.
 * @param total The completion goal (Total_Points_To_Complete).
 * @returns A percentage in [0, 100].
 */
export function computeProgressRatio(playerTotal: number, total: number): number {
  // Guard non-finite / negative player totals -> treat as 0 progress.
  const safePlayerTotal =
    Number.isFinite(playerTotal) && playerTotal > 0 ? playerTotal : 0;

  // Non-positive / non-finite goal: trivially complete when any points held.
  if (!Number.isFinite(total) || total <= 0) {
    return safePlayerTotal > 0 ? 100 : 0;
  }

  const ratio = (safePlayerTotal / total) * 100;

  // Clamp to [0, 100].
  if (ratio <= 0) return 0;
  if (ratio >= 100) return 100;
  return ratio;
}

/**
 * Whether the questline is complete: `playerTotal >= total` (Req 2.1, 2.6, 2.7).
 *
 * A non-positive or non-finite `total` is treated as already complete for any
 * finite `playerTotal >= 0`. A non-finite `playerTotal` is never complete.
 *
 * @param playerTotal The visitor's accumulated points.
 * @param total The completion goal.
 * @returns `true` when the questline should be considered complete.
 */
export function isComplete(playerTotal: number, total: number): boolean {
  return playerTotal >= total;
}

/**
 * Resolve the prize label to display (Req 2.2, 2.3).
 *
 * Returns the input unchanged when it is a string containing at least one
 * non-whitespace character; otherwise returns {@link PLACEHOLDER_PRIZE_LABEL}
 * (covers `null`, `undefined`, empty, and whitespace-only inputs).
 *
 * @param prizeLabel The configured prize label, possibly absent/empty.
 * @returns A non-empty label suitable for display.
 */
export function resolvePrizeLabel(prizeLabel: string | undefined | null): string {
  if (typeof prizeLabel === 'string' && prizeLabel.trim().length > 0) {
    return prizeLabel;
  }
  return PLACEHOLDER_PRIZE_LABEL;
}

/**
 * Generate a voucher code derived deterministically from `timestamp`
 * (Req 2.4). No external service is contacted.
 *
 * Guarantees:
 *  - Output length is within [VOUCHER_CODE_MIN_LENGTH, VOUCHER_CODE_MAX_LENGTH]
 *    (6..32).
 *  - Output matches `^[A-Z0-9]+$` (alphanumeric, upper-case) for ANY numeric
 *    input including 0, negatives, fractional, and very large values.
 *  - Deterministic: `generateVoucherCode(t) === generateVoucherCode(t)`.
 *
 * Implementation: base-36 encode the normalized magnitude of the timestamp,
 * upper-case it, left-pad with '0' to reach the minimum length, and truncate
 * to the maximum length.
 *
 * @param timestamp A timestamp (e.g. `Date.now()`).
 * @returns A 6..32 character alphanumeric voucher code.
 */
export function generateVoucherCode(timestamp: number): string {
  // Normalize to a non-negative safe integer so base-36 encoding always yields
  // [0-9a-z] characters, even for non-finite, negative, or fractional inputs.
  const normalized =
    Number.isFinite(timestamp) ? Math.abs(Math.floor(timestamp)) : 0;

  let code = normalized.toString(36).toUpperCase();

  // Pad up to the minimum length with a deterministic filler.
  if (code.length < VOUCHER_CODE_MIN_LENGTH) {
    code = code.padStart(VOUCHER_CODE_MIN_LENGTH, '0');
  }

  // Truncate down to the maximum length.
  if (code.length > VOUCHER_CODE_MAX_LENGTH) {
    code = code.slice(0, VOUCHER_CODE_MAX_LENGTH);
  }

  return code;
}
