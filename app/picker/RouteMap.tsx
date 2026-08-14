"use client";

import { useEffect, useState, useRef } from "react";
import { Navigation, Navigation2, Zap, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import type { FBO, Pickup } from "@/lib/types";

interface RouteStop {
  id: string;
  fbo_id: string;
  fbo: FBO & { latitude?: number; longitude?: number };
  route_date: string;
  sort_order: number;
  pickup?: Pickup;
}

interface RouteMapProps {
  routes: RouteStop[];
  onOrderOptimized?: (newOrderedStops: RouteStop[]) => void;
}

export default function RouteMap({ routes, onOrderOptimized }: RouteMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [routeMetrics, setRouteMetrics] = useState<{
    distanceStr: string;
    durationStr: string;
    isRealRoad: boolean;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  // 1. Dynamically load Leaflet JS and CSS
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if ((window as any).L) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      setMapLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // 2. Fetch Open-Route-Service road directions and render map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || typeof window === "undefined") return;
    const L = (window as any).L;
    if (!L) return;

    const stopsWithCoords = routes.filter(
      (r) => r.fbo?.latitude != null && r.fbo?.longitude != null
    );

    const defaultCenter =
      stopsWithCoords.length > 0
        ? [stopsWithCoords[0].fbo.latitude!, stopsWithCoords[0].fbo.longitude!]
        : [12.9716, 77.5946];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(defaultCenter, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap & &copy; Open-Route-Service',
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers and polylines
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (stopsWithCoords.length === 0) return;

    // Plot markers for each stop
    stopsWithCoords.forEach((stop, index) => {
      const isCompleted = !!stop.pickup;
      const lat = stop.fbo.latitude!;
      const lng = stop.fbo.longitude!;

      const markerHtml = `
        <div style="
          background-color: ${isCompleted ? "#16a34a" : "#15803d"};
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          transition: all 0.2s ease-in-out;
        ">
          ${index + 1}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const popupContent = document.createElement("div");
      popupContent.className = "p-1 space-y-2 text-gray-800 font-sans";
      popupContent.innerHTML = `
        <div class="font-bold text-sm leading-tight">${stop.fbo.business_name}</div>
        <div class="text-xs text-gray-500">${stop.fbo.address || "No address"}</div>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            isCompleted ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
          }">
            Stop ${index + 1} · ${isCompleted ? "Completed" : "Pending"}
          </span>
        </div>
        <a 
          href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}"
          target="_blank" 
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-1 mt-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 px-3 rounded-lg transition-colors w-full text-center"
          style="text-decoration: none !important; color: white !important;"
        >
          📍 Launch GPS Navigation
        </a>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Fetch real road polyline from Open-Route-Service API endpoint
    async function loadRoadRoute() {
      setLoadingRoute(true);
      try {
        const payloadStops = stopsWithCoords.map((s) => ({
          latitude: s.fbo.latitude!,
          longitude: s.fbo.longitude!,
        }));

        const res = await fetch("/api/routes/directions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "directions", stops: payloadStops }),
        });

        const data = await res.json();

        if (data.success && data.coordinates && data.coordinates.length > 0) {
          const polyline = L.polyline(data.coordinates, {
            color: data.isRealRoad ? "#059669" : "#16a34a",
            weight: 5,
            opacity: 0.85,
            lineJoin: "round",
            dashArray: data.isRealRoad ? undefined : "6, 8",
          }).addTo(map);

          polylineRef.current = polyline;

          // Format metrics
          const distKm = (data.distanceMeters / 1000).toFixed(1);
          const durationMin = Math.round(data.durationSeconds / 60);

          setRouteMetrics({
            distanceStr: `${distKm} km`,
            durationStr: durationMin > 60 ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m` : `${durationMin} mins`,
            isRealRoad: data.isRealRoad,
          });

          map.fitBounds(L.featureGroup(markersRef.current).getBounds(), {
            padding: [35, 35],
          });
        }
      } catch (err) {
        console.error("Error loading road directions:", err);
      } finally {
        setLoadingRoute(false);
      }
    }

    if (stopsWithCoords.length > 1) {
      loadRoadRoute();
    } else if (stopsWithCoords.length === 1) {
      map.setView([stopsWithCoords[0].fbo.latitude!, stopsWithCoords[0].fbo.longitude!], 14);
    }
  }, [mapLoaded, routes]);

  // Handle TSP Route Optimization trigger
  async function handleOptimizeRoute() {
    if (routes.length <= 1 || optimizing) return;
    setOptimizing(true);

    try {
      const stopsWithCoords = routes.filter(
        (r) => r.fbo?.latitude != null && r.fbo?.longitude != null
      );

      const payloadStops = stopsWithCoords.map((s) => ({
        id: s.id,
        name: s.fbo.business_name,
        latitude: s.fbo.latitude!,
        longitude: s.fbo.longitude!,
      }));

      const res = await fetch("/api/routes/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "optimize", stops: payloadStops }),
      });

      const data = await res.json();

      if (data.success && data.optimizedStops) {
        const reorderedMap = new Map<string, number>();
        data.optimizedStops.forEach((op: any, index: number) => {
          reorderedMap.set(op.id, index);
        });

        const newRoutes = [...routes].sort((a, b) => {
          const orderA = reorderedMap.has(a.id) ? reorderedMap.get(a.id)! : 99;
          const orderB = reorderedMap.has(b.id) ? reorderedMap.get(b.id)! : 99;
          return orderA - orderB;
        });

        if (onOrderOptimized) {
          onOrderOptimized(newRoutes);
        }
      }
    } catch (err) {
      console.error("Optimization failed:", err);
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div className="card overflow-hidden border border-gray-200 shadow-sm bg-white rounded-2xl">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-black uppercase tracking-wider">Live Driving Route Map</h2>
        </div>

        <div className="flex items-center gap-2">
          {routes.length > 1 && (
            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing}
              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              {optimizing ? (
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-300" />
              ) : (
                <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
              )}
              {optimizing ? "Optimizing..." : "Optimize Order"}
            </button>
          )}
          <span className="text-[11px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-emerald-100">
            {routes.length} Stops
          </span>
        </div>
      </div>

      {/* Real road metrics banner */}
      {routeMetrics && (
        <div className="bg-emerald-50 px-4 py-2 flex items-center justify-between border-b border-emerald-100 text-emerald-950 text-xs font-bold">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700">
              <Navigation2 className="w-3.5 h-3.5 rotate-45 text-emerald-600" />
              Road Dist: <strong>{routeMetrics.distanceStr}</strong>
            </span>
            <span className="flex items-center gap-1 text-emerald-800">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              Est. Driving Time: <strong>{routeMetrics.durationStr}</strong>
            </span>
          </div>
          <span className="text-[10px] font-extrabold text-emerald-600 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
            {routeMetrics.isRealRoad ? "Open-Route-Service Road Geometry" : "Direct Geometry"}
          </span>
        </div>
      )}

      {/* Map element */}
      <div
        ref={mapContainerRef}
        className="w-full h-[270px] relative z-10"
        style={{ minHeight: "270px" }}
      />

      {/* Footer bar */}
      <div className="bg-gray-50 px-4 py-2 flex items-center justify-between text-xs text-gray-600 border-t border-gray-100">
        <span className="flex items-center gap-1 font-medium text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Real-time Open-Route-Service Navigation active
        </span>
        <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-800">
          Mellod Operations GIS
        </span>
      </div>
    </div>
  );
}
