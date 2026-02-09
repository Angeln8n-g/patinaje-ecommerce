/**
 * Geo-utility functions for delivery zones and tracking.
 *
 * Pure functions with no side effects — shared across server actions and client components.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ─── Point-in-Polygon (Ray-Casting) ─────────────────────────────────────────

/**
 * Determines whether a geographic point lies inside a polygon using the
 * ray-casting algorithm.
 *
 * @param point  - The point to test ({ lat, lng }).
 * @param polygon - An ordered array of vertices defining the polygon.
 * @returns `true` if the point is inside the polygon, `false` otherwise.
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat,
      yi = polygon[i].lng;
    const xj = polygon[j].lat,
      yj = polygon[j].lng;
    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─── Haversine Distance ─────────────────────────────────────────────────────

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * @returns Distance in **kilometres**.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Estimated Time of Arrival ──────────────────────────────────────────────

/**
 * Calculates an estimated delivery time range based on distance.
 *
 * Assumes urban delivery speeds of 20–30 km/h and adds a 5-minute
 * preparation buffer. Enforces minimums of 5 min (min) and 10 min (max).
 *
 * @param distanceKm - Distance in kilometres (must be >= 0).
 * @returns An object with `min` and `max` estimated minutes.
 */
export function calculateEstimatedTime(distanceKm: number): {
  min: number;
  max: number;
} {
  const minMinutes = Math.ceil((distanceKm / 30) * 60);
  const maxMinutes = Math.ceil((distanceKm / 20) * 60);
  return {
    min: Math.max(5, minMinutes + 5),
    max: Math.max(10, maxMinutes + 5),
  };
}

// ─── Format Estimated Time ──────────────────────────────────────────────────

/**
 * Formats an ETA range into a human-readable Spanish string.
 *
 * @example
 * formatEstimatedTime({ min: 25, max: 35 })
 * // => "Llegada estimada: 25-35 minutos"
 */
export function formatEstimatedTime(eta: { min: number; max: number }): string {
  return `Llegada estimada: ${eta.min}-${eta.max} minutos`;
}

// ─── Coordinate Validation ──────────────────────────────────────────────────

/**
 * Validates that latitude and longitude values are within the accepted
 * geographic ranges.
 *
 * @returns An object with `valid: true` on success, or `valid: false` and an
 *          `error` message describing the problem.
 */
export function validateCoordinates(
  lat: number,
  lng: number
): { valid: true } | { valid: false; error: string } {
  if (typeof lat !== "number" || isNaN(lat)) {
    return { valid: false, error: "La latitud debe ser un número válido" };
  }
  if (typeof lng !== "number" || isNaN(lng)) {
    return { valid: false, error: "La longitud debe ser un número válido" };
  }
  if (lat < -90 || lat > 90) {
    return {
      valid: false,
      error: "La latitud debe estar entre -90 y 90 grados",
    };
  }
  if (lng < -180 || lng > 180) {
    return {
      valid: false,
      error: "La longitud debe estar entre -180 y 180 grados",
    };
  }
  return { valid: true };
}
