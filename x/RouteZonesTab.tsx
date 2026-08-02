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
      {/* Sidebar: create zone + zone list */}
      <div className="lg:col-span-1 space-y-6">
        <div className="card p-5 bg-white border border-gray-100">
          <h3 className="font-bold text-gray-800 text-base mb-4">Create Zone</h3>
          <form onSubmit={handleCreateZone} className="space-y-4">
            <div>
              <label htmlFor="zoneName" className="form-label">
                Zone Name *
              </label>
              <input
                id="zoneName"
                type="text"
                placeholder="e.g. Koramangala Zone"
                className="form-input"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="zonePicker" className="form-label">
                Default Picker
              </label>
              <select
                id="zonePicker"
                className="form-input"
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
            <button type="submit" disabled={isPending("create-template")} className="btn btn-primary btn-full">
              {isPending("create-template") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Zone
            </button>
          </form>
        </div>

        <div className="card bg-white border border-gray-100">
          <div className="p-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">Zones</h3>
          </div>
          {routeDefinitions.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400 italic">No zones created yet.</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
              {routeDefinitions.map((def) => {
                const stopsInZone = routeStops.filter((s) => s.route_definition_id === def.id);
                const overdueCount = stopsInZone.filter((s) => {
                  const fbo = fbosById.get(s.fbo_id);
                  if (!fbo) return false;
                  const code = getDueStatus(fbo, selectedDate).code;
                  return code === "overdue" || code === "never";
                }).length;
                const defaultPickerName = pickers.find((p) => p.id === def.default_picker_id)?.profile?.full_name;

                return (
                  <button
                    key={def.id}
                    onClick={() => setSelectedZoneId(def.id)}
                    className={`w-full text-left p-3.5 flex items-center justify-between gap-2 transition-colors ${
                      selectedZoneId === def.id ? "bg-green-50/50 border-r-4 border-green-700" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{def.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {stopsInZone.length} stops · {defaultPickerName ?? "No default picker"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {overdueCount > 0 && (
                        <span
                          className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold"
                          title={`${overdueCount} overdue`}
                        >
                          {overdueCount}
                        </span>
                      )}
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
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

      {/* Main: selected zone editor */}
      <div className="lg:col-span-2">
        {!activeZone ? (
          <div className="card p-12 text-center border border-gray-100 bg-white">
            <Layers className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700">No Zone Selected</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
              Choose a zone from the list, or create a new one to configure its stops.
            </p>
          </div>
        ) : (
          <div className="card bg-white border border-gray-100">
            {/* Editor header */}
            <div className="p-5 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{activeZone.name}</h2>
                <p className="text-xs text-gray-400 mt-1">Set each stop's pickup frequency and default picker here.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="form-input !py-1.5 !px-3 text-xs bg-white border-gray-200"
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
                    if (window.confirm(`Delete "${activeZone.name}"? This removes all its stops too.`)) {
                      data.deleteTemplate(activeZone.id, activeZone.name);
                      setSelectedZoneId(routeDefinitions.find((d) => d.id !== activeZone.id)?.id ?? "");
                    }
                  }}
                  className="btn btn-danger btn-sm text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Zone
                </button>
              </div>
            </div>

            {/* Add stop controls, with search */}
            <div className="p-5 border-b border-gray-50 bg-gray-50/30 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search restaurants by name..."
                  className="form-input !pl-9"
                  value={fboFilter}
                  onChange={(e) => setFboFilter(e.target.value)}
                />
              </div>
              <div className="flex flex-col md:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="form-label">Add Stop (FBO)</label>
                  <select
                    className="form-input"
                    value={selectedFboToAdd}
                    onChange={(e) => setSelectedFboToAdd(e.target.value)}
                  >
                    <option value="">
                      {availableFbosToAdd.length === 0 ? "-- No matching restaurants --" : "-- Choose restaurant to add --"}
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
                  className="btn btn-primary w-full md:w-auto"
                >
                  <Plus className="w-4 h-4" /> Add Stop
                </button>
              </div>
            </div>

            {/* Bulk move toolbar */}
            {selectedStopIds.size > 0 && (
              <div className="p-4 border-b border-gray-50 bg-blue-50/50 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                  <FolderInput className="w-4 h-4" />
                  {selectedStopIds.size} stop{selectedStopIds.size === 1 ? "" : "s"} selected
                </span>
                <select
                  className="form-input !py-1.5 !px-3 text-xs bg-white flex-1 min-w-[180px]"
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                >
                  <option value="">-- Move to zone --</option>
                  {routeDefinitions
                    .filter((d) => d.id !== activeZone.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  <option value="__new__">+ New zone...</option>
                </select>
                {moveTarget === "__new__" && (
                  <input
                    type="text"
                    placeholder="New zone name"
                    className="form-input !py-1.5 !px-3 text-xs bg-white flex-1 min-w-[160px]"
                    value={newZoneNameForMove}
                    onChange={(e) => setNewZoneNameForMove(e.target.value)}
                  />
                )}
                <button
                  type="button"
                  onClick={handleBulkMove}
                  disabled={!moveTarget || (moveTarget === "__new__" && !newZoneNameForMove.trim()) || isPending("bulk-move")}
                  className="btn btn-primary btn-sm"
                >
                  {isPending("bulk-move") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Move"}
                </button>
                <button type="button" onClick={() => setSelectedStopIds(new Set())} className="text-xs text-gray-400 hover:text-gray-600">
                  Cancel
                </button>
              </div>
            )}

            {/* Stops list */}
            <div className="p-5">
              {activeStops.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium">No stops added yet</p>
                  <p className="text-xs text-gray-300 mt-1">Search and add restaurants above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeStops.map((stop, index) => {
                    const fbo: ScheduledFBO | undefined = fbosById.get(stop.fbo_id);
                    if (!fbo) return null;
                    const status = getDueStatus(fbo, selectedDate);
                    return (
                      <div
                        key={stop.id}
                        className="flex flex-wrap items-center justify-between gap-3 border border-gray-100 rounded-xl p-3.5 hover:shadow-sm transition-all bg-white"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedStopIds.has(stop.id)}
                            onChange={() => toggleStopSelected(stop.id)}
                          />
                          <div className="w-8 h-8 bg-green-100 text-green-700 font-bold rounded-full flex items-center justify-center text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{fbo.business_name}</p>
                            <p className="text-xs text-gray-400 truncate">{fbo.address || "No Address"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {status.code === "unscheduled" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          <DueBadge status={status} />
                          <select
                            className="form-input !py-1 !px-2 text-[11px] bg-gray-50 border-gray-200 w-[128px]"
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

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => data.moveStop(activeZone.id, stop.id, "up")}
                              disabled={index === 0}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move Up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => data.moveStop(activeZone.id, stop.id, "down")}
                              disabled={index === activeStops.length - 1}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move Down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => data.removeStop(stop.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 ml-1"
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
