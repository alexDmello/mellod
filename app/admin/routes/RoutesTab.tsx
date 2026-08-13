"use client";

import { useMemo, useState } from "react";
import {
  Plus, Trash2, Loader2, ArrowUp, ArrowDown, Search,
  FolderInput, FolderPlus, Filter, X, Route, AlertTriangle,
} from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import { FREQUENCY_PRESETS, ScheduledFBO, buildFbosById, getDueStatus } from "./route-utils";
import { DueBadge } from "./route-badges";
import { ZONE_CONFIG, ZONE_ORDER, type ZoneName } from "./zone-data";

export default function RoutesTab({ data }: { data: RoutesData }) {
  const { pickers, fbos, zones, routeDefinitions, routeStops, selectedDate, isPending } = data;
  const fbosById = useMemo(() => buildFbosById(fbos), [fbos]);

  const [filterZoneId, setFilterZoneId] = useState("");
  const [filterPickerId, setFilterPickerId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPickerId, setNewPickerId] = useState("");
  const [newZoneId, setNewZoneId] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [fboSearch, setFboSearch] = useState("");
  const [selectedFboToAdd, setSelectedFboToAdd] = useState("");
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState("");

  const zonesById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  const visibleRoutes = useMemo(() =>
    routeDefinitions.filter((rd) => {
      if (filterZoneId && rd.zone_id !== filterZoneId) return false;
      if (filterPickerId && rd.default_picker_id !== filterPickerId) return false;
      return true;
    }), [routeDefinitions, filterZoneId, filterPickerId]);

  const activeRoute = visibleRoutes.find((d) => d.id === selectedRouteId) ?? visibleRoutes[0] ?? null;
  const activeStops = [...routeStops.filter((s) => s.route_definition_id === activeRoute?.id)].sort((a, b) => a.sort_order - b.sort_order);
  const currentFboIds = new Set(activeStops.map((s) => s.fbo_id));
  const availableFbos = fbos.filter((f) => !currentFboIds.has(f.id) && f.business_name.toLowerCase().includes(fboSearch.toLowerCase()));

  const hasFilters = filterZoneId || filterPickerId;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = await data.createTemplate(newName.trim(), newPickerId, newZoneId, newDesc);
    setNewName(""); setNewPickerId(""); setNewZoneId(""); setNewDesc("");
    setShowCreate(false);
    if (created) setSelectedRouteId(created.id);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: Route Directory */}
      <div className="lg:col-span-1 space-y-4">

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xl shadow-gray-200/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filters
            </span>
            {hasFilters && (
              <button onClick={() => { setFilterZoneId(""); setFilterPickerId(""); }}
                className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <select className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            value={filterZoneId} onChange={(e) => setFilterZoneId(e.target.value)}>
            <option value="">All Zones</option>
            {ZONE_ORDER.map((zn) => { const z = zones.find((z) => z.name === zn); return z ? <option key={z.id} value={z.id}>{zn} Zone</option> : null; })}
          </select>
          <select className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            value={filterPickerId} onChange={(e) => setFilterPickerId(e.target.value)}>
            <option value="">All Pickers</option>
            {pickers.map((p) => <option key={p.id} value={p.id}>{p.profile?.full_name}</option>)}
          </select>
        </div>

        {/* Create button + form */}
        <button onClick={() => setShowCreate(!showCreate)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-600/20 transition-all">
          <FolderPlus className="w-4 h-4" /> {showCreate ? "Cancel" : "Create New Route"}
        </button>

        {showCreate && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xl shadow-gray-200/50">
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="text" placeholder="Route name *" required
                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={newName} onChange={(e) => setNewName(e.target.value)} />
              <select className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                value={newZoneId} onChange={(e) => setNewZoneId(e.target.value)}>
                <option value="">— Zone (optional) —</option>
                {ZONE_ORDER.map((zn) => { const z = zones.find((z) => z.name === zn); return z ? <option key={z.id} value={z.id}>{zn}</option> : null; })}
              </select>
              <select className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                value={newPickerId} onChange={(e) => setNewPickerId(e.target.value)}>
                <option value="">— Default Picker —</option>
                {pickers.map((p) => <option key={p.id} value={p.id}>{p.profile?.full_name}</option>)}
              </select>
              <textarea placeholder="Description (optional)" rows={2}
                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              <button type="submit" disabled={isPending("create-template")}
                className="w-full py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                {isPending("create-template") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Route
              </button>
            </form>
          </div>
        )}

        {/* Route list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <h3 className="text-[11px] font-bold font-mono text-gray-500 uppercase tracking-wider">Route Directory</h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">{visibleRoutes.length}</span>
          </div>
          {visibleRoutes.length === 0 ? (
            <p className="p-8 text-center text-xs text-gray-400 italic">{hasFilters ? "No routes match filters." : "No routes yet."}</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
              {visibleRoutes.map((def) => {
                const stops = routeStops.filter((s) => s.route_definition_id === def.id);
                const overdue = stops.filter((s) => { const f = fbosById.get(s.fbo_id); return f ? ["overdue","never"].includes(getDueStatus(f, selectedDate).code) : false; }).length;
                const zone = def.zone_id ? zonesById.get(def.zone_id) : null;
                const config = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;
                const isActive = (activeRoute?.id ?? selectedRouteId) === def.id;
                return (
                  <button key={def.id} onClick={() => setSelectedRouteId(def.id)}
                    className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-all ${isActive ? "bg-emerald-50 border-l-2 border-emerald-600" : "hover:bg-gray-50"}`}>
                    {config && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: config.hex }} />}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${isActive ? "font-black text-emerald-900" : "font-bold text-gray-800"}`}>{def.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                        {stops.length} stops · {pickers.find((p) => p.id === def.default_picker_id)?.profile?.full_name ?? "Unassigned"}
                      </p>
                    </div>
                    {overdue > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[10px] font-extrabold flex-shrink-0">{overdue} Due</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Route Editor */}
      <div className="lg:col-span-2">
        {!activeRoute ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xl shadow-gray-200/50">
            <Route className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="font-black text-gray-700 text-lg">No Route Selected</h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">Select a route from the directory or create one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/60">
              {(() => {
                const zone = activeRoute.zone_id ? zonesById.get(activeRoute.zone_id) : null;
                const config = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;
                return (
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-black text-gray-900 text-xl">{activeRoute.name}</h2>
                        {config && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0"
                            style={{ background: config.hex + "18", color: config.hex, borderColor: config.hex + "40" }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: config.hex }} />
                            {zone?.name} Zone
                          </span>
                        )}
                      </div>
                      {activeRoute.description && <p className="text-xs text-gray-400 font-medium mt-0.5">{activeRoute.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <select className="text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                        value={activeRoute.default_picker_id ?? ""}
                        onChange={(e) => data.setDefaultPicker(activeRoute.id, e.target.value)}>
                        <option value="">— No Default Picker —</option>
                        {pickers.map((p) => <option key={p.id} value={p.id}>{p.profile?.full_name}</option>)}
                      </select>
                      <button onClick={() => { if (window.confirm(`Delete "${activeRoute.name}"?`)) { data.deleteTemplate(activeRoute.id, activeRoute.name); setSelectedRouteId(""); } }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Add Stop toolbar */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/40 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Search available FBOs..."
                  className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={fboSearch} onChange={(e) => setFboSearch(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <select className="flex-1 text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                  value={selectedFboToAdd} onChange={(e) => setSelectedFboToAdd(e.target.value)}>
                  <option value="">{availableFbos.length === 0 ? "No matching FBOs" : "— Select FBO to add —"}</option>
                  {availableFbos.map((f) => { const zone = f.zone_id ? zonesById.get(f.zone_id) : null; return <option key={f.id} value={f.id}>{f.business_name}{zone ? ` (${zone.name})` : ""}</option>; })}
                </select>
                <button onClick={async () => { if (!selectedFboToAdd) return; await data.addStop(activeRoute.id, selectedFboToAdd); setSelectedFboToAdd(""); }}
                  disabled={!selectedFboToAdd || isPending("add-stop")}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 shadow-md shadow-emerald-600/20 disabled:opacity-40 flex items-center gap-2 transition-all">
                  {isPending("add-stop") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Stop
                </button>
              </div>
            </div>

            {/* Bulk move */}
            {selectedStopIds.size > 0 && (
              <div className="px-5 py-3 border-b border-blue-200 bg-blue-50 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  <FolderInput className="w-4 h-4" /> {selectedStopIds.size} selected
                </span>
                <select className="text-xs font-semibold bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-gray-800 flex-1 min-w-[180px] focus:outline-none cursor-pointer"
                  value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
                  <option value="">— Move to route —</option>
                  {routeDefinitions.filter((d) => d.id !== activeRoute.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button onClick={async () => { if (!moveTarget) return; const dest = routeDefinitions.find((d) => d.id === moveTarget); if (!dest) return; await data.bulkMoveStops(Array.from(selectedStopIds), moveTarget, dest.name); setSelectedStopIds(new Set()); setMoveTarget(""); }}
                  disabled={!moveTarget || isPending("bulk-move")}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-all">
                  {isPending("bulk-move") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Move"}
                </button>
                <button onClick={() => { setSelectedStopIds(new Set()); setMoveTarget(""); }} className="text-xs font-bold text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            )}

            {/* Stops */}
            <div className="p-5">
              {activeStops.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="font-bold text-gray-600 text-sm mb-1">No stops in this route</p>
                  <p className="text-xs font-medium">Use the search above to add FBO stops.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeStops.map((stop, index) => {
                    const fbo: ScheduledFBO | undefined = fbosById.get(stop.fbo_id);
                    if (!fbo) return null;
                    const status = getDueStatus(fbo, selectedDate);
                    const checked = selectedStopIds.has(stop.id);
                    const zone = fbo.zone_id ? zonesById.get(fbo.zone_id) : null;
                    const config = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;
                    return (
                      <div key={stop.id}
                        className={`flex flex-wrap items-center justify-between gap-4 border rounded-xl px-4 py-3 transition-all ${checked ? "bg-blue-50 border-blue-200" : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <input type="checkbox"
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            checked={checked}
                            onChange={() => setSelectedStopIds((prev) => { const n = new Set(prev); n.has(stop.id) ? n.delete(stop.id) : n.add(stop.id); return n; })} />
                          <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-extrabold flex items-center justify-center text-xs flex-shrink-0">{index + 1}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-900 text-sm truncate">{fbo.business_name}</p>
                              {config && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: config.hex }} title={zone?.name} />}
                            </div>
                            <p className="text-[11px] text-gray-400 font-medium truncate">{fbo.address || "No address"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {status.code === "unscheduled" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          <DueBadge status={status} />
                          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Every</span>
                            <select className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                              value={fbo.collection_frequency_days ?? ""}
                              disabled={isPending(`frequency-${fbo.id}`)}
                              onChange={(e) => data.setFboFrequency(fbo.id, e.target.value ? Number(e.target.value) : null)}>
                              {FREQUENCY_PRESETS.map((p) => <option key={p.label} value={p.days ?? ""}>{p.label}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => data.moveStop(activeRoute.id, stop.id, "up")} disabled={index === 0}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-20 transition-all">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => data.moveStop(activeRoute.id, stop.id, "down")} disabled={index === activeStops.length - 1}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-20 transition-all">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => data.removeStop(stop.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all ml-1">
                              <Trash2 className="w-3.5 h-3.5" />
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
