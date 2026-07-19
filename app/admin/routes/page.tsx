"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO, formatDate } from "@/lib/utils";
import {
  MapPin,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  CalendarDays,
  FolderKanban,
  Shuffle,
  UserCheck,
  UserX,
  ArrowUp,
  ArrowDown,
  Info,
  Layers,
  Map,
} from "lucide-react";
import type { FBO, Picker, Profile } from "@/lib/types";

interface PickerWithProfile extends Picker {
  profile: Profile;
}

interface RouteDefinition {
  id: string;
  name: string;
  default_picker_id: string | null;
}

interface RouteStop {
  id: string;
  route_definition_id: string;
  fbo_id: string;
  sort_order: number;
  fbo: FBO;
}

interface DailyRouteAssignment {
  id: string;
  picker_id: string;
  fbo_id: string;
  route_date: string;
  sort_order: number;
}

export default function RoutesManagementPage() {
  const [activeTab, setActiveTab] = useState<"dispatch" | "templates">("dispatch");

  // Global State
  const [pickers, setPickers] = useState<PickerWithProfile[]>([]);
  const [fbos, setFBOs] = useState<FBO[]>([]);
  const [routeDefinitions, setRouteDefinitions] = useState<RouteDefinition[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [dailyAssignments, setDailyAssignments] = useState<DailyRouteAssignment[]>([]);

  // Selected state for Dispatch Board
  const [selectedDate, setSelectedDate] = useState(todayISO());

  // Temp form states
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Template Form state
  const [newRouteName, setNewRouteName] = useState("");
  const [newRoutePickerId, setNewRoutePickerId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedFboToAdd, setSelectedFboToAdd] = useState("");

  const supabase = createClient();

  // Load Initial Data
  useEffect(() => {
    fetchBaseData();
  }, []);

  // Fetch daily assignments whenever date changes
  useEffect(() => {
    fetchDailyAssignments();
  }, [selectedDate]);

  async function fetchBaseData() {
    setFetching(true);
    try {
      const [pickersRes, fbosRes, defsRes, stopsRes] = await Promise.all([
        supabase.from("pickers").select("*, profile:profiles(*)").eq("is_active", true),
        supabase.from("fbos").select("*").eq("is_active", true).order("business_name"),
        supabase.from("route_definitions").select("*").order("name"),
        supabase.from("route_stops").select("*, fbo:fbos(*)").order("sort_order"),
      ]);

      setPickers((pickersRes.data as PickerWithProfile[]) ?? []);
      setFBOs(fbosRes.data ?? []);
      setRouteDefinitions(defsRes.data ?? []);
      setRouteStops((stopsRes.data as RouteStop[]) ?? []);

      if (defsRes.data && defsRes.data.length > 0) {
        setSelectedTemplateId(defsRes.data[0].id);
      }
    } catch (e: any) {
      setErrorMessage("Error loading routes metadata");
    } finally {
      setFetching(false);
    }
  }

  async function fetchDailyAssignments() {
    try {
      const { data } = await supabase
        .from("routes")
        .select("*")
        .eq("route_date", selectedDate);
      setDailyAssignments((data as DailyRouteAssignment[]) ?? []);
    } catch (e: any) {
      console.error(e);
    }
  }

  // Temporary helper for showing alert triggers
  function triggerSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  // --- ROUTE TEMPLATE OPERATIONS ---
  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newRouteName.trim()) return;

    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("route_definitions")
      .insert({
        name: newRouteName.trim(),
        default_picker_id: newRoutePickerId || null,
      })
      .select()
      .single();

    if (error) {
      setErrorMessage(error.message);
    } else {
      triggerSuccess(`Route definition "${newRouteName}" created.`);
      setNewRouteName("");
      setNewRoutePickerId("");
      await fetchBaseData();
      if (data) setSelectedTemplateId(data.id);
    }
    setLoading(false);
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Are you sure you want to delete this route template? This will delete all its stops too.")) return;
    setLoading(true);
    const { error } = await supabase.from("route_definitions").delete().eq("id", id);
    if (error) {
      setErrorMessage(error.message);
    } else {
      triggerSuccess("Route template deleted.");
      await fetchBaseData();
    }
    setLoading(false);
  }

  async function handleAddStop() {
    if (!selectedTemplateId || !selectedFboToAdd) return;
    setLoading(true);

    const stopsInTemplate = routeStops.filter((s) => s.route_definition_id === selectedTemplateId);
    const nextOrder = stopsInTemplate.length;

    const { error } = await supabase.from("route_stops").insert({
      route_definition_id: selectedTemplateId,
      fbo_id: selectedFboToAdd,
      sort_order: nextOrder,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      triggerSuccess("Stop added to template.");
      setSelectedFboToAdd("");
      await fetchBaseData();
    }
    setLoading(false);
  }

  async function handleRemoveStop(stopId: string) {
    setLoading(true);
    const { error } = await supabase.from("route_stops").delete().eq("id", stopId);
    if (error) {
      setErrorMessage(error.message);
    } else {
      triggerSuccess("Stop removed from template.");
      await fetchBaseData();
    }
    setLoading(false);
  }

  async function handleMoveStop(stopId: string, direction: "up" | "down") {
    const activeStops = [...routeStops.filter((s) => s.route_definition_id === selectedTemplateId)];
    const index = activeStops.findIndex((s) => s.id === stopId);
    if (index === -1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= activeStops.length) return;

    setLoading(true);
    const itemA = activeStops[index];
    const itemB = activeStops[swapIndex];

    // Swap order values
    const tempOrder = itemA.sort_order;
    itemA.sort_order = itemB.sort_order;
    itemB.sort_order = tempOrder;

    const updateA = supabase
      .from("route_stops")
      .update({ sort_order: itemA.sort_order })
      .eq("id", itemA.id);

    const updateB = supabase
      .from("route_stops")
      .update({ sort_order: itemB.sort_order })
      .eq("id", itemB.id);

    await Promise.all([updateA, updateB]);
    await fetchBaseData();
    setLoading(false);
  }

  // --- DAILY DISPATCH OPERATIONS ---

  // Quick dispatch entire template to default picker
  async function handleQuickDispatch(def: RouteDefinition) {
    const stops = routeStops.filter((s) => s.route_definition_id === def.id);
    if (stops.length === 0) {
      setErrorMessage("No stops defined for this route. Add stops in the Templates tab first.");
      return;
    }
    if (!def.default_picker_id) {
      setErrorMessage("Please set a default picker for this route first in the Templates tab.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const fboIds = stops.map((s) => s.fbo_id);

    // 1. Delete existing daily assignments for these FBOs on this day
    await supabase
      .from("routes")
      .delete()
      .eq("route_date", selectedDate)
      .in("fbo_id", fboIds);

    // 2. Insert new daily routes
    const inserts = stops.map((stop, index) => ({
      picker_id: def.default_picker_id!,
      fbo_id: stop.fbo_id,
      route_date: selectedDate,
      sort_order: index,
    }));

    const { error } = await supabase.from("routes").insert(inserts);

    if (error) {
      setErrorMessage(error.message);
    } else {
      triggerSuccess(`Route "${def.name}" dispatched successfully.`);
      await fetchDailyAssignments();
    }
    setLoading(false);
  }

  // Reassign all stops in template to another picker
  async function handleReassignRoute(def: RouteDefinition, targetPickerId: string) {
    if (!targetPickerId) return;
    const stops = routeStops.filter((s) => s.route_definition_id === def.id);
    if (stops.length === 0) {
      setErrorMessage("No stops defined for this route template.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const fboIds = stops.map((s) => s.fbo_id);

    // 1. Delete existing daily assignments for these FBOs on this day
    await supabase
      .from("routes")
      .delete()
      .eq("route_date", selectedDate)
      .in("fbo_id", fboIds);

    // 2. Insert reassigned daily routes
    const inserts = stops.map((stop, index) => ({
      picker_id: targetPickerId,
      fbo_id: stop.fbo_id,
      route_date: selectedDate,
      sort_order: index,
    }));

    const { error } = await supabase.from("routes").insert(inserts);

    if (error) {
      setErrorMessage(error.message);
    } else {
      const pickerName = pickers.find((p) => p.id === targetPickerId)?.profile?.full_name ?? "Selected picker";
      triggerSuccess(`Route "${def.name}" temporarily assigned to ${pickerName}.`);
      await fetchDailyAssignments();
    }
    setLoading(false);
  }

  // Assign or reassign a single stop to a specific picker for today
  async function handleSingleStopReassign(fboId: string, pickerId: string) {
    setLoading(true);
    setErrorMessage(null);

    if (!pickerId) {
      // Unassign stop from today's routes
      const { error } = await supabase
        .from("routes")
        .delete()
        .eq("route_date", selectedDate)
        .eq("fbo_id", fboId);

      if (error) setErrorMessage(error.message);
      else triggerSuccess("Stop unassigned for today.");
    } else {
      // Check if assignment exists
      const existing = dailyAssignments.find((a) => a.fbo_id === fboId);

      if (existing) {
        // Update picker
        const { error } = await supabase
          .from("routes")
          .update({ picker_id: pickerId })
          .eq("id", existing.id);

        if (error) setErrorMessage(error.message);
        else triggerSuccess("Stop reassigned for today.");
      } else {
        // Insert new assignment
        const { error } = await supabase.from("routes").insert({
          picker_id: pickerId,
          fbo_id: fboId,
          route_date: selectedDate,
          sort_order: 0,
        });

        if (error) setErrorMessage(error.message);
        else triggerSuccess("Stop assigned for today.");
      }
    }

    await fetchDailyAssignments();
    setLoading(false);
  }

  // Clear all daily route assignments for a template
  async function handleClearDispatch(def: RouteDefinition) {
    const stops = routeStops.filter((s) => s.route_definition_id === def.id);
    if (stops.length === 0) return;

    setLoading(true);
    const fboIds = stops.map((s) => s.fbo_id);

    const { error } = await supabase
      .from("routes")
      .delete()
      .eq("route_date", selectedDate)
      .in("fbo_id", fboIds);

    if (error) {
      setErrorMessage(error.message);
    } else {
      triggerSuccess(`Cleared daily assignments for "${def.name}".`);
      await fetchDailyAssignments();
    }
    setLoading(false);
  }

  // Get dispatch stats for a template definition
  function getDispatchStatus(def: RouteDefinition) {
    const stops = routeStops.filter((s) => s.route_definition_id === def.id);
    if (stops.length === 0) return { label: "No Stops", style: "badge-gray", code: "empty" };

    const fboIds = stops.map((s) => s.fbo_id);
    const activeStops = dailyAssignments.filter((a) => fboIds.includes(a.fbo_id));

    if (activeStops.length === 0) {
      return { label: "Not Dispatched", style: "badge-gray", code: "pending" };
    }

    // Check pickers assigned
    const pickerIds = Array.from(new Set(activeStops.map((a) => a.picker_id)));

    if (activeStops.length < stops.length) {
      return { label: "Partially Dispatched", style: "badge-yellow", code: "partial" };
    }

    if (pickerIds.length === 1) {
      const assignedPickerId = pickerIds[0];
      if (assignedPickerId === def.default_picker_id) {
        const name = pickers.find((p) => p.id === assignedPickerId)?.profile?.full_name ?? "Default Picker";
        return { label: `Dispatched to ${name}`, style: "badge-green", code: "dispatched_default" };
      } else {
        const name = pickers.find((p) => p.id === assignedPickerId)?.profile?.full_name ?? "Alternative Picker";
        return { label: `Reassigned to ${name}`, style: "badge-green", code: "reassigned" };
      }
    }

    return { label: "Distributed (Multiple Pickers)", style: "badge-green", code: "distributed" };
  }

  // Filter out FBOs that are already part of the selected template
  const currentTemplateStops = routeStops.filter((s) => s.route_definition_id === selectedTemplateId);
  const currentTemplateFboIds = currentTemplateStops.map((s) => s.fbo_id);
  const availableFbosToAdd = fbos.filter((f) => !currentTemplateFboIds.includes(f.id));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-7 h-7 text-green-700" />
            Routes Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Group restaurants into routes, set default pickers, and manage daily dispatch reassignments.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-gray-100 p-1 self-start sm:self-center">
          <button
            onClick={() => setActiveTab("dispatch")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "dispatch"
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shuffle className="w-4 h-4" />
            Daily Dispatch Board
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "templates"
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            Route Templates
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {fetching ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin text-green-700 mb-4" />
          <p className="font-medium">Loading routes management dashboard...</p>
        </div>
      ) : (
        <>
          {/* ==================== TAB 1: DAILY DISPATCH BOARD ==================== */}
          {activeTab === "dispatch" && (
            <div className="space-y-6">
              {/* Date Control Card */}
              <div className="card p-5 bg-white border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-700">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">Dispatch Calendar</h2>
                    <p className="text-xs text-gray-500">Dispatching routes for: {formatDate(selectedDate)}</p>
                  </div>
                </div>
                <div className="w-full md:w-auto relative">
                  <input
                    type="date"
                    className="form-input !pl-9"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {routeDefinitions.length === 0 ? (
                <div className="card p-12 text-center border border-gray-100 bg-white">
                  <Layers className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-700">No Route Templates Defined</h3>
                  <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                    You need to define route templates (like Koramangala or Indiranagar) and add restaurant stops before you can dispatch routes.
                  </p>
                  <button
                    onClick={() => setActiveTab("templates")}
                    className="btn btn-primary mt-4"
                  >
                    Create a Route Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {routeDefinitions.map((def) => {
                    const stops = routeStops.filter((s) => s.route_definition_id === def.id);
                    const status = getDispatchStatus(def);
                    const defaultPicker = pickers.find((p) => p.id === def.default_picker_id);

                    return (
                      <div
                        key={def.id}
                        className="card bg-white border border-gray-100 flex flex-col justify-between"
                      >
                        {/* Card Header */}
                        <div className="p-5 border-b border-gray-50">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg leading-tight">{def.name}</h3>
                              <p className="text-xs text-gray-400 mt-1">
                                Default Picker:{" "}
                                <span className="font-semibold text-gray-600">
                                  {defaultPicker?.profile?.full_name ?? "Not Assigned"}
                                </span>
                              </p>
                            </div>
                            <span className={`badge ${status.style}`}>{status.label}</span>
                          </div>

                          {/* Stop list preview inside dispatch card */}
                          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-1">
                            {stops.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">No stops added to this template yet.</p>
                            ) : (
                              stops.map((stop, index) => {
                                const dailyAssign = dailyAssignments.find((a) => a.fbo_id === stop.fbo_id);
                                const assignedPicker = pickers.find((p) => p.id === dailyAssign?.picker_id);

                                return (
                                  <div
                                    key={stop.id}
                                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-5 h-5 bg-green-100 text-green-700 font-bold rounded-full flex items-center justify-center text-[10px]">
                                        {index + 1}
                                      </span>
                                      <span className="font-medium text-gray-800 truncate">{stop.fbo.business_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        className="bg-transparent border-0 text-[10px] text-gray-500 font-medium focus:ring-0 cursor-pointer pr-4"
                                        value={dailyAssign?.picker_id ?? ""}
                                        onChange={(e) => handleSingleStopReassign(stop.fbo_id, e.target.value)}
                                      >
                                        <option value="">-- Unassigned --</option>
                                        {pickers.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.profile?.full_name}
                                          </option>
                                        ))}
                                      </select>
                                      {dailyAssign && (
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Dispatched stop" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Dispatch controls at bottom of Card */}
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-2 justify-between items-center rounded-b-[var(--radius-card)]">
                          <div className="flex items-center gap-2">
                            {/* Reassign Entire Route dropdown */}
                            <select
                              className="form-input !py-1.5 !px-3 text-xs bg-white border-gray-200"
                              defaultValue=""
                              onChange={(e) => {
                                handleReassignRoute(def, e.target.value);
                                e.target.value = ""; // Reset value
                              }}
                              disabled={stops.length === 0}
                            >
                              <option value="" disabled>
                                🔀 Reassign Entire Route
                              </option>
                              {pickers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.profile?.full_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            {status.code !== "pending" && (
                              <button
                                onClick={() => handleClearDispatch(def)}
                                className="btn btn-danger btn-sm"
                                title="Clear Daily Route Assignments"
                              >
                                Clear
                              </button>
                            )}
                            <button
                              onClick={() => handleQuickDispatch(def)}
                              disabled={stops.length === 0 || !def.default_picker_id}
                              className="btn btn-primary btn-sm flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Quick Dispatch
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: MANAGE ROUTE TEMPLATES ==================== */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sidebar: Templates list & Create Form */}
              <div className="lg:col-span-1 space-y-6">
                {/* Create template form */}
                <div className="card p-5 bg-white border border-gray-100">
                  <h3 className="font-bold text-gray-800 text-base mb-4">Create Route Template</h3>
                  <form onSubmit={handleCreateTemplate} className="space-y-4">
                    <div>
                      <label htmlFor="routeName" className="form-label">
                        Route Name *
                      </label>
                      <input
                        id="routeName"
                        type="text"
                        placeholder="e.g. Koramangala Route"
                        className="form-input"
                        value={newRouteName}
                        onChange={(e) => setNewRouteName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="routePicker" className="form-label">
                        Default Picker
                      </label>
                      <select
                        id="routePicker"
                        className="form-input"
                        value={newRoutePickerId}
                        onChange={(e) => setNewRoutePickerId(e.target.value)}
                      >
                        <option value="">-- No Default Picker --</option>
                        {pickers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.profile?.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary btn-full">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Create Template
                    </button>
                  </form>
                </div>

                {/* Templates Directory */}
                <div className="card bg-white border border-gray-100">
                  <div className="p-4 border-b border-gray-50">
                    <h3 className="font-bold text-gray-800 text-sm">Active Templates</h3>
                  </div>
                  {routeDefinitions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 italic">No templates created yet.</div>
                  ) : (
                    <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                      {routeDefinitions.map((def) => {
                        const stopsCount = routeStops.filter((s) => s.route_definition_id === def.id).length;
                        return (
                          <button
                            key={def.id}
                            onClick={() => setSelectedTemplateId(def.id)}
                            className={`w-full text-left p-3.5 flex items-center justify-between transition-colors ${
                              selectedTemplateId === def.id
                                ? "bg-green-50/50 border-r-4 border-green-700"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{def.name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{stopsCount} stops defined</p>
                            </div>
                            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                              {stopsCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content Area: Editing selected template stops */}
              <div className="lg:col-span-2">
                {selectedTemplateId ? (
                  (() => {
                    const activeDef = routeDefinitions.find((d) => d.id === selectedTemplateId);
                    const activeStops = routeStops.filter((s) => s.route_definition_id === selectedTemplateId);

                    if (!activeDef) return null;

                    return (
                      <div className="card bg-white border border-gray-100">
                        {/* Editor Header */}
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                          <div>
                            <h2 className="font-bold text-gray-900 text-lg">{activeDef.name} Stops Editor</h2>
                            <p className="text-xs text-gray-400 mt-1">
                              Configure stops sequence order and default picker settings.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(activeDef.id)}
                            className="btn btn-danger btn-sm text-xs flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Template
                          </button>
                        </div>

                        {/* Add Stop controls */}
                        <div className="p-5 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row items-end gap-3">
                          <div className="flex-1 w-full">
                            <label className="form-label">Add Stop (FBO)</label>
                            <select
                              className="form-input"
                              value={selectedFboToAdd}
                              onChange={(e) => setSelectedFboToAdd(e.target.value)}
                            >
                              <option value="">-- Choose restaurant FBO to add --</option>
                              {availableFbosToAdd.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.business_name} ({f.address || "No Address"})
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={handleAddStop}
                            disabled={!selectedFboToAdd || loading}
                            className="btn btn-primary w-full md:w-auto"
                          >
                            <Plus className="w-4 h-4" /> Add Stop
                          </button>
                        </div>

                        {/* Stops List */}
                        <div className="p-5">
                          {activeStops.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                              <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                              <p className="text-sm font-medium">No stops added yet</p>
                              <p className="text-xs text-gray-300 mt-1">Add restaurants from the selection above.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {activeStops.map((stop, index) => (
                                <div
                                  key={stop.id}
                                  className="flex items-center justify-between border border-gray-100 rounded-xl p-3.5 hover:shadow-sm transition-all bg-white"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 bg-green-100 text-green-700 font-bold rounded-full flex items-center justify-center text-sm flex-shrink-0">
                                      {index + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-gray-800 text-sm truncate">
                                        {stop.fbo.business_name}
                                      </p>
                                      <p className="text-xs text-gray-400 truncate">
                                        {stop.fbo.address || "No Address"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Actions: Reorder and Delete */}
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                      onClick={() => handleMoveStop(stop.id, "up")}
                                      disabled={index === 0}
                                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveStop(stop.id, "down")}
                                      disabled={index === activeStops.length - 1}
                                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveStop(stop.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 ml-2"
                                      title="Remove Stop"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="card p-12 text-center border border-gray-100 bg-white">
                    <Layers className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-700">No Template Selected</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                      Choose an active template from the sidebar list, or create a new template to configure its stops.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
