// src/engine/playerState.js
//
// The single gateway to persisted player state (PRD §2, §3). Every phase of the app
// reads and writes through here, and nothing else in the codebase touches localStorage
// for player data.
//
// One namespaced key, exactly as the PRD fixes it:
//
//   mandaiEchoes.playerState = {
//     points: 0,
//     collectedAnimals: [{ exhibitId, photoDataUrl, spriteDataUrl, recognizedVia, capturedAt }],
//     voucherRedeemed: false,
//     voucherCode: null,                                     // additive (Phase 5)
//     tycoon: { day, funds, upgrades, bestDay, earnedPoints } // additive (Phase 7)
//   }
//
// Authored in plain JS with JSDoc so the TypeScript half (Phases 1-6) and the JSX half
// (Phase 7) can both import it under `allowJs`.
//
// WHY EVERY WRITE IS READ-MODIFY-WRITE
// Two independent React trees hold their own in-memory copy of this state: the capture
// flow owns `collectedAnimals`, the tycoon game owns `tycoon`. If either wrote its whole
// snapshot blindly it would revert the other's last change. `updatePlayerState` therefore
// re-reads the live value, applies the mutator to *that*, and writes the result — so the
// two halves can interleave freely.
//
// THE POINTS INVARIANT
//   points === (points from distinct photographed exhibits) + tycoon.earnedPoints
// Neither writer recomputes the whole total. Each adjusts only its own component and
// leaves the other's alone, which keeps the invariant true without either side needing to
// know how the other earns points. This is what the PRD means by the tycoon game
// contributing to, not replacing, existing questline progress (Phase 7, "Output").

/** The one and only localStorage key for player state (PRD §2). */
export const STORAGE_KEY = 'mandaiEchoes.playerState';

/**
 * Fired on `window` after every successful write.
 *
 * The browser's native `storage` event only fires in OTHER tabs, but both halves of the
 * app run in the SAME tab and each caches its own copy: the capture flow holds
 * `collectedAnimals` in React state, the game holds `tycoon`. Without a same-tab signal,
 * banking a tycoon day would not move the questline progress bar until a reload. This
 * event is that signal — listeners re-read and re-render.
 */
export const PLAYER_STATE_EVENT = 'mandaiEchoes:playerStateChanged';

/** @typedef {'classifier' | 'location-fallback'} RecognitionMethod */

/**
 * @typedef {object} CollectedAnimal
 * @property {string} exhibitId
 * @property {string} photoDataUrl
 * @property {string | null} spriteDataUrl composited head-on-body (Phase 6); null until generated
 * @property {RecognitionMethod} recognizedVia
 * @property {string} capturedAt ISO-8601 timestamp
 */

/**
 * @typedef {object} TycoonState
 * @property {number} day
 * @property {number} funds spendable balance for upgrades; never touches `points`
 * @property {Record<string, boolean>} upgrades
 * @property {number} bestDay best single-day score, for the summary screen
 * @property {number} earnedPoints cumulative questline points contributed by the game
 */

/**
 * @typedef {object} PlayerState
 * @property {number} points
 * @property {CollectedAnimal[]} collectedAnimals
 * @property {boolean} voucherRedeemed
 * @property {string | null} voucherCode
 * @property {TycoonState} tycoon
 */

/** @type {TycoonState} */
const EMPTY_TYCOON = { day: 1, funds: 0, upgrades: {}, bestDay: 0, earnedPoints: 0 };

/**
 * A fresh, valid state. Used as the result of every unreadable / absent / corrupt read,
 * so callers never have to handle a null.
 *
 * @returns {PlayerState}
 */
export function createEmptyPlayerState() {
  return {
    points: 0,
    collectedAnimals: [],
    voucherRedeemed: false,
    voucherCode: null,
    tycoon: { ...EMPTY_TYCOON, upgrades: {} },
  };
}

/**
 * localStorage, or null when it is unavailable (private mode, blocked storage, SSR).
 * The app stays fully usable without it — it just will not persist.
 */
function safeStorage() {
  try {
    if (typeof localStorage === 'undefined' || localStorage === null) return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** A finite number, or `fallback`. */
function num(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Coerce one persisted entry into a well-formed CollectedAnimal, or null if it is too
 * damaged to use. Tolerant by design: a single corrupt entry drops out rather than taking
 * the whole collection — and with it the player's progress — down with it.
 *
 * @param {unknown} value
 * @returns {CollectedAnimal | null}
 */
function normalizeAnimal(value) {
  if (typeof value !== 'object' || value === null) return null;
  const entry = /** @type {Record<string, unknown>} */ (value);

  const exhibitId = entry.exhibitId;
  if (typeof exhibitId !== 'string' || exhibitId.length === 0) return null;

  const photoDataUrl = entry.photoDataUrl;
  if (typeof photoDataUrl !== 'string' || photoDataUrl.length === 0) return null;

  const recognizedVia =
    entry.recognizedVia === 'classifier' || entry.recognizedVia === 'location-fallback'
      ? entry.recognizedVia
      : 'location-fallback';

  const spriteDataUrl =
    typeof entry.spriteDataUrl === 'string' && entry.spriteDataUrl.length > 0
      ? entry.spriteDataUrl
      : null;

  const capturedAt =
    typeof entry.capturedAt === 'string' && !Number.isNaN(Date.parse(entry.capturedAt))
      ? entry.capturedAt
      : new Date(0).toISOString();

  return { exhibitId, photoDataUrl, spriteDataUrl, recognizedVia, capturedAt };
}

/**
 * Read the whole player state. Never throws: unavailable storage, an absent key,
 * malformed JSON and partially-corrupt payloads all normalize to a usable state.
 *
 * @returns {PlayerState}
 */
export function readPlayerState() {
  const storage = safeStorage();
  if (!storage) return createEmptyPlayerState();

  let parsed;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return createEmptyPlayerState();
    parsed = JSON.parse(raw);
  } catch {
    return createEmptyPlayerState();
  }

  if (typeof parsed !== 'object' || parsed === null) return createEmptyPlayerState();

  const collectedAnimals = Array.isArray(parsed.collectedAnimals)
    ? parsed.collectedAnimals.map(normalizeAnimal).filter((entry) => entry !== null)
    : [];

  const rawTycoon =
    typeof parsed.tycoon === 'object' && parsed.tycoon !== null ? parsed.tycoon : {};

  return {
    points: Math.max(0, num(parsed.points, 0)),
    collectedAnimals,
    voucherRedeemed: parsed.voucherRedeemed === true,
    voucherCode:
      typeof parsed.voucherCode === 'string' && parsed.voucherCode.length > 0
        ? parsed.voucherCode
        : null,
    tycoon: {
      day: Math.max(1, num(rawTycoon.day, 1)),
      funds: Math.max(0, num(rawTycoon.funds, 0)),
      upgrades:
        typeof rawTycoon.upgrades === 'object' && rawTycoon.upgrades !== null
          ? { ...rawTycoon.upgrades }
          : {},
      bestDay: Math.max(0, num(rawTycoon.bestDay, 0)),
      earnedPoints: Math.max(0, num(rawTycoon.earnedPoints, 0)),
    },
  };
}

/**
 * Persist a whole state object.
 *
 * @param {PlayerState} state
 * @returns {boolean} false when the write failed (quota exceeded, blocked storage). The
 *   caller keeps its in-memory state either way, so a failed save never dead-ends a flow.
 */
export function writePlayerState(state) {
  const storage = safeStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return false;
  }
  // Notify same-tab listeners. Isolated from the write itself so a missing or limited
  // `window` (tests, SSR) can never turn a successful save into a reported failure.
  //
  // This guards constructing and dispatching the event, NOT the listeners: per the DOM
  // spec an exception thrown inside a listener is reported globally rather than
  // propagated back here, so it cannot affect the return value either way.
  try {
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(PLAYER_STATE_EVENT, { detail: state }));
    }
  } catch {
    // Events unavailable in this environment. The save still happened.
  }
  return true;
}

/**
 * Read-modify-write: apply `mutator` to the state currently in storage and persist the
 * result. This is the only safe way to write when more than one part of the app owns a
 * slice of the same key — see the note at the top of this file.
 *
 * @param {(current: PlayerState) => PlayerState} mutator
 * @returns {{ state: PlayerState, saved: boolean }} the new state (returned even when the
 *   write failed, so callers can still update their UI) and whether it persisted.
 */
export function updatePlayerState(mutator) {
  const next = mutator(readPlayerState());
  return { state: next, saved: writePlayerState(next) };
}
