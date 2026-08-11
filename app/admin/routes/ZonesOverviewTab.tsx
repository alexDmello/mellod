"use client";

import { useMemo, useState } from "react";
import {
  Globe,
  Building2,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Edit3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
  Navigation,
  Info,
  ScanLine,
} from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import type { SubZone } from "@/lib/types";
import { ZONE_CONFIG, ZONE_ORDER, type ZoneName } from "./zone-data";

export default function ZonesOverviewTab({ data }: { data: RoutesData }) {
  const { fbos, zones, subZones, routeDefinitions, isPending, bulkRedetectZones, overrideFboZone } = data;

  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null); // fbo id
  const [overrideZoneId, setOverrideZoneId] = useState("");
  const [overrideSubZoneId, setOverrideSubZoneId] = useState("");
  const [fboSearch, setFboSearch] = useState("");
  const [filterUnzoned, setFilterUnzoned] = useState(false);

  // Build lookup maps
  const zonesById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const subZonesById = useMemo(() => new Map(subZones.map((sz) => [sz.id, sz])), [subZones]);
  const subZonesByZone = useMemo(() => {
    const m = new Map<string, SubZone[]>();
    for (const sz of subZones) {
      if (!m.has(sz.zone_id)) m.set(sz.zone_id, []);
      m.get(sz.zone_id)!.push(sz);
    }
    return m;
  }, [subZones]);

  const routesByZone = useMemo(() => {
    const m = new Map<string, number>();
    for (const rd of routeDefinitions) {
      if (rd.zone_id) m.set(rd.zone_id, (m.get(rd.zone_id) ?? 0) + 1);
    }
    return m;
  }, [routeDefinitions]);

  const unzonedFbos = useMemo(() => fbos.filter((f) => !f.zone_id), [fbos]);
  const geoFbos = useMemo(() => fbos.filter((f) => f.latitude != null && f.longitude != null), [fbos]);

  const filteredFbos = useMemo(() => {
    let list = filterUnzoned ? unzonedFbos : fbos;
    if (fboSearch.trim()) {
      const q = fboSearch.toLowerCase();
      list = list.filter((f) => f.business_name.toLowerCase().includes(q) || (f.address ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [fbos, unzonedFbos, filterUnzoned, fboSearch]);

  async function handleOverrideSubmit() {
    if (!overrideTarget || !overrideZoneId) return;
    await overrideFboZone(overrideTarget, overrideZoneId, overrideSubZoneId);
    setOverrideTarget(null);
    setOverrideZoneId("");
    setOverrideSubZoneId("");
  }

  const isBulkPending = isPending("bulk-redetect");

  return (
    <div className="space-y-8">
      {/* Header stats ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total FBOs", value: fbos.length, icon: Building2, color: "text-slate-700", bg: "bg-slate-100" },
          { label: "Zone-Assigned", value: fbos.length - unzonedFbos.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Unzoned", value: unzonedFbos.length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "With GPS Coords", value: geoFbos.length, icon: Navigation, color: "text-blue-600", bg: "bg-blue-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className={`text-3xl font-black mt-2 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Zone Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              Bangalore Municipal Zones
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Greater Bengaluru Authority — 5 City Corporations
            </p>
          </div>
          <button
            onClick={bulkRedetectZones}
            disabled={isBulkPending || geoFbos.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all"
          >
            {isBulkPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            Auto-detect All Zones
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ZONE_ORDER.map((zoneName) => {
            const config = ZONE_CONFIG[zoneName];
            const zoneRecord = zones.find((z) => z.name === zoneName);
            const zoneFbos = zoneRecord ? fbos.filter((f) => f.zone_id === zoneRecord.id) : [];
            const zoneSubZones = zoneRecord ? (subZonesByZone.get(zoneRecord.id) ?? []) : [];
            const routeCount = zoneRecord ? (routesByZone.get(zoneRecord.id) ?? 0) : 0;
            const isExpanded = expandedZone === zoneName;

            return (
              <div
                key={zoneName}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* Zone color accent bar */}
                <div className="h-1.5 w-full" style={{ background: config.hex }} />

                <div className="p-6">
                  {/* Zone header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md flex-shrink-0"
                        style={{ background: config.hex }}
                      >
                        {config.corporationNumber}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base leading-tight">{zoneName}</h3>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{config.corporationName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedZone(isExpanded ? null : zoneName)}
                      className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Stats row */}
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      { label: "FBOs", value: zoneFbos.length },
                      { label: "Routes", value: routeCount },
                      { label: "Sub-Zones", value: zoneSubZones.length },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-xl font-black text-slate-900">{value}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Sub-zone info */}
                  {zoneSubZones.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {zoneSubZones.map((sz) => (
                        <div key={sz.id} className="flex items-start gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: config.hex }} />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{sz.name}</p>
                            {sz.areas && (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-relaxed">{sz.areas}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded: FBO list */}
                  {isExpanded && (
                    <div className="mt-5 pt-5 border-t border-slate-100">
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                        {zoneFbos.length} FBO{zoneFbos.length !== 1 ? "s" : ""} in this zone
                      </p>
                      {zoneFbos.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">No FBOs assigned to this zone yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {zoneFbos.map((fbo) => (
                            <div
                              key={fbo.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-slate-50 group"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{fbo.business_name}</p>
                                {fbo.address && (
                                  <p className="text-[10px] text-slate-400 truncate">{fbo.address}</p>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setOverrideTarget(fbo.id);
                                  setOverrideZoneId(fbo.zone_id ?? "");
                                  setOverrideSubZoneId(fbo.sub_zone_id ?? "");
                                }}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 text-slate-500"
                                title="Override zone"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* No-zone info card */}
          {zones.length === 0 && (
            <div className="col-span-full bg-amber-50 rounded-3xl border border-amber-200 p-8 text-center">
              <Info className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-extrabold text-amber-900 text-base">Zone tables not found</h3>
              <p className="text-sm text-amber-700 mt-2 max-w-md mx-auto">
                Run the <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">zones_migration.sql</code> script
                in your Supabase SQL editor to create the zones and sub-zones tables.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FBO Zone Assignment Panel */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              FBO Zone Assignments
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              View and manually override zone assignments for any FBO.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={filterUnzoned}
                onChange={(e) => setFilterUnzoned(e.target.checked)}
              />
              Show unzoned only ({unzonedFbos.length})
            </label>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search FBOs by name or address..."
              className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500"
              value={fboSearch}
              onChange={(e) => setFboSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-extrabold text-slate-500 uppercase tracking-wider">FBO</th>
                  <th className="text-left px-4 py-3 font-extrabold text-slate-500 uppercase tracking-wider">Address</th>
                  <th className="text-left px-4 py-3 font-extrabold text-slate-500 uppercase tracking-wider">Zone</th>
                  <th className="text-left px-4 py-3 font-extrabold text-slate-500 uppercase tracking-wider">Sub-Zone</th>
                  <th className="text-left px-4 py-3 font-extrabold text-slate-500 uppercase tracking-wider">GPS</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFbos.slice(0, 50).map((fbo) => {
                  const zone = fbo.zone_id ? zonesById.get(fbo.zone_id) : null;
                  const subZone = fbo.sub_zone_id ? subZonesById.get(fbo.sub_zone_id) : null;
                  const config = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;
                  const isOverriding = overrideTarget === fbo.id;
                  const isOverridePending = isPending(`override-zone-${fbo.id}`);
                  const isAutoPending = isPending(`auto-zone-${fbo.id}`);

                  return (
                    <tr key={fbo.id} className={`hover:bg-slate-50 transition-colors ${isOverriding ? "bg-blue-50/50" : ""}`}>
                      <td className="px-4 py-3 font-bold text-slate-900 max-w-[180px]">
                        <span className="truncate block">{fbo.business_name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px]">
                        <span className="truncate block">{fbo.address ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isOverriding ? (
                          <select
                            className="text-xs font-bold bg-white border border-blue-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer w-full"
                            value={overrideZoneId}
                            onChange={(e) => {
                              setOverrideZoneId(e.target.value);
                              setOverrideSubZoneId("");
                            }}
                          >
                            <option value="">— No Zone —</option>
                            {zones.map((z) => (
                              <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                          </select>
                        ) : config ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border"
                            style={{ background: config.hex + "18", color: config.hex, borderColor: config.hex + "40" }}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: config.hex }} />
                            {zone?.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-bold">Unzoned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOverriding ? (
                          <select
                            className="text-xs font-bold bg-white border border-blue-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer w-full"
                            value={overrideSubZoneId}
                            onChange={(e) => setOverrideSubZoneId(e.target.value)}
                          >
                            <option value="">— No Sub-Zone —</option>
                            {(subZonesByZone.get(overrideZoneId) ?? []).map((sz) => (
                              <option key={sz.id} value={sz.id}>{sz.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-600 font-medium text-[11px]">{subZone?.name ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {fbo.latitude != null ? (
                          <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> GPS
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No GPS</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOverriding ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={handleOverrideSubmit}
                              disabled={isOverridePending}
                              className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-all flex items-center gap-1"
                            >
                              {isOverridePending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Save
                            </button>
                            <button
                              onClick={() => setOverrideTarget(null)}
                              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setOverrideTarget(fbo.id);
                                setOverrideZoneId(fbo.zone_id ?? "");
                                setOverrideSubZoneId(fbo.sub_zone_id ?? "");
                              }}
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                              title="Override zone"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {fbo.latitude != null && fbo.longitude != null && (
                              <button
                                onClick={() => data.autoAssignFboZone(fbo.id, fbo.latitude!, fbo.longitude!)}
                                disabled={isAutoPending}
                                className="p-1.5 rounded-xl hover:bg-emerald-100 text-emerald-600 transition-colors disabled:opacity-40"
                                title="Auto-detect zone from GPS"
                              >
                                {isAutoPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredFbos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm font-medium">
                      No FBOs match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {filteredFbos.length > 50 && (
              <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100">
                Showing first 50 of {filteredFbos.length} results. Use the search to narrow down.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
