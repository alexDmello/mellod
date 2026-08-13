"use client";

import { usePathname } from "next/navigation";
import { useAttendanceData } from "./use-attendance-data";
import PickerAttendanceView from "./PickerAttendanceView";
import StaffAttendanceView from "./StaffAttendanceView";
import AdminAttendanceView from "./AdminAttendanceView";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AttendancePage() {
  const pathname = usePathname();
  const data = useAttendanceData();
  const { currentUser, loading, errorMessage, successMessage, isSuperAdmin, isAdmin, isPicker } = data;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20">
        <Loader2 className="w-9 h-9 animate-spin text-emerald-600 mb-3" />
        <p className="font-bold text-gray-700 text-sm">Loading Attendance Portal...</p>
        <p className="text-xs text-gray-400 mt-0.5">Syncing GPS location &amp; leave quotas</p>
      </div>
    );
  }

  const isAdminRoute = pathname?.startsWith("/admin/attendance");

  return (
    <div className="space-y-4">
      {/* ── Toast Alerts ─────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-3 shadow-md max-w-xl mx-auto">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-3 shadow-md max-w-xl mx-auto">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* ── Role-Conditional Views ────────────────────────────────────── */}
      {currentUser?.role === "fbo" ? (
        <div className="bg-white rounded-3xl p-8 max-w-md mx-auto text-center border border-gray-100 shadow-xl space-y-2">
          <h3 className="font-black text-gray-900 text-base">Attendance Portal</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-medium">
            Attendance check-ins and leave tracking are strictly configured for Mellod Field Pickers and Operations Staff.
          </p>
        </div>
      ) : isSuperAdmin || (isAdmin && isAdminRoute) ? (
        <AdminAttendanceView data={data} />
      ) : isPicker ? (
        <PickerAttendanceView data={data} />
      ) : (
        <StaffAttendanceView data={data} />
      )}
    </div>
  );
}
