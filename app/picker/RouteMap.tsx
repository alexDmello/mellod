"use client";

import { useEffect, useState, useRef } from "react";
import { MapPin, Navigation, CheckCircle2, Navigation2 } from "lucide-react";
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
}

export default function RouteMap({ routes }: RouteMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
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

  // 2. Initialize and Update Map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || typeof window === "undefined") return;
    const L = (window as any).L;
    if (!L) return;

    // Filter routes that have coordinates
    const stopsWithCoords = routes.filter(
      (r) => r.fbo?.latitude != null && r.fbo?.longitude != null
    );

    // Default center
    const defaultCenter =
      stopsWithCoords.length > 0
        ? [stopsWithCoords[0].fbo.latitude!, stopsWithCoords[0].fbo.longitude!]
        : [12.9716, 77.5946];

    if (!mapInstanceRef.current) {
      // Create map
      const map = L.map(mapContainerRef.current).setView(defaultCenter, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
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

    // Plot markers and build route coordinates list
    const latlngs: any[] = [];
    
    stopsWithCoords.forEach((stop, index) => {
      const isCompleted = !!stop.pickup;
      const lat = stop.fbo.latitude!;
      const lng = stop.fbo.longitude!;
      latlngs.push([lat, lng]);

      // Custom marker icon showing stop order index
      const markerHtml = `
        <div style="
          background-color: ${isCompleted ? "#16a34a" : "#15803d"};
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          transition: all 0.2s ease-in-out;
        ">
          ${index + 1}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      // Popup content with FBO detail and navigation trigger
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
          class="flex items-center justify-center gap-1 mt-2 text-xs font-semibold bg-green-700 hover:bg-green-800 text-white py-1.5 px-3 rounded-lg transition-colors w-full text-center"
          style="text-decoration: none !important; color: white !important;"
        >
          📍 Navigate (Google Maps)
        </a>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Draw routing Polyline connecting the stops
    if (latlngs.length > 1) {
      const polyline = L.polyline(latlngs, {
        color: "#15803d",
        weight: 4,
        opacity: 0.7,
        dashArray: "6, 8",
      }).addTo(map);
      polylineRef.current = polyline;

      // Fit map to fit all stops
      map.fitBounds(L.featureGroup(markersRef.current).getBounds(), {
        padding: [30, 30],
      });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 14);
    }
  }, [mapLoaded, routes]);

  return (
    <div className="card overflow-hidden border border-gray-200 shadow-sm bg-white">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-green-700" />
          <h2 className="text-sm font-bold text-gray-800">Your Route Map</h2>
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {routes.length} stops today
        </span>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full h-[260px] relative z-10"
        style={{ minHeight: "260px" }}
      />
      <div className="bg-green-50/50 px-4 py-2 flex items-center justify-between text-xs text-green-800 border-t border-gray-100">
        <span className="flex items-center gap-1 font-medium">
          <Navigation2 className="w-3.5 h-3.5 rotate-45 text-green-700 animate-pulse" />
          Tap pins to launch GPS navigation
        </span>
        <span className="font-semibold text-green-700">Powered by Mellod Maps</span>
      </div>
    </div>
  );
}
