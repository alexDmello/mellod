export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatLiters, formatDate, formatTime } from "@/lib/utils";
import { Droplets, IndianRupee, TrendingUp, Clock } from "lucide-react";
import FBOHeader from "@/components/FBOHeader";

async function getFBOData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [fboRes, statsRes, priceRes, pickupsRes] = await Promise.all([
    supabase.from("fbos").select("*").eq("profile_id", user.id).single(),
    supabase.from("fbo_stats").select("*").eq("profile_id", user.id).single(),
    supabase.from("daily_prices").select("price_per_liter, effective_from").order("effective_from", { ascending: false }).limit(1).single(),
    supabase.from("pickups").select("*, fbo:fbos(business_name)").eq("fbo_id",
      (await supabase.from("fbos").select("id").eq("profile_id", user.id).single()).data?.id ?? ""
    ).order("picked_up_at", { ascending: false }).limit(5),
  ]);

  return {
    fbo: fboRes.data,
    stats: statsRes.data,
    currentPrice: priceRes.data,
    recentPickups: pickupsRes.data ?? [],
  };
}

import FBOMissedPickupBanner from "@/components/FBOMissedPickupBanner";
import FBORequestPickupCard from "@/components/FBORequestPickupCard";

export default async function FBODashboard() {
  const data = await getFBOData();
  if (!data?.fbo) {
    return (
      <div className="p-8 text-center text-gray-500 font-medium text-xs">
        FBO partner account not configured. Please contact your administrator.
      </div>
    );
  }

  if (data.fbo.is_active === false) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="card p-8 max-w-sm w-full bg-white shadow-2xl border border-rose-100 rounded-3xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-inner">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-lg font-black text-gray-900">Account Offboarded</h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed font-medium">
            Your FBO account ({data.fbo.business_name}) has been offboarded or suspended by Mellod administration. Access to this portal is restricted.
          </p>
        </div>
      </div>
    );
  }

  const { fbo, stats, currentPrice, recentPickups } = data;

  return (
    <div className="animate-fade-in space-y-5 pb-8 font-sans text-slate-900">
      {/* Unified Top Bar & Hero Banner */}
      <FBOHeader subtitle="Verified Partner Hub">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-300/40 text-emerald-100 text-[10px] font-extrabold uppercase tracking-wider">
              Partner Dashboard
            </span>
          </div>
          <h1 className="text-white text-2xl font-black tracking-tight drop-shadow-sm">{fbo.business_name}</h1>
          <p className="text-emerald-100/90 text-xs font-semibold line-clamp-1">{fbo.address || "Location address active"}</p>
        </div>
      </FBOHeader>

      <div className="px-4 -mt-6 relative z-10 space-y-4">
        {/* Missed Pickup Reschedule Banner */}
        <FBOMissedPickupBanner fboId={fbo.id} />

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Oil Contributed Card */}
          <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-lg shadow-slate-200/50">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center mb-3 border border-emerald-100 shadow-sm">
              <Droplets className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatLiters(Number(stats?.total_liters ?? 0))}
            </p>
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mt-1">Total Oil Contributed</p>
          </div>

          {/* Earnings Card */}
          <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-lg shadow-slate-200/50">
            <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center mb-3 border border-teal-100 shadow-sm">
              <IndianRupee className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(Number(stats?.total_earnings ?? 0))}
            </p>
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mt-1">Total Money Earned</p>
          </div>
        </div>

        {/* Request Pickup Feature (Replaces Live Market Buying Rate Card) */}
        <FBORequestPickupCard fboId={fbo.id} />

        {/* Total Pickups Completed */}
        <div className="bg-white rounded-2xl p-4.5 flex items-center gap-4 border border-slate-100 shadow-lg shadow-slate-200/50">
          <div className="w-11 h-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/20">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Completed Pickups</p>
            <p className="text-xl font-black text-slate-900">{stats?.total_pickups ?? 0} Collections</p>
          </div>
          {stats?.last_pickup_at && (
            <div className="text-right text-xs">
              <p className="text-[9px] text-slate-400 font-extrabold uppercase">LAST COLLECTION</p>
              <p className="font-bold text-slate-800 mt-0.5">{formatDate(stats.last_pickup_at)}</p>
            </div>
          )}
        </div>

        {/* Recent Pickups Timeline */}
        {recentPickups.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-black text-slate-900 text-sm">Recent Collection Activity</h2>
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Live Status
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {recentPickups.map((pickup: any) => (
                <div key={pickup.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">
                        {formatDate(pickup.picked_up_at)}
                      </p>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          pickup.status === "completed"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            : "bg-amber-100 text-amber-900 border border-amber-200"
                        }`}
                      >
                        {pickup.status === "completed" ? "Verified ✓" : "Pending Review ⏳"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{formatTime(pickup.picked_up_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">{formatLiters(Number(pickup.liters))}</p>
                    <p className="text-xs text-emerald-700 font-extrabold">{formatCurrency(Number(pickup.total_amount))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
