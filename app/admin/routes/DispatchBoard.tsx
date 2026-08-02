"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";
import {
  CalendarDays,
  Layers,
  Droplet,
  XCircle,
  Users,
  AlertTriangle,
  Zap,
  Loader2,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Trash2,
  Sparkles,
} from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import {
  DailyRouteAssignment,
  RouteDefinition,
  RouteStop,
  ScheduledFBO,
  buildFbosById,
  computePickerWorkload,
  getDueStatus,
  shouldAutoInclude,
  sortStopsByUrgency,
} from "./route-utils";
import { DueBadge, DailyStatusPill } from "./route-badges";

interface ZoneCardProps {
  def: RouteDefinition;
  stops: RouteStop[];
  fbosById: Map<string, ScheduledFBO>;
  pickers: RoutesData["pickers"];
  dailyAssignments: DailyRouteAssignment[];
  selectedDate: string;
  isFutureDate: boolean;
  isPending: (key: string) => boolean;
  data: RoutesData;
}

function ZoneCard({ def, stops, fbosById, pickers, dailyAssignments, selectedDate, isPending, data }: ZoneCardProps) {
  const dispatchedByFbo = useMemo(() => {
    const stopFboIds = new Set(stops.map((s) => s.fbo_id));
    return new Map(dailyAssignments.filter((a) => stopFboIds.has(a.fbo_id)).map((a) => [a.fbo_id, a]));
  }, [dailyAssignments, stops]);

  const pendingStops = stops.filter((s) => !dispatchedByFbo.has(s.fbo_id));
  const dispatchedStops = stops.filter((s) => dispatchedByFbo.has(s.fbo_id));

  const completedCount = useMemo(
    () => dispatchedStops.filter((s) => dispatchedByFbo.get(s.fbo_id)?.status === "completed").length,
    [dispatchedStops, dispatchedByFbo]
  );

  const pendingResolved = pendingStops
    .map((s) => ({ stop: s, fbo: fbosById.get(s.fbo_id) }))
    .filter((x): x is { stop: RouteStop; fbo: ScheduledFBO } => !!x.fbo);
  const pendingSorted = sortStopsByUrgency(pendingResolved, selectedDate);

  const autoSelectedIds = useMemo(
    () =>
      new Set(
        pendingResolved
          .filter(({ fbo }) => shouldAutoInclude(getDueStatus(fbo, selectedDate).code))
          .map(({ stop }) => stop.fbo_id)
      ),
    [pendingResolved.map((p) => p.stop.fbo_id).join(","), selectedDate]
  );

  const [pickerId, setPickerId] = useState(def.default_picker_id ?? "");
  const [selected, setSelected] = useState<Set<string>>(autoSelectedIds);

  useEffect(() => {
    setSelected(new Set(autoSelectedIds));
  }, [autoSelectedIds]);

  function toggle(fboId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fboId)) next.delete(fboId);
      else next.add(fboId);
      return next;
    });
  }

  const dispatchKey = `dispatch-${def.id}`;
  const clearKey = `clear-${def.id}`;
  const busy = isPending(dispatchKey);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      {/* Zone Card Header Accent */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900/5 via-slate-50 to-emerald-500/5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight truncate group-hover:text-emerald-700 transition-colors">
              {def.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              {stops.length} restaurant{stops.length === 1 ? "" : "s"} in this zone
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {dispatchedStops.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-700 border border-emerald-300/60 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {completedCount} / {dispatchedStops.length} Pickups Done
              </span>
            )}
            {pendingStops.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                All Dispatched
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-300/50 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                {pendingStops.length} Pending
              </span>
            )}
          </div>
        </div>

        {/* Pending / not-yet-dispatched stops list */}
        {pendingSorted.length > 0 && (
          <div className="mt-5 space-y-2 max-h-56 overflow-y-auto pr-1">
            {pendingSorted.map(({ stop, fbo }) => {
              const status = getDueStatus(fbo, selectedDate);
              const isChecked = selected.has(stop.fbo_id);
              return (
                <label
                  key={stop.id}
                  className={`flex items-center justify-between gap-3 text-xs p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isChecked
                      ? "bg-emerald-500/5 border-emerald-300/80 shadow-2xs"
                      : "bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/60"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      checked={isChecked}
                      onChange={() => toggle(stop.fbo_id)}
                    />
                    {status.code === "early_requested" && <Zap className="w-4 h-4 text-blue-500 flex-shrink-0 animate-bounce" />}
                    {(status.code === "overdue" || status.code === "never") && (
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-slate-800 truncate">{fbo.business_name}</span>
                  </span>
                  <DueBadge status={status} />
                </label>
              );
            })}
          </div>
        )}

        {pendingStops.length > 0 && (
          <div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-slate-500">
            <button
              type="button"
              className="hover:text-emerald-600 transition-colors"
              onClick={() => setSelected(new Set(pendingStops.map((s) => s.fbo_id)))}
            >
              Select all
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              className="hover:text-emerald-600 transition-colors"
              onClick={() => setSelected(new Set(autoSelectedIds))}
            >
              Select due only
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              className="hover:text-emerald-600 transition-colors"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Already Dispatched List */}
        {dispatchedStops.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Dispatched for {formatDate(selectedDate)}
              </p>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {completedCount} / {dispatchedStops.length} Completed
              </span>
            </div>
            {dispatchedStops.map((stop) => {
              const fbo = fbosById.get(stop.fbo_id);
              const assignment = dispatchedByFbo.get(stop.fbo_id);
              if (!fbo || !assignment) return null;
              const status = getDueStatus(fbo, selectedDate);
              const assignedPicker = pickers.find((p) => p.id === assignment.picker_id);
              return (
                <div key={stop.id} className="rounded-2xl bg-slate-50 border border-slate-200/60 p-3 space-y-1.5 hover:bg-white hover:shadow-xs transition-all">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-800 truncate">{fbo.business_name}</span>
                    <DailyStatusPill status={assignment.status} liters={assignment.collected_liters} />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold bg-slate-200/60 px-2.5 py-1 rounded-lg">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-400 font-medium">Assigned Picker:</span>
                      <span className="text-slate-900 font-bold">{assignedPicker?.profile?.full_name ?? "Assigned"}</span>
                      <span className="text-[9px] bg-slate-300/70 text-slate-700 px-1.5 py-0.2 rounded-md font-mono uppercase tracking-wider ml-1">
                        Locked
                      </span>
                    </div>
                  </div>
                  {status.code === "early_requested" && (
                    <p className="text-[10px] text-blue-600 font-medium flex items-center gap-1 pt-0.5">
                      <Zap className="w-3 h-3 text-blue-500" /> Requested an early pickup
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {stops.length === 0 && (
          <p className="mt-4 text-xs text-slate-400 italic text-center py-6">
            No restaurants added to this zone yet. Go to Zones &amp; Schedules tab to configure stops.
          </p>
        )}
      </div>

      {/* Footer controls */}
      {stops.length > 0 && (
        <div className="p-4 bg-slate-900 text-white flex flex-wrap gap-3 justify-between items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <select
              className="w-full text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              value={pickerId}
              onChange={(e) => setPickerId(e.target.value)}
            >
              <option value="" disabled>
                -- Assign Picker --
              </option>
              {pickers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.profile?.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {dispatchedStops.length > 0 && (
              <button
                type="button"
                onClick={() => data.clearDispatch(def, stops.map((s) => s.fbo_id))}
                disabled={isPending(clearKey)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-red-300 hover:bg-red-500/20 border border-red-500/30 transition-all flex items-center gap-1.5"
                title="Remove all of today's dispatch for this zone"
              >
                {isPending(clearKey) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => data.dispatchZone(def, pickerId, Array.from(selected))}
              disabled={busy || !pickerId || selected.size === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Dispatch Selected ({selected.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DispatchBoard({ data }: { data: RoutesData }) {
  const { pickers, fbos, routeDefinitions, routeStops, dailyAssignments, weekAssignments, selectedDate, setSelectedDate, isPending } = data;

  const fbosById = useMemo(() => buildFbosById(fbos), [fbos]);
  const todayReal = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isFutureDate = selectedDate > todayReal;

  const workloads = useMemo(
    () => pickers.map((p) => computePickerWorkload(p, dailyAssignments, weekAssignments)),
    [pickers, dailyAssignments, weekAssignments]
  );

  const dueSummary = useMemo(() => {
    let overdue = 0;
    let dueSoonOrToday = 0;
    let requested = 0;
    routeStops.forEach((s) => {
      const fbo = fbosById.get(s.fbo_id);
      if (!fbo) return;
      const status = getDueStatus(fbo, selectedDate);
      if (status.code === "overdue" || status.code === "never") overdue++;
      else if (status.code === "due_today" || status.code === "due_soon") dueSoonOrToday++;
      if (status.code === "early_requested") requested++;
    });
    return { overdue, dueSoonOrToday, requested };
  }, [routeStops, fbosById, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Date Control Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg">Dispatch Calendar</h2>
            <p className="text-xs text-slate-500 font-medium">
              Currently dispatching for: <span className="font-bold text-emerald-700">{formatDate(selectedDate)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setSelectedDate(todayReal)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedDate === todayReal
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            Today
          </button>
          <div className="relative flex-1 md:w-auto">
            <input
              type="date"
              className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* High Density Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Pickers</p>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{pickers.length}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pickups Progress</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-2">
            {dailyAssignments.filter((a) => a.status === "completed").length}{" "}
            <span className="text-sm font-bold text-slate-400">/ {dailyAssignments.length}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue</p>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-600 mt-2">{dueSummary.overdue}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due Today / Soon</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2">{dueSummary.dueSoonOrToday}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Early Requested</p>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-600 mt-2">{dueSummary.requested}</p>
        </div>
      </div>

      {workloads.some((w) => w.nearCapacity) && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-2xl text-xs font-semibold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Capacity Warning:</strong>{" "}
            {workloads
              .filter((w) => w.nearCapacity)
              .map((w) => w.picker.profile?.full_name)
              .join(", ")}{" "}
            {workloads.filter((w) => w.nearCapacity).length === 1 ? "is" : "are"} at or near daily capacity today.
          </span>
        </div>
      )}

      {routeDefinitions.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-sm">
          <Layers className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-extrabold text-slate-800 text-lg">No Zones Created Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Switch to the <strong>Zones &amp; Schedules</strong> tab to set up pickup zones (e.g. Koramangala) and assign restaurants before dispatching routes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {routeDefinitions.map((def) => (
            <ZoneCard
              key={def.id}
              def={def}
              stops={routeStops.filter((s) => s.route_definition_id === def.id)}
              fbosById={fbosById}
              pickers={pickers}
              dailyAssignments={dailyAssignments}
              selectedDate={selectedDate}
              isFutureDate={isFutureDate}
              isPending={isPending}
              data={data}
            />
          ))}
        </div>
      )}
    </div>
  );
}
