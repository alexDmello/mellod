"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  MapPin,
  Search,
  User,
  Phone,
  Navigation,
  Loader2,
  AlertCircle,
  Activity,
  Layers,
} from "lucide-react";
import type { FBO } from "@/lib/types";

export default function AdminMapPage() {
  const [fbos, setFbos] = useState<FBO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  const supabase = createClient();

  // 1. Fetch FBO Data
  useEffect(() => {
    async function fetchFbos() {
      try {
        const { data, error: fboError } = await supabase
          .from("fbos")
          .select("*")
          .order("business_name");

        if (fboError) throw fboError;
        setFbos(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch FBOs");
      } finally {
        setLoading(false);
      }
    }
    fetchFbos();
  }, []);

  // 2. Dynamically Load Leaflet Script and Styles
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

  // 3. Initialize & Sync Map Markers
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || typeof window === "undefined" || loading) return;
    const L = (window as any).L;
    if (!L) return;

    // Filter FBOs that have coordinates
    const fbosWithCoords = fbos.filter((f) => f.latitude != null && f.longitude != null);

    const defaultCenter =
      fbosWithCoords.length > 0
        ? [fbosWithCoords[0].latitude!, fbosWithCoords[0].longitude!]
        : [12.9716, 77.5946];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(defaultCenter, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers from map
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    // Plot new markers
    fbosWithCoords.forEach((fbo) => {
      const lat = fbo.latitude!;
      const lng = fbo.longitude!;

      const markerHtml = `
        <div style="
          background-color: #15803d;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease-in-out;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px; color: #1f2937;">
          <h3 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #111827;">${fbo.business_name}</h3>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #6b7280; line-height: 1.4;">${fbo.address || "No address"}</p>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
            <div><strong>Contact:</strong> ${fbo.contact_person || "N/A"}</div>
            <div><strong>Phone:</strong> ${fbo.phone || "N/A"}</div>
          </div>
          <a 
            href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}"
            target="_blank" 
            rel="noopener noreferrer"
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              margin-top: 10px;
              font-size: 11px;
              font-weight: 600;
              background-color: #15803d;
              color: white;
              padding: 6px;
              border-radius: 6px;
              text-decoration: none;
              text-align: center;
            "
          >
            📍 Open in Google Maps
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current[fbo.id] = marker;
    });

    // Auto-fit to bounds if we have markers
    if (fbosWithCoords.length > 0) {
      const bounds = L.featureGroup(Object.values(markersRef.current)).getBounds();
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [mapLoaded, fbos, loading]);

  // Center Map on a specific FBO
  const focusOnFbo = (fbo: FBO) => {
    if (!fbo.latitude || !fbo.longitude || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.setView([fbo.latitude, fbo.longitude], 16);

    const marker = markersRef.current[fbo.id];
    if (marker) {
      marker.openPopup();
    }
  };

  const filteredFbos = fbos.filter((fbo) => {
    const term = searchTerm.toLowerCase();
    return (
      fbo.business_name.toLowerCase().includes(term) ||
      (fbo.address || "").toLowerCase().includes(term) ||
      (fbo.contact_person || "").toLowerCase().includes(term)
    );
  });

  const fbosWithCoords = fbos.filter((f) => f.latitude != null && f.longitude != null);
  const fbosMissingCoords = fbos.filter((f) => f.latitude == null || f.longitude == null);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Geospatial Map</h1>
        <p className="text-sm text-gray-500 mt-1">Visualize and track all registered FBO (restaurant) locations.</p>
      </div>

      {/* Top statistics overview bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 bg-white border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-green-700">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-semibold uppercase tracking-wider">Total FBOs</span>
            <span className="text-2xl font-black text-gray-800">{fbos.length}</span>
          </div>
        </div>

        <div className="card p-5 bg-white border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-blue-700">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-semibold uppercase tracking-wider">Pinned on Map</span>
            <span className="text-2xl font-black text-gray-800">{fbosWithCoords.length}</span>
          </div>
        </div>

        <div className="card p-5 bg-white border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-amber-700">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-semibold uppercase tracking-wider">Missing Coords</span>
            <span className="text-2xl font-black text-gray-800">{fbosMissingCoords.length}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card min-h-[400px] flex flex-col items-center justify-center bg-white border border-gray-100 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-green-700 mb-3" />
          <p className="text-sm font-medium text-gray-500">Loading map datasets...</p>
        </div>
      ) : error ? (
        <div className="card p-8 text-center bg-white border border-red-100 shadow-sm text-red-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
          <p className="font-semibold">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left panel: Interactive Map */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card overflow-hidden border border-gray-100 shadow-sm bg-white">
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-700 animate-pulse" />
                  <h2 className="text-sm font-bold text-gray-800">Operational Coverage Map</h2>
                </div>
                <span className="text-xs text-gray-500 font-semibold bg-gray-200/50 px-2 py-0.5 rounded-full">
                  {fbosWithCoords.length} Pinned Points
                </span>
              </div>
              <div
                ref={mapContainerRef}
                className="w-full h-[500px] relative z-10"
                style={{ minHeight: "500px" }}
              />
            </div>
          </div>

          {/* Right panel: Search and list view */}
          <div className="card bg-white border border-gray-100 shadow-sm flex flex-col h-[565px] overflow-hidden">
            {/* Search header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-bold text-gray-800 mb-3">Restaurant Directory</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  className="form-input !pl-9 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 scrollbar-thin">
              {filteredFbos.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 font-medium">
                  No matches found for &quot;{searchTerm}&quot;
                </div>
              ) : (
                filteredFbos.map((fbo: FBO) => {
                  const hasCoords = fbo.latitude != null && fbo.longitude != null;
                  return (
                    <div
                      key={fbo.id}
                      onClick={() => {
                        if (hasCoords) {
                          focusOnFbo(fbo);
                        }
                      }}
                      className={`p-4 text-left transition-colors flex flex-col gap-1.5 ${
                        hasCoords
                          ? "hover:bg-green-50/40 cursor-pointer"
                          : "opacity-60 bg-gray-50/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-800 text-xs truncate max-w-[150px]">
                          {fbo.business_name}
                        </span>
                        {hasCoords ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                            <MapPin className="w-2.5 h-2.5" />
                            Pinned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            Unmapped
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                        {fbo.address || "No address listed"}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-1">
                        {fbo.contact_person && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-300" />
                            {fbo.contact_person}
                          </span>
                        )}
                        {fbo.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-300" />
                            {fbo.phone}
                          </span>
                        )}
                      </div>

                      {hasCoords && (
                        <button
                          type="button"
                          className="mt-2 text-[9px] font-bold text-green-700 hover:text-green-800 flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          Center on Map
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
