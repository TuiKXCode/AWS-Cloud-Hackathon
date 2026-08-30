// src/engine/voucherStorage.ts
// Persistence adapter for the questline-progress feature (Phase 5).
//
// The PRD (§2, §3) fixes ALL runtime player state to a single namespaced key,
// `mandaiEchoes.playerState`. The redeemed flag and the voucher code are two
// fields on that object rather than two keys of their own, so — like
// `storage.ts` — this module delegates to the shared gateway in
// `playerState.js` instead of touching localStorage directly.
//
// The public surface is unchanged, and so is the defensive contract: a read
// failure (storage unavailable, unparseable value) normalizes to a safe default
// — `false` for the redeemed flag (Req 3.4) and `null` for the code (Req 2.5) —
// and a write failure is reported as `false` so callers keep their in-memory
// state without a dead-end (Req 2.4, 3.1). Neither ever throws.
//
// Writes are read-modify-write against the shared key, so marking a voucher
// redeemed cannot revert a capture or a banked tycoon day that landed in
// between.

import { STORAGE_KEY, readPlayerState, updatePlayerState } from './playerState.js';

/**
 * The localStorage key backing the voucher fields. Re-exported from the shared
 * gateway so there is exactly one definition of it in the codebase.
 */
export const PLAYER_STATE_KEY = STORAGE_KEY;

/**
 * Read the redeemed flag.
 *
 * Returns `true` ONLY when the persisted `voucherRedeemed` field is the boolean
 * `true`. Anything else — absent state, a non-boolean value, or any error while
 * reading — normalizes to `false` (Req 3.4). Never throws (Req 3.3).
 *
 * @returns `true` if the persisted flag is boolean `true`, otherwise `false`.
 */
export function readVoucherRedeemed(): boolean {
  try {
    return readPlayerState().voucherRedeemed === true;
  } catch {
    return false;
  }
}

/**
 * Persist the redeemed flag.
 *
 * Returns `true` on a successful write, or `false` when the write fails for ANY
 * reason (quota exceeded, storage unavailable). Never throws (Req 3.1).
 *
 * @param redeemed The redeemed state to persist.
 * @returns `true` if stored, `false` otherwise.
 */
export function writeVoucherRedeemed(redeemed: boolean): boolean {
  try {
    const { saved } = updatePlayerState((current) => ({
      ...current,
      voucherRedeemed: redeemed === true,
    }));
    return saved;
  } catch {
    return false;
  }
}

/**
 * Read the persisted voucher code.
 *
 * Returns the stored code when present and non-empty, or `null` when it is
 * absent, empty, or reading fails for ANY reason. Never throws (Req 2.5).
 *
 * @returns The persisted code, or `null` if absent/empty/unreadable.
 */
export function readVoucherCode(): string | null {
  try {
    return readPlayerState().voucherCode;
  } catch {
    return null;
  }
}

/**
 * Persist the voucher code.
 *
 * Returns `true` on a successful write, or `false` when the write fails for ANY
 * reason (quota exceeded, storage unavailable). Never throws (Req 2.4).
 *
 * @param code The voucher code to persist.
 * @returns `true` if stored, `false` otherwise.
 */
export function writeVoucherCode(code: string): boolean {
  try {
    const { saved } = updatePlayerState((current) => ({
      ...current,
      voucherCode: typeof code === 'string' && code.length > 0 ? code : null,
    }));
    return saved;
  } catch {
    return false;
  }
}
