"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Award,
  Clock,
  MapPin,
  Building2,
  Home,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  X,
  User,
  Activity,
  FileText,
} from "lucide-react";
import type {
  Profile,
  AttendanceRecord,
  LeaveRequest,
  LeaveQuota,
  LeaveCategory,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface StaffCalendarInspectorProps {
  allProfiles: Profile[];
  teamAttendanceHistory: AttendanceRecord[];
  allLeaveRequests: LeaveRequest[];
  leaveQuotas: LeaveQuota[];
  currentUser: Profile | null;
  initialSelectedUserId?: string;
}

export default function StaffCalendarInspector({
  allProfiles,
  teamAttendanceHistory,
  allLeaveRequests,
  leaveQuotas,
  currentUser,
  initialSelectedUserId,
}: StaffCalendarInspectorProps) {
  // 1. Staff Filter State
  const validProfiles = useMemo(() => {
    // Exclude super admins if desired, but allow viewing all active staff & pickers
    return allProfiles.filter((p) => p.role !== "admin");
  }, [allProfiles]);

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    if (initialSelectedUserId && validProfiles.some((p) => p.id === initialSelectedUserId)) {
      return initialSelectedUserId;
    }
    if (currentUser && currentUser.role !== "admin" && validProfiles.some((p) => p.id === currentUser.id)) {
      return currentUser.id;
    }
    return validProfiles[0]?.id || currentUser?.id || "";
  });

  const selectedStaff = useMemo(() => {
    return allProfiles.find((p) => p.id === selectedUserId) || currentUser;
  }, [allProfiles, selectedUserId, currentUser]);

  // 2. Calendar Month & Year State
  const todayObj = new Date();
  const [currentYear, setCurrentYear] = useState<number>(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayObj.getMonth()); // 0-indexed

  // Day detail popover modal state
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateStr: string;
    attendance: AttendanceRecord | null;
    leave: LeaveRequest | null;
  } | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // 3. Filter Attendance & Leaves for Selected User
  const userAttendanceRecords = useMemo(() => {
    return teamAttendanceHistory.filter((rec) => {
      const recUserId = rec.profile_id || rec.profile?.id;
      return recUserId?.toLowerCase() === selectedUserId?.toLowerCase();
    });
  }, [teamAttendanceHistory, selectedUserId]);

  const userLeaves = useMemo(() => {
    return allLeaveRequests.filter((l) => {
      const leaveUserId = l.profile_id || l.profile?.id;
      return leaveUserId?.toLowerCase() === selectedUserId?.toLowerCase();
    });
  }, [allLeaveRequests, selectedUserId]);

  // 4. Calculate Selected Staff's Leave Quota Balances (Relocated Feature)
  const staffLeaveBalances = useMemo(() => {
    if (!selectedStaff) return [];

    const staffRole = selectedStaff.role === "picker" ? "picker" : "staff";
    const roleQuotas = leaveQuotas.filter((q) => q.role === staffRole);

    const activeLeaves = userLeaves.filter((r) => {
      if (r.status !== "approved") return false;
      const startYear = new Date(r.start_date).getFullYear();
      return startYear === currentYear;
    });

    const usedMap: Record<LeaveCategory, number> = { CL: 0, SL: 0, EL: 0, PUBLIC: 0 };
    activeLeaves.forEach((r) => {
      const cat = r.leave_category as LeaveCategory;
      if (usedMap[cat] !== undefined) {
        usedMap[cat] += Number(r.days_count || 1);
      }
    });

    const categories: LeaveCategory[] = ["CL", "SL", "EL", "PUBLIC"];
    return categories.map((cat) => {
      const quotaObj = roleQuotas.find((q) => q.category === cat);
      const annual = quotaObj ? Number(quotaObj.annual_quota) : 12;
      const used = usedMap[cat] || 0;
      const remaining = Math.max(0, annual - used);
      return { category: cat, annual, used, remaining };
    });
  }, [selectedStaff, leaveQuotas, userLeaves, currentYear]);

  // 5. Generate Monthly Calendar Grid
  const calendarDaysGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days = [];

    // Empty lead cells before month start
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ isPadding: true, dayNum: 0, dateStr: "" });
    }

    // Days of month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

      // Check attendance record
      const attendance = userAttendanceRecords.find(
        (r) => r.attendance_date === dateStr
      ) || null;

      // Check leave request
      const leave = userLeaves.find((l) => {
        return (
          l.start_date <= dateStr &&
          l.end_date >= dateStr &&
          (l.status === "approved" || l.status === "pending")
        );
      }) || null;

      const dateObj = new Date(currentYear, currentMonth, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isToday = dateStr === todayObj.toISOString().slice(0, 10);
      const isPast = dateStr < todayObj.toISOString().slice(0, 10);

      days.push({
        isPadding: false,
        dayNum: day,
        dateStr,
        attendance,
        leave,
        isWeekend,
        isToday,
        isPast,
      });
    }

    return days;
  }, [currentYear, currentMonth, userAttendanceRecords, userLeaves, todayObj]);

  // Monthly stats summary for selected staff
  const monthStats = useMemo(() => {
    let wfoCount = 0;
    let wfhCount = 0;
    let leaveCount = 0;
    let flaggedCount = 0;

    calendarDaysGrid.forEach((d) => {
      if (d.isPadding) return;
      if (d.attendance) {
        if (d.attendance.work_mode === "wfo") wfoCount++;
        else if (d.attendance.work_mode === "wfh") wfhCount++;
        else if (d.attendance.work_mode === "leave" || d.attendance.work_mode === "holiday") leaveCount++;

        if (d.attendance.is_flagged) flaggedCount++;
      } else if (d.leave && d.leave.status === "approved") {
        leaveCount++;
      }
    });

    return { wfoCount, wfhCount, leaveCount, flaggedCount };
  }, [calendarDaysGrid]);

  return (
    <div className="space-y-6 font-sans">
      {/* ── 1. STAFF FILTER TOOLBAR & USER INSPECTOR HEADER ──────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Staff Attendance &amp; Leave Calendar Inspector
              </h2>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Select any staff member or picker to inspect their monthly attendance matrix, work modes, and available leave balances.
            </p>
          </div>

          {/* STAFF SELECTOR DROPDOWN */}
          <div className="flex items-center gap-2 bg-gray-50 p-2 border border-gray-200 rounded-2xl">
            <Filter className="w-4 h-4 text-emerald-700 ml-2" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="text-xs font-bold bg-transparent text-gray-900 focus:outline-none cursor-pointer pr-3 py-1"
            >
              {validProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role?.toUpperCase()}) — @{p.username}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SELECTED STAFF MEMBER OVERVIEW BADGE */}
        {selectedStaff && (
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 font-black text-lg flex items-center justify-center uppercase shadow-md border border-emerald-400/30">
                {selectedStaff.full_name ? selectedStaff.full_name.charAt(0) : "S"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">{selectedStaff.full_name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {selectedStaff.role}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  @{selectedStaff.username} {selectedStaff.phone ? `· ${selectedStaff.phone}` : ""}
                </p>
              </div>
            </div>

            {/* Monthly Summary Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center">
                <span className="text-[10px] text-emerald-300 block font-bold uppercase">WFO</span>
                <span className="text-sm font-black font-mono">{monthStats.wfoCount}d</span>
              </div>
              <div className="px-3 py-1.5 bg-teal-500/20 border border-teal-500/30 rounded-xl text-center">
                <span className="text-[10px] text-teal-300 block font-bold uppercase">WFH</span>
                <span className="text-sm font-black font-mono">{monthStats.wfhCount}d</span>
              </div>
              <div className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-xl text-center">
                <span className="text-[10px] text-purple-300 block font-bold uppercase">Leaves</span>
                <span className="text-sm font-black font-mono">{monthStats.leaveCount}d</span>
              </div>
              {monthStats.flaggedCount > 0 && (
                <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-center">
                  <span className="text-[10px] text-amber-300 block font-bold uppercase">Flagged</span>
                  <span className="text-sm font-black font-mono">{monthStats.flaggedCount}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. RELOCATED LEAVE QUOTAS & BALANCES SECTION ──────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Staff Leave Quotas &amp; Balances ({currentYear})
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Annual allowance and remaining leave days for {selectedStaff?.full_name || "selected staff"}.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase rounded-full border border-emerald-200">
            Official Statutory Quota
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {staffLeaveBalances.map((b) => (
            <div
              key={b.category}
              className="p-4 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-gray-900 uppercase tracking-wider">
                  {b.category === "CL"
                    ? "Casual Leave (CL)"
                    : b.category === "SL"
                    ? "Sick Leave (SL)"
                    : b.category === "EL"
                    ? "Earned Leave (EL)"
                    : "Public Holidays"}
                </span>
                <span className="text-[10px] font-bold text-gray-500">
                  {b.used} / {b.annual} Days Used
                </span>
              </div>

              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (b.used / b.annual) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[11px] font-bold text-gray-500">Available Balance:</span>
                <span className="text-sm font-black text-emerald-800 font-mono">
                  {b.remaining} Days
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. CUSTOM DESIGNED MONTHLY ATTENDANCE CALENDAR ────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xl space-y-5">
        {/* MONTH / YEAR HEADER NAVIGATOR */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              {monthNames[currentMonth]} {currentYear} Attendance Grid
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-gray-800 px-2">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* LEGEND BADGES */}
        <div className="flex items-center gap-3 text-[11px] font-extrabold flex-wrap">
          <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> WFO (Office)
          </span>
          <span className="flex items-center gap-1 text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            <span className="w-2 h-2 rounded-full bg-teal-600" /> WFH (Home)
          </span>
          <span className="flex items-center gap-1 text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-600" /> Approved Leave
          </span>
          <span className="flex items-center gap-1 text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600" /> Emergency Leave
          </span>
          <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            <ShieldAlert className="w-3 h-3 text-amber-600" /> Flagged Geofence
          </span>
        </div>

        {/* 7-COLUMN CALENDAR GRID */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <div
              key={dayName}
              className="text-center text-[11px] font-black uppercase text-gray-400 py-1"
            >
              {dayName}
            </div>
          ))}

          {/* Calendar Cells */}
          {calendarDaysGrid.map((cell, idx) => {
            if (cell.isPadding) {
              return (
                <div
                  key={`pad-${idx}`}
                  className="min-h-[85px] bg-gray-50/40 rounded-2xl border border-gray-100/50 opacity-40 pointer-events-none"
                />
              );
            }

            const rec = cell.attendance;
            const leaveReq = cell.leave;

            let cellBg = "bg-white border-gray-200 hover:border-emerald-400";
            let statusBadge = null;

            if (rec) {
              if (rec.is_flagged) {
                cellBg = "bg-amber-50/60 border-amber-300";
                statusBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white flex items-center gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5" /> Flagged
                  </span>
                );
              } else if (rec.work_mode === "wfo") {
                cellBg = "bg-emerald-50/70 border-emerald-300";
                statusBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white">
                    🏢 WFO
                  </span>
                );
              } else if (rec.work_mode === "wfh") {
                cellBg = "bg-teal-50/70 border-teal-300";
                statusBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-600 text-white">
                    🏠 WFH
                  </span>
                );
              } else if (rec.work_mode === "leave" || rec.work_mode === "holiday") {
                cellBg = "bg-purple-50/70 border-purple-300";
                statusBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-600 text-white">
                    🏖️ Leave
                  </span>
                );
              }
            } else if (leaveReq) {
              if (leaveReq.request_type === "emergency") {
                cellBg = "bg-rose-50/70 border-rose-300";
                statusBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white">
                    🚨 Emergency
                  </span>
                );
              } else {
                cellBg = "bg-purple-50/70 border-purple-300";
                statusBadge = (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-600 text-white">
                    🏖️ {leaveReq.leave_category}
                  </span>
                );
              }
            } else if (cell.isWeekend) {
              cellBg = "bg-gray-50 border-gray-200/80 text-gray-400";
            } else if (cell.isPast) {
              cellBg = "bg-gray-50/80 border-gray-200 text-gray-500";
            }

            return (
              <div
                key={cell.dateStr}
                onClick={() =>
                  setSelectedDayDetail({
                    dateStr: cell.dateStr,
                    attendance: rec || null,
                    leave: leaveReq || null,
                  })
                }
                className={`min-h-[85px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md ${cellBg} ${
                  cell.isToday ? "ring-2 ring-emerald-500 ring-offset-1" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black font-mono ${
                      cell.isToday
                        ? "w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center"
                        : "text-gray-800"
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {statusBadge}
                </div>

                <div className="text-[10px] space-y-0.5 font-semibold">
                  {rec?.check_in_at && (
                    <div className="text-gray-700 truncate font-mono">
                      In: {new Date(rec.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                  {!rec && !leaveReq && cell.isWeekend && (
                    <span className="text-[9px] font-bold text-gray-400">Off Day</span>
                  )}
                  {!rec && !leaveReq && !cell.isWeekend && cell.isPast && (
                    <span className="text-[9px] font-bold text-rose-500">Unmarked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. DAY DETAIL MODAL ────────────────────────────────────────────── */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-700" />
                <h4 className="font-black text-gray-900 text-base">
                  Date Detail: {formatDate(selectedDayDetail.dateStr)}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                  Inspected Employee
                </span>
                <p className="font-extrabold text-gray-900">{selectedStaff?.full_name}</p>
                <p className="text-gray-500 font-medium">@{selectedStaff?.username} ({selectedStaff?.role?.toUpperCase()})</p>
              </div>

              {selectedDayDetail.attendance ? (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
                  <span className="font-black text-emerald-950 block">Attendance Record</span>
                  <div className="grid grid-cols-2 gap-2 text-gray-700 font-medium">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Work Mode</span>
                      <span className="font-bold uppercase text-emerald-800">{selectedDayDetail.attendance.work_mode}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Approval Status</span>
                      <span className="font-bold capitalize">{selectedDayDetail.attendance.approval_status}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Check In</span>
                      <span className="font-mono">
                        {selectedDayDetail.attendance.check_in_at
                          ? new Date(selectedDayDetail.attendance.check_in_at).toLocaleTimeString()
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Check Out</span>
                      <span className="font-mono">
                        {selectedDayDetail.attendance.check_out_at
                          ? new Date(selectedDayDetail.attendance.check_out_at).toLocaleTimeString()
                          : "Not Checked Out"}
                      </span>
                    </div>
                  </div>

                  {selectedDayDetail.attendance.is_flagged && (
                    <div className="p-2.5 bg-amber-100/80 border border-amber-200 text-amber-900 rounded-xl font-bold flex items-center gap-1.5 mt-2">
                      <ShieldAlert className="w-4 h-4 text-amber-700" />
                      <span>{selectedDayDetail.attendance.flagged_reason || "Flagged Check-in"}</span>
                    </div>
                  )}
                </div>
              ) : selectedDayDetail.leave ? (
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                  <span className="font-black text-purple-950 block">Approved Leave Record</span>
                  <p className="font-bold text-purple-900">
                    {selectedDayDetail.leave.leave_category} ({selectedDayDetail.leave.request_type})
                  </p>
                  <p className="text-gray-600">
                    Duration: {selectedDayDetail.leave.start_date} to {selectedDayDetail.leave.end_date} ({selectedDayDetail.leave.days_count} day(s))
                  </p>
                  {selectedDayDetail.leave.reason && (
                    <p className="text-gray-500 italic">&quot;{selectedDayDetail.leave.reason}&quot;</p>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-center text-gray-500 font-medium">
                  No attendance record logged for this date.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayDetail(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
