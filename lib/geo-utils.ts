// geo-utils.ts
// Haversine formula for geofence validation and distance calculations.

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Calculates distance in meters between two lat/lng points using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats meters into human-readable distance (e.g. "42m" or "1.4 km").
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || isNaN(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
