"use client";

import { useMemo, useState } from "react";
import {
  Users, CheckCircle2, Clock, Calendar, AlertCircle, ShieldAlert,
  Building2, Home, Download, Settings, Check, X, Search, Filter,
  Plus, Edit2, Loader2, ArrowRightLeft, Sparkles, MapPin, Award, RefreshCw
} from "lucide-react";
import type { AttendanceData } from "./use-attendance-data";
import { formatDate } from "@/lib/utils";
import { formatDistance } from "@/lib/geo-utils";
import type { OfficeLocation, StaffSchedule, LeaveCategory, LeaveQuota } from "@/lib/types";
import StaffCalendarInspector from "@/components/attendance/StaffCalendarInspector";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminAttendanceView({ data }: { data: AttendanceData }) {
  const {
    today,
    currentUser,
    allProfiles,
    teamTodayAttendance,
    allLeaveRequests,
    allSwitchRequests,
    officeLocations,
    leaveQuotas,
    allStaffSchedules,
    teamAttendanceHistory,
    actionPending,
    refetch,
    reviewLeaveRequest,
    reviewSwitchRequest,
    reviewFlaggedCheckIn,
    saveOfficeLocation,
    updateLeaveQuota,
    updateStaffSchedule,
    toggleAttendanceEnabled,
  } = data;

  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const [activeTab, setActiveTab] = useState<"overview" | "history" | "calendar" | "settings">("overview");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "staff" | "picker">("");
  const [dateFilter, setDateFilter] = useState(today);

  // Settings State
  const [editingOffice, setEditingOffice] = useState<Partial<OfficeLocation> | null>(null);

  // ── Pending Queue Items ──────────────────────────────────────────────
  const pendingLeaves = useMemo(
    () => allLeaveRequests.filter((r) => r.status === "pending"),
    [allLeaveRequests]
  );
  const pendingSwitches = useMemo(
    () => allSwitchRequests.filter((r) => r.status === "pending"),
    [allSwitchRequests]
  );
  const pendingFlaggedCheckIns = useMemo(
    () => teamTodayAttendance.filter((r) => r.is_flagged && r.approval_status === "pending"),
    [teamTodayAttendance]
  );

  const totalPendingCount = pendingLeaves.length + pendingSwitches.length + pendingFlaggedCheckIns.length;

  // ── Stats Summary ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let wfo = 0;
    let wfh = 0;
    let leave = 0;
    let flagged = 0;

    teamTodayAttendance.forEach((rec) => {
      if (rec.is_flagged) flagged++;
      if (rec.work_mode === "wfo") wfo++;
      else if (rec.work_mode === "wfh") wfh++;
      else if (rec.work_mode === "leave" || rec.work_mode === "holiday") leave++;
    });

    const trackingProfiles = allProfiles.filter((p) => p.role !== "admin" && p.is_attendance_enabled !== false);
    const activePickers = trackingProfiles.filter((p) => p.role === "picker").length;
    const activeStaff = trackingProfiles.filter((p) => p.role !== "picker").length;
    const unmarked = Math.max(0, trackingProfiles.length - teamTodayAttendance.filter((r) => r.profile?.role !== "admin").length);

    return { total: trackingProfiles.length, wfo, wfh, leave, flagged, unmarked, activePickers, activeStaff };
  }, [allProfiles, teamTodayAttendance]);

  // ── Filtered History Records ─────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    return teamAttendanceHistory.filter((rec) => {
      const prof = rec.profile;
      if (prof?.role === "admin") return false; // Super Admin is default exempt
      const matchesSearch =
        !searchQuery ||
        prof?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof?.username?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = !roleFilter || prof?.role === roleFilter;
      const matchesDate = !dateFilter || rec.attendance_date === dateFilter;

      return matchesSearch && matchesRole && matchesDate;
    });
  }, [teamAttendanceHistory, searchQuery, roleFilter, dateFilter]);

  // ── Export CSV Function ──────────────────────────────────────────────
  function exportAttendanceCSV() {
    const validHistory = teamAttendanceHistory.filter((rec) => rec.profile?.role !== "admin");
    if (validHistory.length === 0) return;

    const headers = ["Date", "Full Name", "Username", "Role", "Work Mode", "Check In", "Check Out", "Distance (m)", "Flagged", "Approval Status"];
    const rows = validHistory.map((rec) => [
      rec.attendance_date,
      `"${rec.profile?.full_name || "Unknown"}"`,
      rec.profile?.username || "",
      rec.profile?.role || "",
      rec.work_mode,
      rec.check_in_at ? new Date(rec.check_in_at).toLocaleTimeString() : "",
      rec.check_out_at ? new Date(rec.check_out_at).toLocaleTimeString() : "",
      rec.distance_meters != null ? rec.distance_meters : "",
      rec.is_flagged ? "YES" : "NO",
      rec.approval_status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mellod_attendance_report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Page Header & Navigation Tabs ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Team Attendance &amp; Leave</h1>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Real-time staff/picker geofenced check-ins, leave approvals, and office geofence settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>

          <button
            onClick={exportAttendanceCSV}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            CSV Report
          </button>
        </div>
      </div>

      {/* ── KPI Ribbon (Six Small Containers) ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Team</span>
          <p className="text-2xl font-black text-gray-900 font-mono mt-1">{stats.total}</p>
          <span className="text-[10px] text-gray-500 font-medium">{stats.activeStaff} Staff · {stats.activePickers} Pickers</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">WFO (Office)</span>
          <p className="text-2xl font-black text-emerald-900 font-mono mt-1">{stats.wfo}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Checked in at site</span>
        </div>

        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">WFH (Home)</span>
          <p className="text-2xl font-black text-teal-900 font-mono mt-1">{stats.wfh}</p>
          <span className="text-[10px] text-teal-600 font-medium">Approved remote</span>
        </div>

        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">On Leave</span>
          <p className="text-2xl font-black text-purple-900 font-mono mt-1">{stats.leave}</p>
          <span className="text-[10px] text-purple-600 font-medium">Approved time-off</span>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Flagged GPS</span>
          <p className="text-2xl font-black text-amber-900 font-mono mt-1">{stats.flagged}</p>
          <span className="text-[10px] text-amber-600 font-medium">Outside geofence</span>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Not Marked</span>
          <p className="text-2xl font-black text-gray-800 font-mono mt-1">{stats.unmarked}</p>
          <span className="text-[10px] text-gray-400 font-medium">Pending check-in</span>
        </div>
      </div>

      {/* ── Main Navigation Tab Bar (Smooth Spring Pill Slider) ──────────────── */}
      <div className="flex bg-slate-100/90 p-1.5 rounded-2xl gap-1.5 border border-slate-200/80 overflow-x-auto relative">
        {[
          { id: "overview", label: `Overview & Queue (${totalPendingCount})` },
          { id: "history", label: "Attendance Logs" },
          { id: "calendar", label: "Staff Calendar & Quotas" },
          { id: "settings", label: "Settings" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "overview" | "history" | "calendar" | "settings")}
            className={`relative z-10 flex-1 py-2.5 px-4 text-xs font-extrabold rounded-xl transition-colors whitespace-nowrap text-center cursor-pointer ${
              activeTab === tab.id ? "text-emerald-950 font-black" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="adminAttendanceTabActivePill"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/60"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >

      {/* ── TAB 1: OVERVIEW & PENDING APPROVALS QUEUE ──────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Pending Approvals Queue */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl shadow-gray-200/50 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Pending Approvals Queue ({totalPendingCount})
              </h2>
            </div>

            {totalPendingCount === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-gray-100 rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-gray-700 text-sm">All Catch Up!</p>
                <p className="text-xs text-gray-400 mt-0.5">No pending leave, mode switch, or flagged check-in requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Emergency Leave Requests (Top Red Priority) */}
                {pendingLeaves.filter((l) => l.request_type === "emergency").map((req) => (
                  <div key={req.id} className="p-4 bg-red-50/80 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-600 text-white animate-pulse">
                          🚨 Emergency Request
                        </span>
                        <span className="text-xs font-black text-gray-900">{req.profile?.full_name || "Unknown User"}</span>
                        <span className="text-[10px] font-bold text-gray-500">({req.profile?.role})</span>
                      </div>
                      <p className="text-xs text-gray-700 font-semibold">
                        {req.leave_category} Leave: {formatDate(req.start_date)} to {formatDate(req.end_date)} ({req.days_count} day(s))
                      </p>
                      {req.reason && <p className="text-xs text-gray-600 italic">&quot;{req.reason}&quot;</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => reviewLeaveRequest(req.id, false, "Admin rejected")}
                        disabled={actionPending}
                        className="px-3.5 py-1.5 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-100 text-xs font-bold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => reviewLeaveRequest(req.id, true)}
                        disabled={actionPending}
                        className="px-4 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-black shadow-md shadow-red-600/20"
                      >
                        Approve Emergency Leave
                      </button>
                    </div>
                  </div>
                ))}

                {/* 2. Flagged Check-Ins (Outside Geofence) */}
                {pendingFlaggedCheckIns.map((rec) => (
                  <div key={rec.id} className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500 text-white flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Flagged Geofence
                        </span>
                        <span className="text-xs font-black text-gray-900">{rec.profile?.full_name || "Unknown Picker"}</span>
                      </div>
                      <p className="text-xs text-amber-900 font-semibold">
                        Checked in at {rec.check_in_at ? new Date(rec.check_in_at).toLocaleTimeString() : "N/A"} — {rec.flagged_reason || `${rec.distance_meters}m from office`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => reviewFlaggedCheckIn(rec.id, false)}
                        disabled={actionPending}
                        className="px-3 py-1.5 rounded-xl border border-amber-300 text-amber-800 bg-white hover:bg-amber-100 text-xs font-bold"
                      >
                        Reject Check-in
                      </button>
                      <button
                        onClick={() => reviewFlaggedCheckIn(rec.id, true)}
                        disabled={actionPending}
                        className="px-4 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-black shadow-md shadow-amber-600/20"
                      >
                        Approve Check-in
                      </button>
                    </div>
                  </div>
                ))}

                {/* 3. Pre-Approved Leave Requests */}
                {pendingLeaves.filter((l) => l.request_type !== "emergency").map((req) => (
                  <div key={req.id} className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                          Pre-Approved Request
                        </span>
                        <span className="text-xs font-black text-gray-900">{req.profile?.full_name || "Unknown User"}</span>
                        <span className="text-[10px] text-gray-500">({req.profile?.role})</span>
                      </div>
                      <p className="text-xs text-gray-700 font-semibold">
                        {req.leave_category} Leave: {formatDate(req.start_date)} to {formatDate(req.end_date)} ({req.days_count} day(s))
                      </p>
                      {req.reason && <p className="text-xs text-gray-500 italic">&quot;{req.reason}&quot;</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => reviewLeaveRequest(req.id, false, "Admin rejected")}
                        disabled={actionPending}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 text-xs font-bold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => reviewLeaveRequest(req.id, true)}
                        disabled={actionPending}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-extrabold shadow-md shadow-emerald-600/20"
                      >
                        Approve Leave
                      </button>
                    </div>
                  </div>
                ))}

                {/* 4. WFO/WFH Switch Requests */}
                {pendingSwitches.map((req) => (
                  <div key={req.id} className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                          WFO ↔ WFH Switch
                        </span>
                        <span className="text-xs font-black text-gray-900">{req.profile?.full_name || "Unknown Staff"}</span>
                      </div>
                      <p className="text-xs text-gray-700 font-semibold">
                        Requested {req.requested_mode.toUpperCase()} on {formatDate(req.switch_date)}
                      </p>
                      {req.reason && <p className="text-xs text-gray-500 italic">&quot;{req.reason}&quot;</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => reviewSwitchRequest(req.id, false)}
                        disabled={actionPending}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 text-xs font-bold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => reviewSwitchRequest(req.id, true)}
                        disabled={actionPending}
                        className="px-4 py-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-xs font-extrabold shadow-md shadow-teal-600/20"
                      >
                        Approve Switch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Team Roster List */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl shadow-gray-200/50 space-y-4">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Today&apos;s Team Attendance Status ({formatDate(today)})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allProfiles
                .filter((prof) => prof.role !== "admin")
                .map((prof) => {
                  const rec = teamTodayAttendance.find(
                    (r) =>
                      r.profile_id?.toLowerCase() === prof.id?.toLowerCase() ||
                      r.profile?.id?.toLowerCase() === prof.id?.toLowerCase()
                  );
                const isPicker = prof.role === "picker";

                return (
                  <div key={prof.id} className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{prof.full_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gray-200 text-gray-700">
                          {prof.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400">@{prof.username}</p>
                    </div>

                    <div>
                      {rec ? (
                        rec.is_flagged ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                            Flagged ({rec.distance_meters}m)
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            rec.work_mode === "wfo" ? "bg-emerald-100 text-emerald-800"
                            : rec.work_mode === "wfh" ? "bg-teal-100 text-teal-800"
                            : "bg-purple-100 text-purple-800"
                          }`}>
                            {rec.work_mode}
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-200 text-gray-500">
                          {prof.is_attendance_enabled === false ? "Exempted" : "Not Marked"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ATTENDANCE LOGS & HISTORY ───────────────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl shadow-gray-200/50 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search staff or picker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-gray-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none cursor-pointer"
              />
              <button
                onClick={() => setDateFilter("")}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                Clear Date
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Work Mode</th>
                  <th className="p-3">Check In</th>
                  <th className="p-3">Check Out</th>
                  <th className="p-3">Geofence Distance</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3 font-bold font-mono text-gray-800">{rec.attendance_date}</td>
                    <td className="p-3 font-bold text-gray-900">{rec.profile?.full_name || "Unknown"}</td>
                    <td className="p-3 capitalize text-gray-500">{rec.profile?.role}</td>
                    <td className="p-3 uppercase font-bold text-emerald-700">{rec.work_mode}</td>
                    <td className="p-3 font-mono">{rec.check_in_at ? new Date(rec.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="p-3 font-mono">{rec.check_out_at ? new Date(rec.check_out_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="p-3 font-mono">{formatDistance(rec.distance_meters)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                        rec.is_flagged ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {rec.is_flagged ? "Flagged" : rec.approval_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: STAFF CALENDAR & LEAVE QUOTAS INSPECTOR ──────────────── */}
      {activeTab === "calendar" && (
        <StaffCalendarInspector
          allProfiles={allProfiles}
          teamAttendanceHistory={teamAttendanceHistory}
          allLeaveRequests={allLeaveRequests}
          leaveQuotas={leaveQuotas}
          currentUser={currentUser}
        />
      )}

      {/* ── TAB 4: SYSTEM SETTINGS PANEL ────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Employee Attendance Access Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl shadow-gray-200/50 space-y-4">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Staff Check-In Access Controls
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Enable or exempt daily check-in requirements per staff member or picker. Exempted staff will not be required to log daily attendance. (Super Admin is strictly exempted by default).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allProfiles.map((prof) => {
                const isEnabled = prof.is_attendance_enabled !== false;

                return (
                  <div key={prof.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-xs">{prof.full_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gray-200 text-gray-700">
                          {prof.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">@{prof.username}</p>
                    </div>

                    <button
                      onClick={() => toggleAttendanceEnabled(prof.id, !isEnabled)}
                      disabled={actionPending}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        isEnabled
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                          : "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                      }`}
                    >
                      {isEnabled ? "✓ Enabled" : "🚫 Exempted"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Office Locations Manager */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xl shadow-gray-200/50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Office Geofence Locations
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure office sites and allowed check-in radius (default 100 meters).
                </p>
              </div>

              <button
                onClick={() => setEditingOffice({ name: "", latitude: 12.9716, longitude: 77.5946, allowed_radius_meters: 100, is_active: true })}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                + Add Location
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {officeLocations.map((loc) => (
                <div key={loc.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-gray-900 text-sm">{loc.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${loc.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"}`}>
                      {loc.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    Lat: {loc.latitude}, Lng: {loc.longitude}
                  </p>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60">
                    <span className="font-bold text-gray-700">Radius: {loc.allowed_radius_meters}m</span>
                    <button onClick={() => setEditingOffice(loc)} className="text-emerald-600 font-bold hover:underline">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Office Modal */}
          {editingOffice && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                <h3 className="font-black text-gray-900 text-base">Office Location</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveOfficeLocation(editingOffice).then(() => setEditingOffice(null));
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Location Name</label>
                    <input
                      type="text"
                      required
                      value={editingOffice.name || ""}
                      onChange={(e) => setEditingOffice({ ...editingOffice, name: e.target.value })}
                      className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl p-2.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={editingOffice.latitude || ""}
                        onChange={(e) => setEditingOffice({ ...editingOffice, latitude: parseFloat(e.target.value) })}
                        className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl p-2.5"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={editingOffice.longitude || ""}
                        onChange={(e) => setEditingOffice({ ...editingOffice, longitude: parseFloat(e.target.value) })}
                        className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl p-2.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Allowed Radius (Meters)</label>
                    <input
                      type="number"
                      required
                      value={editingOffice.allowed_radius_meters || 100}
                      onChange={(e) => setEditingOffice({ ...editingOffice, allowed_radius_meters: parseInt(e.target.value) })}
                      className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl p-2.5"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="locActive"
                      checked={editingOffice.is_active ?? true}
                      onChange={(e) => setEditingOffice({ ...editingOffice, is_active: e.target.checked })}
                    />
                    <label htmlFor="locActive" className="text-xs font-bold text-gray-700">Active Location</label>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button type="button" onClick={() => setEditingOffice(null)} className="flex-1 py-2 rounded-xl border text-xs font-bold">Cancel</button>
                    <button type="submit" disabled={actionPending} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
