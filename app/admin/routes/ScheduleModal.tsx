"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, X, Loader2, Trash2, Plus,
  Clock, CheckCircle2, AlarmClock, Info,
} from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import { RouteDefinition, RouteStop, ScheduledFBO, buildFbosById, getDueStatus } from "./route-utils";
import { todayISO } from "@/lib/utils";

interface ScheduleModalProps {
  def: RouteDefinition;
  stops: RouteStop[];
  data: RoutesData;
  onClose: () => void;
}

export default function ScheduleModal({ def, stops, data, onClose }: ScheduleModalProps) {
  const { pickers, fbos, schedules, isPending, createSchedule, deleteSchedule } = data;
  const fbosById = useMemo(() => buildFbosById(fbos), [fbos]);

  // Schedules that belong to this route, sorted by date
  const routeSchedules = useMemo(
    () => schedules.filter((s) => s.route_definition_id === def.id).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [schedules, def.id]
  );

  // Form state
  const [date, setDate] = useState("");
  const [pickerId, setPickerId] = useState(def.default_picker_id ?? "");
  const [notes, setNotes] = useState("");
  const [selectedFboIds, setSelectedFboIds] = useState<Set<string>>(new Set(stops.map((s) => s.fbo_id)));

  // Sync picker default when def changes
  useEffect(() => { setPickerId(def.default_picker_id ?? ""); }, [def.default_picker_id]);

  const today = todayISO();
  const isCreatePending = isPending(`create-schedule-${def.id}-${date}`);

  const orderedStops = [...stops].sort((a, b) => a.sort_order - b.sort_order);

  function toggleFbo(fboId: string) {
    setSelectedFboIds((prev) => {
      const n = new Set(prev);
      n.has(fboId) ? n.delete(fboId) : n.add(fboId);
      return n;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !pickerId || selectedFboIds.size === 0) return;
    // Preserve the stop order from route_stops sort_order
    const orderedFboIds = orderedStops.map((s) => s.fbo_id).filter((id) => selectedFboIds.has(id));
    await createSchedule(def.id, date, pickerId, orderedFboIds, notes);
    setDate(""); setNotes("");
  }

  function formatDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <AlarmClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-base">Schedule Route</h2>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{def.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Existing Schedules */}
          {routeSchedules.length > 0 && (
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-[11px] font-bold font-mono text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Upcoming Schedules
              </h3>
              <div className="space-y-2">
                {routeSchedules.map((s) => {
                  const picker = pickers.find((p) => p.id === s.picker_id);
                  const isPast = s.scheduled_date < today;
                  const isToday = s.scheduled_date === today;
                  return (
                    <div key={s.id}
                      className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-xs ${
                        s.is_executed ? "bg-emerald-50 border-emerald-200"
                        : isPast ? "bg-red-50 border-red-200"
                        : isToday ? "bg-amber-50 border-amber-200"
                        : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {s.is_executed
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          : isPast
                          ? <Clock className="w-4 h-4 text-red-500 flex-shrink-0" />
                          : <AlarmClock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        }
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800">{formatDate(s.scheduled_date)}</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                            {picker?.profile?.full_name ?? "No picker"} · {s.fbo_ids.length} stops
                            {s.is_executed && " · Dispatched"}
                            {isPast && !s.is_executed && " · Missed"}
                          </p>
                          {s.notes && <p className="text-[10px] text-gray-400 italic mt-0.5">{s.notes}</p>}
                        </div>
                      </div>
                      {!s.is_executed && (
                        <button
                          onClick={() => deleteSchedule(s.id)}
                          disabled={isPending(`delete-schedule-${s.id}`)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors flex-shrink-0 disabled:opacity-40"
                          title="Remove schedule"
                        >
                          {isPending(`delete-schedule-${s.id}`) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create New Schedule */}
          <div className="p-5">
            <h3 className="text-[11px] font-bold font-mono text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Create New Schedule
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date + Picker row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 mb-1.5 block">Dispatch Date *</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={today}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 mb-1.5 block">Assign Picker *</label>
                  <select
                    required
                    value={pickerId}
                    onChange={(e) => setPickerId(e.target.value)}
                    className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                  >
                    <option value="">— Select Picker —</option>
                    {pickers.map((p) => <option key={p.id} value={p.id}>{p.profile?.full_name}</option>)}
                  </select>
                </div>
              </div>

              {/* FBO Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-gray-600">Select Stops ({selectedFboIds.size}/{stops.length})</label>
                  <div className="flex gap-3 text-[11px] font-bold text-gray-400">
                    <button type="button" onClick={() => setSelectedFboIds(new Set(stops.map((s) => s.fbo_id)))} className="hover:text-emerald-600 transition-colors">All</button>
                    <span className="text-gray-200">•</span>
                    <button type="button" onClick={() => setSelectedFboIds(new Set())} className="hover:text-emerald-600 transition-colors">None</button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50">
                  {orderedStops.map((stop, idx) => {
                    const fbo: ScheduledFBO | undefined = fbosById.get(stop.fbo_id);
                    if (!fbo) return null;
                    const checked = selectedFboIds.has(stop.fbo_id);
                    const status = getDueStatus(fbo, date || today);
                    return (
                      <label key={stop.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          checked ? "bg-white border-emerald-200" : "bg-white border-transparent hover:border-gray-200"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <input type="checkbox"
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/20 w-3.5 h-3.5"
                            checked={checked}
                            onChange={() => toggleFbo(stop.fbo_id)}
                          />
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center text-[10px] flex-shrink-0">{idx + 1}</span>
                          <span className="font-semibold text-gray-800 truncate">{fbo.business_name}</span>
                        </span>
                        {date && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${
                            status.code === "overdue" || status.code === "never" ? "bg-red-50 text-red-600 border-red-200"
                            : status.code === "due_today" || status.code === "due_soon" ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}>
                            {status.label}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1.5 block">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Festival week, extra collection..."
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Info callout */}
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                  When you open the Dispatch Board on <strong>{date ? formatDate(date) : "the scheduled date"}</strong>, this route will be <strong>automatically dispatched</strong> to the selected picker without any manual action.
                </p>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatePending || !date || !pickerId || selectedFboIds.size === 0}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-40 flex items-center gap-2 transition-all"
                >
                  {isCreatePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlarmClock className="w-4 h-4" />}
                  Schedule Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
