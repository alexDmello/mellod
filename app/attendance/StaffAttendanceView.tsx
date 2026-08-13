"use client";

import { useState } from "react";
import {
  Building2, Home, CheckCircle2, Clock, Calendar, AlertCircle, AlertTriangle, Plus,
  RefreshCw, ArrowRightLeft, Loader2, LogOut, Award,
  User, Mail, Phone, Lock, Unlock, ShieldCheck, BadgeCheck, MapPin,
  FileText, Activity, CalendarDays
} from "lucide-react";
import type { AttendanceData } from "./use-attendance-data";
import { formatDate } from "@/lib/utils";
import type { LeaveCategory, LeaveType, WorkMode } from "@/lib/types";

export default function StaffAttendanceView({ data }: { data: AttendanceData }) {
  const {
    currentUser,
    todayAttendance,
    today,
    expectedModeToday,
    userAttendanceHistory,
    userLeaveRequests,
    userSwitchRequests,
    leaveBalances,
    staffSchedule,
    actionPending,
    checkIn,
    checkOut,
    submitLeaveRequest,
    submitModeSwitchRequest,
  } = data;

  const [selectedMode, setSelectedMode] = useState<WorkMode>(expectedModeToday);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [requestType, setRequestType] = useState<LeaveType>("pre_approved");
  const [category, setCategory] = useState<LeaveCategory>("CL");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");

  // Switch Mode Modal State
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchDate, setSwitchDate] = useState(today);
  const [requestedMode, setRequestedMode] = useState<"wfo" | "wfh">("wfh");
  const [switchReason, setSwitchReason] = useState("");

  const isWfhAllowedToday = expectedModeToday === "wfh";

  function handleCheckIn() {
    setLocationError(null);
    if (selectedMode === "wfo") {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser. Cannot verify WFO location.");
        return;
      }
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          checkIn({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            workMode: "wfo",
          });
        },
        (err) => {
          setIsLocating(false);
          console.warn("Geolocation error:", err);
          if (err.code === err.PERMISSION_DENIED) {
            setLocationError("Location access denied. Please enable GPS permissions in your browser settings, then try again.");
          } else if (err.code === err.TIMEOUT) {
            setLocationError("GPS location timed out. Please check your signal and try again.");
          } else {
            setLocationError("Could not fetch GPS location. Please enable location access and try again.");
          }
          // Do NOT call checkIn with 0,0 — WFO requires verified coordinates
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      checkIn({ lat: 0, lng: 0, workMode: "wfh" });
    }
  }

  function handleCheckOut() {
    checkOut({ lat: 0, lng: 0 });
  }

  function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    submitLeaveRequest({
      requestType,
      leaveCategory: category,
      startDate,
      endDate,
      reason,
    }).then(() => {
      setShowLeaveModal(false);
      setReason("");
    });
  }

  function handleSwitchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!switchReason.trim()) return;
    submitModeSwitchRequest({
      switchDate,
      requestedMode,
      reason: switchReason,
    }).then(() => {
      setShowSwitchModal(false);
      setSwitchReason("");
    });
  }

  // Attendance Status Helpers
  const isCheckedIn = !!todayAttendance?.check_in_at || todayAttendance?.work_mode === "leave" || todayAttendance?.work_mode === "holiday";
  const isCheckedOut = !!todayAttendance?.check_out_at;
  const isAttendanceEnabled = currentUser?.is_attendance_enabled !== false;

  const totalRemainingLeaveDays = leaveBalances.reduce((sum, b) => sum + b.remaining, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-16 font-sans text-gray-900">
      
      {/* ── Top Header Toolbar ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">My Profile &amp; Workspace</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
              {currentUser?.role === "sub_admin" ? "Sub-Admin" : currentUser?.role || "Staff"}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Manage daily check-ins, view leave balance quotas, and request work mode schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSwitchModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-teal-600" />
            <span>Switch Mode</span>
          </button>

          <button
            onClick={() => setShowLeaveModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* ── Top Executive KPI Cards Row ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Today's Shift Status */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Today&apos;s Attendance</span>
            {isCheckedOut ? (
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            ) : isCheckedIn ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <p className="text-lg font-bold text-gray-900">
            {isCheckedOut
              ? "Completed"
              : isCheckedIn
              ? `Checked In (${todayAttendance?.work_mode?.toUpperCase()})`
              : "Pending Check-In"}
          </p>
          <p className="text-[11px] text-gray-400">
            {todayAttendance?.check_in_at
              ? `In at ${new Date(todayAttendance.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : "Mark attendance to begin shift"}
          </p>
        </div>

        {/* KPI 2: Assigned Mode Today */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Assigned Shift Today</span>
            {expectedModeToday === "wfo" ? (
              <Building2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Home className="w-4 h-4 text-teal-600" />
            )}
          </div>
          <p className="text-lg font-bold text-gray-900 uppercase">
            {expectedModeToday} Mode
          </p>
          <p className="text-[11px] text-gray-400">
            {isWfhAllowedToday ? "WFH approved for today" : "Scheduled for Office (WFO)"}
          </p>
        </div>

        {/* KPI 3: Remaining Leave Quota */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Available Leave Quotas</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">
            {totalRemainingLeaveDays} Days
          </p>
          <p className="text-[11px] text-gray-400">
            Across CL, SL, EL &amp; Public Holidays
          </p>
        </div>

        {/* KPI 4: Office Location Base */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Office Base Station</span>
            <MapPin className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-lg font-bold text-gray-900">
            Bangalore HQ
          </p>
          <p className="text-[11px] text-gray-400">
            100m Geofence Radius
          </p>
        </div>
      </div>

      {/* ── Main Layout Grid (8 Cols Left / 4 Cols Right) ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── LEFT MAIN WORKSTATION (8 Cols) ─────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. Profile Details & Meta Info Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-black text-lg flex items-center justify-center uppercase shadow-sm">
                  {currentUser?.full_name ? currentUser.full_name.charAt(0) : "U"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">{currentUser?.full_name || "Staff Profile"}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Staff
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">@{currentUser?.username || "user"}</p>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="text-gray-400 block font-medium text-[10px] uppercase">Account Type</span>
                <span className="font-bold text-gray-800 uppercase">{currentUser?.role?.replace("_", " ")}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-gray-400 block font-medium">Email Address</span>
                  <span className="font-semibold text-gray-800 truncate block">{currentUser?.email || "N/A"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Phone Contact</span>
                  <span className="font-semibold text-gray-800 block">{currentUser?.phone || "Not Listed"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Attendance Check-In Panel */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  {!isCheckedIn ? (
                    <>
                      <Lock className="w-4 h-4 text-amber-500" />
                      Daily Attendance Check-In
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 text-emerald-600" />
                      Attendance Unlocked ({todayAttendance?.work_mode?.toUpperCase()})
                    </>
                  )}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {!isCheckedIn
                    ? "Select your work mode and click Check-In to record your attendance for today."
                    : `Check-in recorded at ${todayAttendance?.check_in_at ? new Date(todayAttendance.check_in_at).toLocaleTimeString() : "Today"}`}
                </p>
              </div>

              {isCheckedOut ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                  Shift Concluded
                </span>
              ) : isCheckedIn ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Shift Active
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  Pending Check-In
                </span>
              )}
            </div>

            {!isCheckedIn ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Work Location Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMode("wfo")}
                      className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        selectedMode === "wfo"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      Work From Office (WFO)
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMode("wfh")}
                      className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        selectedMode === "wfh"
                          ? "bg-teal-50 border-teal-500 text-teal-900 shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Home className="w-4 h-4 text-teal-600" />
                      Work From Home (WFH)
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400 font-medium">
                    {selectedMode === "wfo"
                      ? "WFO requires GPS verification within the office geofence."
                      : "WFH selected — no GPS required. Your check-in will be recorded."}
                  </p>
                </div>

                {locationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{locationError}</span>
                  </div>
                )}

                <button
                  onClick={handleCheckIn}
                  disabled={actionPending || isLocating}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying GPS Location...</span>
                    </>
                  ) : actionPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Check-In ({selectedMode.toUpperCase()}) &amp; Unlock Workspace</span>
                    </>
                  )}
                </button>
              </div>
            ) : !isCheckedOut ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between">
                  <div>
                    <p className="font-bold">Checked In: {todayAttendance?.check_in_at ? new Date(todayAttendance.check_in_at).toLocaleTimeString() : "Today"}</p>
                    <p className="text-[11px] text-emerald-700">Location: {todayAttendance?.work_mode?.toUpperCase()} Mode</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>

                <button
                  onClick={handleCheckOut}
                  disabled={actionPending}
                  className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {actionPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Mark Check-Out &amp; Conclude Shift</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 text-center font-semibold">
                ✓ Shift Completed for Today ({formatDate(today)})
              </div>
            )}
          </div>

          {/* 3. My Recent Activity Requests Logs */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              My Request Log
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Leave Applications */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Leave Applications</span>
                {userLeaveRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">No leave requests submitted.</p>
                ) : (
                  userLeaveRequests.slice(0, 3).map((lr) => (
                    <div key={lr.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{lr.leave_category} ({lr.days_count}d)</span>
                          <span className="text-[10px] text-gray-400 uppercase">({lr.request_type})</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{lr.start_date} → {lr.end_date}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        lr.status === "approved" ? "bg-emerald-100 text-emerald-800"
                        : lr.status === "rejected" ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                      }`}>
                        {lr.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Mode Switch Log */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Work Mode Switch Requests</span>
                {userSwitchRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">No mode switch requests submitted.</p>
                ) : (
                  userSwitchRequests.slice(0, 3).map((sr) => (
                    <div key={sr.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">Switch to {sr.requested_mode.toUpperCase()}</p>
                        <p className="text-[10px] text-gray-500">Date: {sr.switch_date}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        sr.status === "approved" ? "bg-emerald-100 text-emerald-800"
                        : sr.status === "rejected" ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                      }`}>
                        {sr.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT SIDEBAR WIDGETS (4 Cols) ─────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">

          {/* 1. Leave Quota Balances Widget */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Leave Balances ({new Date().getFullYear()})
              </h3>
              <span className="text-[10px] font-semibold text-gray-500">Annual Quota</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {leaveBalances.map((b) => (
                <div key={b.category} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">{b.category}</span>
                    <span className="text-[10px] text-gray-400">{b.used}/{b.annual}d</span>
                  </div>

                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (b.used / b.annual) * 100)}%` }}
                    />
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-700">{b.remaining}d left</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Weekly Work Routine */}
          {staffSchedule && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold text-gray-900 block uppercase tracking-wider">Weekly Work Routine</span>
              <div className="grid grid-cols-7 gap-1 text-center font-mono">
                {[
                  { label: "Mon", mode: staffSchedule.monday_mode },
                  { label: "Tue", mode: staffSchedule.tuesday_mode },
                  { label: "Wed", mode: staffSchedule.wednesday_mode },
                  { label: "Thu", mode: staffSchedule.thursday_mode },
                  { label: "Fri", mode: staffSchedule.friday_mode },
                  { label: "Sat", mode: staffSchedule.saturday_mode },
                  { label: "Sun", mode: staffSchedule.sunday_mode },
                ].map((d, i) => (
                  <div key={i} className={`p-2 rounded-lg border text-[10px] font-bold uppercase ${
                    d.mode === "wfo" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-teal-50 border-teal-200 text-teal-800"
                  }`}>
                    <span className="block text-[9px] text-gray-400">{d.label}</span>
                    {d.mode}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. My Attendance Log History */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              Recent Attendance Log
            </h3>

            {userAttendanceHistory.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">No attendance history found.</p>
            ) : (
              <div className="space-y-2">
                {userAttendanceHistory.slice(0, 5).map((rec) => (
                  <div key={rec.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{formatDate(rec.attendance_date)}</p>
                      <p className="text-[10px] text-gray-500">
                        {rec.check_in_at ? new Date(rec.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No Check-in"}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rec.work_mode === "wfo" ? "bg-emerald-100 text-emerald-800"
                      : rec.work_mode === "wfh" ? "bg-teal-100 text-teal-800"
                      : "bg-purple-100 text-purple-800"
                    }`}>
                      {rec.work_mode}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Request Leave Modal ───────────────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Apply for Leave
              </h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Request Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType("pre_approved")}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      requestType === "pre_approved" ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Pre-approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType("emergency")}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      requestType === "emergency" ? "bg-red-600 text-white shadow-sm" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Emergency
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Leave Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LeaveCategory)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900"
                >
                  <option value="CL">Casual Leave (CL)</option>
                  <option value="SL">Sick Leave (SL)</option>
                  <option value="EL">Earned Leave (EL)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl p-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl p-2 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State reason for leave..."
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Request Mode Switch Modal ─────────────────────────────────── */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-teal-600" />
                Switch Work Mode
              </h3>
              <button onClick={() => setShowSwitchModal(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSwitchSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Target Date</label>
                <input
                  type="date"
                  value={switchDate}
                  onChange={(e) => setSwitchDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Requested Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestedMode("wfo")}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      requestedMode === "wfo"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    WFO
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestedMode("wfh")}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      requestedMode === "wfh"
                        ? "bg-teal-50 border-teal-500 text-teal-900 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                  >
                    <Home className="w-3.5 h-3.5 text-teal-600" />
                    WFH
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={switchReason}
                  onChange={(e) => setSwitchReason(e.target.value)}
                  placeholder="Reason for mode switch..."
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSwitchModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-sm hover:bg-teal-700"
                >
                  Submit Switch Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
