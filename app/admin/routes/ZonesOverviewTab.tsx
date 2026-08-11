"use client";

import { useMemo, useState } from "react";
import {
  Globe, Building2, MapPin, RefreshCw, AlertTriangle,
  Edit3, CheckCircle2, Loader2, Search, X, Navigation,
  Info, ScanLine,
} from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import type { SubZone } from "@/lib/types";
import { ZONE_CONFIG, ZONE_ORDER, type ZoneName } from "./zone-data";

export default function ZonesOverviewTab({ data }: { data: RoutesData }) {
  const { fbos, zones, subZones, routeDefinitions, isPending, bulkRedetectZones, overrideFboZone } = data;

  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [overrideZoneId, setOverrideZoneId] = useState("");
  const [overrideSubZoneId, setOverrideSubZoneId] = useState("");
  const [fboSearch, setFboSearch] = useState("");
  const [filterUnzoned, setFilterUnzoned] = useState(false);

  const zonesById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const subZonesById = useMemo(() => new Map(subZones.map((sz) => [sz.id, sz])), [subZones]);
  const subZonesByZone = useMemo(() => {
    const m = new Map<string, SubZone[]>();
    for (const sz of subZones) { if (!m.has(sz.zone_id)) m.set(sz.zone_id, []); m.get(sz.zone_id)!.push(sz); }
    return m;
  }, [subZones]);

  const unzonedFbos = useMemo(() => fbos.filter((f) => !f.zone_id), [fbos]);
  const geoFbos     = useMemo(() => fbos.filter((f) => f.latitude != null && f.longitude != null), [fbos]);
  const routesByZone = useMemo(() => { const m = new Map<string, number>(); for (const rd of routeDefinitions) { if (rd.zone_id) m.set(rd.zone_id, (m.get(rd.zone_id) ?? 0) + 1); } return m; }, [routeDefinitions]);

  const filteredFbos = useMemo(() => {
    let list = filterUnzoned ? unzonedFbos : fbos;
    const q = fboSearch.trim().toLowerCase();
    if (q) list = list.filter((f) => f.business_name.toLowerCase().includes(q) || (f.address ?? "").toLowerCase().includes(q));
    return list;
  }, [fbos, unzonedFbos, filterUnzoned, fboSearch]);

  async function handleOverrideSubmit() {
    if (!overrideTarget || !overrideZoneId) return;
    await overrideFboZone(overrideTarget, overrideZoneId, overrideSubZoneId);
    setOverrideTarget(null); setOverrideZoneId(""); setOverrideSubZoneId("");
  }

  const kpis = [
    { label: "Total FBOs",    value: fbos.length,                             color: "text-slate-900",   bg: "bg-gray-50",     border: "border-gray-100",    icon: Building2 },
    { label: "Zone-Assigned", value: fbos.length - unzonedFbos.length,        color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-100", icon: CheckCircle2 },
    { label: "Unzoned",       value: unzonedFbos.length,                      color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-100",   icon: AlertTriangle },
    { label: "With GPS",      value: geoFbos.length,                          color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-100",    icon: Navigation },
  ];

  return (
    <div className="space-y-6">

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, color, bg, border, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-2xl border ${border} p-5 shadow-xl shadow-gray-200/50 hover:shadow-gray-300/50 transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold font-mono text-gray-500 uppercase tracking-wider">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-3xl font-black tracking-tight font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Zone Cards */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/60">
          <div>
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" /> Bangalore Municipal Zones
            </h2>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">Greater Bengaluru Authority — 5 City Corporations</p>
          </div>
          <button onClick={bulkRedetectZones} disabled={isPending("bulk-redetect") || geoFbos.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all">
            {isPending("bulk-redetect") ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            Auto-detect All Zones
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="p-10 text-center">
            <Info className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-black text-gray-800">Zone tables not found</h3>
            <p className="text-xs text-gray-500 mt-2 font-medium max-w-md mx-auto">
              Run <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">zones_migration.sql</code> in your Supabase SQL editor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
            {ZONE_ORDER.map((zoneName) => {
              const config = ZONE_CONFIG[zoneName];
              const zoneRecord = zones.find((z) => z.name === zoneName);
              const zoneFbos = zoneRecord ? fbos.filter((f) => f.zone_id === zoneRecord.id) : [];
              const zoneSubZones = zoneRecord ? (subZonesByZone.get(zoneRecord.id) ?? []) : [];
              const routeCount = zoneRecord ? (routesByZone.get(zoneRecord.id) ?? 0) : 0;
              return (
                <div key={zoneName} className="rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                  <div className="h-1" style={{ background: config.hex }} />
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0"
                        style={{ background: config.hex }}>{config.corporationNumber}</div>
                      <div>
                        <h3 className="font-black text-gray-900 text-sm">{zoneName}</h3>
                        <p className="text-[10px] font-mono text-gray-400">Corp {config.corporationNumber}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[{ l: "FBOs", v: zoneFbos.length }, { l: "Routes", v: routeCount }, { l: "Sub-Zones", v: zoneSubZones.length }].map(({ l, v }) => (
                        <div key={l} className="text-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                          <p className="text-lg font-black text-gray-900 font-mono">{v}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{l}</p>
                        </div>
                      ))}
                    </div>
                    {zoneSubZones.map((sz) => (
                      <div key={sz.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 mt-1.5">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: config.hex }} />
                        <div>
                          <p className="text-[11px] font-bold text-gray-800">{sz.name}</p>
                          {sz.areas && <p className="text-[10px] text-gray-400 font-medium leading-relaxed mt-0.5">{sz.areas}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FBO Assignment Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" /> FBO Zone Assignments
            </h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">View and override zone assignments for any FBO.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none">
            <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/20"
              checked={filterUnzoned} onChange={(e) => setFilterUnzoned(e.target.checked)} />
            Unzoned only ({unzonedFbos.length})
          </label>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search FBOs by name or address..."
              className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={fboSearch} onChange={(e) => setFboSearch(e.target.value)} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["FBO", "Address", "Zone", "Sub-Zone", "GPS", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFbos.slice(0, 50).map((fbo) => {
                  const zone = fbo.zone_id ? zonesById.get(fbo.zone_id) : null;
                  const subZone = fbo.sub_zone_id ? subZonesById.get(fbo.sub_zone_id) : null;
                  const config = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;
                  const isOverriding = overrideTarget === fbo.id;
                  return (
                    <tr key={fbo.id} className={`hover:bg-gray-50 transition-colors ${isOverriding ? "bg-blue-50/40" : ""}`}>
                      <td className="px-4 py-3 font-bold text-gray-900 max-w-[180px]"><span className="truncate block">{fbo.business_name}</span></td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px]"><span className="truncate block">{fbo.address ?? "—"}</span></td>
                      <td className="px-4 py-3">
                        {isOverriding ? (
                          <select className="text-xs font-semibold bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full cursor-pointer"
                            value={overrideZoneId} onChange={(e) => { setOverrideZoneId(e.target.value); setOverrideSubZoneId(""); }}>
                            <option value="">— No Zone —</option>
                            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                          </select>
                        ) : config ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                            style={{ background: config.hex + "18", color: config.hex, borderColor: config.hex + "40" }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.hex }} /> {zone?.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] font-semibold">Unzoned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOverriding ? (
                          <select className="text-xs font-semibold bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none w-full cursor-pointer"
                            value={overrideSubZoneId} onChange={(e) => setOverrideSubZoneId(e.target.value)}>
                            <option value="">—</option>
                            {(subZonesByZone.get(overrideZoneId) ?? []).map((sz) => <option key={sz.id} value={sz.id}>{sz.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-gray-500 font-medium text-[11px]">{subZone?.name ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {fbo.latitude != null ? (
                          <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1"><Navigation className="w-3 h-3" /> GPS</span>
                        ) : <span className="text-gray-400 text-[11px]">No GPS</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isOverriding ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={handleOverrideSubmit} disabled={isPending(`override-zone-${fbo.id}`)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center gap-1 transition-all">
                              {isPending(`override-zone-${fbo.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save
                            </button>
                            <button onClick={() => setOverrideTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setOverrideTarget(fbo.id); setOverrideZoneId(fbo.zone_id ?? ""); setOverrideSubZoneId(fbo.sub_zone_id ?? ""); }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Override zone">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {fbo.latitude != null && fbo.longitude != null && (
                              <button onClick={() => data.autoAssignFboZone(fbo.id, fbo.latitude!, fbo.longitude!)}
                                disabled={isPending(`auto-zone-${fbo.id}`)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 disabled:opacity-40 transition-colors" title="Auto-detect zone">
                                {isPending(`auto-zone-${fbo.id}`) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredFbos.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-xs font-medium">No FBOs match your filter.</td></tr>
                )}
              </tbody>
            </table>
            {filteredFbos.length > 50 && (
              <div className="p-3 text-center text-[11px] text-gray-400 border-t border-gray-100 font-medium">
                Showing first 50 of {filteredFbos.length} — refine your search to see more.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
