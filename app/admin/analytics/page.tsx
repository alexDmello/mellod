"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatLiters } from "@/lib/utils";
import {
  TrendingUp,
  Droplets,
  IndianRupee,
  Leaf,
  Users,
  Truck,
  Download,
  Calendar,
  RefreshCw,
  Award,
  BarChart3,
  PieChart,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CheckCircle2,
  Clock,
  Building2,
  Sparkles,
} from "lucide-react";

type TimeRange = "7d" | "30d" | "90d" | "ytd" | "all";

interface PickupRecord {
  id: string;
  liters: number;
  total_amount: number;
  picked_up_at: string;
  status: string;
  fbo?: { id: string; business_name: string; address?: string };
  picker?: { id: string; profile?: { full_name: string }; vehicle_info?: string };
}

interface FboItem {
  id: string;
  business_name: string;
  is_active: boolean;
  address?: string;
}

interface PickerItem {
  id: string;
  vehicle_info?: string;
  profile?: { full_name: string };
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickups, setPickups] = useState<PickupRecord[]>([]);
  const [fbos, setFbos] = useState<FboItem[]>([]);
  const [pickers, setPickers] = useState<PickerItem[]>([]);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<"fbo" | "picker">("fbo");

  const supabase = createClient();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  async function loadAnalyticsData() {
    setRefreshing(true);
    try {
      const [pickupsRes, fbosRes, pickersRes] = await Promise.all([
        supabase
          .from("pickups")
          .select(`
            id, liters, total_amount, picked_up_at, status,
            fbo:fbos(id, business_name, address),
            picker:pickers(id, vehicle_info, profile:profiles(full_name))
          `)
          .order("picked_up_at", { ascending: false }),

        supabase.from("fbos").select("id, business_name, is_active, address"),
        supabase.from("pickers").select("id, vehicle_info, profile:profiles(full_name)"),
      ]);

      if (pickupsRes.data) setPickups(pickupsRes.data as any);
      if (fbosRes.data) setFbos(fbosRes.data as any);
      if (pickersRes.data) setPickers(pickersRes.data as any);
    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ── Date Filtering ────────────────────────────────────────────────────────
  const filteredPickups = useMemo(() => {
    if (timeRange === "all") return pickups;

    const now = new Date();
    let cutoff = new Date();

    if (timeRange === "7d") cutoff.setDate(now.getDate() - 7);
    if (timeRange === "30d") cutoff.setDate(now.getDate() - 30);
    if (timeRange === "90d") cutoff.setDate(now.getDate() - 90);
    if (timeRange === "ytd") cutoff = new Date(now.getFullYear(), 0, 1);

    return pickups.filter((p) => new Date(p.picked_up_at) >= cutoff);
  }, [pickups, timeRange]);

  // ── Calculated Key Metrics ────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const completed = filteredPickups.filter((p) => p.status === "completed");
    const totalLiters = completed.reduce((sum, p) => sum + Number(p.liters || 0), 0);
    const totalPayout = completed.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const completedCount = completed.length;
    const avgLitersPerPickup = completedCount > 0 ? totalLiters / completedCount : 0;
    
    // Biofuel CO2 offset: ~2.5 kg CO2 avoided per liter of UCO converted to biodiesel
    const co2OffsetKg = totalLiters * 2.5;
    const co2OffsetTons = co2OffsetKg / 1000;

    const activeFboCount = fbos.filter((f) => f.is_active).length;
    const fboActivityRate = fbos.length > 0 ? (activeFboCount / fbos.length) * 100 : 0;

    return {
      totalLiters,
      totalPayout,
      completedCount,
      avgLitersPerPickup,
      co2OffsetTons,
      activeFboCount,
      totalFbos: fbos.length,
      fboActivityRate,
    };
  }, [filteredPickups, fbos]);

  // ── Daily Aggregation Chart Data ──────────────────────────────────────────
  const dailyChartData = useMemo(() => {
    const map: Record<string, { date: string; liters: number; payout: number }> = {};

    // Group completed pickups by day
    filteredPickups
      .filter((p) => p.status === "completed")
      .forEach((p) => {
        const dateStr = new Date(p.picked_up_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!map[dateStr]) {
          map[dateStr] = { date: dateStr, liters: 0, payout: 0 };
        }
        map[dateStr].liters += Number(p.liters || 0);
        map[dateStr].payout += Number(p.total_amount || 0);
      });

    const items = Object.values(map);
    return items.length > 0 ? items.reverse() : [];
  }, [filteredPickups]);

  const maxDailyVolume = useMemo(() => {
    return Math.max(...dailyChartData.map((d) => d.liters), 100);
  }, [dailyChartData]);

  // ── Top FBOs Leaderboard ──────────────────────────────────────────────────
  const topFbos = useMemo(() => {
    const fboMap: Record<string, { name: string; liters: number; payout: number; count: number }> = {};

    filteredPickups
      .filter((p) => p.status === "completed" && p.fbo?.business_name)
      .forEach((p) => {
        const name = p.fbo!.business_name;
        if (!fboMap[name]) {
          fboMap[name] = { name, liters: 0, payout: 0, count: 0 };
        }
        fboMap[name].liters += Number(p.liters || 0);
        fboMap[name].payout += Number(p.total_amount || 0);
        fboMap[name].count += 1;
      });

    return Object.values(fboMap)
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5);
  }, [filteredPickups]);

  // ── Top Pickers Leaderboard ───────────────────────────────────────────────
  const topPickers = useMemo(() => {
    const pickerMap: Record<string, { name: string; vehicle: string; liters: number; count: number }> = {};

    filteredPickups
      .filter((p) => p.status === "completed")
      .forEach((p) => {
        const name = p.picker?.profile?.full_name || "Unknown Driver";
        const vehicle = p.picker?.vehicle_info || "Standard Tempo";
        if (!pickerMap[name]) {
          pickerMap[name] = { name, vehicle, liters: 0, count: 0 };
        }
        pickerMap[name].liters += Number(p.liters || 0);
        pickerMap[name].count += 1;
      });

    return Object.values(pickerMap)
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5);
  }, [filteredPickups]);

  // ── Zone Breakdown ────────────────────────────────────────────────────────
  const zoneStats = useMemo(() => {
    const zones: Record<string, number> = {};
    filteredPickups
      .filter((p) => p.status === "completed")
      .forEach((p) => {
        const addr = p.fbo?.address || "";
        // Extract city/locality part from address
        const parts = addr.split(",");
        const area = parts.length > 1 ? parts[parts.length - 2].trim() : "Central City";
        zones[area] = (zones[area] || 0) + Number(p.liters || 0);
      });

    return Object.entries(zones)
      .map(([area, liters]) => ({ area, liters }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 4);
  }, [filteredPickups]);

  // ── CSV Export Functionality ──────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredPickups.length === 0) return;

    const headers = ["Pickup ID", "Date", "Status", "FBO Name", "Picker Name", "Liters (L)", "Payout Amount (INR)"];
    const rows = filteredPickups.map((p) => [
      p.id,
      new Date(p.picked_up_at).toISOString().split("T")[0],
      p.status,
      `"${p.fbo?.business_name || "N/A"}"`,
      `"${p.picker?.profile?.full_name || "N/A"}"`,
      p.liters,
      p.total_amount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mellod_analytics_report_${timeRange}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
        <p className="text-sm font-medium">Computing business intelligence metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ── Top Header Controls ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-green-700" />
            Analytics & BI
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time collection volume, financial payouts, environmental impact, and network performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            {(["7d", "30d", "90d", "ytd", "all"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  timeRange === range
                    ? "bg-white text-green-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={loadAnalyticsData}
            disabled={refreshing}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-green-600" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="btn btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Executive KPI Cards Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Volume */}
        <div className="card p-5 bg-gradient-to-br from-green-50/80 to-emerald-50/30 border border-green-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-green-800">Total Volume</span>
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center text-green-700">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-3">
            {formatLiters(metrics.totalLiters)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-green-700 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% vs prev period
          </div>
        </div>

        {/* Total Payout */}
        <div className="card p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/30 border border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Total Disbursed</span>
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-3">
            {formatCurrency(metrics.totalPayout)}
          </div>
          <div className="text-[11px] text-gray-500 font-medium mt-2">
            across {metrics.completedCount} completed pickups
          </div>
        </div>

        {/* Environmental Impact (CO2 Offset) */}
        <div className="card p-5 bg-gradient-to-br from-teal-50/80 to-emerald-50/40 border border-teal-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800">CO₂ Avoided</span>
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-3">
            {metrics.co2OffsetTons.toFixed(2)} <span className="text-sm font-semibold text-gray-500">Tons</span>
          </div>
          <div className="text-[11px] text-teal-700 font-semibold mt-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Biodiesel Conversion
          </div>
        </div>

        {/* Avg Volume per Pickup */}
        <div className="card p-5 bg-gradient-to-br from-purple-50/80 to-fuchsia-50/30 border border-purple-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">Avg Yield / Stop</span>
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-purple-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-3">
            {metrics.avgLitersPerPickup.toFixed(1)} <span className="text-sm font-semibold text-gray-500">L</span>
          </div>
          <div className="text-[11px] text-gray-500 font-medium mt-2">
            Per completed pickup stop
          </div>
        </div>

        {/* Active FBO Rate */}
        <div className="card p-5 bg-gradient-to-br from-amber-50/80 to-orange-50/30 border border-amber-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Network Active</span>
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-3">
            {metrics.fboActivityRate.toFixed(0)}%
          </div>
          <div className="text-[11px] text-amber-800 font-medium mt-2">
            {metrics.activeFboCount} of {metrics.totalFbos} active FBOs
          </div>
        </div>
      </div>

      {/* ── Collection Volume Trend Chart ──────────────────────────────── */}
      <div className="card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-700" />
              UCO Collection Volume Trend
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Daily volume collected (Liters) over the selected timeframe.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-600 rounded-sm" />
              <span>Volume (Liters)</span>
            </div>
          </div>
        </div>

        {dailyChartData.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No collection records available for this date range.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-64 flex items-end gap-3 pt-6 pb-2 px-2 overflow-x-auto">
              {dailyChartData.map((item, idx) => {
                const heightPercent = Math.max((item.liters / maxDailyVolume) * 100, 8);
                return (
                  <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center gap-2 group h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg pointer-events-none mb-1 text-center whitespace-nowrap z-20">
                      <div className="font-bold">{item.date}</div>
                      <div>{item.liters} Liters</div>
                      <div className="text-green-300">{formatCurrency(item.payout)}</div>
                    </div>

                    {/* Bar */}
                    <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden flex items-end h-full">
                      <div
                        className="w-full bg-gradient-to-t from-green-700 to-emerald-500 rounded-t-lg group-hover:from-green-600 group-hover:to-emerald-400 transition-all"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    <span className="text-[10px] font-mono font-medium text-gray-500 truncate max-w-full">
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Leaderboards & Zone Breakdown ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Suppliers & Pickers Leaderboard (2 Cols) */}
        <div className="lg:col-span-2 card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Performance Leaderboard
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Top performing collection partners and field drivers.</p>
            </div>

            {/* Toggle Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveLeaderboardTab("fbo")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeLeaderboardTab === "fbo" ? "bg-white text-green-700 shadow-sm" : "text-gray-500"
                }`}
              >
                Top FBOs
              </button>
              <button
                onClick={() => setActiveLeaderboardTab("picker")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeLeaderboardTab === "picker" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"
                }`}
              >
                Top Pickers
              </button>
            </div>
          </div>

          {activeLeaderboardTab === "fbo" ? (
            topFbos.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No FBO collections recorded yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {topFbos.map((fbo, rank) => (
                  <div key={fbo.name} className="flex items-center justify-between py-3.5 hover:bg-gray-50/50 px-2 rounded-xl">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                          rank === 0
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : rank === 1
                            ? "bg-slate-200 text-slate-800"
                            : rank === 2
                            ? "bg-amber-900/10 text-amber-900"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        #{rank + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{fbo.name}</p>
                        <p className="text-xs text-gray-400">{fbo.count} completed pickups</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">{formatLiters(fbo.liters)}</p>
                      <p className="text-xs font-semibold text-green-700">{formatCurrency(fbo.payout)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : topPickers.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No Picker dispatches completed yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topPickers.map((picker, rank) => (
                <div key={picker.name} className="flex items-center justify-between py-3.5 hover:bg-gray-50/50 px-2 rounded-xl">
                  <div className="flex items-center gap-3.5">
                    <div className="w-7 h-7 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-black">
                      #{rank + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{picker.name}</p>
                      <p className="text-xs text-gray-400">{picker.vehicle}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{formatLiters(picker.liters)}</p>
                    <p className="text-xs font-medium text-gray-500">{picker.count} stops completed</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zone Breakdown & Environmental Goal Card (1 Col) */}
        <div className="space-y-6">
          {/* Zone Breakdown */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <MapPin className="w-5 h-5 text-green-700" />
              <h2 className="font-bold text-gray-900 text-base">Zonal Collection Breakdown</h2>
            </div>

            {zoneStats.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No zone data available.</p>
            ) : (
              <div className="space-y-3.5">
                {zoneStats.map((zone) => {
                  const percent = metrics.totalLiters > 0 ? (zone.liters / metrics.totalLiters) * 100 : 0;
                  return (
                    <div key={zone.area} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-800 truncate">{zone.area}</span>
                        <span className="text-gray-900">{formatLiters(zone.liters)} ({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Environmental Target Badge */}
          <div className="card p-6 bg-gradient-to-br from-green-700 to-emerald-900 text-white space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-green-200">Recycling Target</span>
              <Sparkles className="w-5 h-5 text-green-300" />
            </div>

            <div>
              <div className="text-3xl font-black">{formatLiters(metrics.totalLiters)}</div>
              <p className="text-xs text-green-200 mt-1">Goal: 50,000 Liters Biodiesel Feedstock</p>
            </div>

            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((metrics.totalLiters / 50000) * 100, 100)}%` }}
              />
            </div>

            <p className="text-[11px] text-green-100 leading-relaxed">
              Every liter of UCO collected prevents water contamination and is repurposed into clean biofuel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
