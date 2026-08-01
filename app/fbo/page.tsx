export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatLiters, formatDate, formatTime } from "@/lib/utils";
import { Droplets, IndianRupee, TrendingUp, Clock } from "lucide-react";

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
      <div className="p-8 text-center text-gray-500">
        FBO account not configured. Please contact your administrator.
      </div>
    );
  }

  if (data.fbo.is_active === false) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="card p-8 max-w-sm w-full bg-white shadow-md border border-red-100 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Account Offboarded</h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Your FBO account ({data.fbo.business_name}) has been offboarded or suspended by Mellod administration. Access to this portal is restricted.
          </p>
        </div>
      </div>
    );
  }

  const { fbo, stats, currentPrice, recentPickups } = data;

  return (
    <div className="animate-fade-in">
      {/* Welcome hero */}
      <div className="bg-green-700 px-4 pt-4 pb-8">
        <p className="text-green-200 text-sm">Welcome back,</p>
        <h1 className="text-white text-2xl font-bold mt-0.5">{fbo.business_name}</h1>
        <p className="text-green-300 text-xs mt-0.5">{fbo.address}</p>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-4">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
              <Droplets className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatLiters(Number(stats?.total_liters ?? 0))}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Total Oil Contributed</p>
          </div>

          <div className="card p-4">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center mb-3">
              <IndianRupee className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(Number(stats?.total_earnings ?? 0))}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Total Money Earned</p>
          </div>
        </div>

        {/* Market price card */}
        <div className="bg-green-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-xs font-medium">Live Market Rate</p>
              <p className="text-3xl font-bold mt-1">
                {currentPrice ? `${formatCurrency(currentPrice.price_per_liter)}/L` : "—"}
              </p>
              <p className="text-green-300 text-xs mt-1">per liter of Used Cooking Oil</p>
              {currentPrice && (
                <p className="text-green-400 text-xs mt-0.5">
                  Updated {formatDate(currentPrice.effective_from)}
                </p>
              )}
            </div>
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        {/* Total pickups */}
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Total Pickups Completed</p>
            <p className="text-xl font-bold text-gray-900">{stats?.total_pickups ?? 0} pickups</p>
          </div>
          {stats?.last_pickup_at && (
            <div className="text-right text-xs text-gray-400">
              <p>Last pickup</p>
              <p className="font-medium text-gray-600">{formatDate(stats.last_pickup_at)}</p>
            </div>
          )}
        </div>

        {/* Recent pickups */}
        {recentPickups.length > 0 && (
          <div className="card">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Recent Pickups</h2>
              <span className="text-xs text-gray-400 font-medium">Verification Status</span>
            </div>
            <div className="divide-y divide-gray-50">
              {recentPickups.map((pickup: any) => (
                <div key={pickup.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">
                        {formatDate(pickup.picked_up_at)}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          pickup.status === "completed"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-amber-100 text-amber-900 border border-amber-200"
                        }`}
                      >
                        {pickup.status === "completed" ? "Verified ✓" : "Pending Review ⏳"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{formatTime(pickup.picked_up_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{formatLiters(Number(pickup.liters))}</p>
                    <p className="text-xs text-green-600 font-medium">{formatCurrency(Number(pickup.total_amount))}</p>
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
