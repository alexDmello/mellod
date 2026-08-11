"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";
import {
  CalendarDays, Droplet, Users, AlertTriangle,
  Zap, Loader2, MapPin, CheckCircle2, Clock, Send, Trash2, AlarmClock,
} from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import {
  DailyRouteAssignment, RouteDefinition, RouteStop, ScheduledFBO,
  buildFbosById, computePickerWorkload, getDueStatus,
  shouldAutoInclude, sortStopsByUrgency,
} from "./route-utils";
import { DueBadge, DailyStatusPill } from "./route-badges";
import { ZONE_CONFIG, type ZoneName } from "./zone-data";
import ScheduleModal from "./ScheduleModal";

/* ── Route Card ─────────────────────────────────────────────────────────────── */
interface RouteCardProps {
  def: RouteDefinition;
  stops: RouteStop[];
  fbosById: Map<string, ScheduledFBO>;
  pickers: RoutesData["pickers"];
  zonesById: Map<string, { name: string; color: string }>;
  dailyAssignments: DailyRouteAssignment[];
  selectedDate: string;
  isPending: (key: string) => boolean;
  data: RoutesData;
  onSchedule: (def: RouteDefinition) => void;
}

function RouteCard({ def, stops, fbosById, pickers, zonesById, dailyAssignments, selectedDate, isPending, data, onSchedule }: RouteCardProps) {
  const dispatchedByFbo = useMemo(() => {
    const ids = new Set(stops.map((s) => s.fbo_id));
    return new Map(dailyAssignments.filter((a) => ids.has(a.fbo_id)).map((a) => [a.fbo_id, a]));
  }, [dailyAssignments, stops]);

  const pendingStops   = stops.filter((s) => !dispatchedByFbo.has(s.fbo_id));
  const dispatchedStops = stops.filter((s) =>  dispatchedByFbo.has(s.fbo_id));
  const completedCount = dispatchedStops.filter((s) => dispatchedByFbo.get(s.fbo_id)?.status === "completed").length;

  const pendingResolved = pendingStops
    .map((s) => ({ stop: s, fbo: fbosById.get(s.fbo_id) }))
    .filter((x): x is { stop: RouteStop; fbo: ScheduledFBO } => !!x.fbo);
  const pendingSorted = sortStopsByUrgency(pendingResolved, selectedDate);

  const autoSelectedIds = useMemo(
    () => new Set(pendingResolved.filter(({ fbo }) => shouldAutoInclude(getDueStatus(fbo, selectedDate).code)).map(({ stop }) => stop.fbo_id)),
    [pendingResolved.map((p) => p.stop.fbo_id).join(","), selectedDate]
  );

  const [pickerId, setPickerId] = useState(def.default_picker_id ?? "");
  const [selected, setSelected] = useState<Set<string>>(autoSelectedIds);

  useEffect(() => { setSelected(new Set(autoSelectedIds)); }, [autoSelectedIds]);

  const zone = def.zone_id ? zonesById.get(def.zone_id) : null;
  const config = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;
  const busy = isPending(`dispatch-${def.id}`);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 hover:border-gray-200 hover:shadow-gray-300/50 transition-all flex flex-col overflow-hidden">
      {/* Zone color accent */}
      {config && <div className="h-1 w-full" style={{ background: config.hex }} />}

      <div className="p-5 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-black text-gray-900 text-base truncate">{def.name}</h3>
              {config && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0"
                  style={{ background: config.hex + "18", color: config.hex, borderColor: config.hex + "40" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.hex }} />
                  {zone?.name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {stops.length} stop{stops.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
            <button
              onClick={() => onSchedule(def)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 transition-all"
              title="Schedule this route for a future date"
            >
              <AlarmClock className="w-3 h-3" /> Schedule
            </button>
            {dispatchedStops.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> {completedCount}/{dispatchedStops.length}
              </span>
            )}
            {pendingStops.length > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3" /> {pendingStops.length} Pending
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">All Dispatched</span>
            )}
          </div>
        </div>

        {/* Pending stops to select */}
        {pendingSorted.length > 0 && (
          <div className="space-y-1.5 max-h-52 overflow-y-auto mb-3">
            {pendingSorted.map(({ stop, fbo }) => {
              const status = getDueStatus(fbo, selectedDate);
              const checked = selected.has(stop.fbo_id);
              return (
                <label key={stop.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    checked ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <input type="checkbox"
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      checked={checked}
                      onChange={() => setSelected((prev) => { const n = new Set(prev); checked ? n.delete(stop.fbo_id) : n.add(stop.fbo_id); return n; })}
                    />
                    {status.code === "early_requested" && <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                    {(status.code === "overdue" || status.code === "never") && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                    <span className="font-semibold text-gray-800 truncate">{fbo.business_name}</span>
                  </span>
                  <DueBadge status={status} />
                </label>
              );
            })}
          </div>
        )}

        {/* Selection shortcuts */}
        {pendingStops.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400 mb-3">
            <button onClick={() => setSelected(new Set(pendingStops.map((s) => s.fbo_id)))} className="hover:text-emerald-600 transition-colors">All</button>
            <span className="text-gray-200">•</span>
            <button onClick={() => setSelected(new Set(autoSelectedIds))} className="hover:text-emerald-600 transition-colors">Due only</button>
            <span className="text-gray-200">•</span>
            <button onClick={() => setSelected(new Set())} className="hover:text-emerald-600 transition-colors">Clear</button>
          </div>
        )}

        {/* Dispatched section */}
        {dispatchedStops.length > 0 && (
          <div className="border-t border-gray-100 pt-3 mt-1 space-y-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Dispatched · {formatDate(selectedDate)}
            </p>
            {dispatchedStops.map((stop) => {
              const fbo = fbosById.get(stop.fbo_id);
              const a = dispatchedByFbo.get(stop.fbo_id);
              if (!fbo || !a) return null;
              const picker = pickers.find((p) => p.id === a.picker_id);
              return (
                <div key={stop.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <span className="font-semibold text-gray-800 truncate">{fbo.business_name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-gray-400 font-medium">{picker?.profile?.full_name ?? "—"}</span>
                    <DailyStatusPill status={a.status} liters={a.collected_liters} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {stops.length === 0 && (
          <p className="text-xs text-gray-400 italic text-center py-8">No FBOs in this route yet. Add stops in the Routes tab.</p>
        )}
      </div>

      {/* Footer Action Bar */}
      {stops.length > 0 && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <select
              className="flex-1 text-xs font-semibold bg-white border border-gray-200 text-gray-800 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              value={pickerId}
              onChange={(e) => setPickerId(e.target.value)}
            >
              <option value="" disabled>— Assign Picker —</option>
              {pickers.map((p) => <option key={p.id} value={p.id}>{p.profile?.full_name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            {dispatchedStops.length > 0 && (
              <button
                onClick={() => data.clearDispatch(def, stops.map((s) => s.fbo_id))}
                disabled={isPending(`clear-${def.id}`)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200 transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                {isPending(`clear-${def.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Clear
              </button>
            )}
            <button
              onClick={() => data.dispatchZone(def, pickerId, Array.from(selected))}
              disabled={busy || !pickerId || selected.size === 0}
              className="px-4 py-1.5 rounded-lg text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Dispatch ({selected.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── DispatchBoard ───────────────────────────────────────────────────────────── */
export default function DispatchBoard({ data }: { data: RoutesData }) {
  const { pickers, fbos, routeDefinitions, routeStops, zones, dailyAssignments, weekAssignments, selectedDate, setSelectedDate, isPending, schedules, executeSchedulesForDate } = data;

  const [schedulingRoute, setSchedulingRoute] = useState<RouteDefinition | null>(null);

  // Auto-execute pending schedules for selected date
  useEffect(() => {
    if (selectedDate && schedules.length > 0) {
      executeSchedulesForDate(selectedDate);
    }
  }, [selectedDate, schedules.length]);

  const fbosById  = useMemo(() => buildFbosById(fbos), [fbos]);
  const zonesById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const todayReal = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const workloads = useMemo(() => pickers.map((p) => computePickerWorkload(p, dailyAssignments, weekAssignments)), [pickers, dailyAssignments, weekAssignments]);

  const dueSummary = useMemo(() => {
    let overdue = 0, dueSoon = 0, requested = 0;
    routeStops.forEach((s) => {
      const fbo = fbosById.get(s.fbo_id); if (!fbo) return;
      const { code } = getDueStatus(fbo, selectedDate);
      if (code === "overdue" || code === "never") overdue++;
      if (code === "due_today" || code === "due_soon") dueSoon++;
      if (code === "early_requested") requested++;
    });
    return { overdue, dueSoon, requested };
  }, [routeStops, fbosById, selectedDate]);

  const kpis = [
    { label: "Active Pickers",     value: pickers.length,                                                                      color: "text-slate-900",   bg: "bg-gray-50",    border: "border-gray-100", icon: Users },
    { label: "Pickups Today",      value: `${dailyAssignments.filter((a) => a.status === "completed").length} / ${dailyAssignments.length}`, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100", icon: CheckCircle2 },
    { label: "Overdue",            value: dueSummary.overdue,                                                                  color: "text-red-600",     bg: "bg-red-50",     border: "border-red-100",  icon: AlertTriangle },
    { label: "Due Today / Soon",   value: dueSummary.dueSoon,                                                                  color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-100", icon: Clock },
    { label: "Early Requested",    value: dueSummary.requested,                                                                color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-100",  icon: Zap },
  ];

  return (
    <div className="space-y-6">

      {/* Date Control + KPI ribbon */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xl shadow-gray-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              Dispatch Board
            </h2>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              Dispatching for <span className="font-bold text-gray-700">{formatDate(selectedDate)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(todayReal)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDate === todayReal ? "bg-slate-900 text-white shadow-sm" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >Today</button>
            <div className="relative">
              <input type="date"
                className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map(({ label, value, color, bg, border, icon: Icon }) => (
            <div key={label} className={`rounded-xl ${bg} border ${border} p-3.5`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className={`text-2xl font-black tracking-tight font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Warning */}
      {workloads.some((w) => w.nearCapacity) && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="font-semibold">
            Capacity Warning: {workloads.filter((w) => w.nearCapacity).map((w) => w.picker.profile?.full_name).join(", ")} at or near daily capacity.
          </span>
        </div>
      )}

      {/* Route Cards Grid */}
      {routeDefinitions.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xl shadow-gray-200/50">
          <Droplet className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="font-black text-gray-700 text-lg">No Routes Created</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto font-medium">
            Switch to the <strong>Routes</strong> tab to create route clusters and assign restaurants before dispatching.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {routeDefinitions.map((def) => (
            <RouteCard
              key={def.id}
              def={def}
              stops={routeStops.filter((s) => s.route_definition_id === def.id)}
              fbosById={fbosById}
              pickers={pickers}
              zonesById={zonesById}
              dailyAssignments={dailyAssignments}
              selectedDate={selectedDate}
              isPending={isPending}
              data={data}
              onSchedule={(defToSchedule) => setSchedulingRoute(defToSchedule)}
            />
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {schedulingRoute && (
        <ScheduleModal
          def={schedulingRoute}
          stops={routeStops.filter((s) => s.route_definition_id === schedulingRoute.id)}
          data={data}
          onClose={() => setSchedulingRoute(null)}
        />
      )}
    </div>
  );
}
