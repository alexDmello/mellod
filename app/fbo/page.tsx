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
    <div className="animate-fade-in space-y-4 pb-8 font-sans">
      {/* Unified Top Bar & Hero Banner */}
      <FBOHeader subtitle="Verified Partner Hub">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              Partner Dashboard
            </span>
          </div>
          <h1 className="text-white text-2xl font-black tracking-tight">{fbo.business_name}</h1>
          <p className="text-emerald-200/80 text-xs font-medium line-clamp-1">{fbo.address || "Location address active"}</p>
        </div>
      </FBOHeader>

      <div className="px-4 -mt-6 relative z-10 space-y-4">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Oil Contributed Card */}
          <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 transition-all hover:shadow-2xl">
            <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center mb-3 shadow-sm border border-teal-100">
              <Droplets className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              {formatLiters(Number(stats?.total_liters ?? 0))}
            </p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Total Oil Contributed</p>
          </div>

          {/* Earnings Card */}
          <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 transition-all hover:shadow-2xl">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center mb-3 shadow-sm border border-emerald-100">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              {formatCurrency(Number(stats?.total_earnings ?? 0))}
            </p>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Total Money Earned</p>
          </div>
        </div>

        {/* Live Market Price Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-800 to-teal-900 rounded-2xl p-5 text-white shadow-xl shadow-emerald-900/20 border border-emerald-700/50">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider">Live Market Buying Rate</p>
              <p className="text-3xl font-black mt-1 tracking-tight text-white">
                {currentPrice ? `${formatCurrency(currentPrice.price_per_liter)}/L` : "—"}
              </p>
              <p className="text-emerald-200/90 text-xs font-medium mt-1">Per Liter of Used Cooking Oil (UCO)</p>
              {currentPrice && (
                <p className="text-emerald-300 text-[10px] font-semibold mt-1 bg-emerald-950/40 px-2 py-0.5 rounded-md inline-block border border-emerald-500/20">
                  Effective from {formatDate(currentPrice.effective_from)}
                </p>
              )}
            </div>
            <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        {/* Total Pickups Completed */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 flex items-center gap-4">
          <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-100">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Pickups</p>
            <p className="text-xl font-black text-gray-900">{stats?.total_pickups ?? 0} Collections</p>
          </div>
          {stats?.last_pickup_at && (
            <div className="text-right text-xs">
              <p className="text-[10px] text-gray-400 font-semibold">LAST COLLECTION</p>
              <p className="font-bold text-gray-700 mt-0.5">{formatDate(stats.last_pickup_at)}</p>
            </div>
          )}
        </div>

        {/* Recent Pickups Timeline */}
        {recentPickups.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="font-bold text-gray-900 text-sm">Recent Collection Activity</h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                Live Status
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {recentPickups.map((pickup: any) => (
                <div key={pickup.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900">
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
                    <p className="text-[11px] text-gray-400 font-medium">{formatTime(pickup.picked_up_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900">{formatLiters(Number(pickup.liters))}</p>
                    <p className="text-xs text-emerald-700 font-bold">{formatCurrency(Number(pickup.total_amount))}</p>
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
