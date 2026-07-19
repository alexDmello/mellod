"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO, formatDate } from "@/lib/utils";
import { MapPin, Plus, Trash2, Loader2, CheckCircle2, CalendarDays } from "lucide-react";
import type { FBO, Picker, Profile, Route } from "@/lib/types";

interface PickerWithProfile extends Picker {
  profile: Profile;
}
interface RouteWithFBO extends Route {
  fbo: FBO;
}

export default function RoutesPage() {
  const [pickers, setPickers] = useState<PickerWithProfile[]>([]);
  const [fbos, setFBOs] = useState<FBO[]>([]);
  const [selectedPicker, setSelectedPicker] = useState<string>("");
  const [selectedFBO, setSelectedFBO] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [routes, setRoutes] = useState<RouteWithFBO[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (selectedPicker) fetchRoutes(); }, [selectedPicker, selectedDate]);

  async function fetchData() {
    const [pickersRes, fbosRes] = await Promise.all([
      supabase.from("pickers").select("*, profile:profiles(*)").eq("is_active", true),
      supabase.from("fbos").select("*").eq("is_active", true).order("business_name"),
    ]);
    setPickers((pickersRes.data as PickerWithProfile[]) ?? []);
    setFBOs(fbosRes.data ?? []);
    setFetching(false);
  }

  async function fetchRoutes() {
    const { data } = await supabase
      .from("routes")
      .select("*, fbo:fbos(*)")
      .eq("picker_id", selectedPicker)
      .eq("route_date", selectedDate)
      .order("sort_order");
    setRoutes((data as RouteWithFBO[]) ?? []);
  }

  async function addRoute() {
    if (!selectedPicker || !selectedFBO) return;
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("routes").insert({
      picker_id: selectedPicker,
      fbo_id: selectedFBO,
      route_date: selectedDate,
      sort_order: routes.length,
    });

    if (insertError) {
      setError(insertError.code === "23505"
        ? "This FBO is already assigned to this picker for the selected date."
        : insertError.message
      );
    } else {
      setSuccess(true);
      setSelectedFBO("");
      await fetchRoutes();
      setTimeout(() => setSuccess(false), 2000);
    }
    setLoading(false);
  }

  async function removeRoute(routeId: string) {
    await supabase.from("routes").delete().eq("id", routeId);
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
  }

  const selectedPickerData = pickers.find((p) => p.id === selectedPicker);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daily Route Assignment</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assign FBOs to pickers for their daily collection routes.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Select Picker</label>
            <select
              className="form-input"
              value={selectedPicker}
              onChange={(e) => setSelectedPicker(e.target.value)}
            >
              <option value="">-- Choose a picker --</option>
              {pickers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.profile?.full_name ?? "Unknown"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Route Date</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                className="form-input !pl-9"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Add FBO to Route</label>
            <div className="flex gap-2">
              <select
                className="form-input"
                value={selectedFBO}
                onChange={(e) => setSelectedFBO(e.target.value)}
                disabled={!selectedPicker}
              >
                <option value="">-- Select FBO --</option>
                {fbos.map((f) => (
                  <option key={f.id} value={f.id}>{f.business_name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addRoute}
                disabled={!selectedPicker || !selectedFBO || loading}
                className="btn btn-primary flex-shrink-0 px-3"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> FBO added to route successfully!
          </div>
        )}
      </div>

      {/* Route list */}
      {selectedPicker && (
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">
                {selectedPickerData?.profile?.full_name ?? "Picker"}&apos;s Route
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDate(selectedDate)} · {routes.length} stop{routes.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">{routes.length} FBOs</span>
            </div>
          </div>

          {routes.length === 0 ? (
            <div className="p-12 text-center">
              <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No FBOs assigned yet for this date.</p>
              <p className="text-gray-300 text-xs mt-1">Use the form above to add stops.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {routes.map((route, idx) => (
                <div key={route.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{route.fbo?.business_name}</p>
                    <p className="text-xs text-gray-400 truncate">{route.fbo?.address ?? "No address"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRoute(route.id)}
                    className="btn btn-danger btn-sm"
                    aria-label="Remove from route"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedPicker && !fetching && (
        <div className="text-center py-16 text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-200" />
          <p className="text-sm">Select a picker above to view and manage their route.</p>
        </div>
      )}
    </div>
  );
}
