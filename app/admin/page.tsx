import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatLiters } from "@/lib/utils";

export const dynamic = "force-dynamic";
import { Users, Droplets, TrendingUp, MapPin, ArrowUpRight } from "lucide-react";
import Link from "next/link";

async function getDashboardStats() {
  const supabase = await createClient();

  const [fbosRes, pickersRes, pickupsRes, pendingRes, priceRes] = await Promise.all([
    supabase.from("fbos").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("pickers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("pickups").select("liters, total_amount").eq("status", "completed"),
    supabase.from("pickups").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("daily_prices").select("price_per_liter").order("effective_from", { ascending: false }).limit(1).single(),
  ]);

  const totalLiters = pickupsRes.data?.reduce((s, p) => s + Number(p.liters), 0) ?? 0;
  const totalEarnings = pickupsRes.data?.reduce((s, p) => s + Number(p.total_amount), 0) ?? 0;

  return {
    activeFBOs: fbosRes.count ?? 0,
    activePickers: pickersRes.count ?? 0,
    totalPickups: pickupsRes.data?.length ?? 0,
    pendingReviewsCount: pendingRes.count ?? 0,
    totalLiters,
    totalEarnings,
    currentPrice: priceRes.data?.price_per_liter ?? 0,
  };
}

async function getRecentPickups() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pickups")
    .select(`
      id, liters, total_amount, picked_up_at, status,
      fbo:fbos(business_name),
      picker:pickers(profile:profiles(full_name))
    `)
    .order("picked_up_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

export default async function AdminDashboard() {
  const [stats, recentPickups] = await Promise.all([getDashboardStats(), getRecentPickups()]);

  const statCards = [
    {
      label: "Active FBOs",
      value: stats.activeFBOs,
      icon: Users,
      color: "bg-blue-50 text-blue-700",
      href: "/admin/fbo?tab=onboarding",
    },
    {
      label: "Active Pickers",
      value: stats.activePickers,
      icon: Users,
      color: "bg-purple-50 text-purple-700",
      href: "/admin/pickers?tab=onboarding",
    },
    {
      label: "Total Pickups",
      value: stats.totalPickups,
      icon: Droplets,
      color: "bg-green-50 text-green-700",
      href: "/admin/pickers?tab=reviews",
    },
    {
      label: "Total Volume",
      value: formatLiters(stats.totalLiters),
      icon: TrendingUp,
      color: "bg-amber-50 text-amber-700",
      href: "/admin/pickers?tab=reviews",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome to the Mellod Admin Panel</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <span className="text-xs text-gray-500">Market Price</span>
          <span className="text-green-700 font-bold text-sm">
            {stats.currentPrice ? `${formatCurrency(stats.currentPrice)}/L` : "Not set"}
          </span>
          <Link href="/admin/fbo?tab=price" className="text-green-600 hover:text-green-800 ml-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Pending Reviews Alert Banner */}
      {stats.pendingReviewsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold">
              {stats.pendingReviewsCount}
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">Pickups Pending Review</p>
              <p className="text-xs text-amber-700">Pickers have submitted collection logs awaiting admin verification.</p>
            </div>
          </div>
          <Link
            href="/admin/pickers?tab=reviews"
            className="btn text-xs font-semibold px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
          >
            Review Now →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link href={card.href} key={card.label} className="card card-interactive p-5 block">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Total earnings highlight */}
      <div className="bg-green-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm font-medium">Total Earnings Paid Out</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalEarnings)}</p>
            <p className="text-green-300 text-xs mt-1">
              across {stats.totalPickups} completed pickups
            </p>
          </div>
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Recent Pickups */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent Pickups</h2>
          <Link href="/admin/pickers?tab=routes" className="text-xs text-green-600 hover:text-green-800 font-medium">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentPickups.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No pickups recorded yet.
            </div>
          ) : (
            recentPickups.map((pickup: any) => (
              <div key={pickup.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-4 h-4 text-green-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {pickup.fbo?.business_name ?? "Unknown FBO"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {pickup.picker?.profile?.full_name ?? "—"} ·{" "}
                    {new Date(pickup.picked_up_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {formatLiters(Number(pickup.liters))}
                  </p>
                  <p className="text-xs text-green-600">{formatCurrency(Number(pickup.total_amount))}</p>
                </div>
                <span className={`badge ${pickup.status === "completed" ? "badge-green" : "badge-yellow"}`}>
                  {pickup.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
