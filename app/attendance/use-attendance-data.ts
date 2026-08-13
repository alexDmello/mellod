"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  OfficeLocation,
  LeaveQuota,
  StaffSchedule,
  AttendanceRecord,
  LeaveRequest,
  WorkModeSwitchRequest,
  WorkMode,
  LeaveCategory,
  LeaveType,
} from "@/lib/types";
import { calculateDistanceMeters } from "@/lib/geo-utils";
import { todayISO } from "@/lib/utils";

export interface LeaveBalance {
  category: LeaveCategory;
  annual: number;
  used: number;
  remaining: number;
}

export function useAttendanceData() {
  // Memoize supabase client — creating it on every render would change the
  // useCallback dependency, causing fetchAllData to be recreated, which would
  // trigger the useEffect again, resulting in an infinite re-fetch loop.
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Memoize today so it's stable for the lifetime of the hook instance.
  const today = useMemo(() => todayISO(), []);

  // User state
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // System Config Data
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([]);
  const [leaveQuotas, setLeaveQuotas] = useState<LeaveQuota[]>([]);

  // User Specific Data
  const [staffSchedule, setStaffSchedule] = useState<StaffSchedule | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [userAttendanceHistory, setUserAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [userLeaveRequests, setUserLeaveRequests] = useState<LeaveRequest[]>([]);
  const [userSwitchRequests, setUserSwitchRequests] = useState<WorkModeSwitchRequest[]>([]);

  // Admin Queue & Team Data
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [teamTodayAttendance, setTeamTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);
  const [allSwitchRequests, setAllSwitchRequests] = useState<WorkModeSwitchRequest[]>([]);
  const [allStaffSchedules, setAllStaffSchedules] = useState<StaffSchedule[]>([]);
  const [teamAttendanceHistory, setTeamAttendanceHistory] = useState<AttendanceRecord[]>([]);

  const isSuperAdmin = currentUser?.role === "admin";
  const isAdmin = currentUser?.role !== "fbo" && currentUser?.role !== "picker";
  const isPicker = currentUser?.role === "picker";
  const isStaff = currentUser?.role !== "fbo" && currentUser?.role !== "picker";

  function triggerSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  function triggerError(msg: string) {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  }

  // ── Fetch Initial Data ───────────────────────────────────────────────────
  const fetchAllData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      // 1. Get auth user & profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) setCurrentUser(profile);

      // 2. Fetch Office Locations & Leave Quotas
      const [{ data: locs }, { data: quotas }] = await Promise.all([
        supabase.from("office_locations").select("*").order("created_at", { ascending: true }),
        supabase.from("leave_quotas").select("*"),
      ]);

      if (locs) setOfficeLocations(locs as OfficeLocation[]);
      if (quotas) setLeaveQuotas(quotas as LeaveQuota[]);

      // 3. Fetch User's Schedule & Attendance
      const [
        { data: sched },
        { data: todayRecList, error: todayRecError },
        { data: myHist },
        { data: myLeaves },
        { data: mySwitches },
      ] = await Promise.all([
        supabase.from("staff_schedules").select("*").eq("profile_id", user.id).maybeSingle(),
        supabase.from("attendance_records").select("*").eq("profile_id", user.id).eq("attendance_date", today).order("created_at", { ascending: false }).limit(1),
        supabase.from("attendance_records").select("*").eq("profile_id", user.id).order("attendance_date", { ascending: false }).limit(60),
        supabase.from("leave_requests").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }),
        supabase.from("work_mode_switch_requests").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }),
      ]);

      const todayRec = todayRecList?.[0] || null;

      // Diagnostic logging — open browser DevTools console to see these
      console.log("[Attendance] today:", today, "| uid:", user.id);
      console.log("[Attendance] todayRec:", todayRec, "| error:", todayRecError);
      if (todayRecError) {
        console.error("[Attendance] RLS or query error on attendance_records SELECT:", todayRecError);
      }

      if (sched) setStaffSchedule(sched as StaffSchedule);
      if (todayRec) {
        setTodayAttendance(todayRec as AttendanceRecord);
      } else if (isInitialLoad) {
        setTodayAttendance(null);
      }
      if (myHist) setUserAttendanceHistory(myHist as AttendanceRecord[]);
      if (myLeaves) setUserLeaveRequests(myLeaves as LeaveRequest[]);
      if (mySwitches) setUserSwitchRequests(mySwitches as WorkModeSwitchRequest[]);

      // 4. Fetch Admin Data if internal staff / sub-admin / admin (tracking all non-FBO employees)
      if (profile?.role !== "fbo") {
        const [{ data: profs }, { data: teamToday }, { data: allLeaves }, { data: allSwitches }, { data: allScheds }, { data: teamHist }] =
          await Promise.all([
            supabase.from("profiles").select("*").neq("role", "fbo").order("full_name", { ascending: true }),
            supabase.from("attendance_records").select("*").eq("attendance_date", today).order("created_at", { ascending: false }),
            supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
            supabase.from("work_mode_switch_requests").select("*").order("created_at", { ascending: false }),
            supabase.from("staff_schedules").select("*"),
            supabase.from("attendance_records").select("*").order("attendance_date", { ascending: false }).limit(300),
          ]);

        if (profs) {
          const staffOnly = profs.filter((p: any) => p.role !== "admin");
          setAllProfiles(staffOnly as Profile[]);
        }

        const normalizeProf = (r: any) => {
          if (!r) return r;
          const rawProf = r.profile || r.profiles;
          let p = Array.isArray(rawProf) ? rawProf[0] : rawProf;
          if (!p && r.profile_id) {
            if (profile && profile.id === r.profile_id) {
              p = profile;
            } else if (profs) {
              p = profs.find((prof: any) => prof.id?.toLowerCase() === r.profile_id?.toLowerCase()) || null;
            }
          }
          return { ...r, profile: p };
        };

        const mappedTeamToday = (teamToday || []).map(normalizeProf).filter((r) => r.profile?.role !== "admin");
        const mappedTeamHist = (teamHist || []).map(normalizeProf).filter((r) => r.profile?.role !== "admin");
        const mappedLeaves = (allLeaves || []).map(normalizeProf).filter((r) => r.profile?.role !== "admin");
        const mappedSwitches = (allSwitches || []).map(normalizeProf).filter((r) => r.profile?.role !== "admin");

        console.log("[Attendance Admin] profs:", profs);
        console.log("[Attendance Admin] raw teamToday:", teamToday);
        console.log("[Attendance Admin] mappedTeamToday:", mappedTeamToday);

        // Ensure current user's todayRec is immediately merged AND updated in teamTodayAttendance & teamAttendanceHistory
        if (todayRec) {
          const profObj = profile || (profs ? profs.find((p: any) => p.id === user.id) : null);
          const updatedRec = { ...todayRec, profile: profObj };

          if (profObj?.role !== "admin") {
            const todayIdx = mappedTeamToday.findIndex(
              (r: any) => r.profile_id === user.id || r.id === todayRec.id
            );
            if (todayIdx >= 0) {
              mappedTeamToday[todayIdx] = updatedRec;
            } else {
              mappedTeamToday.push(updatedRec);
            }

            const histIdx = mappedTeamHist.findIndex(
              (r: any) => r.id === todayRec.id || (r.profile_id === user.id && r.attendance_date === today)
            );
            if (histIdx >= 0) {
              mappedTeamHist[histIdx] = updatedRec;
            } else {
              mappedTeamHist.unshift(updatedRec);
            }
          }
        }

        setTeamTodayAttendance(mappedTeamToday as AttendanceRecord[]);
        setAllLeaveRequests(mappedLeaves as LeaveRequest[]);
        setAllSwitchRequests(mappedSwitches as WorkModeSwitchRequest[]);
        if (allScheds) setAllStaffSchedules(allScheds as StaffSchedule[]);
        setTeamAttendanceHistory(mappedTeamHist as AttendanceRecord[]);
      }
    } catch (err: unknown) {
      console.error("Failed to load attendance data:", err);
      triggerError("Failed to synchronize attendance data.");
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  // supabase is now a stable ref, today is memoized — no more infinite loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  useEffect(() => {
    fetchAllData(true);

    // 1. Automatic 10-second polling interval so live updates reflect without manual refresh
    const intervalId = setInterval(() => {
      fetchAllData(false);
    }, 10000);

    // 2. Supabase Realtime subscription on attendance, leave, and switch tables for instant push updates
    const channel = supabase
      .channel("attendance_live_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_records" },
        () => {
          console.log("[Attendance Realtime] Attendance table updated — auto syncing...");
          fetchAllData(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leave_requests" },
        () => {
          fetchAllData(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_mode_switch_requests" },
        () => {
          fetchAllData(false);
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [fetchAllData, supabase]);

  // ── Calculated User Leave Balances ──────────────────────────────────────
  const leaveBalances = useMemo((): LeaveBalance[] => {
    const userRole = currentUser?.role === "picker" ? "picker" : "staff";
    const userRoleQuotas = leaveQuotas.filter((q) => q.role === userRole);

    const currentYear = new Date().getFullYear();
    const activeLeaves = userLeaveRequests.filter((r) => {
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
      const quotaObj = userRoleQuotas.find((q) => q.category === cat);
      const annual = quotaObj ? Number(quotaObj.annual_quota) : 12;
      const used = usedMap[cat] || 0;
      const remaining = Math.max(0, annual - used);
      return { category: cat, annual, used, remaining };
    });
  }, [currentUser, leaveQuotas, userLeaveRequests]);

  // ── Default Expected Work Mode Today for Staff ──────────────────────────
  const expectedModeToday = useMemo((): WorkMode => {
    if (isPicker) return "wfo";

    // Check if there is an approved switch request for today
    const switchToday = userSwitchRequests.find(
      (sr) => sr.switch_date === today && sr.status === "approved"
    );
    if (switchToday) return switchToday.requested_mode;

    // Otherwise use default weekly schedule
    if (!staffSchedule) return "wfo";
    const dayName = new Date().getDay(); // 0=Sun, 1=Mon...
    const dayMap: Record<number, keyof StaffSchedule> = {
      0: "sunday_mode",
      1: "monday_mode",
      2: "tuesday_mode",
      3: "wednesday_mode",
      4: "thursday_mode",
      5: "friday_mode",
      6: "saturday_mode",
    };
    const key = dayMap[dayName];
    return (staffSchedule[key] as WorkMode) || "wfo";
  }, [isPicker, userSwitchRequests, staffSchedule, today]);

  // ── User Actions ─────────────────────────────────────────────────────────

  /** Mark Check-In with Geofence Validation */
  async function checkIn(params: { lat: number; lng: number; workMode?: WorkMode }) {
    if (!currentUser) return;
    setActionPending(true);
    try {
      const activeOffice = officeLocations.find((o) => o.is_active) || officeLocations[0];
      let distanceMeters: number | null = 0;
      let isFlagged = false;
      let flaggedReason: string | null = null;
      let approvalStatus: "approved" | "pending" = "approved";

      const selectedMode = params.workMode || expectedModeToday;

      // Pickers are always WFO — no WFH allowed.
      // Staff / sub_admin can self-select WFH without a pre-approved switch;
      // the system trusts management-level employees to work responsibly.
      if (isPicker && selectedMode === "wfh") {
        triggerError("Field Pickers must check in from the office / field location (WFO only).");
        return;
      }

      // ── Geofence Validation (WFO only) ───────────────────────────────
      if (selectedMode === "wfo") {
        if (activeOffice) {
          if (params.lat === 0 && params.lng === 0) {
            // Pickers must have GPS — hard block.
            // Staff/sub_admin: flag for admin review instead of blocking.
            if (isPicker) {
              triggerError("GPS location required for WFO check-in. Please enable location access.");
              return;
            }
            isFlagged = true;
            flaggedReason = "GPS unavailable at check-in time — location unverified.";
            approvalStatus = "pending";
            distanceMeters = null;
          } else {
            distanceMeters = calculateDistanceMeters(
              params.lat,
              params.lng,
              activeOffice.latitude,
              activeOffice.longitude
            );
            const allowedRadius = activeOffice.allowed_radius_meters || 100;
            if (distanceMeters > allowedRadius) {
              if (isPicker) {
                triggerError(`Geofence Verification Failed: You are ${Math.round(distanceMeters)}m away from ${activeOffice.name} (Max: ${allowedRadius}m).`);
                return;
              }
              // Staff outside geofence: flag for review instead of hard block
              isFlagged = true;
              flaggedReason = `Checked in ${Math.round(distanceMeters)}m from ${activeOffice.name} (outside ${allowedRadius}m radius).`;
              approvalStatus = "pending";
            }
          }
        }
      } else {
        // WFH mode has no location restriction
        distanceMeters = 0;
      }

      const payload = {
        profile_id: currentUser.id,
        attendance_date: today,
        work_mode: selectedMode,
        check_in_at: new Date().toISOString(),
        check_in_lat: params.lat,
        check_in_lng: params.lng,
        office_location_id: activeOffice?.id || null,
        distance_meters: distanceMeters,
        is_flagged: isFlagged,
        flagged_reason: flaggedReason,
        approval_status: approvalStatus,
      };

      // Check if record exists for today
      const { data: existingRecList } = await supabase
        .from("attendance_records")
        .select("id, check_in_at")
        .eq("profile_id", currentUser.id)
        .eq("attendance_date", today)
        .order("created_at", { ascending: false })
        .limit(1);

      const existingRec = existingRecList?.[0] || null;

      let data;
      let error;

      if (existingRec) {
        const updateRes = await supabase
          .from("attendance_records")
          .update({
            work_mode: selectedMode,
            check_in_at: existingRec.check_in_at || payload.check_in_at,
            check_in_lat: params.lat,
            check_in_lng: params.lng,
            office_location_id: payload.office_location_id,
            distance_meters: distanceMeters,
            is_flagged: isFlagged,
            flagged_reason: flaggedReason,
            approval_status: approvalStatus,
          })
          .eq("id", existingRec.id)
          .select()
          .single();
        data = updateRes.data;
        error = updateRes.error;
      } else {
        const insertRes = await supabase
          .from("attendance_records")
          .insert(payload)
          .select()
          .single();
        data = insertRes.data;
        error = insertRes.error;
      }

      if (error) throw error;

      const recWithProfile = { ...data, profile: currentUser };
      setTodayAttendance(recWithProfile as AttendanceRecord);

      setUserAttendanceHistory((prev) => {
        const filtered = prev.filter((r) => r.attendance_date !== today);
        return [recWithProfile as AttendanceRecord, ...filtered];
      });

      if (currentUser.role !== "admin") {
        setTeamTodayAttendance((prev) => {
          const filtered = prev.filter(
            (r) => r.profile_id !== currentUser.id && r.id !== data.id
          );
          return [recWithProfile as AttendanceRecord, ...filtered];
        });

        setTeamAttendanceHistory((prev) => {
          const filtered = prev.filter(
            (r) => !(r.profile_id === currentUser.id && r.attendance_date === today)
          );
          return [recWithProfile as AttendanceRecord, ...filtered];
        });
      }

      if (isFlagged) {
        triggerSuccess(`Checked in (${distanceMeters}m from office) — Flagged for Admin Review.`);
      } else {
        triggerSuccess(`Successfully checked in for today (${selectedMode.toUpperCase()}).`);
      }
      await fetchAllData();
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.reload();
      }, 500);
    } catch (err: unknown) {
      console.error("Check-in error:", err);
      triggerError((err as Error).message || "Check-in failed. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  /** Mark Check-Out */
  async function checkOut(params: { lat: number; lng: number }) {
    if (!currentUser || !todayAttendance) return;
    setActionPending(true);
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .update({
          check_out_at: new Date().toISOString(),
          check_out_lat: params.lat,
          check_out_lng: params.lng,
        })
        .eq("id", todayAttendance.id)
        .select()
        .single();

      if (error) throw error;

      const recWithProfile = { ...data, profile: currentUser };
      setTodayAttendance(recWithProfile as AttendanceRecord);
      triggerSuccess("Checked out successfully. Have a great evening!");
      await fetchAllData();
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.reload();
      }, 500);
    } catch (err: unknown) {
      console.error("Check-out error:", err);
      triggerError((err as Error).message || "Check-out failed.");
    } finally {
      setActionPending(false);
    }
  }

  /** Submit Leave or Holiday Request */
  async function submitLeaveRequest(params: {
    requestType: LeaveType;
    leaveCategory: LeaveCategory;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    if (!currentUser) return;
    setActionPending(true);
    try {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const { data: newLeave, error } = await supabase
        .from("leave_requests")
        .insert({
          profile_id: currentUser.id,
          request_type: params.requestType,
          leave_category: params.leaveCategory,
          start_date: params.startDate,
          end_date: params.endDate,
          days_count: daysCount,
          reason: params.reason.trim(),
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      const leaveWithProfile = { ...(newLeave || {}), profile: currentUser };
      setUserLeaveRequests((prev) => [leaveWithProfile as LeaveRequest, ...prev]);
      if (currentUser.role !== "admin") {
        setAllLeaveRequests((prev) => [leaveWithProfile as LeaveRequest, ...prev]);
      }

      triggerSuccess(
        `${params.requestType === "emergency" ? "Emergency" : "Pre-approved"} request submitted for admin review.`
      );
      await fetchAllData();
    } catch (err: unknown) {
      console.error("Leave request error:", err);
      triggerError((err as Error).message || "Failed to submit request.");
    } finally {
      setActionPending(false);
    }
  }

  /** Submit WFO / WFH Mode Switch Request */
  async function submitModeSwitchRequest(params: { switchDate: string; requestedMode: "wfo" | "wfh"; reason: string }) {
    if (!currentUser) return;
    setActionPending(true);
    try {
      const { error } = await supabase.from("work_mode_switch_requests").insert({
        profile_id: currentUser.id,
        switch_date: params.switchDate,
        requested_mode: params.requestedMode,
        reason: params.reason.trim(),
        status: "pending",
      });

      if (error) throw error;

      triggerSuccess("Work mode switch request submitted to manager.");
      await fetchAllData();
    } catch (err: unknown) {
      console.error("Switch request error:", err);
      triggerError((err as Error).message || "Failed to submit switch request.");
    } finally {
      setActionPending(false);
    }
  }

  // ── Admin Actions ────────────────────────────────────────────────────────

  /** Review Leave Request (Approve/Reject) */
  async function reviewLeaveRequest(requestId: string, approve: boolean, rejectionReason?: string) {
    if (!currentUser) return;
    setActionPending(true);
    try {
      const status = approve ? "approved" : "rejected";
      const { data: req, error } = await supabase
        .from("leave_requests")
        .update({
          status,
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved and encompasses today, auto-create or update attendance record for that date range
      if (approve && req) {
        const start = new Date(req.start_date);
        const end = new Date(req.end_date);
        const recordsToInsert = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().slice(0, 10);
          recordsToInsert.push({
            profile_id: req.profile_id,
            attendance_date: dateStr,
            work_mode: req.request_type === "emergency" ? "leave" : "holiday",
            approval_status: "approved",
            reviewed_by: currentUser.id,
            reviewed_at: new Date().toISOString(),
          });
        }

        if (recordsToInsert.length > 0) {
          await supabase
            .from("attendance_records")
            .upsert(recordsToInsert, { onConflict: "profile_id,attendance_date" });
        }
      }

      triggerSuccess(`Leave request ${status}.`);
      await fetchAllData();
    } catch (err: unknown) {
      console.error("Review leave error:", err);
      triggerError((err as Error).message || "Action failed.");
    } finally {
      setActionPending(false);
    }
  }

  /** Review Switch Request */
  async function reviewSwitchRequest(requestId: string, approve: boolean) {
    if (!currentUser) return;
    setActionPending(true);
    try {
      const status = approve ? "approved" : "rejected";
      const { error } = await supabase
        .from("work_mode_switch_requests")
        .update({
          status,
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      triggerSuccess(`Work mode switch request ${status}.`);
      await fetchAllData();
    } catch (err: unknown) {
      console.error("Review switch error:", err);
      triggerError((err as Error).message || "Action failed.");
    } finally {
      setActionPending(false);
    }
  }

  /** Review Flagged Check-In */
  async function reviewFlaggedCheckIn(recordId: string, approve: boolean) {
    if (!currentUser) return;
    setActionPending(true);
    try {
      const status = approve ? "approved" : "rejected";
      const { error } = await supabase
        .from("attendance_records")
        .update({
          approval_status: status,
          is_flagged: approve ? false : true,
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", recordId);

      if (error) throw error;

      triggerSuccess(`Check-in record ${status}.`);
      await fetchAllData();
    } catch (err: unknown) {
      console.error("Review check-in error:", err);
      triggerError((err as Error).message || "Action failed.");
    } finally {
      setActionPending(false);
    }
  }

  /** Admin Settings: Create/Edit Office Location */
  async function saveOfficeLocation(loc: Partial<OfficeLocation>) {
    setActionPending(true);
    try {
      const payload = {
        name: loc.name?.trim(),
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        allowed_radius_meters: Number(loc.allowed_radius_meters || 100),
        is_active: loc.is_active ?? true,
      };

      if (loc.id) {
        const { error } = await supabase.from("office_locations").update(payload).eq("id", loc.id);
        if (error) throw error;
        triggerSuccess("Office location updated.");
      } else {
        const { error } = await supabase.from("office_locations").insert(payload);
        if (error) throw error;
        triggerSuccess("New office location added.");
      }
      await fetchAllData();
    } catch (err: unknown) {
      console.error("Save office error:", err);
      triggerError((err as Error).message || "Failed to save office location.");
    } finally {
      setActionPending(false);
    }
  }

  /** Admin Settings: Update Leave Quotas */
  async function updateLeaveQuota(role: "staff" | "picker", category: LeaveCategory, quota: number) {
    setActionPending(true);
    try {
      const { error } = await supabase
        .from("leave_quotas")
        .upsert({ role, category, annual_quota: quota }, { onConflict: "role,category" });
      if (error) throw error;

      triggerSuccess(`Leave quota for ${role.toUpperCase()} (${category}) updated to ${quota} days.`);
      await fetchAllData();
    } catch (err: unknown) {
      console.error("Save quota error:", err);
      triggerError((err as Error).message || "Failed to update quota.");
    } finally {
      setActionPending(false);
    }
  }

  /** Admin Settings: Update Staff Schedule */
  async function updateStaffSchedule(profileId: string, schedule: Partial<StaffSchedule>) {
    setActionPending(true);
    try {
      const payload = {
        profile_id: profileId,
        monday_mode: schedule.monday_mode || "wfo",
        tuesday_mode: schedule.tuesday_mode || "wfo",
        wednesday_mode: schedule.wednesday_mode || "wfh",
        thursday_mode: schedule.thursday_mode || "wfo",
        friday_mode: schedule.friday_mode || "wfh",
        saturday_mode: schedule.saturday_mode || "wfo",
        sunday_mode: schedule.sunday_mode || "wfh",
      };

      const { error } = await supabase
        .from("staff_schedules")
        .upsert(payload, { onConflict: "profile_id" });

      if (error) throw error;

      triggerSuccess("Staff default weekly schedule updated.");
      await fetchAllData();
    } catch (err: unknown) {
      console.error("Save schedule error:", err);
      triggerError((err as Error).message || "Failed to save staff schedule.");
    } finally {
      setActionPending(false);
    }
  }

  async function toggleAttendanceEnabled(profileId: string, enabled: boolean) {
    setActionPending(true);
    try {
      const res = await fetch("/api/admin/toggle-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, enabled }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        if (resData.error?.includes("is_attendance_enabled") || resData.error?.includes("schema cache")) {
          throw new Error("Database column 'is_attendance_enabled' is missing on table 'profiles'. Please run: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_attendance_enabled BOOLEAN DEFAULT TRUE NOT NULL; in Supabase SQL Editor.");
        }
        throw new Error(resData.error || "Failed to update attendance exemption.");
      }

      triggerSuccess(`Attendance check-in ${enabled ? "enabled" : "exempted/disabled"} for employee.`);
      await fetchAllData();
    } catch (err: unknown) {
      console.error("Toggle attendance error:", err);
      triggerError((err as Error).message || "Failed to update attendance toggle.");
    } finally {
      setActionPending(false);
    }
  }

  return {
    currentUser,
    loading,
    actionPending,
    errorMessage,
    successMessage,
    isSuperAdmin,
    isAdmin,
    isPicker,
    isStaff,
    today,
    officeLocations,
    leaveQuotas,
    staffSchedule,
    expectedModeToday,
    todayAttendance,
    userAttendanceHistory,
    userLeaveRequests,
    userSwitchRequests,
    leaveBalances,
    // Admin properties
    allProfiles,
    teamTodayAttendance,
    allLeaveRequests,
    allSwitchRequests,
    allStaffSchedules,
    teamAttendanceHistory,
    // Methods
    refetch: fetchAllData,
    checkIn,
    checkOut,
    submitLeaveRequest,
    submitModeSwitchRequest,
    reviewLeaveRequest,
    reviewSwitchRequest,
    reviewFlaggedCheckIn,
    saveOfficeLocation,
    updateLeaveQuota,
    updateStaffSchedule,
    toggleAttendanceEnabled,
  };
}

export type AttendanceData = ReturnType<typeof useAttendanceData>;
