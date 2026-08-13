"use client";

import { useState } from "react";
import {
  MapPin, CheckCircle2, Clock, Calendar, AlertCircle, ShieldAlert,
  Compass, Plus, RefreshCw, Send, ChevronRight, Award, Loader2, LogOut, ArrowRight
} from "lucide-react";
import type { AttendanceData } from "./use-attendance-data";
import { formatDistance } from "@/lib/geo-utils";
import { formatDate } from "@/lib/utils";
import type { LeaveCategory, LeaveType } from "@/lib/types";

export default function PickerAttendanceView({ data }: { data: AttendanceData }) {
  const {
    currentUser,
    todayAttendance,
    today,
    officeLocations,
    userAttendanceHistory,
    userLeaveRequests,
    leaveBalances,
    actionPending,
    checkIn,
    checkOut,
    submitLeaveRequest,
  } = data;

  const activeOffice = officeLocations.find((o) => o.is_active) || officeLocations[0];

  // Geolocation state
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Leave Modal State
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [requestType, setRequestType] = useState<LeaveType>("pre_approved");
  const [category, setCategory] = useState<LeaveCategory>("CL");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");

  // Get GPS Coordinates
  function acquireGPS(onSuccess: (coords: { lat: number; lng: number }) => void) {
    setGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your device browser.");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGettingLocation(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);
        onSuccess(coords);
      },
      (err) => {
        setGettingLocation(false);
        console.error("GPS error:", err);
        let msg = "Could not fetch GPS location. Please check location permissions.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location access denied. Please enable GPS in browser settings.";
        }
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function handleCheckInClick() {
    acquireGPS((coords) => {
      checkIn({ lat: coords.lat, lng: coords.lng, workMode: "wfo" });
    });
  }

  function handleCheckOutClick() {
    acquireGPS((coords) => {
      checkOut({ lat: coords.lat, lng: coords.lng });
    });
  }

  function handleHolidaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    submitLeaveRequest({
      requestType,
      leaveCategory: category,
      startDate,
      endDate,
      reason,
    }).then(() => {
      setShowHolidayModal(false);
      setReason("");
    });
  }

  const isCheckedIn = !!todayAttendance?.check_in_at || todayAttendance?.work_mode === "leave" || todayAttendance?.work_mode === "holiday";
  const isCheckedOut = !!todayAttendance?.check_out_at;

  return (
    <div className="space-y-5 pb-16 max-w-md mx-auto animate-fade-in">
      {/* ── 1. USER PROFILE CARD ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-600/20 uppercase">
              {currentUser?.full_name ? currentUser.full_name.charAt(0) : "P"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-gray-900">{currentUser?.full_name || "Picker Profile"}</h2>
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                  Picker
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">@{currentUser?.username || "driver"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Mobile Page Header ─────────────────────────────────────────── */}
      <div className={`rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all ${
        isCheckedIn ? "bg-slate-900 text-white" : "bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white"
      }`}>
        <div className="flex items-center justify-between gap-3 relative z-10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Field Check-In</h1>
              <p className="text-xs text-amber-100 font-semibold mt-0.5">
                {activeOffice ? `${activeOffice.name} (${activeOffice.allowed_radius_meters || 100}m Radius)` : "Geofenced Check-In"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowHolidayModal(true)}
            disabled={!isCheckedIn}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              isCheckedIn
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-black/20 text-white/50 cursor-not-allowed border border-white/10"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Holiday
          </button>
        </div>

        {/* Status Card Banner */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Today&apos;s Status ({formatDate(today)})</span>
            {isCheckedOut ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Completed
              </span>
            ) : isCheckedIn ? (
              todayAttendance?.is_flagged ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Flagged Check-in
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> On Duty
                </span>
              )
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                Not Checked In
              </span>
            )}
          </div>

          {isCheckedIn && (
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-700/60">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">In Time</span>
                <span className="font-mono font-extrabold text-slate-200">
                  {new Date(todayAttendance.check_in_at!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Distance</span>
                <span className="font-mono font-extrabold text-slate-200">
                  {formatDistance(todayAttendance.distance_meters)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Check-in/Check-out Action Button ─────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-4">
        {locationError && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{locationError}</span>
          </div>
        )}

        {!isCheckedIn ? (
          <button
            onClick={handleCheckInClick}
            disabled={actionPending || gettingLocation}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-base shadow-xl shadow-emerald-600/30 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {gettingLocation ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Acquiring GPS Location...</span>
              </div>
            ) : actionPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting Check-In...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>CHECK IN AT OFFICE</span>
                </div>
                <span className="text-[11px] text-emerald-200 font-normal">
                  Captures GPS &amp; validates office geofence
                </span>
              </>
            )}
          </button>
        ) : !isCheckedOut ? (
          <button
            onClick={handleCheckOutClick}
            disabled={actionPending || gettingLocation}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-950 hover:from-slate-900 hover:to-black text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {gettingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : actionPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                <span>CHECK OUT FOR TODAY</span>
              </>
            )}
          </button>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
            <h4 className="font-extrabold text-emerald-900 text-sm">Attendance Completed Today</h4>
            <p className="text-xs text-emerald-700 font-medium">
              Checked out at {new Date(todayAttendance.check_out_at!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}

        {/* Flagged Check-in Notice if outside radius */}
        {todayAttendance?.is_flagged && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1 text-amber-900">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Flagged Check-In (Pending Review)</span>
            </div>
            <p className="text-[11px] text-amber-800 font-medium">
              {todayAttendance.flagged_reason || "Check-in recorded outside geofence. Sent to admin queue for sign-off."}
            </p>
          </div>
        )}
      </div>

      {/* ── Holiday Quota Balances ─────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-emerald-600" />
          Holiday Balance Quotas ({new Date().getFullYear()})
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {leaveBalances.filter((b) => b.category !== "PUBLIC").map((b) => (
            <div key={b.category} className="bg-gray-50 border border-gray-200/70 p-3 rounded-2xl text-center">
              <span className="text-[10px] font-extrabold text-gray-400 block uppercase">
                {b.category === "CL" ? "Casual" : b.category === "SL" ? "Sick" : "Earned"} ({b.category})
              </span>
              <p className="text-lg font-black text-gray-900 font-mono mt-0.5">{b.remaining}</p>
              <span className="text-[10px] text-gray-500 font-medium">{b.used} used / {b.annual}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Attendance & Holiday Requests ──────────────────────── */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-teal-600" />
          Recent Holiday Requests
        </h3>

        {userLeaveRequests.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2 text-center">No holiday requests filed yet.</p>
        ) : (
          <div className="space-y-2">
            {userLeaveRequests.slice(0, 4).map((req) => (
              <div key={req.id} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{formatDate(req.start_date)}</span>
                    {req.request_type === "emergency" && (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-red-100 text-red-700 rounded">
                        Emergency
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{req.leave_category} · {req.days_count} day(s)</p>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize ${
                  req.status === "approved" ? "bg-emerald-100 text-emerald-800"
                  : req.status === "rejected" ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Request Holiday Modal ─────────────────────────────────────── */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Request Holiday
              </h3>
              <button onClick={() => setShowHolidayModal(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleHolidaySubmit} className="space-y-3.5">
              {/* Type Switcher */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Request Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType("pre_approved")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      requestType === "pre_approved"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Pre-approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType("emergency")}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      requestType === "emergency"
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Emergency
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LeaveCategory)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900"
                >
                  <option value="CL">Casual Holiday (CL)</option>
                  <option value="SL">Sick Holiday (SL)</option>
                  <option value="EL">Earned Holiday (EL)</option>
                </select>
              </div>

              {/* Date Range */}
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

              {/* Reason */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State reason for holiday..."
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
