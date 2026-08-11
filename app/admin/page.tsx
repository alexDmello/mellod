"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatLiters } from "@/lib/utils";
import {
  Building2,
  Truck,
  Droplets,
  Clock,
  Activity,
  Loader2,
  Maximize2,
  Leaf,
  Globe2,
  Sparkles,
  CalendarDays,
  Radio,
  Zap,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

const POLL_INTERVAL_MS = 15_000; // Live refresh every 15 seconds

interface PlatformStats {
  activeFBOs: number;
  activePickers: number;
  totalPickups: number;
  totalLiters: number;
  todayPickups: number;
  todayLiters: number;
  monthPickups: number;
  monthLiters: number;
}

interface RecentPickup {
  id: string;
  liters: number;
  picked_up_at: string;
  status: string;
  fbo: { business_name: string } | null;
  picker: { profile: { full_name: string } | null } | null;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats>({
    activeFBOs: 0,
    activePickers: 0,
    totalPickups: 0,
    totalLiters: 0,
    todayPickups: 0,
    todayLiters: 0,
    monthPickups: 0,
    monthLiters: 0,
  });
  const [recentPickups, setRecentPickups] = useState<RecentPickup[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Live second clock for banner
  useEffect(() => {
    setCurrentTime(new Date());
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const fetchDashboardData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const [
        fbosCountRes,
        pickersCountRes,
        pickupsRes,
        todayPickupsRes,
        monthPickupsRes,
        recentRes,
      ] = await Promise.all([
        supabase.from("fbos").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("pickers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("pickups").select("liters").eq("status", "completed"),
        supabase
          .from("pickups")
          .select("liters")
          .eq("status", "completed")
          .gte("picked_up_at", `${todayStr}T00:00:00`)
          .lte("picked_up_at", `${todayStr}T23:59:59`),
        supabase
          .from("pickups")
          .select("liters")
          .eq("status", "completed")
          .gte("picked_up_at", `${monthStart}T00:00:00`),
        supabase
          .from("pickups")
          .select(
            `id, liters, picked_up_at, status,
             fbo:fbos(business_name),
             picker:pickers(profile:profiles(full_name))`
          )
          .order("picked_up_at", { ascending: false })
          .limit(1),
      ]);

      const totalLiters = pickupsRes.data?.reduce((s, p) => s + Number(p.liters), 0) ?? 0;
      const todayLiters = todayPickupsRes.data?.reduce((s, p) => s + Number(p.liters), 0) ?? 0;
      const monthLiters = monthPickupsRes.data?.reduce((s, p) => s + Number(p.liters), 0) ?? 0;

      setStats({
        activeFBOs: fbosCountRes.count ?? 0,
        activePickers: pickersCountRes.count ?? 0,
        totalPickups: pickupsRes.data?.length ?? 0,
        totalLiters,
        todayPickups: todayPickupsRes.data?.length ?? 0,
        todayLiters,
        monthPickups: monthPickupsRes.data?.length ?? 0,
        monthLiters,
      });

      setRecentPickups((recentRes.data as any[]) ?? []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Live polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Fullscreen toggle + Esc listener
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Format date & time strings
  const formattedDay = currentTime
    ? currentTime.toLocaleDateString("en-IN", { weekday: "long" })
    : "";

  const formattedFullDate = currentTime
    ? currentTime.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const formattedTime = currentTime
    ? currentTime.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "";

  const monthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Ecological impact calculations
  const co2SavedKg = Math.round(stats.totalLiters * 2.5);
  const waterProtectedLiters = Math.round(stats.totalLiters * 1000);
  const latestPickup = recentPickups[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-700 mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Loading live dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-[calc(100vh-5.5rem)] flex flex-col justify-between space-y-6 animate-fade-in ${
        isFullscreen ? "bg-slate-950 p-6 md:p-8 overflow-hidden !min-h-screen" : ""
      }`}
    >
      {/* ── Futuristic HUD Live Clock & Date Banner with Dynamic Mesh Animations ── */}
      <div className="relative rounded-[2rem] p-6 md:p-8 text-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-emerald-500/20 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 flex-shrink-0 group">
        {/* Animated ambient backdrop mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#05966950,transparent_55%),radial-gradient(circle_at_70%_80%,#0d948845,transparent_55%)] animate-pulse duration-[4000ms]" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-bounce duration-[10000ms]" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse duration-[8000ms]" />
        
        {/* Technical grid lines overlay */}
        <div className="absolute inset-0 bg-canvas-grid-dark opacity-40 pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                00 // WORKSTATION
              </span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-200 hidden sm:inline-block">
                MELLOD LIVE COMMAND SYSTEM
              </span>
            </div>

            {/* Desktop Fullscreen Button — Hidden when in Fullscreen mode */}
            {!isFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="hidden lg:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-full transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-95 hover:scale-105"
                title="Enter fullscreen mode"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Fullscreen Mode</span>
              </button>
            )}
          </div>

          {/* Unified High-Impact Digital Clock & Date Layout */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-6 shadow-2xl transition-all duration-500 hover:bg-white/[0.08] hover:border-white/20">
            {/* TIME DISPLAY */}
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Clock className="w-7 h-7 animate-spin duration-[20000ms]" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-300 font-mono tracking-widest block mb-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  REAL-TIME CLOCK
                </span>
                <div className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight text-white drop-shadow-md">
                  {formattedTime || "00:00:00 AM"}
                </div>
              </div>
            </div>

            {/* Center Glowing Divider */}
            <div className="hidden lg:block w-px h-16 bg-gradient-to-b from-transparent via-emerald-400/50 to-transparent animate-pulse" />

            {/* DATE DISPLAY */}
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <CalendarDays className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-teal-300 font-mono tracking-widest block mb-0.5">
                  {formattedDay || "TODAY"}
                </span>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
                  {formattedFullDate || "2026"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active FBOs, Active Pickers & Recent Pickup Activity (Workstation Cards with 2rem Radii & Index Tags) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {/* Active FBOs Card */}
        <div className="group relative overflow-hidden rounded-[2rem] p-6 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.07)] hover:border-blue-300/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Building2 className="w-5.5 h-5.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">01/04</span>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-400">
                    Partner Directory
                  </h3>
                </div>
                <p className="text-base font-bold text-slate-900">
                  Active FBO Outlets
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold font-mono border border-emerald-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Verified</span>
            </div>
          </div>

          <div className="my-auto py-4 flex items-baseline justify-between">
            <div>
              <span className="text-4xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                {stats.activeFBOs}
              </span>
              <span className="ml-2 text-xs font-mono font-medium text-slate-500">
                registered outlets
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              Onboarded Status
            </span>
            <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">100% Operational</span>
          </div>
        </div>

        {/* Active Pickers Card */}
        <div className="group relative overflow-hidden rounded-[2rem] p-6 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.07)] hover:border-purple-300/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Truck className="w-5.5 h-5.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">02/04</span>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-400">
                    Field Logistics
                  </h3>
                </div>
                <p className="text-base font-bold text-slate-900">
                  Active Collection Agents
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 text-[10px] font-bold font-mono border border-purple-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span>On Field</span>
            </div>
          </div>

          <div className="my-auto py-4 flex items-baseline justify-between">
            <div>
              <span className="text-4xl font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                {stats.activePickers}
              </span>
              <span className="ml-2 text-xs font-mono font-medium text-slate-500">
                licensed pickers
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
              Vehicle Assignments
            </span>
            <span className="font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">Dispatch Ready</span>
          </div>
        </div>

        {/* Recent Pickup Activity Card */}
        <div className="group relative overflow-hidden rounded-[2rem] p-6 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.07)] hover:border-emerald-300/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Droplets className="w-5.5 h-5.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">03/04</span>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-400">
                    Latest Activity
                  </h3>
                </div>
                <p className="text-base font-bold text-slate-900">
                  Recent Pickup
                </p>
              </div>
            </div>

            {latestPickup && (
              <span
                className={`text-[10px] font-bold font-mono px-3 py-1 rounded-full uppercase tracking-wider ${
                  latestPickup.status === "completed"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {latestPickup.status}
              </span>
            )}
          </div>

          <div className="my-auto py-4 flex items-baseline justify-between">
            {latestPickup ? (
              <div>
                <span className="text-4xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                  {formatLiters(Number(latestPickup.liters))}
                </span>
                <span className="ml-2 text-xs font-mono font-medium text-slate-500 truncate block sm:inline">
                  from {latestPickup.fbo?.business_name ?? "FBO"}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xl font-bold font-mono text-slate-400">No Pickups</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="truncate">By: {latestPickup?.picker?.profile?.full_name ?? "—"}</span>
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" />
              {latestPickup
                ? new Date(latestPickup.picked_up_at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Today's Activity + This Month's Volume (Mesh Gradient Dark Cards) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* Today's Activity */}
        <div className="group relative overflow-hidden mesh-gradient-dark rounded-[2rem] p-6 text-white flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-800 hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest">Today&apos;s Activity</span>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              LOG // TODAY
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-auto py-3">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-4xl font-black text-white">{stats.todayPickups}</div>
              <p className="text-slate-400 text-xs mt-1 font-mono">Pickups completed</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-4xl font-black text-emerald-400">{formatLiters(stats.todayLiters)}</div>
              <p className="text-slate-400 text-xs mt-1 font-mono">Volume collected</p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Realtime telemetry active</span>
            </span>
            <span className="text-emerald-400 font-bold">15s refresh</span>
          </div>
        </div>

        {/* This Month's Volume */}
        <div className="group relative overflow-hidden mesh-gradient-dark rounded-[2rem] p-6 text-white flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-800 hover:border-sky-500/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Droplets className="w-4 h-4 text-sky-400" />
              </div>
              <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest">This Month&apos;s Volume</span>
            </div>
            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
              LOG // MONTH
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-auto py-3">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-4xl font-black text-white">{stats.monthPickups}</div>
              <p className="text-slate-400 text-xs mt-1 font-mono">Pickups this month</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-4xl font-black text-sky-400">{formatLiters(stats.monthLiters)}</div>
              <p className="text-slate-400 text-xs mt-1 font-mono">Volume this month</p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>{monthLabel}</span>
            </span>
            <span className="text-sky-400 font-bold">Monthly Cumulative</span>
          </div>
        </div>
      </div>

      {/* ── Eco & Environmental Impact Container (Mesh Gradient Inner Box & Soft Highlights) ── */}
      <div className="group rounded-[2rem] p-6 mesh-gradient-emerald border border-emerald-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-all duration-300 flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Leaf className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-700">04/04</span>
                <h2 className="font-bold text-base text-emerald-950">
                  Environmental Impact &amp; Sustainability
                </h2>
              </div>
              <p className="text-xs text-emerald-800 font-medium">
                Positive ecological contribution derived from all-time UCO collections
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/10 text-emerald-800 text-xs font-bold font-mono border border-emerald-300/60">
            <Globe2 className="w-4 h-4 text-emerald-600 animate-spin duration-[25000ms]" />
            <span>Green Energy Initiative</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 my-auto py-2">
          <div className="p-5 rounded-[1.5rem] bg-white/90 backdrop-blur-md border border-emerald-100 shadow-md shadow-emerald-950/5 hover:border-emerald-300 transition-colors">
            <span className="text-[10px] font-bold font-mono text-emerald-700 uppercase tracking-widest flex items-center justify-between">
              CO₂ Emissions Prevented
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <div className="text-2xl font-black mt-1 text-slate-900 font-mono">
              {co2SavedKg.toLocaleString("en-IN")} kg
            </div>
            {/* Animated progress fill bar */}
            <div className="w-full bg-emerald-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-[78%] animate-pulse" />
            </div>
          </div>

          <div className="p-5 rounded-[1.5rem] bg-white/90 backdrop-blur-md border border-emerald-100 shadow-md shadow-emerald-950/5 hover:border-teal-300 transition-colors">
            <span className="text-[10px] font-bold font-mono text-teal-700 uppercase tracking-widest flex items-center justify-between">
              Water Bodies Protected
              <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
            </span>
            <div className="text-2xl font-black mt-1 text-slate-900 font-mono">
              {(waterProtectedLiters / 1000000).toFixed(1)} Million L
            </div>
            {/* Animated progress fill bar */}
            <div className="w-full bg-teal-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full w-[85%] animate-pulse" />
            </div>
          </div>

          <div className="p-5 rounded-[1.5rem] bg-white/90 backdrop-blur-md border border-emerald-100 shadow-md shadow-emerald-950/5 hover:border-green-300 transition-colors">
            <span className="text-[10px] font-bold font-mono text-green-700 uppercase tracking-widest flex items-center justify-between">
              Biodiesel Feedstock Supply
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            </span>
            <div className="text-2xl font-black mt-1 text-slate-900 font-mono">
              {formatLiters(stats.totalLiters)}
            </div>
            {/* Animated progress fill bar */}
            <div className="w-full bg-green-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-green-600 h-full rounded-full w-[92%] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
