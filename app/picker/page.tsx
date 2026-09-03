"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, todayISO } from "@/lib/utils";
import { useAttendanceData } from "../attendance/use-attendance-data";
import {
  MapPin,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Droplets,
  Navigation,
  Phone,
  User,
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle,
  LogOut,
  Sparkles,
  Ban,
  Camera,
  X,
  CalendarDays,
  ShieldCheck,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FBO, Pickup } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface RouteWithDetails {
  id: string;
  fbo_id: string;
  fbo: FBO;
  route_date: string;
  sort_order: number;
  pickup?: Pickup;
}

export default function PickerDashboard() {
  const [pickerName, setPickerName] = useState("");
  const [routes, setRoutes] = useState<RouteWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFboId, setExpandedFboId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");

  // Report Closed Modal States
  const [reportingClosedRoute, setReportingClosedRoute] = useState<RouteWithDetails | null>(null);
  const [closedReason, setClosedReason] = useState("Outlet Closed / Shutter Down");
  const [closedNotes, setClosedNotes] = useState("");
  const [closedPhoto, setClosedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submittingClosed, setSubmittingClosed] = useState(false);
  const [closedError, setClosedError] = useState<string | null>(null);

  // Embedded Check-In Hook Integration
  const attendance = useAttendanceData();
  const {
    todayAttendance,
    actionPending: attendancePending,
    errorMessage: attendanceError,
    successMessage: attendanceSuccess,
    checkIn,
    checkOut,
  } = attendance;

  const [gettingGps, setGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("picker_dashboard_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pickup_requests" },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "routes" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleEmbeddedCheckIn() {
    setGettingGps(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your device browser.");
      setGettingGps(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGettingGps(false);
        checkIn({ lat: pos.coords.latitude, lng: pos.coords.longitude, workMode: "wfo" });
      },
      (err) => {
        setGettingGps(false);
        let msg = "Location access denied. Please enable GPS in browser settings to check in.";
        if (err.code === err.TIMEOUT) msg = "GPS search timed out. Try again.";
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function handleEmbeddedCheckOut() {
    setGettingGps(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      checkOut({ lat: 0, lng: 0 });
      setGettingGps(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGettingGps(false);
        checkOut({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setGettingGps(false);
        checkOut({ lat: 0, lng: 0 });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setPickerName(profile?.full_name ?? "Picker Agent");

      const { data: picker } = await supabase
        .from("pickers")
        .select("id, is_active")
        .eq("profile_id", user.id)
        .single();

      if (!picker) {
        setError("Picker account details could not be found. Contact admin.");
        setLoading(false);
        return;
      }

      if (picker.is_active === false) {
        setError("Your picker account has been offboarded or suspended. Please contact Mellod administration.");
        setLoading(false);
        return;
      }

      const today = todayISO();

      // 1. Fetch routes assigned for today
      const { data: routesData } = await supabase
        .from("routes")
        .select(`
          id, fbo_id, route_date, sort_order,
          fbo:fbos(*)
        `)
        .eq("picker_id", picker.id)
        .eq("route_date", today)
        .order("sort_order");

      // 2. Fetch pickup_requests assigned to this picker for active processing
      const { data: assignedRequests } = await supabase
        .from("pickup_requests")
        .select(`
          id, fbo_id, created_at, status, estimated_liters,
          fbo:fbos(*)
        `)
        .eq("assigned_picker_id", picker.id)
        .in("status", ["scheduled", "assigned", "in_transit", "completed"]);

      let mergedRoutes: any[] = [...(routesData ?? [])];
      const existingFboIds = new Set(mergedRoutes.map((r: any) => r.fbo_id));

      (assignedRequests ?? []).forEach((req: any) => {
        if (!existingFboIds.has(req.fbo_id)) {
          existingFboIds.add(req.fbo_id);
          mergedRoutes.push({
            id: req.id,
            fbo_id: req.fbo_id,
            route_date: today,
            sort_order: 999,
            fbo: req.fbo,
          });
        }
      });

      // 4. Ensure 100% of stops have FBO details by directly fetching any missing fbo objects
      const allFboIds = mergedRoutes.map((r: any) => r.fbo_id).filter(Boolean);
      const missingFboIds = mergedRoutes
        .filter((r: any) => !r.fbo && r.fbo_id)
        .map((r: any) => r.fbo_id);

      if (missingFboIds.length > 0) {
        const { data: extraFbos } = await supabase
          .from("fbos")
          .select("*")
          .in("id", missingFboIds);

        if (extraFbos && extraFbos.length > 0) {
          const fboMap = new Map(extraFbos.map((f: any) => [f.id, f]));
          mergedRoutes = mergedRoutes.map((r: any) => ({
            ...r,
            fbo: r.fbo || fboMap.get(r.fbo_id) || null,
          }));
        }
      }

      // Filter out any stop that completely lacks FBO entity reference
      mergedRoutes = mergedRoutes.filter((r: any) => Boolean(r.fbo));

      const fboIds = mergedRoutes.map((r: any) => r.fbo_id);

      // Start window strictly at start of TODAY (00:00:00 local time)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayISO = startOfToday.toISOString();

      let pickupsData: any[] = [];
      let exceptionsData: any[] = [];

      if (fboIds.length > 0) {
        const [pickupsRes, exceptionsRes] = await Promise.all([
          supabase
            .from("pickups")
            .select("*")
            .eq("picker_id", picker.id)
            .in("fbo_id", fboIds)
            .gte("picked_up_at", startOfTodayISO)
            .order("picked_up_at", { ascending: false }),
          supabase
            .from("pickup_exceptions")
            .select("*")
            .eq("picker_id", picker.id)
            .in("fbo_id", fboIds)
            .gte("created_at", startOfTodayISO)
            .order("created_at", { ascending: false }),
        ]);

        pickupsData = pickupsRes.data ?? [];
        exceptionsData = exceptionsRes.data ?? [];
      }

      const pickupsByFBO: Record<string, Pickup> = {};

      // 1. Fill from pickups table (latest record per FBO today)
      pickupsData.forEach((p: any) => {
        if (!pickupsByFBO[p.fbo_id]) {
          pickupsByFBO[p.fbo_id] = p;
        }
      });

      // 2. Fill from exceptions table if pickups table did not contain entry today
      exceptionsData.forEach((exc: any) => {
        if (!pickupsByFBO[exc.fbo_id]) {
          pickupsByFBO[exc.fbo_id] = {
            id: exc.id,
            picker_id: picker.id,
            fbo_id: exc.fbo_id,
            route_id: null,
            liters: 0,
            price_per_liter: 0,
            total_amount: 0,
            photo_url: exc.photo_url || null,
            notes: `[ATTEMPTED_CLOSED] ${exc.reason}`,
            status: "disputed",
            picked_up_at: exc.created_at,
            created_at: exc.created_at,
          };
        }
      });

      const enrichedRoutes: RouteWithDetails[] = mergedRoutes.map((r: any) => ({
        ...r,
        pickup: pickupsByFBO[r.fbo_id],
      }));

      setRoutes(enrichedRoutes);

      // Trigger celebratory confetti if all assigned stops are completed!
      const total = enrichedRoutes.length;
      const completed = enrichedRoutes.filter((r) => r.pickup).length;
      if (total > 0 && total === completed) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#059669", "#34d399", "#f59e0b"],
        });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred fetching dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleStartNavigation(fboId: string, destination: string | null) {
    if (destination) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank");
    }
    try {
      await supabase
        .from("pickup_requests")
        .update({ status: "in_transit", updated_at: new Date().toISOString() })
        .eq("fbo_id", fboId)
        .in("status", ["pending", "assigned", "scheduled"]);
    } catch (e) {
      console.warn("Could not set pickup request status to in_transit:", e);
    }
  }

  async function handleReportClosedSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reportingClosedRoute) return;

    setSubmittingClosed(true);
    setClosedError(null);

    let lat = "";
    let lng = "";

    // Grab geolocation
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        lat = pos.coords.latitude.toString();
        lng = pos.coords.longitude.toString();
      } catch (geoErr) {
        console.warn("GPS fetch skipped or denied:", geoErr);
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication user not found.");

      const { data: picker } = await supabase
        .from("pickers")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (!picker) throw new Error("Picker profile record not found.");

      const formData = new FormData();
      formData.append("picker_id", picker.id);
      formData.append("fbo_id", reportingClosedRoute.fbo_id);
      formData.append("route_id", reportingClosedRoute.id);
      formData.append("reason", closedReason);
      formData.append("notes", closedNotes);
      if (lat) formData.append("latitude", lat);
      if (lng) formData.append("longitude", lng);
      if (closedPhoto) formData.append("photo", closedPhoto);

      const res = await fetch("/api/pickup/report-closed", {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to log closed outlet.");

      // Mark this route as attempted locally
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === reportingClosedRoute.id
            ? {
                ...r,
                pickup: {
                  id: resData.exception?.id || `closed_${Date.now()}`,
                  fbo_id: r.fbo_id,
                  picker_id: picker.id,
                  route_id: r.id,
                  liters: 0,
                  price_per_liter: 0,
                  total_amount: 0,
                  picked_up_at: new Date().toISOString(),
                  status: "pending" as any,
                  notes: `[ATTEMPTED_CLOSED] ${closedReason}`,
                  photo_url: resData.photo_url || null,
                  created_at: new Date().toISOString(),
                },
              }
            : r
        )
      );

      // Close modal & reset
      setReportingClosedRoute(null);
      setClosedReason("Outlet Closed / Shutter Down");
      setClosedNotes("");
      setClosedPhoto(null);
      setPhotoPreview(null);
    } catch (err: any) {
      setClosedError(err.message || "Failed to report closed outlet. Try again.");
    } finally {
      setSubmittingClosed(false);
    }
  }

  const pendingStops = routes.filter((r) => !r.pickup);
  const completedStops = routes.filter((r) => r.pickup);

  const completedCount = completedStops.length;
  const totalStops = routes.length;
  const progressPct = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

  return (
    <div className="min-h-screen bg-paper-grid pb-16 font-sans text-emerald-950">
      {/* Modern Field Header with Emerald Theme & Paper Accents */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 px-5 pb-9 relative rounded-b-[2rem] shadow-xl border-b-2 border-emerald-950"
        style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}
      >
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-300/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top bar with Branding & Logout */}
        <div className="flex items-center justify-between pb-4 border-b border-white/20 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center border-2 border-emerald-950 shadow-[2px_2px_0px_#064e3b]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/logo.png" alt="Mellod Logo" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-tight leading-none drop-shadow-xs">Mellod Biofuels</div>
              <div className="text-emerald-100 text-[11px] font-bold mt-0.5">Field Agent Operations</div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-white font-extrabold bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all text-xs px-3.5 py-1.5 rounded-xl border border-white/30 shadow-xs cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
            <span>Sign Out</span>
          </motion.button>
        </div>

        {/* Welcome Agent Greeting & Refresh */}
        <div className="flex justify-between items-center gap-2 relative z-10">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-emerald-950 text-emerald-950 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0px_#064e3b] flex items-center gap-1 w-max">
              <Sparkles className="w-3 h-3 text-emerald-700" />
              Active Route Dispatch
            </span>
            <h1 className="text-white text-2xl font-black tracking-tight mt-1 drop-shadow-xs">
              Hello, {pickerName.split(" ")[0]} 👋
            </h1>
            <p className="text-emerald-100 text-xs font-bold mt-0.5">{formatDate(new Date())}</p>
          </div>
          <motion.button
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
            onClick={fetchData}
            className="w-10 h-10 bg-white hover:bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-950 border-2 border-emerald-950 shadow-[2px_2px_0px_#064e3b] transition-all cursor-pointer"
            title="Refresh Route Data"
          >
            <RefreshCw className="w-4.5 h-4.5 text-emerald-700" />
          </motion.button>
        </div>

        {/* Route Progress HUD Card */}
        {totalStops > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-5 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white relative z-10"
          >
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-emerald-300" />
                Shift Progress
              </span>
              <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[11px]">
                {completedCount} / {totalStops} Stops ({progressPct}%)
              </span>
            </div>

            <div className="w-full bg-emerald-950/40 rounded-full h-3.5 p-0.5 border border-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full shadow-sm"
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Embedded Simple Check-In Card directly on Home Dashboard */}
      <div className="mx-4 mt-4 bg-white rounded-3xl p-5 border-2 border-emerald-950 shadow-[4px_4px_0px_#064e3b]">
        <div className="flex items-center justify-between mb-3 border-b-2 border-emerald-950/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-950 flex items-center justify-center text-emerald-950 font-black shadow-[1px_1px_0px_#064e3b]">
              <MapPin className="w-4.5 h-4.5 text-emerald-800" />
            </div>
            <div>
              <h2 className="text-xs font-black text-emerald-950 uppercase tracking-wider">Shift Check-In</h2>
              <p className="text-[11px] text-emerald-800/80 font-bold">
                {todayAttendance?.check_out_at
                  ? "Shift Completed for Today"
                  : todayAttendance?.check_in_at
                  ? `Checked In at ${new Date(todayAttendance.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Mark daily check-in to start pickups"}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-emerald-950 shadow-[1px_1px_0px_#064e3b] ${
            todayAttendance?.check_out_at
              ? "bg-blue-100 text-blue-950"
              : todayAttendance?.check_in_at
              ? "bg-emerald-100 text-emerald-950"
              : "bg-amber-100 text-amber-950"
          }`}>
            {todayAttendance?.check_out_at ? "Completed" : todayAttendance?.check_in_at ? "On Duty" : "Pending"}
          </span>
        </div>

        {(gpsError || attendanceError) && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{gpsError || attendanceError}</span>
          </div>
        )}

        {attendanceSuccess && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{attendanceSuccess}</span>
          </div>
        )}

        {!todayAttendance?.check_in_at ? (
          <button
            onClick={handleEmbeddedCheckIn}
            disabled={gettingGps || attendancePending}
            className="btn-paper-primary w-full py-3.5 px-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#064e3b] border-1.5 border-emerald-950"
          >
            {gettingGps ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Acquiring GPS Location...
              </>
            ) : attendancePending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Logging Check-In...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-white" />
                Check In for Today&apos;s Shift
              </>
            )}
          </button>
        ) : !todayAttendance?.check_out_at ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-emerald-50 border border-emerald-950/20 rounded-2xl p-3 text-xs font-bold text-emerald-950">
              <span className="text-[10px] text-emerald-800 uppercase block font-black">Active Shift</span>
              Checked in: {new Date(todayAttendance.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <button
              onClick={handleEmbeddedCheckOut}
              disabled={gettingGps || attendancePending}
              className="bg-slate-900 hover:bg-black text-white font-black text-xs uppercase px-4 py-3.5 rounded-2xl border-1.5 border-emerald-950 shadow-[2px_2px_0px_#064e3b] flex items-center gap-1.5 cursor-pointer"
            >
              {gettingGps || attendancePending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Check Out
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-950/20 rounded-2xl text-center text-xs font-bold text-emerald-950 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Shift completed today ({new Date(todayAttendance.check_out_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
          </div>
        )}
      </div>

      <div className="px-4 mt-5 space-y-4 relative z-10">
        {loading ? (
          <div className="space-y-4">
            <div className="paper-card p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-950 flex items-center justify-center text-emerald-800 flex-shrink-0">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-800" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-emerald-100/60 rounded-lg w-2/3 animate-pulse" />
                <div className="h-3 bg-emerald-100/60 rounded-lg w-1/2 animate-pulse" />
              </div>
            </div>

            {[1, 2, 3].map((n) => (
              <div key={n} className="paper-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-100 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-4 bg-emerald-100/60 rounded-md w-36 animate-pulse" />
                      <div className="h-3 bg-emerald-100/60 rounded-md w-24 animate-pulse" />
                    </div>
                  </div>
                  <div className="w-16 h-6 rounded-full bg-emerald-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="paper-card p-8 text-center"
          >
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-rose-600" />
            <p className="font-black text-sm text-emerald-950">{error}</p>
            <button onClick={fetchData} className="mt-4 btn-paper-primary px-4 py-2 text-xs">
              Try Again
            </button>
          </motion.div>
        ) : totalStops === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="paper-card p-12 text-center"
          >
            <MapPin className="w-12 h-12 text-emerald-700 mx-auto mb-3" />
            <h3 className="font-black text-emerald-950 text-sm">No Route Stops Assigned Today</h3>
            <p className="text-xs text-emerald-800/80 mt-1 max-w-xs mx-auto font-semibold">
              Your supervisor has not dispatched any collection routes to you for today.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Pill-Style Tab Switcher - Paper & Green */}
            <div className="flex bg-white p-1.5 rounded-2xl border-1.5 border-emerald-950 shadow-[3px_3px_0px_#064e3b] gap-1.5 relative">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pending");
                  setExpandedFboId(null);
                }}
                className={`relative z-10 flex-1 py-2.5 text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "pending" ? "text-white" : "text-emerald-900 hover:bg-emerald-50"
                }`}
              >
                {activeTab === "pending" && (
                  <motion.div
                    layoutId="pickerTabActivePill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 bg-emerald-600 rounded-xl border border-emerald-950 shadow-xs"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Pending ({pendingStops.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("completed");
                  setExpandedFboId(null);
                }}
                className={`relative z-10 flex-1 py-2.5 text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "completed" ? "text-white" : "text-emerald-900 hover:bg-emerald-50"
                }`}
              >
                {activeTab === "completed" && (
                  <motion.div
                    layoutId="pickerTabActivePill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 bg-emerald-600 rounded-xl border border-emerald-950 shadow-xs"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed ({completedStops.length})
                </span>
              </button>
            </div>

            {/* Active Tab List with Framer Motion AnimatePresence */}
            <AnimatePresence mode="wait">
              {activeTab === "pending" ? (
                <motion.div
                  key="pending-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3"
                >
                  {pendingStops.length === 0 ? (
                    <div className="paper-card p-8 text-center text-xs text-emerald-900 font-extrabold bg-emerald-50">
                      🎉 All collection stops completed for today!
                    </div>
                  ) : (
                    pendingStops.map((route, idx) => {
                      const isExpanded = expandedFboId === route.fbo_id;
                      const destination = route.fbo?.latitude && route.fbo?.longitude
                        ? `${route.fbo.latitude},${route.fbo.longitude}`
                        : null;

                      return (
                        <div
                          key={route.id}
                          className="paper-card overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFboId(isExpanded ? null : route.fbo_id)}
                            className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-emerald-50/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-950 font-black text-xs flex items-center justify-center flex-shrink-0 border border-emerald-950 shadow-[1px_1px_0px_#064e3b]">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-black text-emerald-950 text-sm truncate">
                                  {route.fbo?.business_name || "FBO Outlet"}
                                </h3>
                                <p className="text-xs text-emerald-800/80 truncate mt-0.5 font-semibold">
                                  {route.fbo?.address || "No address defined"}
                                </p>
                              </div>
                            </div>
                            <div className="text-emerald-800 flex-shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 border-t border-emerald-950/15 bg-emerald-50/30 space-y-4 animate-fade-in">
                              {route.fbo && <FBODetailInfo fbo={route.fbo} />}

                              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                {destination ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStartNavigation(route.fbo_id, destination)}
                                    className="flex-1 btn-paper-secondary py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Navigation className="w-3.5 h-3.5 text-emerald-900" />
                                    Navigate 📍
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="flex-1 text-xs py-2.5 rounded-xl font-bold bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-300"
                                  >
                                    No GPS Coords
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setReportingClosedRoute(route)}
                                  className="flex-1 py-2.5 px-3 bg-amber-400 text-emerald-950 font-black text-xs rounded-xl border-1.5 border-emerald-950 shadow-[2px_2px_0px_#064e3b] hover:bg-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5 text-emerald-950" />
                                  Report Closed 🚫
                                </button>

                                <Link
                                  href={`/picker/pickup/${route.fbo_id}?routeId=${route.id}`}
                                  className="flex-1 btn-paper-primary py-2.5 text-xs flex items-center justify-center gap-1.5"
                                >
                                  <Droplets className="w-3.5 h-3.5 text-white" />
                                  Log Pickup 🛢️
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="completed-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3"
                >
                  {completedStops.length === 0 ? (
                    <div className="paper-card p-8 text-center text-xs text-emerald-800 font-semibold italic">
                      Stops will appear here once you log their pickups.
                    </div>
                  ) : (
                    completedStops.map((route, idx) => {
                      const isExpanded = expandedFboId === route.fbo_id;
                      const pickup = route.pickup!;

                      return (
                        <div
                          key={route.id}
                          className="paper-card overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFboId(isExpanded ? null : route.fbo_id)}
                            className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-emerald-50/50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-2xl bg-emerald-200 text-emerald-950 font-black text-xs flex items-center justify-center flex-shrink-0 border border-emerald-950">
                                <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-black text-emerald-950 text-sm truncate line-through">
                                  {route.fbo?.business_name || "FBO Outlet"}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 text-[10px] font-black border border-emerald-950 shadow-[1px_1px_0px_#064e3b]">
                                    {pickup.liters} L Collected
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-emerald-800 flex-shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 border-t border-emerald-950/15 bg-emerald-50/30 space-y-4 animate-fade-in">
                              {route.fbo && <FBODetailInfo fbo={route.fbo} />}

                              <div className="p-3.5 bg-white rounded-2xl border border-emerald-950/20 space-y-2.5 shadow-xs">
                                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider border-b border-emerald-950/10 pb-1.5 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                  Collection Summary
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-emerald-800/80 block font-extrabold text-[10px] uppercase">Liters Logged</span>
                                    <span className="font-black text-emerald-950 text-sm">{pickup.liters} Liters</span>
                                  </div>
                                  <div>
                                    <span className="text-emerald-800/80 block font-extrabold text-[10px] uppercase">Status</span>
                                    <span className="font-black text-emerald-700 capitalize">{pickup.status}</span>
                                  </div>
                                </div>
                                {pickup.notes && (
                                  <div className="text-xs border-t border-emerald-950/10 pt-2 text-emerald-900">
                                    <span className="text-emerald-800/80 font-extrabold text-[10px] uppercase block">Notes:</span>
                                    <p className="text-emerald-950 italic mt-0.5 font-medium">{pickup.notes}</p>
                                  </div>
                                )}
                                {pickup.photo_url && (
                                  <div className="border-t border-emerald-950/10 pt-2.5">
                                    <span className="text-emerald-900 text-xs block mb-1 font-bold">Pickup Photo</span>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={pickup.photo_url}
                                      className="w-full h-36 object-cover rounded-xl border border-emerald-950/20 shadow-xs"
                                      alt="Logged pickup"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── REPORT CLOSED OUTLET MODAL - PAPER GREEN & WHITE ───────────────── */}
      <AnimatePresence>
        {reportingClosedRoute && (
          <div className="fixed inset-0 z-50 bg-emerald-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-[8px_8px_0px_#064e3b] border-2 border-emerald-950 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b-2 border-emerald-950 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-emerald-950 flex items-center justify-center font-bold border border-emerald-950 shadow-[1px_1px_0px_#064e3b]">
                    <Ban className="w-4 h-4 text-emerald-950" />
                  </div>
                  <div>
                    <h3 className="font-black text-emerald-950 text-sm">Report Closed Outlet</h3>
                    <p className="text-[11px] text-emerald-800 font-semibold">{reportingClosedRoute.fbo.business_name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReportingClosedRoute(null)}
                  className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-950 flex items-center justify-center font-bold border border-emerald-950 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {closedError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{closedError}</span>
                </div>
              )}

              <form onSubmit={handleReportClosedSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-emerald-950 block mb-1.5 uppercase tracking-wider">
                    Reason for Unavailability *
                  </label>
                  <select
                    value={closedReason}
                    onChange={(e) => setClosedReason(e.target.value)}
                    className="w-full text-xs font-bold bg-emerald-50/50 border border-emerald-950 rounded-2xl p-3 text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Outlet Closed / Shutter Down">Outlet Closed / Shutter Down</option>
                    <option value="Owner / Staff Unavailable">Owner / Staff Unavailable</option>
                    <option value="Access Blocked / No Entry">Access Blocked / No Entry</option>
                    <option value="Zero UCO Stock Available">Zero UCO Stock Available</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-emerald-950 block mb-1.5 uppercase tracking-wider">
                    Geotagged Photo Evidence (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setClosedPhoto(file);
                          setPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                      id="closedPhotoInput"
                    />
                    <label
                      htmlFor="closedPhotoInput"
                      className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-emerald-950/30 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-950 flex items-center justify-center gap-2 text-xs font-extrabold cursor-pointer transition-all"
                    >
                      <Camera className="w-4 h-4 text-emerald-700" />
                      <span>{closedPhoto ? "Change Photo Evidence" : "Take / Upload Photo of Closed Shutter"}</span>
                    </label>
                  </div>
                  {photoPreview && (
                    <div className="mt-2 relative rounded-2xl overflow-hidden border border-emerald-950 shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Closed outlet proof" className="w-full h-36 object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-extrabold text-emerald-950 block mb-1.5 uppercase tracking-wider">
                    Additional Field Notes
                  </label>
                  <textarea
                    rows={2}
                    value={closedNotes}
                    onChange={(e) => setClosedNotes(e.target.value)}
                    placeholder="e.g. Spoke to security, outlet opens at 5 PM..."
                    className="w-full text-xs font-medium bg-emerald-50/50 border border-emerald-950 rounded-2xl p-3 text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReportingClosedRoute(null)}
                    className="flex-1 py-3 rounded-2xl border border-emerald-950 text-xs font-bold text-emerald-950 bg-white hover:bg-emerald-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClosed}
                    className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 text-emerald-950 rounded-2xl text-xs font-black border border-emerald-950 shadow-[2px_2px_0px_#064e3b] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingClosed ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-950" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4 text-emerald-950" />
                        <span>Log Closed &amp; Release Route</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FBODetailInfo({ fbo }: { fbo: FBO }) {
  const phoneHref = fbo.phone ? `tel:${fbo.phone.replace(/[^0-9+]/g, "")}` : null;
  return (
    <div className="space-y-2 text-xs">
      {fbo.contact_person && (
        <div className="flex items-center gap-2 text-slate-800 font-medium">
          <User className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold text-slate-900">Contact:</span> {fbo.contact_person}
        </div>
      )}
      {fbo.phone && (
        <div className="flex items-center gap-2 text-slate-800 font-medium">
          <Phone className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold text-slate-900">Phone:</span>{" "}
          <a href={phoneHref!} className="text-emerald-600 font-bold hover:underline">
            {fbo.phone}
          </a>
        </div>
      )}
      <div className="flex items-start gap-2 text-slate-800 font-medium">
        <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold text-slate-900">Full Address:</span>
          <p className="text-slate-500 mt-0.5 leading-relaxed font-medium">{fbo.address}</p>
        </div>
      </div>
    </div>
  );
}
