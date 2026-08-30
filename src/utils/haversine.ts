// src/utils/haversine.ts
// Pure utility for computing the great-circle distance between two
// geographic coordinate pairs using the Haversine formula.
// Part of the location-aware-exhibit-discovery feature.

/**
 * Earth's mean radius in metres, used by the Haversine formula.
 */
const EARTH_RADIUS_METRES = 6_371_000;

/**
 * Convert an angle in degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Compute the great-circle distance between two points on the Earth's
 * surface, given their latitudes and longitudes in decimal degrees.
 *
 * Uses the standard Haversine formula with a mean Earth radius of
 * 6,371,000 metres.
 *
 * @param lat1 Latitude of the first point, in decimal degrees.
 * @param lng1 Longitude of the first point, in decimal degrees.
 * @param lat2 Latitude of the second point, in decimal degrees.
 * @param lng2 Longitude of the second point, in decimal degrees.
 * @returns The distance between the two points, in metres (always >= 0).
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lng2 - lng1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METRES * c;
}
