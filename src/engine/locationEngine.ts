// src/engine/locationEngine.ts
// The Location Engine: pure functions that compute distances between the
// current position and exhibits/facilities, determine the nearest exhibit,
// and support movement-threshold and coordinate-validity checks.
//
// Part of the location-aware-exhibit-discovery feature. All functions are
// pure and decoupled from React so they can be unit- and property-tested in
// isolation. Distance computation reuses the shared Haversine utility.

import { haversine } from '../utils/haversine';
import type {
  Exhibit,
  ExhibitWithDistance,
  Facility,
  FacilityWithDistance,
  Position,
} from '../types';

/**
 * The default "reasonable radius" (in metres) beyond which no exhibit is
 * considered nearby. See Requirement 3.4.
 */
export const DEFAULT_RADIUS_METRES = 500;

/**
 * The default movement threshold (in metres). The Location Engine recomputes
 * distances only when the position has changed by at least this much. See
 * Requirement 1.4.
 */
export const DEFAULT_MOVEMENT_THRESHOLD_METRES = 5;

/**
 * Determine whether a position is valid: latitude in [-90, 90] and longitude
 * in [-180, 180], both finite numbers.
 *
 * Used to withhold distance results when the current position is unavailable
 * or out of range (Requirement 1.5).
 *
 * @param position The position to validate. May be null/undefined.
 * @returns true if the position has a valid lat/lng, false otherwise.
 */
export function isValidPosition(position: Position | null | undefined): boolean {
  if (position == null) {
    return false;
  }
  const { lat, lng } = position;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Compute the Haversine distance (in metres) from the given position to every
 * exhibit in the provided array.
 *
 * Exhibits with missing or invalid coordinates are skipped (see the design's
 * "Invalid Data Handling" section). The returned array preserves the input
 * order of the surviving exhibits, which matters for tie-breaking in
 * {@link findNearestExhibit}.
 *
 * @param position A valid current position.
 * @param exhibits The exhibits dataset.
 * @returns One ExhibitWithDistance entry per exhibit with valid coordinates.
 */
export function computeExhibitDistances(
  position: Position,
  exhibits: Exhibit[],
): ExhibitWithDistance[] {
  const results: ExhibitWithDistance[] = [];
  for (const exhibit of exhibits) {
    if (
      typeof exhibit.lat !== 'number' ||
      typeof exhibit.lng !== 'number' ||
      !Number.isFinite(exhibit.lat) ||
      !Number.isFinite(exhibit.lng)
    ) {
      continue;
    }
    const distance = haversine(position.lat, position.lng, exhibit.lat, exhibit.lng);
    results.push({ exhibit, distance });
  }
  return results;
}

/**
 * Find the nearest exhibit among the given distance entries, considering only
 * those within the radius threshold.
 *
 * Returns the exhibit with the smallest distance that is within
 * `radiusMetres`. If two or more exhibits share the same minimum distance, the
 * one appearing first in the input array is returned (Requirement 1.2). If no
 * exhibit is within the radius, returns null (Requirement 3.4).
 *
 * @param exhibitsWithDistance Distance entries, typically from
 *   {@link computeExhibitDistances}.
 * @param radiusMetres The maximum distance (inclusive) to consider. Defaults
 *   to {@link DEFAULT_RADIUS_METRES}.
 * @returns The nearest ExhibitWithDistance within the radius, or null.
 */
export function findNearestExhibit(
  exhibitsWithDistance: ExhibitWithDistance[],
  radiusMetres: number = DEFAULT_RADIUS_METRES,
): ExhibitWithDistance | null {
  let nearest: ExhibitWithDistance | null = null;
  for (const entry of exhibitsWithDistance) {
    if (entry.distance > radiusMetres) {
      continue;
    }
    // Strict less-than preserves the first-in-array element on ties.
    if (nearest === null || entry.distance < nearest.distance) {
      nearest = entry;
    }
  }
  return nearest;
}

/**
 * Compute the Haversine distance (in metres) from the given position to every
 * facility, returning the results sorted by ascending distance
 * (Requirement 4.1).
 *
 * Facilities with missing or invalid coordinates are skipped. The sort is
 * stable, so facilities that tie on distance retain their input order.
 *
 * @param position A valid current position.
 * @param facilities The facilities dataset.
 * @returns FacilityWithDistance entries sorted by ascending distance.
 */
export function computeFacilityDistances(
  position: Position,
  facilities: Facility[],
): FacilityWithDistance[] {
  const results: FacilityWithDistance[] = [];
  for (const facility of facilities) {
    if (
      typeof facility.lat !== 'number' ||
      typeof facility.lng !== 'number' ||
      !Number.isFinite(facility.lat) ||
      !Number.isFinite(facility.lng)
    ) {
      continue;
    }
    const distance = haversine(position.lat, position.lng, facility.lat, facility.lng);
    results.push({ facility, distance });
  }
  // Array.prototype.sort is stable in all modern JS engines (ES2019+),
  // preserving input order for equal-distance facilities.
  results.sort((a, b) => a.distance - b.distance);
  return results;
}

/**
 * Determine whether the current position has moved beyond the given threshold
 * relative to the previous position.
 *
 * Returns true if and only if the Haversine distance between `prev` and
 * `current` is greater than or equal to `thresholdMetres` (Requirement 1.4).
 *
 * @param prev The previously computed position.
 * @param current The new position.
 * @param thresholdMetres The movement threshold in metres. Defaults to
 *   {@link DEFAULT_MOVEMENT_THRESHOLD_METRES}.
 * @returns true if movement is at least the threshold, false otherwise.
 */
export function hasMovedBeyondThreshold(
  prev: Position,
  current: Position,
  thresholdMetres: number = DEFAULT_MOVEMENT_THRESHOLD_METRES,
): boolean {
  const distance = haversine(prev.lat, prev.lng, current.lat, current.lng);
  return distance >= thresholdMetres;
}
