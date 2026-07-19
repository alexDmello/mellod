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
  Leaf,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FBO, Pickup } from "@/lib/types";

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

      // Fetch profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setPickerName(profile?.full_name ?? "Picker");

      // Fetch picker relation
      const { data: picker } = await supabase
        .from("pickers")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (!picker) {
        setError("Picker account details could not be found. Contact admin.");
        setLoading(false);
        return;
      }

      const today = todayISO();

      // Fetch today's assigned routes
      const { data: routesData } = await supabase
        .from("routes")
        .select(`
          id, fbo_id, route_date, sort_order,
          fbo:fbos(*)
        `)
        .eq("picker_id", picker.id)
        .eq("route_date", today)
        .order("sort_order");

      // Fetch today's logged pickups for this picker
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
    <div className="animate-fade-in min-h-screen bg-gray-50 pb-12">
      {/* Premium Header */}
      <div className="bg-green-700 px-4 pt-8 pb-9 relative rounded-b-[2rem] shadow-md safe-top">
        {/* Merged Header & Logo bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none">Mellod</div>
              <div className="text-green-200 text-xs mt-0.5">Picker App</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-lg"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Welcome Section */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-green-200 text-xs tracking-wide uppercase font-semibold">Logistics Portal</p>
            <h1 className="text-white text-2xl font-black mt-0.5">
              Hello, {pickerName.split(" ")[0]} 👋
            </h1>
            <p className="text-green-300 text-xs mt-1">{formatDate(new Date())}</p>
          </div>
          <button
            onClick={fetchData}
            className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Card */}
        {totalStops > 0 && (
          <div className="mt-5 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 text-sm font-semibold">Today's Progress</span>
              <span className="text-white font-black text-sm">{completedCount} / {totalStops} Stops Done</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-green-200 text-[10px] mt-1.5 font-medium">
              <span>{progressPct}% Completed</span>
              <span>{totalStops - completedCount} pending collections</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-6 space-y-4">
        {loading ? (
          <div className="card p-12 text-center flex flex-col items-center justify-center bg-white border border-gray-100 shadow-sm mt-4">
            <Loader2 className="w-8 h-8 animate-spin text-green-700 mb-3" />
            <p className="text-sm font-medium text-gray-600">Loading daily route stops...</p>
          </div>
        ) : error ? (
          <div className="card p-8 text-center bg-white border border-red-100 shadow-sm mt-4 text-red-600">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
            <p className="font-semibold">{error}</p>
            <button onClick={fetchData} className="btn btn-primary mt-4 btn-sm">
              Try Again
            </button>
          </div>
        ) : totalStops === 0 ? (
          <div className="card p-12 text-center bg-white border border-gray-100 shadow-sm mt-4">
            <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <h3 className="font-bold text-gray-700">No Stops Assigned Today</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
              Your supervisor has not dispatched any collection routes to you for today.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pill-Style Premium Tab Switcher */}
            <div className="flex bg-gray-200/50 p-1 rounded-xl border border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pending");
                  setExpandedFboId(null);
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "pending"
                    ? "bg-white text-green-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Pending ({pendingStops.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("completed");
                  setExpandedFboId(null);
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "completed"
                    ? "bg-white text-green-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed ({completedStops.length})
              </button>
            </div>

            {/* Conditionally Render Active Tab Panel */}
            {activeTab === "pending" ? (
              <div className="space-y-2.5">
                {pendingStops.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-gray-200 rounded-2xl bg-white text-xs text-gray-400 font-medium">
                    🎉 All collections completed for today!
                  </div>
                ) : (
                  pendingStops.map((route, idx) => {
                    const isExpanded = expandedFboId === route.fbo_id;
                    const phoneHref = route.fbo.phone ? `tel:${route.fbo.phone}` : null;
                    const destination = route.fbo.latitude && route.fbo.longitude
                      ? `${route.fbo.latitude},${route.fbo.longitude}`
                      : null;

                    return (
                      <div
                        key={route.id}
                        className="card overflow-hidden bg-white border border-gray-100 shadow-sm transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFboId(isExpanded ? null : route.fbo_id)}
                          className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-800 text-sm truncate">
                                {route.fbo.business_name}
                              </h3>
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {route.fbo.address || "No address defined"}
                              </p>
                            </div>
                          </div>
                          <div className="text-gray-400 flex-shrink-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-50 bg-gray-50/30 space-y-4">
                            <div className="space-y-2 text-xs">
                              {route.fbo.contact_person && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <User className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="font-medium">Contact:</span> {route.fbo.contact_person}
                                </div>
                              )}
                              {route.fbo.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="font-medium">Phone:</span>{" "}
                                  <a href={phoneHref!} className="text-green-700 font-semibold hover:underline">
                                    {route.fbo.phone}
                                  </a>
                                </div>
                              )}
                              <div className="flex items-start gap-2 text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                                <div>
                                  <span className="font-medium">Full Address:</span>
                                  <p className="text-gray-500 mt-0.5 leading-relaxed">{route.fbo.address}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {destination ? (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary flex-1 text-xs py-2 flex items-center justify-center gap-1.5 bg-white"
                                >
                                  <Navigation className="w-3.5 h-3.5 text-green-700" />
                                  Navigate
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="btn btn-secondary flex-1 text-xs py-2 opacity-50 cursor-not-allowed bg-white"
                                >
                                  No Location Coords
                                </button>
                              )}
                              <Link
                                href={`/picker/pickup/${route.fbo_id}?routeId=${route.id}`}
                                className="btn btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
                              >
                                <Droplets className="w-3.5 h-3.5" />
                                Log Pickup
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {completedStops.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-gray-200 rounded-2xl bg-white text-xs text-gray-400 italic">
                    Stops will appear here once you log their pickups.
                  </div>
                ) : (
                  completedStops.map((route) => {
                    const isExpanded = expandedFboId === route.fbo_id;
                    const phoneHref = route.fbo.phone ? `tel:${route.fbo.phone}` : null;
                    const pickup = route.pickup!;

                    return (
                      <div
                        key={route.id}
                        className="card overflow-hidden bg-white border border-gray-100 shadow-sm opacity-95"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFboId(isExpanded ? null : route.fbo_id)}
                          className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-green-50 text-green-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-500 text-sm truncate line-through">
                                {route.fbo.business_name}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="badge badge-green text-[10px] py-0.5 px-1.5">
                                  {pickup.liters} L Collected
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-gray-400 flex-shrink-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-50 bg-gray-50/30 space-y-4">
                            <div className="space-y-2 text-xs">
                              {route.fbo.contact_person && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <User className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="font-medium">Contact:</span> {route.fbo.contact_person}
                                </div>
                              )}
                              {route.fbo.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="font-medium">Phone:</span>{" "}
                                  <a href={phoneHref!} className="text-green-700 font-semibold hover:underline">
                                    {route.fbo.phone}
                                  </a>
                                </div>
                              )}
                              <div className="flex items-start gap-2 text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                                <div>
                                  <span className="font-medium">Address:</span>
                                  <p className="text-gray-500 mt-0.5">{route.fbo.address}</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-2.5">
                              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-50 pb-1.5 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-green-700" />
                                Collection Summary
                              </h4>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-gray-400 block">Liters Logged</span>
                                  <span className="font-bold text-gray-800 text-sm">{pickup.liters} Liters</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block">Status</span>
                                  <span className="font-semibold text-green-700 capitalize">{pickup.status}</span>
                                </div>
                              </div>
                              {pickup.notes && (
                                <div className="text-xs border-t border-gray-50 pt-2 text-gray-600">
                                  <span className="text-gray-400 font-medium block">Notes:</span>
                                  <p className="text-gray-500 italic mt-0.5">{pickup.notes}</p>
                                </div>
                              )}
                              {pickup.photo_url && (
                                <div className="border-t border-gray-50 pt-2.5">
                                  <span className="text-gray-400 text-xs block mb-1 font-medium">Pickup Photo</span>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={pickup.photo_url}
                                    className="w-full h-32 object-cover rounded-xl border border-gray-100"
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
