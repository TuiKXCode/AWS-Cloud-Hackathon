// src/engine/voucherStorage.ts
// Persistence adapter for the questline-progress feature (Phase 5): a thin
// wrapper over the browser's localStorage for the two persisted keys used by
// the redemption voucher flow. Modeled on `storage.ts`: this is the only
// module in the feature that touches localStorage, and both reads and writes
// are defensive — they never throw.
//
// A read failure (localStorage unavailable, getItem throws, private-mode
// restrictions, unparseable value) is normalized to a safe default: `false`
// for the redeemed flag (Req 3.4) and `null` for the voucher code (Req 2.5).
// A write failure (quota exceeded, serialization error, storage unavailable)
// is reported as `false` so callers can keep the in-memory state without a
// dead-end (Req 2.4, 3.1).

/**
 * The localStorage key under which the voucher-redeemed boolean is stored as
 * a JSON string ("true" / "false"). See Requirements 3.1, 3.3, 3.4.
 */
export const VOUCHER_REDEEMED_KEY = 'voucherRedeemed';

/**
 * The localStorage key under which the generated voucher code is stored as a
 * raw alphanumeric string. See Requirements 2.4, 2.5.
 */
export const VOUCHER_CODE_KEY = 'voucherCode';

/**
 * Read the redeemed flag from localStorage.
 *
 * Returns `true` ONLY when the stored value parses (via JSON) to the boolean
 * `true`. Anything else — the key being absent, a value that is not valid JSON
 * (e.g. "1", "yes", ""), a JSON value that is not the boolean `true`, or any
 * error while reading — is normalized to `false` (Req 3.4). Never throws
 * (Req 3.3).
 *
 * @returns `true` if the persisted flag is boolean `true`, otherwise `false`.
 */
export function readVoucherRedeemed(): boolean {
  try {
    const raw = localStorage.getItem(VOUCHER_REDEEMED_KEY);
    if (raw === null) {
      return false;
    }
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

/**
 * Persist the redeemed flag to localStorage under {@link VOUCHER_REDEEMED_KEY}
 * as the JSON string "true" / "false".
 *
 * Returns `true` on a successful write, or `false` when the write fails for
 * ANY reason (quota exceeded, storage unavailable, security restrictions).
 * Never throws (Req 3.1).
 *
 * @param redeemed The redeemed state to persist.
 * @returns `true` if stored, `false` otherwise.
 */
export function writeVoucherRedeemed(redeemed: boolean): boolean {
  try {
    localStorage.setItem(VOUCHER_REDEEMED_KEY, JSON.stringify(redeemed));
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the persisted voucher code from localStorage.
 *
 * Returns the stored code when present and non-empty, or `null` when the key
 * is missing, the stored value is empty, or reading fails for ANY reason
 * (localStorage unavailable, getItem throws, security restrictions). Never
 * throws (Req 2.5).
 *
 * @returns The persisted code, or `null` if absent/empty/unreadable.
 */
export function readVoucherCode(): string | null {
  try {
    const raw = localStorage.getItem(VOUCHER_CODE_KEY);
    if (raw === null || raw === '') {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

/**
 * Persist the voucher code to localStorage under {@link VOUCHER_CODE_KEY} as a
 * raw string.
 *
 * Returns `true` on a successful write, or `false` when the write fails for
 * ANY reason (quota exceeded, storage unavailable, security restrictions).
 * Never throws (Req 2.4).
 *
 * @param code The voucher code to persist.
 * @returns `true` if stored, `false` otherwise.
 */
export function writeVoucherCode(code: string): boolean {
  try {
    localStorage.setItem(VOUCHER_CODE_KEY, code);
    return true;
  } catch {
    return false;
  }
}
