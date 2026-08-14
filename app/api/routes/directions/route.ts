import { NextResponse } from "next/server";
import { getDrivingDirections, optimizeStopsSequence, LocationPoint, RouteOptimizationStop } from "@/lib/open-route-service";
import { parseAndSanitizeJson } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    const parseResult = parseAndSanitizeJson<{
      action?: "directions" | "optimize";
      stops?: (LocationPoint & { id?: string; name?: string })[];
      startLocation?: LocationPoint;
    }>(rawText);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error }, { status: parseResult.status });
    }

    const { action = "directions", stops = [], startLocation } = parseResult.data;

    if (!stops || stops.length === 0) {
      return NextResponse.json({ error: "No stops provided for route processing." }, { status: 400 });
    }

    if (action === "optimize") {
      const validStart = startLocation || stops[0];
      const validStops: RouteOptimizationStop[] = stops.map((s, idx) => ({
        id: s.id || `stop_${idx}`,
        name: s.name || `Stop ${idx + 1}`,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
      }));

      const result = await optimizeStopsSequence(validStart, validStops);
      return NextResponse.json({ success: true, ...result });
    }

    // Default: directions calculation
    const validPoints: LocationPoint[] = stops.map((s) => ({
      latitude: Number(s.latitude),
      longitude: Number(s.longitude),
    }));

    const result = await getDrivingDirections(validPoints);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("API error in /api/routes/directions:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
