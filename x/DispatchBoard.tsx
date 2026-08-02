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
  Map as MapIcon,
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

function ZoneCard({ def, stops, fbosById, pickers, dailyAssignments, selectedDate, isFutureDate, isPending, data }: ZoneCardProps) {
  const dispatchedByFbo = useMemo(() => {
    const stopFboIds = new Set(stops.map((s) => s.fbo_id));
    return new Map(dailyAssignments.filter((a) => stopFboIds.has(a.fbo_id)).map((a) => [a.fbo_id, a]));
  }, [dailyAssignments, stops]);

  const pendingStops = stops.filter((s) => !dispatchedByFbo.has(s.fbo_id));
  const dispatchedStops = stops.filter((s) => dispatchedByFbo.has(s.fbo_id));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingResolved.map((p) => p.stop.fbo_id).join(","), selectedDate]
  );

  const [pickerId, setPickerId] = useState(def.default_picker_id ?? "");
  const [selected, setSelected] = useState<Set<string>>(autoSelectedIds);

  useEffect(() => {
    setSelected(new Set(autoSelectedIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="card bg-white border border-gray-100 flex flex-col justify-between">
      {/* Header */}
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{def.name}</h3>
            <p className="text-xs text-gray-400 mt-1">{stops.length} restaurants in this zone</p>
          </div>
          {pendingStops.length === 0 ? (
            <span className="badge badge-gray text-[10px] whitespace-nowrap">Nothing pending</span>
          ) : (
            <span className="badge badge-yellow text-[10px] whitespace-nowrap">{pendingStops.length} pending</span>
          )}
        </div>

        {/* Pending / not-yet-dispatched stops with due badges */}
        {pendingSorted.length > 0 && (
          <div className="mt-4 space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {pendingSorted.map(({ stop, fbo }) => {
              const status = getDueStatus(fbo, selectedDate);
              return (
                <label
                  key={stop.id}
                  className="flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selected.has(stop.fbo_id)}
                      onChange={() => toggle(stop.fbo_id)}
                    />
                    {status.code === "early_requested" && <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                    {(status.code === "overdue" || status.code === "never") && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-800 truncate">{fbo.business_name}</span>
                  </span>
                  <DueBadge status={status} />
                </label>
              );
            })}
          </div>
        )}

        {pendingStops.length > 0 && (
          <div className="mt-2.5 flex items-center gap-3 text-[10px] font-semibold text-gray-400">
            <button type="button" className="hover:text-green-700" onClick={() => setSelected(new Set(pendingStops.map((s) => s.fbo_id)))}>
              Select all
            </button>
            <button type="button" className="hover:text-green-700" onClick={() => setSelected(new Set(autoSelectedIds))}>
              Select due only
            </button>
            <button type="button" className="hover:text-green-700" onClick={() => setSelected(new Set())}>
              Select none
            </button>
          </div>
        )}

        {/* Already-dispatched stops for this date */}
        {dispatchedStops.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Dispatched for {formatDate(selectedDate)}</p>
            {dispatchedStops.map((stop) => {
              const fbo = fbosById.get(stop.fbo_id);
              const assignment = dispatchedByFbo.get(stop.fbo_id);
              if (!fbo || !assignment) return null;
              const status = getDueStatus(fbo, selectedDate);
              const canAct = assignment.status === "assigned" && !isFutureDate;
              return (
                <div key={stop.id} className="rounded-lg bg-gray-50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-gray-800 truncate">{fbo.business_name}</span>
                    <DailyStatusPill status={assignment.status} liters={assignment.collected_liters} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <select
                      className="bg-transparent border-0 text-[10px] text-gray-500 font-medium focus:ring-0 cursor-pointer pl-0"
                      value={assignment.picker_id}
                      disabled={isPending(`stop-${stop.fbo_id}`)}
                      onChange={(e) => data.singleStopReassign(stop.fbo_id, e.target.value)}
                    >
                      {pickers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.profile?.full_name}
                        </option>
                      ))}
                    </select>
                    {canAct && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Mark collected"
                          disabled={isPending(`collect-${assignment.id}`)}
                          onClick={() => {
                            const input = window.prompt(`Litres collected from ${fbo.business_name} (optional):`, "");
                            if (input === null) return;
                            const trimmed = input.trim();
                            if (trimmed === "") {
                              data.markCollected(assignment, null);
                              return;
                            }
                            const liters = Number(trimmed);
                            if (Number.isNaN(liters) || liters < 0) {
                              window.alert("Enter a valid number of litres, or leave it blank.");
                              return;
                            }
                            data.markCollected(assignment, liters);
                          }}
                          className="p-1 rounded hover:bg-green-100 text-green-700"
                        >
                          <Droplet className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Mark skipped"
                          disabled={isPending(`skip-${assignment.id}`)}
                          onClick={() => {
                            if (window.confirm(`Mark ${fbo.business_name} as skipped for this date?`)) {
                              data.skipStop(assignment);
                            }
                          }}
                          className="p-1 rounded hover:bg-red-100 text-red-500"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {status.code === "early_requested" && (
                    <p className="text-[10px] text-blue-500 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Requested an early pickup
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {stops.length === 0 && <p className="mt-4 text-xs text-gray-400 italic">No restaurants added to this zone yet.</p>}
      </div>

      {/* Footer controls */}
      {stops.length > 0 && (
        <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-2 justify-between items-center rounded-b-[var(--radius-card)]">
          <select
            className="form-input !py-1.5 !px-3 text-xs bg-white border-gray-200"
            value={pickerId}
            onChange={(e) => setPickerId(e.target.value)}
          >
            <option value="" disabled>
              -- Choose picker --
            </option>
            {pickers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.profile?.full_name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            {dispatchedStops.length > 0 && (
              <button
                type="button"
                onClick={() => data.clearDispatch(def, stops.map((s) => s.fbo_id))}
                disabled={isPending(clearKey)}
                className="btn btn-danger btn-sm"
                title="Remove all of today's dispatch for this zone"
              >
                {isPending(clearKey) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Clear"}
              </button>
            )}
            <button
              type="button"
              onClick={() => data.dispatchZone(def, pickerId, Array.from(selected))}
              disabled={busy || !pickerId || selected.size === 0}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapIcon className="w-3.5 h-3.5" />}
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
      {/* Date control */}
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

      {/* Workload / due-status summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4 bg-white border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Active pickers
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pickers.length}</p>
        </div>
        <div className="card p-4 bg-white border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Overdue
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">{dueSummary.overdue}</p>
        </div>
        <div className="card p-4 bg-white border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Due today / soon</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{dueSummary.dueSoonOrToday}</p>
        </div>
        <div className="card p-4 bg-white border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-500" /> Requested pickup
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{dueSummary.requested}</p>
        </div>
      </div>

      {workloads.some((w) => w.nearCapacity) && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {workloads
            .filter((w) => w.nearCapacity)
            .map((w) => w.picker.profile?.full_name)
            .join(", ")}{" "}
          {workloads.filter((w) => w.nearCapacity).length === 1 ? "is" : "are"} at or near daily capacity today — worth
          reviewing zones or adding a picker. See the Pickers tab.
        </div>
      )}

      {routeDefinitions.length === 0 ? (
        <div className="card p-12 text-center border border-gray-100 bg-white">
          <Layers className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700">No zones defined yet</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Create a zone (e.g. Koramangala) and add restaurant stops to it in the Zones &amp; Schedules tab before you can
            dispatch routes.
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
