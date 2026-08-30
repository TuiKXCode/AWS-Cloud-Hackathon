// src/engine/diningFilterEngine.ts
// The Dining Filter Engine: pure functions that filter dining venues by tag
// (AND logic) and sort them by ascending Haversine distance from the visitor's
// current position.
//
// Part of the food-web-dining feature. All functions are pure and decoupled
// from React so they can be unit- and property-tested in isolation. Distance
// computation reuses the shared Haversine utility.

import { haversine } from '../utils/haversine';
import type { Dining, Position } from '../types';

/**
 * The tag identifiers a visitor can filter dining venues by. These match the
 * Filter_Chip labels defined in Requirement 3.4.
 */
export type DiningTag =
  | 'halal'
  | 'vegetarian'
  | 'air-conditioned'
  | 'kid-friendly';

/**
 * A dining venue paired with its computed Haversine distance from the current
 * position, in metres, rounded to the nearest whole metre.
 */
export interface DiningVenueWithDistance {
  venue: Dining;
  distance: number; // metres, rounded to the nearest whole metre
}

/**
 * Filter dining venues by the active set of tag filters using AND logic.
 *
 * When `activeFilters` is empty, all venues are returned unchanged
 * (Requirement 5.3). Otherwise, only venues whose `tags` array contains
 * *every* tag in `activeFilters` are returned (Requirements 3.2, 5.4).
 *
 * Input order is preserved among the surviving venues.
 *
 * @param venues The dining venues to filter.
 * @param activeFilters The set of tags that must all be present on a venue.
 * @returns The venues that satisfy the AND-logic filter.
 */
export function filterByTags(
  venues: Dining[],
  activeFilters: DiningTag[],
): Dining[] {
  if (activeFilters.length === 0) {
    return [...venues];
  }
  return venues.filter((venue) =>
    activeFilters.every((tag) => venue.tags.includes(tag)),
  );
}

/**
 * Compute the Haversine distance (in metres, rounded to the nearest whole
 * metre) from the given position to every venue, returning the results sorted
 * by ascending distance (Requirements 3.1, 4.1).
 *
 * The sort is stable, so venues that tie on rounded distance retain their
 * input order (Requirement 4.4).
 *
 * @param venues The dining venues to sort.
 * @param position A current position to measure distance from.
 * @returns DiningVenueWithDistance entries sorted by ascending distance.
 */
export function sortByDistance(
  venues: Dining[],
  position: Position,
): DiningVenueWithDistance[] {
  const withDistance: DiningVenueWithDistance[] = venues.map((venue) => ({
    venue,
    distance: Math.round(
      haversine(position.lat, position.lng, venue.lat, venue.lng),
    ),
  }));
  // Array.prototype.sort is stable in all modern JS engines (ES2019+),
  // preserving input order for equal-distance venues.
  withDistance.sort((a, b) => a.distance - b.distance);
  return withDistance;
}

/**
 * Apply tag filtering, then distance sorting, to produce the venue list shown
 * on the Dining_Tab.
 *
 * 1. Filter venues via {@link filterByTags} (AND logic).
 * 2. If `position` is non-null, sort the filtered venues by ascending distance
 *    via {@link sortByDistance}.
 * 3. If `position` is null, return the filtered venues in dataset order with a
 *    distance of `NaN` (distance is unavailable until a position is
 *    established — Requirements 3.7, 4.2).
 *
 * @param venues The full dining dataset.
 * @param activeFilters The active tag filters (empty = no filtering).
 * @param position The current position, or null if unavailable.
 * @returns The filtered (and, when possible, distance-sorted) venues.
 */
export function filterAndSort(
  venues: Dining[],
  activeFilters: DiningTag[],
  position: Position | null,
): DiningVenueWithDistance[] {
  const filtered = filterByTags(venues, activeFilters);
  if (position === null) {
    // No position: preserve dataset order and mark distance as unavailable.
    return filtered.map((venue) => ({ venue, distance: NaN }));
  }
  return sortByDistance(filtered, position);
}
