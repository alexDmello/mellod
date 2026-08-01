"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

export interface Coords {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  coords: Coords;
  onChange: (coords: Coords) => void;
  label?: string;
  height?: string;
}

export function LocationPicker({
  coords,
  onChange,
  label = "Pinpoint exact location",
  height = "h-[220px]",
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initial Map creation & cleanup
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    const lat = coords?.lat && !isNaN(Number(coords.lat)) ? Number(coords.lat) : 12.9716;
    const lng = coords?.lng && !isNaN(Number(coords.lng)) ? Number(coords.lng) : 77.5946;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([lat, lng], 14);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const customIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = L.marker([lat, lng], { draggable: true, icon: customIcon }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current({ lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) });
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        onChangeRef.current({ lat: Number(clickLat.toFixed(6)), lng: Number(clickLng.toFixed(6)) });
      });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (mapInstanceRef.current && (mapContainerRef.current as any)?._leaflet_id) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch (e) {
            // Ignore if map pane was already removed
          }
        }
      }, 200);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // Ignore cleanup error if DOM element was removed
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update map view & marker position safely when coords prop updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const lat = coords?.lat && !isNaN(Number(coords.lat)) ? Number(coords.lat) : 12.9716;
    const lng = coords?.lng && !isNaN(Number(coords.lng)) ? Number(coords.lng) : 77.5946;

    const currentPos = marker.getLatLng();
    if (Math.abs(currentPos.lat - lat) > 0.00001 || Math.abs(currentPos.lng - lng) > 0.00001) {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], map.getZoom());
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (mapInstanceRef.current && (mapContainerRef.current as any)?._leaflet_id) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch (e) {
          // Ignore if map pane was removed
        }
      }
    }, 150);
  }, [coords?.lat, coords?.lng]);

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          };
          onChange(newCoords);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], 15);
            markerRef.current.setLatLng([newCoords.lat, newCoords.lng]);
          }
        },
        (error) => {
          alert("Could not get current location: " + error.message);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="form-label font-semibold text-gray-700 !mb-0">{label}</label>
        <button
          type="button"
          onClick={handleLocateMe}
          className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors font-semibold"
        >
          <MapPin className="w-3.5 h-3.5" /> Use Current Location
        </button>
      </div>

      <div
        ref={mapContainerRef}
        className={`w-full ${height} rounded-xl border border-gray-200 bg-gray-50 overflow-hidden relative z-10`}
      />

      <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-gray-100 p-2.5 rounded-lg border border-gray-200 text-gray-600">
        <div>Lat: {Number(coords?.lat ?? 12.9716).toFixed(6)}</div>
        <div>Lng: {Number(coords?.lng ?? 77.5946).toFixed(6)}</div>
      </div>
    </div>
  );
}
