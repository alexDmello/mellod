// zone-data.ts
//
// Static data for Bangalore's 5 Municipal Corporations (GBA 2025).
// Includes approximate geographic boundary polygons for client-side
// point-in-polygon auto-assignment. No Google Maps API required.

export type ZoneName = "North" | "Central" | "West" | "South" | "East";

export interface ZoneConfig {
  name: ZoneName;
  slug: string;
  color: string;           // Tailwind bg- color class
  textColor: string;       // Tailwind text- color class
  borderColor: string;     // Tailwind border- color class
  bgLight: string;         // Tailwind bg- light color class
  hex: string;             // Raw hex for inline styles
  corporationNumber: number;
  corporationName: string;
  areas: string[];
}

export const ZONE_CONFIG: Record<ZoneName, ZoneConfig> = {
  North: {
    name: "North",
    slug: "north",
    color: "bg-red-500",
    textColor: "text-red-600",
    borderColor: "border-red-300",
    bgLight: "bg-red-50",
    hex: "#ef4444",
    corporationNumber: 1,
    corporationName: "Bengaluru North City Corporation (BNCC)",
    areas: ["Bytarayanpura", "RR Nagar", "Dasarahalli", "Yeshwantapura", "Yelahanka", "Jakkur", "Hebbal", "Byatarayanapura"],
  },
  Central: {
    name: "Central",
    slug: "central",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    borderColor: "border-orange-300",
    bgLight: "bg-orange-50",
    hex: "#f97316",
    corporationNumber: 2,
    corporationName: "Bengaluru Central City Corporation (BCCC)",
    areas: ["Shivaji Nagar", "Gandhi Nagar", "Hebbal", "Pulakeshi Nagar", "Malleshwaram", "Rajaji Nagar", "Mahalakshmi Layout"],
  },
  West: {
    name: "West",
    slug: "west",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    borderColor: "border-blue-300",
    bgLight: "bg-blue-50",
    hex: "#3b82f6",
    corporationNumber: 3,
    corporationName: "Bengaluru West City Corporation (BWCC)",
    areas: ["Vijayanagar", "Chamrajpet", "Chickpet", "Basavanagudi", "Govindaraja Nagar", "Padmanaba Nagar", "RR Nagar West"],
  },
  South: {
    name: "South",
    slug: "south",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-300",
    bgLight: "bg-yellow-50",
    hex: "#eab308",
    corporationNumber: 4,
    corporationName: "Bengaluru South City Corporation (BSCC)",
    areas: ["Jayanagar", "JP Nagar", "Bommanahalli", "Bangalore South", "Shanthi Nagar", "BTM Layout", "Begur"],
  },
  East: {
    name: "East",
    slug: "east",
    color: "bg-green-500",
    textColor: "text-green-600",
    borderColor: "border-green-300",
    bgLight: "bg-green-50",
    hex: "#22c55e",
    corporationNumber: 5,
    corporationName: "Bengaluru East City Corporation (BECC)",
    areas: ["CV Raman Nagar", "Sarvagna Nagar", "KR Puram", "Mahadevpura", "Whitefield", "Marathahalli", "Bellandur"],
  },
};

export const ZONE_ORDER: ZoneName[] = ["North", "Central", "West", "South", "East"];

// ----------------------------------------------------------------
// Approximate bounding polygons for each zone
// lat/lng coordinates for point-in-polygon detection
// These are simplified convex hulls — accuracy ~500m margin
// Admins can always manually override if auto-detect is wrong
// ----------------------------------------------------------------
export const ZONE_BOUNDARIES: Record<ZoneName, Array<{ lat: number; lng: number }>> = {
  North: [
    { lat: 13.00, lng: 77.48 },
    { lat: 13.05, lng: 77.46 },
    { lat: 13.17, lng: 77.50 },
    { lat: 13.17, lng: 77.68 },
    { lat: 13.05, lng: 77.68 },
    { lat: 13.00, lng: 77.63 },
    { lat: 12.98, lng: 77.60 },
    { lat: 12.97, lng: 77.56 },
  ],
  Central: [
    { lat: 12.97, lng: 77.56 },
    { lat: 12.98, lng: 77.60 },
    { lat: 13.00, lng: 77.63 },
    { lat: 12.97, lng: 77.65 },
    { lat: 12.95, lng: 77.62 },
    { lat: 12.94, lng: 77.58 },
    { lat: 12.95, lng: 77.54 },
  ],
  West: [
    { lat: 12.97, lng: 77.56 },
    { lat: 12.95, lng: 77.54 },
    { lat: 12.94, lng: 77.52 },
    { lat: 12.90, lng: 77.52 },
    { lat: 12.87, lng: 77.50 },
    { lat: 12.87, lng: 77.47 },
    { lat: 13.00, lng: 77.47 },
    { lat: 13.00, lng: 77.48 },
  ],
  South: [
    { lat: 12.94, lng: 77.58 },
    { lat: 12.95, lng: 77.62 },
    { lat: 12.97, lng: 77.65 },
    { lat: 12.93, lng: 77.70 },
    { lat: 12.88, lng: 77.70 },
    { lat: 12.83, lng: 77.62 },
    { lat: 12.84, lng: 77.55 },
    { lat: 12.87, lng: 77.50 },
    { lat: 12.90, lng: 77.52 },
    { lat: 12.94, lng: 77.52 },
  ],
  East: [
    { lat: 13.00, lng: 77.63 },
    { lat: 13.05, lng: 77.68 },
    { lat: 13.07, lng: 77.82 },
    { lat: 12.98, lng: 77.82 },
    { lat: 12.88, lng: 77.75 },
    { lat: 12.88, lng: 77.70 },
    { lat: 12.93, lng: 77.70 },
    { lat: 12.97, lng: 77.65 },
  ],
};

// ----------------------------------------------------------------
// Ray-casting point-in-polygon algorithm
// ----------------------------------------------------------------
function pointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  const { lat: py, lng: px } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ----------------------------------------------------------------
// Determine the zone for a given lat/lng coordinate
// Returns the ZoneName or null if outside all known zones
// ----------------------------------------------------------------
export function detectZoneFromCoords(lat: number, lng: number): ZoneName | null {
  const point = { lat, lng };
  for (const zoneName of ZONE_ORDER) {
    if (pointInPolygon(point, ZONE_BOUNDARIES[zoneName])) {
      return zoneName;
    }
  }
  return null;
}

// ----------------------------------------------------------------
// Find the closest zone center if point falls outside all polygons
// (fallback for edge cases near zone boundaries)
// ----------------------------------------------------------------
const ZONE_CENTERS: Record<ZoneName, { lat: number; lng: number }> = {
  North:   { lat: 13.08, lng: 77.57 },
  Central: { lat: 12.97, lng: 77.60 },
  West:    { lat: 12.92, lng: 77.52 },
  South:   { lat: 12.89, lng: 77.61 },
  East:    { lat: 12.97, lng: 77.73 },
};

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const ha =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(ha), Math.sqrt(1 - ha));
}

export function detectZoneFromCoordsWithFallback(lat: number, lng: number): ZoneName {
  const exact = detectZoneFromCoords(lat, lng);
  if (exact) return exact;

  // Fallback: find closest zone center
  let closest: ZoneName = "Central";
  let minDist = Infinity;
  for (const [zone, center] of Object.entries(ZONE_CENTERS) as [ZoneName, { lat: number; lng: number }][]) {
    const d = haversineDistance({ lat, lng }, center);
    if (d < minDist) {
      minDist = d;
      closest = zone;
    }
  }
  return closest;
}
