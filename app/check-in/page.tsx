"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAttendanceData } from "../attendance/use-attendance-data";
import PickerAttendanceView from "../attendance/PickerAttendanceView";
import StaffAttendanceView from "../attendance/StaffAttendanceView";
import { Loader2, AlertTriangle, CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";

export default function CheckInPage() {
  const router = useRouter();
  const data = useAttendanceData();
  const { currentUser, loading, errorMessage, successMessage, isSuperAdmin, isPicker } = data;

  useEffect(() => {
    if (!loading && !isPicker) {
      router.replace("/admin/check-in");
    }
  }, [loading, isPicker, router]);

  if (loading || (!isPicker && currentUser)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20">
        <Loader2 className="w-9 h-9 animate-spin text-emerald-600 mb-3" />
        <p className="font-bold text-gray-700 text-sm">Loading Daily Check-In Portal...</p>
        <p className="text-xs text-gray-400 mt-0.5">Syncing user profile &amp; GPS geofence</p>
      </div>
    );
  }

  // Check if attendance feature is disabled/exempted for this profile
  const isAttendanceDisabled = currentUser?.is_attendance_enabled === false;

  return (
    <div className="space-y-4 max-w-xl mx-auto px-4 py-6">
      {/* ── Toast Alerts ─────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-3 shadow-md">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-3 shadow-md">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* ── Exemption Views ───────────────────────────────────────────── */}
      {isSuperAdmin ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xl space-y-3">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl text-emerald-700 flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="font-black text-gray-900 text-base">Super Admin Account</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-medium max-w-sm mx-auto">
            Daily check-in &amp; attendance tracking is strictly non-applicable for Super Admin owner accounts.
          </p>
        </div>
      ) : isAttendanceDisabled ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xl space-y-3">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl text-amber-700 flex items-center justify-center mx-auto mb-2">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="font-black text-gray-900 text-base">Attendance Check-In Exempted</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-medium max-w-sm mx-auto">
            Daily check-in has been disabled or exempted for your employee profile by Admin. You are not required to log daily attendance.
          </p>
        </div>
      ) : isPicker ? (
        <PickerAttendanceView data={data} />
      ) : (
        <StaffAttendanceView data={data} />
      )}
    </div>
  );
}
