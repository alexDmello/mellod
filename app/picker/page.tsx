"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, todayISO } from "@/lib/utils";
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

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

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

      const { data: routesData } = await supabase
        .from("routes")
        .select(`
          id, fbo_id, route_date, sort_order,
          fbo:fbos(*)
        `)
        .eq("picker_id", picker.id)
        .eq("route_date", today)
        .order("sort_order");

      const { data: pickupsData } = await supabase
        .from("pickups")
        .select("*")
        .eq("picker_id", picker.id)
        .gte("picked_up_at", `${today}T00:00:00`)
        .lt("picked_up_at", `${today}T23:59:59`);

      const pickupsByFBO = (pickupsData ?? []).reduce((acc, p) => {
        acc[p.fbo_id] = p;
        return acc;
      }, {} as Record<string, Pickup>);

      const enrichedRoutes: RouteWithDetails[] = (routesData ?? []).map((r: any) => ({
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

  const pendingStops = routes.filter((r) => !r.pickup);
  const completedStops = routes.filter((r) => r.pickup);

  const completedCount = completedStops.length;
  const totalStops = routes.length;
  const progressPct = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 font-sans">
      {/* Modern Field Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 px-5 pb-9 relative rounded-b-[2rem] shadow-2xl shadow-emerald-950/20 border-b border-emerald-500/20"
        style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}
      >
        {/* Top bar with Branding & Logout */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
              <img src="/icons/logo.png" alt="Mellod Logo" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-tight leading-none">Mellod Biofuels</div>
              <div className="text-emerald-300 text-[11px] font-medium mt-0.5">Field Agent Operations</div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-emerald-200 hover:text-white transition-colors text-xs font-bold bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 shadow-sm cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </motion.button>
        </div>

        {/* Welcome Agent Greeting */}
        <div className="flex justify-between items-center">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Active Route Dispatch
            </span>
            <h1 className="text-white text-2xl font-black tracking-tight mt-1">
              Hello, {pickerName.split(" ")[0]} 👋
            </h1>
            <p className="text-emerald-200/80 text-xs font-medium mt-0.5">{formatDate(new Date())}</p>
          </div>
          <motion.button
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
            onClick={fetchData}
            className="w-10 h-10 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/25 border border-white/20 transition-all shadow-sm cursor-pointer"
            title="Refresh Route Data"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </motion.button>
        </div>

        {/* Route Progress HUD Card */}
        {totalStops > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mt-5 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/15 shadow-inner"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Daily Route Progress</span>
              <span className="text-white font-black text-xs">{completedCount} / {totalStops} Stops Done</span>
            </div>
            <div className="h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full shadow-sm"
              />
            </div>
            <div className="flex justify-between text-emerald-200 text-[10px] mt-2 font-semibold">
              <span>{progressPct}% Completed</span>
              <span>{totalStops - completedCount} pending collections</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      <div className="px-4 mt-5 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-300/40 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded-lg w-2/3 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded-lg w-1/2 animate-pulse" />
              </div>
            </div>

            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-100 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-4 bg-slate-200 rounded-md w-36 animate-pulse" />
                      <div className="h-3 bg-slate-100 rounded-md w-24 animate-pulse" />
                    </div>
                  </div>
                  <div className="w-16 h-6 rounded-full bg-slate-100 animate-pulse" />
                </div>
                <div className="h-10 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 text-center border border-rose-100 shadow-xl text-rose-600"
          >
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-rose-500" />
            <p className="font-bold text-sm">{error}</p>
            <button onClick={fetchData} className="mt-4 py-2 px-4 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md">
              Try Again
            </button>
          </motion.div>
        ) : totalStops === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-xl shadow-slate-200/60"
          >
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">No Route Stops Assigned Today</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-medium">
              Your supervisor has not dispatched any collection routes to you for today.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Pill-Style Tab Switcher (Smooth Spring Slider) */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 gap-1.5 relative">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pending");
                  setExpandedFboId(null);
                }}
                className={`relative z-10 flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "pending" ? "text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {activeTab === "pending" && (
                  <motion.div
                    layoutId="pickerTabActivePill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 bg-emerald-700 rounded-xl shadow-md shadow-emerald-700/20"
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
                className={`relative z-10 flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "completed" ? "text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {activeTab === "completed" && (
                  <motion.div
                    layoutId="pickerTabActivePill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 bg-emerald-700 rounded-xl shadow-md shadow-emerald-700/20"
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
                    <div className="p-8 text-center border border-dashed border-emerald-200 rounded-2xl bg-emerald-50/50 text-xs text-emerald-800 font-bold">
                      🎉 All collection stops completed for today!
                    </div>
                  ) : (
                    pendingStops.map((route, idx) => {
                      const isExpanded = expandedFboId === route.fbo_id;
                      const destination = route.fbo.latitude && route.fbo.longitude
                        ? `${route.fbo.latitude},${route.fbo.longitude}`
                        : null;

                      return (
                        <motion.div
                          key={route.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.04 }}
                          className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFboId(isExpanded ? null : route.fbo_id)}
                            className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 font-black text-xs flex items-center justify-center flex-shrink-0 border border-amber-100 shadow-sm">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-900 text-sm truncate">
                                  {route.fbo.business_name}
                                </h3>
                                <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                                  {route.fbo.address || "No address defined"}
                                </p>
                              </div>
                            </div>
                            <div className="text-slate-400 flex-shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4"
                            >
                              <FBODetailInfo fbo={route.fbo} />

                              <div className="flex gap-2">
                                {destination ? (
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-xs py-2.5 rounded-xl font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                  >
                                    <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                                    Navigate 📍
                                  </a>
                                ) : (
                                  <button
                                    disabled
                                    className="flex-1 text-xs py-2.5 rounded-xl font-bold bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                  >
                                    No GPS Coords
                                  </button>
                                )}

                                <Link
                                  href={`/picker/pickup/${route.fbo_id}?routeId=${route.id}`}
                                  className="flex-1 text-xs py-2.5 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all"
                                >
                                  <Droplets className="w-3.5 h-3.5" />
                                  Log Pickup 🛢️
                                </Link>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
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
                    <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-white text-xs text-slate-400 italic">
                      Stops will appear here once you log their pickups.
                    </div>
                  ) : (
                    completedStops.map((route, idx) => {
                      const isExpanded = expandedFboId === route.fbo_id;
                      const pickup = route.pickup!;

                      return (
                        <motion.div
                          key={route.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.04 }}
                          className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-lg shadow-slate-200/50 transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFboId(isExpanded ? null : route.fbo_id)}
                            className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center flex-shrink-0 border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-800 text-sm truncate line-through">
                                  {route.fbo.business_name}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black">
                                    {pickup.liters} L Collected
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-slate-400 flex-shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4"
                            >
                              <FBODetailInfo fbo={route.fbo} />

                              <div className="p-3.5 bg-white rounded-2xl border border-slate-100 space-y-2.5">
                                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                  Collection Summary
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Liters Logged</span>
                                    <span className="font-black text-slate-900 text-sm">{pickup.liters} Liters</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Status</span>
                                    <span className="font-bold text-emerald-700 capitalize">{pickup.status}</span>
                                  </div>
                                </div>
                                {pickup.notes && (
                                  <div className="text-xs border-t border-slate-100 pt-2 text-slate-600">
                                    <span className="text-slate-400 font-bold text-[10px] uppercase block">Notes:</span>
                                    <p className="text-slate-600 italic mt-0.5">{pickup.notes}</p>
                                  </div>
                                )}
                                {pickup.photo_url && (
                                  <div className="border-t border-slate-100 pt-2.5">
                                    <span className="text-slate-400 text-xs block mb-1 font-bold">Pickup Photo</span>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={pickup.photo_url}
                                      className="w-full h-36 object-cover rounded-xl border border-slate-100 shadow-sm"
                                      alt="Logged pickup"
                                    />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function FBODetailInfo({ fbo }: { fbo: FBO }) {
  const phoneHref = fbo.phone ? `tel:${fbo.phone.replace(/[^0-9+]/g, "")}` : null;
  return (
    <div className="space-y-2 text-xs">
      {fbo.contact_person && (
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-900">Contact:</span> {fbo.contact_person}
        </div>
      )}
      {fbo.phone && (
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-900">Phone:</span>{" "}
          <a href={phoneHref!} className="text-emerald-700 font-bold hover:underline">
            {fbo.phone}
          </a>
        </div>
      )}
      <div className="flex items-start gap-2 text-slate-700 font-medium">
        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold text-slate-900">Full Address:</span>
          <p className="text-slate-600 mt-0.5 leading-relaxed">{fbo.address}</p>
        </div>
      </div>
    </div>
  );
}
