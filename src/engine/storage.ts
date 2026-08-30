// src/engine/storage.ts
// Persistence adapter for the checkpoint-photo-capture feature: a thin wrapper
// over the browser's localStorage under a single key. This is the only module
// in the feature that touches localStorage; the collection parsing/derivation
// logic lives in the pure `collection.ts` module.
//
// Both functions are defensive: reads and writes never throw. A read failure
// (localStorage unavailable, getItem throws, private-mode restrictions) is
// normalized to `null`, which the caller parses as an empty collection
// (Req 7.4). A write failure (quota exceeded, serialization error, storage
// unavailable) is reported as `false` so the UI can surface a save warning
// without discarding the in-memory record (Req 7.2).

/**
 * The localStorage key under which the collected-animals records are stored
 * as a JSON string. See Requirements 7.1-7.4.
 */
export const COLLECTED_ANIMALS_KEY = 'collectedAnimals';

/**
 * Read the raw collected-animals JSON string from localStorage.
 *
 * Returns the stored string when present, or `null` when the key is missing
 * or when reading fails for ANY reason (localStorage unavailable, getItem
 * throws, security restrictions). Never throws (Req 7.1, 7.4).
 *
 * @returns The stored JSON string, or `null` if absent/unreadable.
 */
export function readRawCollection(): string | null {
  try {
    return localStorage.getItem(COLLECTED_ANIMALS_KEY);
  } catch {
    return null;
  }
}

/**
 * Write the given JSON string to localStorage under {@link COLLECTED_ANIMALS_KEY}.
 *
 * Returns `true` on a successful write, or `false` when the write fails for
 * ANY reason (quota exceeded, storage unavailable, security restrictions).
 * Never throws, so a failed persist does not discard the in-memory record
 * (Req 7.2).
 *
 * @param json The serialized collection to persist.
 * @returns `true` if the value was stored, `false` otherwise.
 */
export function writeCollection(json: string): boolean {
  try {
    localStorage.setItem(COLLECTED_ANIMALS_KEY, json);
    return true;
  } catch {
    return false;
  }
}
