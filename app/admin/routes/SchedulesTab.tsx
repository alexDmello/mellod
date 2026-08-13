"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays, AlarmClock, CheckCircle2, Clock, Plus, Trash2,
  Send, Filter, Search, ChevronDown, ChevronUp, MapPin, Users, Globe,
  AlertCircle, Sparkles, Loader2
} from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import { ScheduledFBO, buildFbosById } from "./route-utils";
import { ZONE_CONFIG, type ZoneName } from "./zone-data";
import { formatDate, todayISO } from "@/lib/utils";
import ScheduleModal from "./ScheduleModal";

export default function SchedulesTab({ data }: { data: RoutesData }) {
  const {
    schedules,
    routeDefinitions,
    routeStops,
    pickers,
    fbos,
    zones,
    isPending,
    deleteSchedule,
    dispatchZone,
    executeSchedulesForDate,
  } = data;

  const today = todayISO();
  const fbosById = useMemo(() => buildFbosById(fbos), [fbos]);
  const zonesById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const routeDefsById = useMemo(() => new Map(routeDefinitions.map((rd) => [rd.id, rd])), [routeDefinitions]);

  // Filters & Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "today" | "executed" | "missed">("all");
  const [filterZoneId, setFilterZoneId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

  // Sorting & Filtering Schedules
  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((s) => {
        const route = routeDefsById.get(s.route_definition_id);
        const picker = pickers.find((p) => p.id === s.picker_id);

        const matchesSearch =
          !searchQuery ||
          (route?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          (picker?.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          s.scheduled_date.includes(searchQuery);

        if (!matchesSearch) return false;

        if (filterZoneId && route?.zone_id !== filterZoneId) return false;

        const isPast = s.scheduled_date < today;
        const isToday = s.scheduled_date === today;

        if (statusFilter === "executed") return s.is_executed;
        if (statusFilter === "upcoming") return !s.is_executed && s.scheduled_date > today;
        if (statusFilter === "today") return !s.is_executed && isToday;
        if (statusFilter === "missed") return !s.is_executed && isPast;

        return true;
      })
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [schedules, routeDefsById, pickers, searchQuery, filterZoneId, statusFilter, today]);

  // Stats
  const stats = useMemo(() => {
    let upcoming = 0;
    let scheduledToday = 0;
    let executed = 0;
    let missed = 0;

    schedules.forEach((s) => {
      const isPast = s.scheduled_date < today;
      const isToday = s.scheduled_date === today;

      if (s.is_executed) executed++;
      else if (isToday) scheduledToday++;
      else if (isPast) missed++;
      else upcoming++;
    });

    return { total: schedules.length, upcoming, scheduledToday, executed, missed };
  }, [schedules, today]);

  function toggleExpand(id: string) {
    setExpandedScheduleId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header / Quick Actions ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <AlarmClock className="w-5 h-5 text-emerald-600" />
            Advance Route Schedules
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Pre-assign specific routes to future dates. Schedules automatically dispatch when the date arrives.
          </p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-600/20 transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Schedule Route for Date
        </button>
      </div>

      {/* ── KPI Ribbon ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider">All Scheduled</span>
            <CalendarDays className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 font-mono">{stats.total}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold font-mono text-emerald-700 uppercase tracking-wider">Upcoming</span>
            <AlarmClock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 font-mono">{stats.upcoming}</p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold font-mono text-amber-700 uppercase tracking-wider">Due Today</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 font-mono">{stats.scheduledToday}</p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold font-mono text-blue-700 uppercase tracking-wider">Dispatched</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900 font-mono">{stats.executed}</p>
        </div>
      </div>

      {/* ── Filters & Search ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xl shadow-gray-200/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {(["all", "upcoming", "today", "executed", "missed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/80"
              }`}
            >
              {st === "today" ? "Due Today" : st}
            </button>
          ))}
        </div>

        {/* Zone & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search route or picker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <select
            value={filterZoneId}
            onChange={(e) => setFilterZoneId(e.target.value)}
            className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name} Zone</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Schedules List ────────────────────────────────────────────────────── */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xl shadow-gray-200/50">
          <CalendarDays className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="font-black text-gray-700 text-lg">No Schedules Found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto font-medium">
            {statusFilter !== "all"
              ? `No schedules match the "${statusFilter}" filter.`
              : "Click '+ Schedule Route for Date' to assign a route in advance."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSchedules.map((schedule) => {
            const route = routeDefsById.get(schedule.route_definition_id);
            const picker = pickers.find((p) => p.id === schedule.picker_id);
            const zone = route?.zone_id ? zonesById.get(route.zone_id) : null;
            const zoneConfig = zone ? ZONE_CONFIG[zone.name as ZoneName] : null;

            const isPast = schedule.scheduled_date < today;
            const isToday = schedule.scheduled_date === today;
            const isExpanded = expandedScheduleId === schedule.id;

            // Resolve FBO objects for stops
            const scheduledFboList = schedule.fbo_ids
              .map((id) => fbosById.get(id))
              .filter((f): f is ScheduledFBO => !!f);

            return (
              <div
                key={schedule.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 hover:border-gray-200 transition-all overflow-hidden flex flex-col"
              >
                {/* Zone Color Bar */}
                {zoneConfig && <div className="h-1 w-full" style={{ background: zoneConfig.hex }} />}

                <div className="p-5 flex-1 space-y-4">
                  {/* Top Badges & Date */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-black text-slate-900 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                          {formatDate(schedule.scheduled_date)}
                        </span>

                        {schedule.is_executed ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Dispatched
                          </span>
                        ) : isToday ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Due Today
                          </span>
                        ) : isPast ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Missed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <AlarmClock className="w-3 h-3 text-emerald-600" /> Upcoming
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-gray-900 text-base">{route?.name ?? "Unknown Route"}</h3>
                    </div>

                    {/* Zone pill */}
                    {zoneConfig && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0"
                        style={{ background: zoneConfig.hex + "18", color: zoneConfig.hex, borderColor: zoneConfig.hex + "40" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: zoneConfig.hex }} />
                        {zone?.name}
                      </span>
                    )}
                  </div>

                  {/* Picker & Details */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Picker</p>
                      <p className="font-bold text-gray-800 mt-0.5 truncate flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {picker?.profile?.full_name ?? "Unassigned"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stops Count</p>
                      <p className="font-bold text-gray-800 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {schedule.fbo_ids.length} Stops
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {schedule.notes && (
                    <p className="text-xs text-gray-500 bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl italic">
                      &quot;{schedule.notes}&quot;
                    </p>
                  )}

                  {/* Collapsible Stop List */}
                  <div>
                    <button
                      onClick={() => toggleExpand(schedule.id)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors py-1"
                    >
                      <span>{isExpanded ? "Hide Stops" : `View ${schedule.fbo_ids.length} Scheduled Stops`}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-2 bg-gray-50">
                        {scheduledFboList.map((fbo, idx) => (
                          <div key={fbo.id} className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-gray-100 text-xs">
                            <span className="font-semibold text-gray-800 truncate">
                              {idx + 1}. {fbo.business_name}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium truncate max-w-[120px]">
                              {fbo.address || "No address"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    disabled={isPending(`delete-schedule-${schedule.id}`)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200 transition-all flex items-center gap-1.5 disabled:opacity-40"
                    title="Delete schedule"
                  >
                    {isPending(`delete-schedule-${schedule.id}`) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Cancel
                  </button>

                  {!schedule.is_executed && route && schedule.picker_id && (
                    <button
                      onClick={async () => {
                        await dispatchZone(route, schedule.picker_id!, schedule.fbo_ids);
                      }}
                      disabled={isPending(`dispatch-${route.id}`)}
                      className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {isPending(`dispatch-${route.id}`) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Dispatch Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          data={data}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
}
