"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

import {
  Building2,
  MapPin,
  Search,
  Phone,
  Navigation,
  Loader2,
  AlertCircle,
  Filter,
  ExternalLink,
  Map as MapIcon
} from "lucide-react";
import type { FBO } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────
export function isValidCoordinate(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (lat == null || lng == null) return false;
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Fix Leaflet's default icon assets URL resolution in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

export function FBOMapView() {
  const [fbos, setFbos] = useState<FBO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [coordFilter, setCoordFilter] = useState<"all" | "mapped" | "unmapped">("all");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

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
        console.error("Error fetching FBOs for map view:", err);
        setError("Unable to load restaurant map data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchFbos();
  }, []);

  // 2. Initialize Map once container div is mounted into DOM (when loading is false)
  useEffect(() => {
    if (!mapContainerRef.current || typeof window === "undefined" || loading) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
      }).setView([12.9716, 77.5946], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      }).addTo(map);

      const clusterGroup = (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
      });

      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
      mapInstanceRef.current = map;

      // Ensure proper sizing after DOM render
      setTimeout(() => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch (e) {
            // Ignore if map unmounted
          }
        }
      }, 150);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.remove();
        } catch (e) {
          // Ignore DOM removal errors during unmount
        }
        mapInstanceRef.current = null;
        clusterGroupRef.current = null;
        markersRef.current = {};
      }
    };
  }, [loading]);

  // 3. Sync Markers & Filter without destroying the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup || loading) return;

    try {
      map.stop();
      clusterGroup.clearLayers();
    } catch (e) {
      // Ignore transition stop errors
    }
    markersRef.current = {};

    // Filter by coordinate status and search term
    const visibleFbos = fbos.filter((fbo) => {
      const hasCoords = isValidCoordinate(fbo.latitude, fbo.longitude);
      if (coordFilter === "mapped" && !hasCoords) return false;
      if (coordFilter === "unmapped" && hasCoords) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = fbo.business_name.toLowerCase().includes(term);
        const matchesAddress = (fbo.address || "").toLowerCase().includes(term);
        const matchesContact = (fbo.contact_person || "").toLowerCase().includes(term);
        return matchesName || matchesAddress || matchesContact;
      }
      return true;
    });

    const mappedVisibleFbos = visibleFbos.filter((f) => isValidCoordinate(f.latitude, f.longitude));

    // Plot markers
    mappedVisibleFbos.forEach((fbo) => {
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
          transition: transform 0.2s ease-in-out;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const safeBusinessName = escapeHtml(fbo.business_name);
      const safeAddress = escapeHtml(fbo.address || "No address");
      const safeContactPerson = escapeHtml(fbo.contact_person || "N/A");
      const safePhone = escapeHtml(fbo.phone || "N/A");

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px; color: #1f2937;">
          <h3 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #111827;">${safeBusinessName}</h3>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #6b7280; line-height: 1.4;">${safeAddress}</p>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
            <div><strong>Contact:</strong> ${safeContactPerson}</div>
            <div><strong>Phone:</strong> ${safePhone}</div>
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
      clusterGroup.addLayer(marker);
      markersRef.current[fbo.id] = marker;
    });

    // Auto-fit to bounds if we have markers
    if (mappedVisibleFbos.length > 0) {
      const bounds = clusterGroup.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [fbos, loading, coordFilter, searchTerm]);

  // Center Map on a specific FBO from the side list
  const handleCenterFbo = (fbo: FBO) => {
    if (!isValidCoordinate(fbo.latitude, fbo.longitude)) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    map.setView([fbo.latitude!, fbo.longitude!], 16, { animate: true });
    const marker = markersRef.current[fbo.id];
    if (marker) {
      if (clusterGroupRef.current) {
        clusterGroupRef.current.zoomToShowLayer(marker, () => {
          marker.openPopup();
        });
      } else {
        marker.openPopup();
      }
    }
  };

  const totalCount = fbos.length;
  const mappedCount = fbos.filter((f) => isValidCoordinate(f.latitude, f.longitude)).length;
  const unmappedCount = totalCount - mappedCount;

  const filteredFbos = fbos.filter((fbo) => {
    const hasCoords = isValidCoordinate(fbo.latitude, fbo.longitude);
    if (coordFilter === "mapped" && !hasCoords) return false;
    if (coordFilter === "unmapped" && hasCoords) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = fbo.business_name.toLowerCase().includes(term);
      const matchesAddress = (fbo.address || "").toLowerCase().includes(term);
      const matchesContact = (fbo.contact_person || "").toLowerCase().includes(term);
      return matchesName || matchesAddress || matchesContact;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Bar Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <MapIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Operational Coverage Map
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Geospatial distribution and cluster monitoring of registered FBO collection partners.
          </p>
        </div>

        {/* Coordinate Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl text-xs font-bold border border-gray-200/60">
          <button
            type="button"
            onClick={() => setCoordFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              coordFilter === "all"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All FBOs ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setCoordFilter("mapped")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              coordFilter === "mapped"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Mapped GPS ({mappedCount})
          </button>
          <button
            type="button"
            onClick={() => setCoordFilter("unmapped")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              coordFilter === "unmapped"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Unmapped ({unmappedCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-gray-400 bg-white flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          <p className="font-semibold text-gray-700">Loading map data...</p>
        </div>
      ) : error ? (
        <div className="card p-8 text-center bg-white border border-rose-100 shadow-sm text-rose-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-rose-500" />
          <p className="font-semibold">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Canvas */}
          <div className="lg:col-span-2 relative min-h-[500px] rounded-2xl overflow-hidden border border-gray-200 shadow-xl shadow-gray-200/80 bg-gray-50">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />
          </div>

          {/* Side List: Partner Locations */}
          <div className="card p-5 bg-white border border-gray-100 shadow-xl shadow-gray-200/80 flex flex-col h-[500px]">
            <div className="space-y-3 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">FBO Directory ({filteredFbos.length})</h3>
                <span className="text-[11px] font-semibold text-gray-400">Click to locate</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search partner or address..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1 mt-2">
              {filteredFbos.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs italic">
                  No partners found matching search criteria.
                </div>
              ) : (
                filteredFbos.map((fbo) => {
                  const hasCoords = isValidCoordinate(fbo.latitude, fbo.longitude);
                  return (
                    <div
                      key={fbo.id}
                      onClick={() => handleCenterFbo(fbo)}
                      className={`p-3 text-xs transition-colors rounded-xl flex items-start justify-between gap-2 ${
                        hasCoords
                          ? "hover:bg-emerald-50/60 cursor-pointer"
                          : "opacity-60 bg-gray-50/50 cursor-not-allowed"
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-bold text-gray-900 truncate">{fbo.business_name}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{fbo.address || "No address provided"}</p>
                        {fbo.phone && <p className="text-[10px] text-gray-400 font-mono">Ph: {fbo.phone}</p>}
                      </div>
                      <div className="flex-shrink-0">
                        {hasCoords ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            GPS ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            No GPS
                          </span>
                        )}
                      </div>
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

export default function MapPage() {
  return <FBOMapView />;
}
