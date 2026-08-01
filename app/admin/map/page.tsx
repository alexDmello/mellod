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

  // 2. Initialize Map & Sync Cluster Markers
  useEffect(() => {
    if (!mapContainerRef.current || typeof window === "undefined" || loading) return;

    // Filter FBOs with valid coordinates
    const mappedFbos = fbos.filter((f) => isValidCoordinate(f.latitude, f.longitude));

    const defaultCenter: [number, number] =
      mappedFbos.length > 0
        ? [mappedFbos[0].latitude!, mappedFbos[0].longitude!]
        : [12.9716, 77.5946];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(defaultCenter, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing cluster group if any
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    // Initialize marker cluster group
    const clusterGroup = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
    });
    clusterGroupRef.current = clusterGroup;
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

    map.addLayer(clusterGroup);

    // Auto-fit to bounds if we have markers
    if (mappedVisibleFbos.length > 0) {
      const bounds = clusterGroup.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        clusterGroupRef.current = null;
        markersRef.current = {};
      }
    };
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
    <div className="space-y-6">
      {/* Top Bar with Counts & Status Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-green-700" />
            Operational Coverage Map
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Geospatial distribution of registered FBO collection partners.
          </p>
        </div>

        {/* Coordinate Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCoordFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              coordFilter === "all"
                ? "bg-green-700 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setCoordFilter("mapped")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              coordFilter === "mapped"
                ? "bg-green-700 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📍 Mapped ({mappedCount})
          </button>
          <button
            type="button"
            onClick={() => setCoordFilter("unmapped")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              coordFilter === "unmapped"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ⚠️ Unmapped ({unmappedCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-gray-400 bg-white flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-700 mb-3" />
          <p className="font-semibold text-gray-700">Loading map data...</p>
        </div>
      ) : error ? (
        <div className="card p-8 text-center bg-white border border-red-100 shadow-sm text-red-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
          <p className="font-semibold">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Canvas */}
          <div className="lg:col-span-2 relative min-h-[500px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />
          </div>

          {/* Side Directory Panel */}
          <div className="card p-5 flex flex-col h-[500px]">
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search FBO name or address..."
                className="form-input !pl-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Restaurants ({filteredFbos.length})
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {coordFilter === "unmapped" ? "Missing Pin" : "Showing Matches"}
              </span>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-50">
              {filteredFbos.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No matching FBOs found for current filter.
                </div>
              ) : (
                filteredFbos.map((fbo) => {
                  const hasCoords = isValidCoordinate(fbo.latitude, fbo.longitude);
                  return (
                    <div
                      key={fbo.id}
                      className="pt-2 hover:bg-gray-50 p-2 rounded-xl transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-semibold text-gray-900 text-sm truncate group-hover:text-green-700 transition-colors">
                            {fbo.business_name}
                          </h4>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {fbo.address || "No address listed"}
                          </p>
                        </div>
                        {hasCoords ? (
                          <span className="badge badge-green text-[10px] font-semibold flex-shrink-0">
                            Mapped
                          </span>
                        ) : (
                          <span className="badge bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold flex-shrink-0">
                            No Pin
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        {fbo.contact_person && (
                          <span className="truncate">Contact: {fbo.contact_person}</span>
                        )}
                        {fbo.phone && (
                          <span className="flex items-center gap-1 font-mono text-[11px] ml-auto">
                            <Phone className="w-3 h-3 text-gray-300" />
                            {fbo.phone}
                          </span>
                        )}
                      </div>

                      {hasCoords ? (
                        <button
                          type="button"
                          onClick={() => handleCenterFbo(fbo)}
                          className="mt-2 text-[10px] font-bold text-green-700 hover:text-green-800 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg border border-green-100 transition-colors"
                        >
                          <Navigation className="w-3 h-3" />
                          Center on Map
                        </button>
                      ) : (
                        <a
                          href="/admin/fbo?tab=onboarding"
                          className="mt-2 text-[10px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 transition-colors inline-flex"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Set Location Pin in Onboarding
                        </a>
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

export default function AdminMapPage() {
  return <FBOMapView />;
}
