import { createClient } from "@/lib/supabase/server";
import { formatDate, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";
import { MapPin, CheckCircle2, Clock, ChevronRight, Droplets } from "lucide-react";
import Link from "next/link";
import type { FBO, Pickup } from "@/lib/types";
import RouteMap from "./RouteMap";

interface RouteWithDetails {
  id: string;
  fbo_id: string;
  fbo: FBO;
  route_date: string;
  sort_order: number;
  pickup?: Pickup;
}

async function getTodayRoutes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { routes: [], pickerName: "" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: picker } = await supabase
    .from("pickers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!picker) return { routes: [], pickerName: profile?.full_name ?? "" };

  const today = todayISO();
  const { data: routes } = await supabase
    .from("routes")
    .select(`
      id, fbo_id, route_date, sort_order,
      fbo:fbos(*)
    `)
    .eq("picker_id", picker.id)
    .eq("route_date", today)
    .order("sort_order");

  // Get today's pickups for this picker to mark completed stops
  const { data: pickups } = await supabase
    .from("pickups")
    .select("*")
    .eq("picker_id", picker.id)
    .gte("picked_up_at", `${today}T00:00:00`)
    .lt("picked_up_at", `${today}T23:59:59`);

  const pickupsByFBO = (pickups ?? []).reduce((acc, p) => {
    acc[p.fbo_id] = p;
    return acc;
  }, {} as Record<string, Pickup>);

  const enrichedRoutes: RouteWithDetails[] = (routes ?? []).map((r: any) => ({
    ...r,
    pickup: pickupsByFBO[r.fbo_id],
  }));

  return { routes: enrichedRoutes, pickerName: profile?.full_name ?? "" };
}

export default async function PickerRoutePage() {
  const { routes, pickerName } = await getTodayRoutes();

  const completed = routes.filter((r) => r.pickup).length;
  const total = routes.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* Hero header */}
      <div className="bg-green-700 px-4 pt-4 pb-8">
        <p className="text-green-200 text-sm">Good morning,</p>
        <h1 className="text-white text-2xl font-bold mt-0.5">
          {pickerName.split(" ")[0]} 👋
        </h1>
        <p className="text-green-300 text-xs mt-1">{formatDate(new Date())}</p>

        {/* Progress */}
        {total > 0 && (
          <div className="mt-4 bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 text-sm font-medium">Today&apos;s Progress</span>
              <span className="text-white font-bold text-sm">{completed}/{total} stops</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-green-300 text-xs mt-1.5">{progressPct}% complete</p>
          </div>
        )}
      </div>

      {/* Route list — raised card style */}
      <div className="px-4 -mt-4 space-y-4 pb-6">
        {routes.length > 0 && (
          <div className="mt-4">
            <RouteMap routes={routes as any} />
          </div>
        )}

        {routes.length === 0 ? (
          <div className="card p-10 text-center mt-4">
            <MapPin className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No stops assigned today</p>
            <p className="text-gray-400 text-sm mt-1">Check with your admin for today&apos;s route.</p>
          </div>
        ) : (
          routes.map((route, idx) => {
            const isCompleted = !!route.pickup;
            return (
              <Link
                key={route.id}
                href={isCompleted ? "#" : `/picker/pickup/${route.fbo_id}?routeId=${route.id}`}
                className={`card card-interactive flex items-center gap-4 p-4 mt-${idx === 0 ? "4" : "0"} ${isCompleted ? "opacity-75 pointer-events-none" : "cursor-pointer"}`}
                style={{ marginTop: idx === 0 ? "1rem" : undefined }}
              >
                {/* Stop number */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isCompleted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isCompleted ? "text-gray-500" : "text-gray-800"}`}>
                    {route.fbo?.business_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{route.fbo?.address ?? "No address"}</p>
                  {isCompleted && route.pickup && (
                    <div className="flex items-center gap-1 mt-1">
                      <Droplets className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">
                        {route.pickup.liters}L collected
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <span className="badge badge-green">Done</span>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
