/**
 * Open-Route-Service (ORS) Integration Module for Mellod PWA
 *
 * Provides real-world road directions, driving distance/duration,
 * and Traveling Salesperson Problem (TSP) multi-stop route optimization.
 */

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface RouteOptimizationStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface DrivingRouteResult {
  coordinates: [number, number][]; // [lat, lng] array for Leaflet polyline
  distanceMeters: number;
  durationSeconds: number;
  isRealRoad: boolean;
}

export interface OptimizedSequenceResult {
  optimizedStops: RouteOptimizationStop[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  isOptimized: boolean;
}

/**
 * Decodes Open-Route-Service encoded polyline (Google Encoded Polyline format) into [lat, lng] pairs.
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * Fetches real driving route geometry and travel metrics from Open-Route-Service.
 * Coordinates are passed as Array of [longitude, latitude] for ORS API.
 */
export async function getDrivingDirections(
  stops: LocationPoint[],
  apiKey?: string
): Promise<DrivingRouteResult> {
  const orsApiKey = apiKey || process.env.NEXT_PUBLIC_ORS_API_KEY || process.env.OPEN_ROUTE_SERVICE_KEY;

  // Need at least 2 points
  if (!stops || stops.length < 2) {
    const coords: [number, number][] = stops.map((s) => [s.latitude, s.longitude]);
    return {
      coordinates: coords,
      distanceMeters: 0,
      durationSeconds: 0,
      isRealRoad: false,
    };
  }

  // Fallback straight line coordinates generator
  const fallbackCoords: [number, number][] = stops.map((s) => [s.latitude, s.longitude]);
  let fallbackDistance = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const rad = Math.PI / 180;
    const dLat = (stops[i + 1].latitude - stops[i].latitude) * rad;
    const dLng = (stops[i + 1].longitude - stops[i].longitude) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(stops[i].latitude * rad) *
        Math.cos(stops[i + 1].latitude * rad) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    fallbackDistance += Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  if (!orsApiKey) {
    return {
      coordinates: fallbackCoords,
      distanceMeters: fallbackDistance,
      durationSeconds: Math.round(fallbackDistance / 8.33), // Assumes ~30 km/h avg speed
      isRealRoad: false,
    };
  }

  try {
    // ORS expects [longitude, latitude]
    const bodyCoordinates = stops.map((s) => [s.longitude, s.latitude]);

    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        Authorization: orsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: bodyCoordinates,
        elevation: false,
      }),
    });

    if (!response.ok) {
      console.warn("ORS Driving directions API response not OK:", response.status);
      return {
        coordinates: fallbackCoords,
        distanceMeters: fallbackDistance,
        durationSeconds: Math.round(fallbackDistance / 8.33),
        isRealRoad: false,
      };
    }

    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) {
      return {
        coordinates: fallbackCoords,
        distanceMeters: fallbackDistance,
        durationSeconds: Math.round(fallbackDistance / 8.33),
        isRealRoad: false,
      };
    }

    // GeoJSON coordinates are [lng, lat], convert to Leaflet [lat, lng]
    const rawCoords: [number, number][] = feature.geometry.coordinates;
    const leafletCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

    const summary = feature.properties.summary;

    return {
      coordinates: leafletCoords,
      distanceMeters: Math.round(summary.distance || fallbackDistance),
      durationSeconds: Math.round(summary.duration || fallbackDistance / 8.33),
      isRealRoad: true,
    };
  } catch (err) {
    console.error("Open-Route-Service API fetch error:", err);
    return {
      coordinates: fallbackCoords,
      distanceMeters: fallbackDistance,
      durationSeconds: Math.round(fallbackDistance / 8.33),
      isRealRoad: false,
    };
  }
}

/**
 * Optimizes the sequence of collection stops for a picker using Open-Route-Service Optimization VRP Engine.
 */
export async function optimizeStopsSequence(
  startLocation: LocationPoint,
  stops: RouteOptimizationStop[],
  apiKey?: string
): Promise<OptimizedSequenceResult> {
  const orsApiKey = apiKey || process.env.NEXT_PUBLIC_ORS_API_KEY || process.env.OPEN_ROUTE_SERVICE_KEY;

  if (stops.length <= 1) {
    return {
      optimizedStops: stops,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      isOptimized: false,
    };
  }

  if (!orsApiKey) {
    // Basic nearest-neighbor fallback sorting when key is absent
    const sorted = [...stops];
    let current = startLocation;
    const result: RouteOptimizationStop[] = [];

    while (sorted.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < sorted.length; i++) {
        const rad = Math.PI / 180;
        const dLat = (sorted[i].latitude - current.latitude) * rad;
        const dLng = (sorted[i].longitude - current.longitude) * rad;
        const dist = Math.sin(dLat / 2) ** 2 + Math.cos(current.latitude * rad) * Math.cos(sorted[i].latitude * rad) * Math.sin(dLng / 2) ** 2;
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }

      const nextStop = sorted.splice(closestIdx, 1)[0];
      result.push(nextStop);
      current = { latitude: nextStop.latitude, longitude: nextStop.longitude };
    }

    return {
      optimizedStops: result,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      isOptimized: true,
    };
  }

  try {
    const jobs = stops.map((stop, idx) => ({
      id: idx + 1,
      location: [stop.longitude, stop.latitude],
    }));

    const vehicle = {
      id: 1,
      profile: "driving-car",
      start: [startLocation.longitude, startLocation.latitude],
    };

    const response = await fetch("https://api.openrouteservice.org/optimization", {
      method: "POST",
      headers: {
        Authorization: orsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobs,
        vehicles: [vehicle],
      }),
    });

    if (!response.ok) {
      console.warn("ORS Optimization API error status:", response.status);
      throw new Error(`ORS error: ${response.status}`);
    }

    const data = await response.json();
    const routeSteps = data.routes?.[0]?.steps || [];

    const jobStepIndexes = routeSteps
      .filter((step: any) => step.type === "job")
      .map((step: any) => step.id - 1);

    const reorderedStops = jobStepIndexes.map((idx: number) => stops[idx]).filter(Boolean);

    // Append any unassigned stops if any
    stops.forEach((s) => {
      if (!reorderedStops.some((r: RouteOptimizationStop) => r.id === s.id)) {
        reorderedStops.push(s);
      }
    });

    const routeSummary = data.routes?.[0] || {};

    return {
      optimizedStops: reorderedStops,
      totalDistanceMeters: routeSummary.distance || 0,
      totalDurationSeconds: routeSummary.duration || 0,
      isOptimized: true,
    };
  } catch (err) {
    console.error("Error in ORS stop optimization:", err);
    // Nearest neighbor fallback
    const sorted = [...stops];
    let current = startLocation;
    const result: RouteOptimizationStop[] = [];

    while (sorted.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < sorted.length; i++) {
        const rad = Math.PI / 180;
        const dLat = (sorted[i].latitude - current.latitude) * rad;
        const dLng = (sorted[i].longitude - current.longitude) * rad;
        const dist = Math.sin(dLat / 2) ** 2 + Math.cos(current.latitude * rad) * Math.cos(sorted[i].latitude * rad) * Math.sin(dLng / 2) ** 2;
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }

      const nextStop = sorted.splice(closestIdx, 1)[0];
      result.push(nextStop);
      current = { latitude: nextStop.latitude, longitude: nextStop.longitude };
    }

    return {
      optimizedStops: result,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      isOptimized: true,
    };
  }
}
