"use client";

import { useMemo, useState } from "react";
import {
  MapPin,
  Plus,
  Trash2,
  Loader2,
  ArrowUp,
  ArrowDown,
  Layers,
  Search,
  FolderInput,
  AlertTriangle,
  Sparkles,
  FolderPlus,
  Building2,
} from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import { FREQUENCY_PRESETS, ScheduledFBO, buildFbosById, getDueStatus } from "./route-utils";
import { DueBadge } from "./route-badges";

export default function RouteZonesTab({ data }: { data: RoutesData }) {
  const { pickers, fbos, routeDefinitions, routeStops, selectedDate, isPending } = data;

  const fbosById = useMemo(() => buildFbosById(fbos), [fbos]);

  const [selectedZoneId, setSelectedZoneId] = useState<string>(routeDefinitions[0]?.id ?? "");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZonePickerId, setNewZonePickerId] = useState("");
  const [fboFilter, setFboFilter] = useState("");
  const [selectedFboToAdd, setSelectedFboToAdd] = useState("");
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState("");
  const [newZoneNameForMove, setNewZoneNameForMove] = useState("");

  const activeZone = routeDefinitions.find((d) => d.id === selectedZoneId) ?? null;
  const activeStops = [...routeStops.filter((s) => s.route_definition_id === selectedZoneId)].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const currentZoneFboIds = new Set(activeStops.map((s) => s.fbo_id));
  const availableFbosToAdd = fbos
    .filter((f) => !currentZoneFboIds.has(f.id))
    .filter((f) => f.business_name.toLowerCase().includes(fboFilter.trim().toLowerCase()));

  async function handleCreateZone(e: React.FormEvent) {
    e.preventDefault();
    if (!newZoneName.trim()) return;
    const created = await data.createTemplate(newZoneName.trim(), newZonePickerId);
    setNewZoneName("");
    setNewZonePickerId("");
    if (created) setSelectedZoneId(created.id);
  }

  function toggleStopSelected(stopId: string) {
    setSelectedStopIds((prev) => {
      const next = new Set(prev);
      if (next.has(stopId)) next.delete(stopId);
      else next.add(stopId);
      return next;
    });
  }

  async function handleBulkMove() {
    if (selectedStopIds.size === 0 || !moveTarget) return;
    let destId = moveTarget;
    let destName = routeDefinitions.find((d) => d.id === moveTarget)?.name ?? "";

    if (moveTarget === "__new__") {
      if (!newZoneNameForMove.trim()) return;
      const created = await data.createTemplate(newZoneNameForMove.trim(), "");
      if (!created) return;
      destId = created.id;
      destName = created.name;
    }

    await data.bulkMoveStops(Array.from(selectedStopIds), destId, destName);
    setSelectedStopIds(new Set());
    setMoveTarget("");
    setNewZoneNameForMove("");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Sidebar: Create Zone + Zone Selection List */}
      <div className="lg:col-span-1 space-y-6">
        {/* Create Zone Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Create Zone</h3>
              <p className="text-xs text-slate-400">Add a geographical route cluster</p>
            </div>
          </div>

          <form onSubmit={handleCreateZone} className="space-y-4">
            <div>
              <label htmlFor="zoneName" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Zone Name *
              </label>
              <input
                id="zoneName"
                type="text"
                placeholder="e.g. Koramangala & Indiranagar"
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="zonePicker" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Default Assigned Picker
              </label>
              <select
                id="zonePicker"
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                value={newZonePickerId}
                onChange={(e) => setNewZonePickerId(e.target.value)}
              >
                <option value="">-- No Default Picker --</option>
                {pickers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.profile?.full_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isPending("create-template")}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              {isPending("create-template") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Zone
            </button>
          </form>
        </div>

        {/* Zones List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Zone Directory</h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {routeDefinitions.length} Zones
            </span>
          </div>

          {routeDefinitions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">No zones created yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {routeDefinitions.map((def) => {
                const stopsInZone = routeStops.filter((s) => s.route_definition_id === def.id);
                const overdueCount = stopsInZone.filter((s) => {
                  const fbo = fbosById.get(s.fbo_id);
                  if (!fbo) return false;
                  const code = getDueStatus(fbo, selectedDate).code;
                  return code === "overdue" || code === "never";
                }).length;
                const defaultPickerName = pickers.find((p) => p.id === def.default_picker_id)?.profile?.full_name;
                const isSelected = selectedZoneId === def.id;

                return (
                  <button
                    key={def.id}
                    onClick={() => setSelectedZoneId(def.id)}
                    className={`w-full text-left p-4 flex items-center justify-between gap-3 transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 border-l-4 border-emerald-600 font-bold"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${isSelected ? "text-emerald-950 font-black" : "text-slate-800 font-bold"}`}>
                        {def.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate font-medium">
                        {stopsInZone.length} stop{stopsInZone.length === 1 ? "" : "s"} • {defaultPickerName ?? "Unassigned"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {overdueCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-300/50 text-[10px] font-extrabold">
                          {overdueCount} Overdue
                        </span>
                      )}
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {stopsInZone.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Column: Active Zone Editor */}
      <div className="lg:col-span-2">
        {!activeZone ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-md">
            <Layers className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-extrabold text-slate-800 text-lg">No Zone Selected</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Select a zone from the sidebar directory or create a new one to begin adding restaurant stops.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
            {/* Active Zone Top Controls */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900/5 via-slate-50 to-emerald-500/5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-black text-slate-900 text-xl">{activeZone.name}</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Configure restaurant stops, sort pickup priority order, and manage collection frequencies.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  value={activeZone.default_picker_id ?? ""}
                  onChange={(e) => data.setDefaultPicker(activeZone.id, e.target.value)}
                  disabled={isPending(`default-picker-${activeZone.id}`)}
                  title="Default picker for this zone"
                >
                  <option value="">-- No Default Picker --</option>
                  {pickers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.profile?.full_name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete "${activeZone.name}"? This will remove all stops from this zone.`)) {
                      data.deleteTemplate(activeZone.id, activeZone.name);
                      setSelectedZoneId(routeDefinitions.find((d) => d.id !== activeZone.id)?.id ?? "");
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-300/50 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Zone
                </button>
              </div>
            </div>

            {/* Add Stop Toolbar with Search Filter */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter available restaurants by name or area..."
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  value={fboFilter}
                  onChange={(e) => setFboFilter(e.target.value)}
                />
              </div>

              <div className="flex flex-col md:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Select Restaurant (FBO) To Add
                  </label>
                  <select
                    className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                    value={selectedFboToAdd}
                    onChange={(e) => setSelectedFboToAdd(e.target.value)}
                  >
                    <option value="">
                      {availableFbosToAdd.length === 0 ? "-- No matching restaurants available --" : "-- Select a restaurant to add --"}
                    </option>
                    {availableFbosToAdd.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.business_name} ({f.address || "No Address"})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={async () => {
                    if (!selectedFboToAdd) return;
                    await data.addStop(activeZone.id, selectedFboToAdd);
                    setSelectedFboToAdd("");
                  }}
                  disabled={!selectedFboToAdd || isPending("add-stop")}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Restaurant Stop
                </button>
              </div>
            </div>

            {/* Bulk Move Toolbar */}
            {selectedStopIds.size > 0 && (
              <div className="p-4 border-b border-blue-200/60 bg-blue-500/10 flex flex-wrap items-center gap-3 animate-fade-in">
                <span className="text-xs font-extrabold text-blue-700 flex items-center gap-2">
                  <FolderInput className="w-4 h-4 text-blue-600" />
                  {selectedStopIds.size} stop{selectedStopIds.size === 1 ? "" : "s"} selected
                </span>
                <select
                  className="text-xs font-bold bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-slate-800 flex-1 min-w-[180px] focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                >
                  <option value="">-- Move selected stops to zone --</option>
                  {routeDefinitions
                    .filter((d) => d.id !== activeZone.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  <option value="__new__">+ Create new zone...</option>
                </select>
                {moveTarget === "__new__" && (
                  <input
                    type="text"
                    placeholder="New zone title"
                    className="text-xs font-bold bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-slate-900 flex-1 min-w-[160px]"
                    value={newZoneNameForMove}
                    onChange={(e) => setNewZoneNameForMove(e.target.value)}
                  />
                )}
                <button
                  type="button"
                  onClick={handleBulkMove}
                  disabled={!moveTarget || (moveTarget === "__new__" && !newZoneNameForMove.trim()) || isPending("bulk-move")}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all flex items-center gap-1.5"
                >
                  {isPending("bulk-move") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Move Selected"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStopIds(new Set())}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Active Stops List */}
            <div className="p-6">
              {activeStops.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-3">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-extrabold text-slate-700">No stops in this zone</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Use the restaurant selector above to add stops to this zone.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeStops.map((stop, index) => {
                    const fbo: ScheduledFBO | undefined = fbosById.get(stop.fbo_id);
                    if (!fbo) return null;
                    const status = getDueStatus(fbo, selectedDate);
                    const isStopChecked = selectedStopIds.has(stop.id);

                    return (
                      <div
                        key={stop.id}
                        className={`flex flex-wrap items-center justify-between gap-4 border rounded-2xl p-4 transition-all duration-200 ${
                          isStopChecked
                            ? "bg-blue-500/5 border-blue-300 shadow-xs"
                            : "bg-white border-slate-200/80 hover:shadow-md hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <input
                            type="checkbox"
                            className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            checked={isStopChecked}
                            onChange={() => toggleStopSelected(stop.id)}
                          />
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-700 font-extrabold flex items-center justify-center text-xs flex-shrink-0 border border-emerald-300/40">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 text-sm truncate">{fbo.business_name}</p>
                            <p className="text-xs text-slate-400 font-medium truncate">{fbo.address || "No Address Provided"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {status.code === "unscheduled" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          <DueBadge status={status} />

                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Cadence</span>
                            <select
                              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                              value={fbo.collection_frequency_days ?? ""}
                              disabled={isPending(`frequency-${fbo.id}`)}
                              onChange={(e) => data.setFboFrequency(fbo.id, e.target.value ? Number(e.target.value) : null)}
                              title="Collection frequency"
                            >
                              {FREQUENCY_PRESETS.map((preset) => (
                                <option key={preset.label} value={preset.days ?? ""}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => data.moveStop(activeZone.id, stop.id, "up")}
                              disabled={index === 0}
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 disabled:opacity-20 transition-all"
                              title="Move Up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => data.moveStop(activeZone.id, stop.id, "down")}
                              disabled={index === activeStops.length - 1}
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 disabled:opacity-20 transition-all"
                              title="Move Down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => data.removeStop(stop.id)}
                              className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-600 transition-all ml-1"
                              title="Remove Stop"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
