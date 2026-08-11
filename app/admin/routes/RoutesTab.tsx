"use client";

import { useMemo, useState } from "react";
import {
  Plus, Trash2, Loader2, ArrowUp, ArrowDown, Search,
  FolderInput, AlertTriangle, FolderPlus, Filter, X, Route,
} from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import { FREQUENCY_PRESETS, ScheduledFBO, buildFbosById, getDueStatus } from "./route-utils";
import { DueBadge } from "./route-badges";
import { ZONE_CONFIG, ZONE_ORDER, type ZoneName } from "./zone-data";

export default function RoutesTab({ data }: { data: RoutesData }) {
  const { pickers, fbos, zones, subZones, routeDefinitions, routeStops, selectedDate, isPending } = data;
  const fbosById = useMemo(() => buildFbosById(fbos), [fbos]);

  // Filters
  const [filterZoneId, setFilterZoneId] = useState("");
  const [filterSubZoneId, setFilterSubZoneId] = useState("");
  const [filterPickerId, setFilterPickerId] = useState("");

  // Create form
  const [newName, setNewName] = useState("");
  const [newPickerId, setNewPickerId] = useState("");
  const [newZoneId, setNewZoneId] = useState("");
  const [newSubZoneId, setNewSubZoneId] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Route editor state
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routeDefinitions[0]?.id ?? "");
  const [fboFilter, setFboFilter] = useState("");
  const [selectedFboToAdd, setSelectedFboToAdd] = useState("");
  const [selectedStopIds, setSelectedStopIds] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState("");

  const zonesById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const subZonesById = useMemo(() => new Map(subZones.map((sz) => [sz.id, sz])), [subZones]);
  const subZonesForNewZone = useMemo(() => subZones.filter((sz) => sz.zone_id === newZoneId), [subZones, newZoneId]);
  const filterSubZones = useMemo(() => subZones.filter((sz) => sz.zone_id === filterZoneId), [subZones, filterZoneId]);

  // Filtered route list
  const visibleRoutes = useMemo(() => {
    return routeDefinitions.filter((rd) => {
      if (filterZoneId && rd.zone_id !== filterZoneId) return false;
      if (filterSubZoneId && rd.sub_zone_id !== filterSubZoneId) return false;
      if (filterPickerId && rd.default_picker_id !== filterPickerId) return false;
      return true;
    });
  }, [routeDefinitions, filterZoneId, filterSubZoneId, filterPickerId]);

  const activeRoute = visibleRoutes.find((d) => d.id === selectedRouteId) ?? visibleRoutes[0] ?? null;
  const activeStops = [...routeStops.filter((s) => s.route_definition_id === activeRoute?.id)].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const currentRouteFboIds = new Set(activeStops.map((s) => s.fbo_id));

  const availableFbos = fbos
    .filter((f) => !currentRouteFboIds.has(f.id))
    .filter((f) => f.business_name.toLowerCase().includes(fboFilter.trim().toLowerCase()));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = await data.createTemplate(newName.trim(), newPickerId, newZoneId, newSubZoneId, newDesc);
    setNewName(""); setNewPickerId(""); setNewZoneId(""); setNewSubZoneId(""); setNewDesc("");
    setShowCreateForm(false);
    if (created) setSelectedRouteId(created.id);
  }

  function toggleStop(stopId: string) {
    setSelectedStopIds((prev) => {
      const next = new Set(prev);
      next.has(stopId) ? next.delete(stopId) : next.add(stopId);
      return next;
    });
  }

  async function handleBulkMove() {
    if (selectedStopIds.size === 0 || !moveTarget) return;
    const dest = routeDefinitions.find((d) => d.id === moveTarget);
    if (!dest) return;
    await data.bulkMoveStops(Array.from(selectedStopIds), moveTarget, dest.name);
    setSelectedStopIds(new Set()); setMoveTarget("");
  }

  const hasFilters = filterZoneId || filterSubZoneId || filterPickerId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ── LEFT: Route Directory ── */}
      <div className="lg:col-span-1 space-y-5">
        {/* Filter Bar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" /> Filter Routes
            </h3>
            {hasFilters && (
              <button onClick={() => { setFilterZoneId(""); setFilterSubZoneId(""); setFilterPickerId(""); }}
                className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <select className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            value={filterZoneId} onChange={(e) => { setFilterZoneId(e.target.value); setFilterSubZoneId(""); }}>
            <option value="">All Zones</option>
            {ZONE_ORDER.map((zn) => {
              const z = zones.find((z) => z.name === zn);
              return z ? <option key={z.id} value={z.id}>{zn} — {ZONE_CONFIG[zn as ZoneName].corporationName.split("(")[1]?.replace(")", "") || zn}</option> : null;
            })}
          </select>
          {filterZoneId && filterSubZones.length > 0 && (
            <select className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              value={filterSubZoneId} onChange={(e) => setFilterSubZoneId(e.target.value)}>
              <option value="">All Sub-Zones</option>
              {filterSubZones.map((sz) => <option key={sz.id} value={sz.id}>{sz.name}</option>)}
            </select>
          )}
          <select className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            value={filterPickerId} onChange={(e) => setFilterPickerId(e.target.value)}>
            <option value="">All Pickers</option>
            {pickers.map((p) => <option key={p.id} value={p.id}>{p.profile?.full_name}</option>)}
          </select>
        </div>

        {/* Create Button */}
        <button onClick={() => setShowCreateForm(!showCreateForm)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all">
          <FolderPlus className="w-4 h-4" /> {showCreateForm ? "Cancel" : "Create Route"}
        </button>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md">
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="text" placeholder="Route name *" required
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                value={newName} onChange={(e) => setNewName(e.target.value)} />
              <select className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                value={newZoneId} onChange={(e) => { setNewZoneId(e.target.value); setNewSubZoneId(""); }}>
                <option value="">— Zone (optional) —</option>
                {ZONE_ORDER.map((zn) => { const z = zones.find((z) => z.name === zn); return z ? <option key={z.id} value={z.id}>{zn}</option> : null; })}
              </select>
              {newZoneId && subZonesForNewZone.length > 0 && (
                <select className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  value={newSubZoneId} onChange={(e) => setNewSubZoneId(e.target.value)}>
                  <option value="">— Sub-Zone —</option>
                  {subZonesForNewZone.map((sz) => <option key={sz.id} value={sz.id}>{sz.name}</option>)}
                </select>
              )}
              <select className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                value={newPickerId} onChange={(e) => setNewPickerId(e.target.value)}>
                <option value="">— Default Picker —</option>
                {pickers.map((p) => <option key={p.id} value={p.id}>{p.profile?.full_name}</option>)}
              </select>
              <textarea placeholder="Description (optional)" rows={2}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 resize-none"
                value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              <button type="submit" disabled={isPending("create-template")}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                {isPending("create-template") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Route
              </button>
            </form>
          </div>
        )}

        {/* Route List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Route Directory</h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">{visibleRoutes.length} Routes</span>
          </div>
          {visibleRoutes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              {hasFilters ? "No routes match current filters." : "No routes created yet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {visibleRoutes.map((def) => {
                const stops = routeStops.filter((s) => s.route_definition_id === def.id);
                const overdue = stops.filter((s) => { const f = fbosById.get(s.fbo_id); return f ? ["overdue","never"].includes(getDueStatus(f, selectedDate).code) : false; }).length;
                const zone = def.zone_id ? zonesById.get(def.zone_id) : null;
                const config = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;
                const isActive = (activeRoute?.id ?? selectedRouteId) === def.id;
                return (
                  <button key={def.id} onClick={() => setSelectedRouteId(def.id)}
                    className={`w-full text-left p-4 flex items-center gap-3 transition-all ${isActive ? "bg-emerald-500/10 border-l-4 border-emerald-600" : "hover:bg-slate-50"}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm truncate ${isActive ? "text-emerald-950 font-black" : "text-slate-800 font-bold"}`}>{def.name}</p>
                        {config && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border flex-shrink-0"
                            style={{ background: config.hex + "18", color: config.hex, borderColor: config.hex + "40" }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.hex }} />
                            {zone?.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate font-medium">
                        {stops.length} stop{stops.length !== 1 ? "s" : ""} • {pickers.find((p) => p.id === def.default_picker_id)?.profile?.full_name ?? "Unassigned"}
                      </p>
                    </div>
                    {overdue > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-300/50 text-[10px] font-extrabold flex-shrink-0">
                        {overdue} Overdue
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Route Editor ── */}
      <div className="lg:col-span-2">
        {!activeRoute ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-md">
            <Route className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-extrabold text-slate-800 text-lg">No Route Selected</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Select a route from the directory or create a new one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
            {/* Route Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900/5 via-slate-50 to-emerald-500/5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-black text-slate-900 text-xl">{activeRoute.name}</h2>
                    {(() => {
                      const zone = activeRoute.zone_id ? zonesById.get(activeRoute.zone_id) : null;
                      const config = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;
                      const sz = activeRoute.sub_zone_id ? subZonesById.get(activeRoute.sub_zone_id) : null;
                      return config ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border"
                          style={{ background: config.hex + "18", color: config.hex, borderColor: config.hex + "40" }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: config.hex }} />
                          {zone?.name}{sz ? ` · ${sz.name}` : ""}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {activeRoute.description && <p className="text-xs text-slate-500 font-medium">{activeRoute.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <select className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                    value={activeRoute.default_picker_id ?? ""}
                    onChange={(e) => data.setDefaultPicker(activeRoute.id, e.target.value)}
                    disabled={isPending(`default-picker-${activeRoute.id}`)}>
                    <option value="">— No Default Picker —</option>
                    {pickers.map((p) => <option key={p.id} value={p.id}>{p.profile?.full_name}</option>)}
                  </select>
                  <button onClick={() => { if (window.confirm(`Delete "${activeRoute.name}"?`)) { data.deleteTemplate(activeRoute.id, activeRoute.name); setSelectedRouteId(""); } }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-300/50 transition-all flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Add FBO Toolbar */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input type="text" placeholder="Search available FBOs..."
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  value={fboFilter} onChange={(e) => setFboFilter(e.target.value)} />
              </div>
              <div className="flex flex-col md:flex-row items-end gap-3">
                <select className="flex-1 w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  value={selectedFboToAdd} onChange={(e) => setSelectedFboToAdd(e.target.value)}>
                  <option value="">{availableFbos.length === 0 ? "— No matching FBOs —" : "— Select FBO to add —"}</option>
                  {availableFbos.map((f) => {
                    const zone = f.zone_id ? zonesById.get(f.zone_id) : null;
                    return <option key={f.id} value={f.id}>{f.business_name}{zone ? ` (${zone.name})` : ""}{f.address ? ` · ${f.address}` : ""}</option>;
                  })}
                </select>
                <button onClick={async () => { if (!selectedFboToAdd) return; await data.addStop(activeRoute.id, selectedFboToAdd); setSelectedFboToAdd(""); }}
                  disabled={!selectedFboToAdd || isPending("add-stop")}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  {isPending("add-stop") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Stop
                </button>
              </div>
            </div>

            {/* Bulk Move Toolbar */}
            {selectedStopIds.size > 0 && (
              <div className="p-4 border-b border-blue-200/60 bg-blue-500/10 flex flex-wrap items-center gap-3">
                <span className="text-xs font-extrabold text-blue-700 flex items-center gap-2">
                  <FolderInput className="w-4 h-4 text-blue-600" /> {selectedStopIds.size} selected
                </span>
                <select className="text-xs font-bold bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-slate-800 flex-1 min-w-[180px] focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
                  <option value="">— Move to route —</option>
                  {routeDefinitions.filter((d) => d.id !== activeRoute.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button onClick={handleBulkMove} disabled={!moveTarget || isPending("bulk-move")}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-all flex items-center gap-1.5">
                  {isPending("bulk-move") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Move"}
                </button>
                <button onClick={() => { setSelectedStopIds(new Set()); setMoveTarget(""); }} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
              </div>
            )}

            {/* Stops List */}
            <div className="p-6">
              {activeStops.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-3">
                  <p className="text-sm font-extrabold text-slate-700">No stops in this route</p>
                  <p className="text-xs">Use the search above to add FBO stops.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeStops.map((stop, index) => {
                    const fbo: ScheduledFBO | undefined = fbosById.get(stop.fbo_id);
                    if (!fbo) return null;
                    const status = getDueStatus(fbo, selectedDate);
                    const checked = selectedStopIds.has(stop.id);
                    const zone = fbo.zone_id ? zonesById.get(fbo.zone_id) : null;
                    const config = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;
                    return (
                      <div key={stop.id} className={`flex flex-wrap items-center justify-between gap-4 border rounded-2xl p-4 transition-all ${checked ? "bg-blue-500/5 border-blue-300" : "bg-white border-slate-200/80 hover:shadow-md hover:border-slate-300"}`}>
                        <div className="flex items-center gap-3.5 min-w-0">
                          <input type="checkbox" className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            checked={checked} onChange={() => toggleStop(stop.id)} />
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-700 font-extrabold flex items-center justify-center text-xs flex-shrink-0 border border-emerald-300/40">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-slate-900 text-sm truncate">{fbo.business_name}</p>
                              {config && (
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: config.hex }} title={zone?.name} />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-medium truncate">{fbo.address || "No address"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {status.code === "unscheduled" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          <DueBadge status={status} />
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Cadence</span>
                            <select className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                              value={fbo.collection_frequency_days ?? ""}
                              disabled={isPending(`frequency-${fbo.id}`)}
                              onChange={(e) => data.setFboFrequency(fbo.id, e.target.value ? Number(e.target.value) : null)}>
                              {FREQUENCY_PRESETS.map((p) => <option key={p.label} value={p.days ?? ""}>{p.label}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => data.moveStop(activeRoute.id, stop.id, "up")} disabled={index === 0}
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 disabled:opacity-20 transition-all">
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button onClick={() => data.moveStop(activeRoute.id, stop.id, "down")} disabled={index === activeStops.length - 1}
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 disabled:opacity-20 transition-all">
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button onClick={() => data.removeStop(stop.id)}
                              className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-600 transition-all ml-1">
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
