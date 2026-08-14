"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatLiters } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Droplets,
  IndianRupee,
  Leaf,
  Download,
  RefreshCw,
  Award,
  BarChart3,
  MapPin,
  Loader2,
  Building2,
  Zap,
  Flame,
  Calendar,
  ChevronDown,
  X,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  Activity,
  CheckCircle2,
  Users,
  AlertTriangle,
  Target,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TimeRange = "7d" | "30d" | "90d" | "ytd" | "custom" | "all";
type ActiveTab = "overview" | "collections" | "financials" | "network";
type SelectedMetric = "volume" | "payout" | "gross_margin" | "burn_rate" | "pickups";
type Granularity = "daily" | "weekly" | "monthly";
type AdvancedBreakdown = "fbo" | "picker" | "zone" | "transaction_type";

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
  created_at?: string;
}

interface PickerItem {
  id: string;
  vehicle_info?: string;
  profile?: { full_name: string };
}

interface FinancialTransaction {
  id: string;
  date: string;
  type: "Income" | "Expense" | "Asset" | "Transfer" | "Liability";
  category: string;
  amount: number;
  costType?: "COGS" | "OPEX" | null;
  isOpeningBalance?: boolean;
  isVoided?: boolean;
}

// ── FORMATTER HELPER TO FIX SIGN BUGS (+₹-50,000 bug fix) ─────────────────────
function formatSignedCurrency(amount: number): string {
  const formatted = formatCurrency(Math.abs(amount));
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

// ── REUSABLE SVG LINE CHART COMPONENT ─────────────────────────────────────────
function AnalyticsTrendChart({
  points,
  selectedMetric,
  maxVal,
  height = 220,
}: {
  points: { date: string; value: number }[];
  selectedMetric: SelectedMetric;
  maxVal: number;
  height?: number;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; date: string; value: number } | null>(null);

  // Check if data is empty or all zeroes
  const isDataEmpty = points.length === 0 || points.every((p) => p.value === 0);

  if (isDataEmpty) {
    return (
      <div className="w-full h-60 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col items-center justify-center space-y-2 text-gray-400">
        <BarChart3 className="w-8 h-8 text-gray-300 animate-pulse" />
        <p className="text-xs font-semibold text-gray-500">No collection or financial activity recorded for this period</p>
        <p className="text-[11px] text-gray-400">Try selecting a different date range or clearing partner filters.</p>
      </div>
    );
  }

  const width = 800;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const n = points.length;
  const coords = points.map((pt, idx) => {
    const x = n > 1 ? paddingX + (idx / (n - 1)) * chartWidth : width / 2;
    const y = height - paddingY - (pt.value / (maxVal || 1)) * chartHeight;
    return { x, y, date: pt.date, value: pt.value };
  });

  const pathD = coords.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaD =
    coords.length > 0
      ? `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`
      : "";

  return (
    <div className="w-full relative space-y-3">
      <div className="w-full overflow-hidden relative" style={{ height: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = height - paddingY - pct * chartHeight;
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#trendGradient)" />}

          {/* Line Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#059669"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {coords.map((pt, idx) => (
            <g
              key={idx}
              onMouseEnter={() => setHoveredPoint({ index: idx, date: pt.date, value: pt.value })}
              onMouseLeave={() => setHoveredPoint(null)}
              className="group cursor-pointer"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill="#059669"
                stroke="#ffffff"
                strokeWidth="2.5"
                className="transition-transform group-hover:scale-150"
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg shadow-xl z-30 pointer-events-none border border-slate-800 flex items-center gap-2">
            <span className="text-emerald-400">{hoveredPoint.date}:</span>
            <span>
              {selectedMetric === "volume"
                ? formatLiters(hoveredPoint.value)
                : selectedMetric === "pickups"
                ? `${hoveredPoint.value} stops`
                : formatCurrency(hoveredPoint.value)}
            </span>
          </div>
        )}
      </div>

      {/* Date Labels below SVG */}
      <div className="flex justify-between px-4 text-[10px] font-mono text-gray-400">
        {points.map((pt, idx) => (
          <span key={idx} className="truncate max-w-[55px] text-center">
            {pt.date}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [selectedMetric, setSelectedMetric] = useState<SelectedMetric>("volume");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showDatePickerDropdown, setShowDatePickerDropdown] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("daily");

  // Advanced Mode States
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [advancedBreakdown, setAdvancedBreakdown] = useState<AdvancedBreakdown>("fbo");
  const [advancedSearch, setAdvancedSearch] = useState("");
  const [selectedFboFilter, setSelectedFboFilter] = useState<string>("all");
  const [selectedPickerFilter, setSelectedPickerFilter] = useState<string>("all");

  // Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickups, setPickups] = useState<PickupRecord[]>([]);
  const [fbos, setFbos] = useState<FboItem[]>([]);
  const [pickers, setPickers] = useState<PickerItem[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([]);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<"fbo" | "picker">("fbo");

  const supabase = createClient();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  async function loadAnalyticsData() {
    setRefreshing(true);
    try {
      const [pickupsRes, fbosRes, pickersRes, txsRes] = await Promise.all([
        supabase
          .from("pickups")
          .select(`
            id, liters, total_amount, picked_up_at, status,
            fbo:fbos(id, business_name, address),
            picker:pickers(id, vehicle_info, profile:profiles(full_name))
          `)
          .order("picked_up_at", { ascending: false }),

        supabase.from("fbos").select("id, business_name, is_active, address, created_at"),
        supabase.from("pickers").select("id, vehicle_info, profile:profiles(full_name)"),
        supabase
          .from("financial_transactions")
          .select("id, transaction_date, type, category, amount, cost_type, is_voided")
          .order("transaction_date", { ascending: false }),
      ]);

      if (pickupsRes.data) setPickups(pickupsRes.data as unknown as PickupRecord[]);
      if (fbosRes.data) setFbos(fbosRes.data as unknown as FboItem[]);
      if (pickersRes.data) setPickers(pickersRes.data as unknown as PickerItem[]);

      let loadedTxs: FinancialTransaction[] = [];
      if (txsRes.data) {
        loadedTxs = txsRes.data.map((c) => ({
          id: c.id,
          date: c.transaction_date,
          type: c.type as FinancialTransaction["type"],
          category: c.category,
          amount: Number(c.amount),
          costType: c.cost_type as "COGS" | "OPEX" | null,
          isOpeningBalance: false,
          isVoided: c.is_voided || false,
        }));
      }

      // Local Storage Offline Fallback
      if (typeof window !== "undefined") {
        const localSavedStr = localStorage.getItem("mellod_custom_financial_txs");
        if (localSavedStr) {
          try {
            const localItems = JSON.parse(localSavedStr);
            const existingIds = new Set(loadedTxs.map((t) => t.id));
            localItems.forEach((item: any) => {
              if (!existingIds.has(item.id)) {
                loadedTxs.push({
                  id: item.id,
                  date: item.date,
                  type: item.type,
                  category: item.category,
                  amount: Number(item.amount),
                  costType: item.costType || null,
                  isOpeningBalance: item.isOpeningBalance || false,
                  isVoided: item.isVoided || false,
                });
              }
            });
          } catch (e) {
            console.error("Local tx parse error:", e);
          }
        }
      }

      setFinancialTransactions(loadedTxs);
    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ── Date Filtering ─────────────────────────────────────────────────────────
  const filteredPickups = useMemo(() => {
    return pickups.filter((p) => {
      if (selectedFboFilter !== "all" && p.fbo?.id !== selectedFboFilter) return false;
      if (selectedPickerFilter !== "all" && p.picker?.id !== selectedPickerFilter) return false;

      if (timeRange === "all") return true;

      const pDate = new Date(p.picked_up_at);
      const now = new Date();

      if (timeRange === "custom" && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return pDate >= start && pDate <= end;
      }

      let cutoff = new Date();
      if (timeRange === "7d") cutoff.setDate(now.getDate() - 7);
      if (timeRange === "30d") cutoff.setDate(now.getDate() - 30);
      if (timeRange === "90d") cutoff.setDate(now.getDate() - 90);
      if (timeRange === "ytd") cutoff = new Date(now.getFullYear(), 0, 1);

      return pDate >= cutoff;
    });
  }, [pickups, timeRange, customStartDate, customEndDate, selectedFboFilter, selectedPickerFilter]);

  const filteredTransactions = useMemo(() => {
    return financialTransactions.filter((t) => {
      if (timeRange === "all") return true;

      const tDate = new Date(t.date);
      const now = new Date();

      if (timeRange === "custom" && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return tDate >= start && tDate <= end;
      }

      let cutoff = new Date();
      if (timeRange === "7d") cutoff.setDate(now.getDate() - 7);
      if (timeRange === "30d") cutoff.setDate(now.getDate() - 30);
      if (timeRange === "90d") cutoff.setDate(now.getDate() - 90);
      if (timeRange === "ytd") cutoff = new Date(now.getFullYear(), 0, 1);

      return tDate >= cutoff;
    });
  }, [financialTransactions, timeRange, customStartDate, customEndDate]);

  // Prior Period Filtered Data for Trend Narrative Comparisons
  const priorPeriodPickups = useMemo(() => {
    const now = new Date();
    let days = 30;
    if (timeRange === "7d") days = 7;
    if (timeRange === "90d") days = 90;

    const startPrior = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);
    const endPrior = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return pickups.filter((p) => {
      if (p.status !== "completed") return false;
      const d = new Date(p.picked_up_at);
      return d >= startPrior && d <= endPrior;
    });
  }, [pickups, timeRange]);

  // ── Calculated Key Metrics ────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const completed = filteredPickups.filter((p) => p.status === "completed");
    const totalLiters = completed.reduce((sum, p) => sum + Number(p.liters || 0), 0);
    const totalPayout = completed.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const completedCount = completed.length;
    const avgLitersPerPickup = completedCount > 0 ? totalLiters / completedCount : 0;
    const co2OffsetTons = (totalLiters * 2.5) / 1000;

    // Prior period totals for trend arrows
    const priorLiters = priorPeriodPickups.reduce((sum, p) => sum + Number(p.liters || 0), 0);
    const volumeTrendPct = priorLiters > 0 ? ((totalLiters - priorLiters) / priorLiters) * 100 : 0;

    const activeFboCount = fbos.filter((f) => f.is_active).length;
    const fboActivityRate = fbos.length > 0 ? (activeFboCount / fbos.length) * 100 : 0;

    return {
      totalLiters,
      totalPayout,
      completedCount,
      avgLitersPerPickup,
      co2OffsetTons,
      volumeTrendPct,
      activeFboCount,
      totalFbos: fbos.length,
      fboActivityRate,
    };
  }, [filteredPickups, priorPeriodPickups, fbos]);

  // ── Financial Metrics ─────────────────────────────────────────────────────
  const financialMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const activeTransactions = filteredTransactions.filter((t) => !t.isOpeningBalance && !t.isVoided);

    const totalIncome = activeTransactions.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = activeTransactions.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
    const totalAsset = activeTransactions.filter((t) => t.type === "Asset").reduce((sum, t) => sum + t.amount, 0);

    const loanReceived = activeTransactions
      .filter((t) => t.type === "Liability" && t.category === "Loan Received")
      .reduce((sum, t) => sum + t.amount, 0);
    const loanOutflow = activeTransactions
      .filter((t) => t.type === "Liability" && t.category !== "Loan Received")
      .reduce((sum, t) => sum + t.amount, 0);

    const currentMonthExpenses = activeTransactions.filter((t) => {
      if (t.type !== "Expense") return false;
      const txDate = new Date(t.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
    const monthlyBurnRate = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenseCount = currentMonthExpenses.length;

    const currentCashBalance = totalIncome + loanReceived - totalExpense - totalAsset - loanOutflow;
    const netCashFlow = totalIncome - totalExpense;

    const revenueIncome = activeTransactions
      .filter((t) => t.type === "Income" && t.category === "Revenue / Oil Sale")
      .reduce((sum, t) => sum + t.amount, 0);
    const cogsExpense = activeTransactions
      .filter((t) => t.type === "Expense" && t.costType === "COGS")
      .reduce((sum, t) => sum + t.amount, 0);
    const grossMargin = revenueIncome - cogsExpense;
    const grossMarginPct = revenueIncome > 0 ? (grossMargin / revenueIncome) * 100 : 0;
    const monthLabel = now.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

    return {
      currentCashBalance,
      monthlyBurnRate,
      monthlyExpenseCount,
      monthLabel,
      netCashFlow,
      grossMargin,
      grossMarginPct,
      txCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // ── Dynamic Chart Data Aggregation ────────────────────────────────────────
  const chartPoints = useMemo(() => {
    const map: Record<string, number> = {};

    if (selectedMetric === "volume" || selectedMetric === "payout" || selectedMetric === "pickups") {
      filteredPickups
        .filter((p) => p.status === "completed")
        .forEach((p) => {
          const d = new Date(p.picked_up_at);
          let key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (granularity === "monthly") {
            key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          }

          if (!map[key]) map[key] = 0;

          if (selectedMetric === "volume") map[key] += Number(p.liters || 0);
          if (selectedMetric === "payout") map[key] += Number(p.total_amount || 0);
          if (selectedMetric === "pickups") map[key] += 1;
        });
    } else {
      filteredTransactions
        .filter((t) => !t.isOpeningBalance && !t.isVoided)
        .forEach((t) => {
          const d = new Date(t.date);
          let key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (granularity === "monthly") {
            key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          }

          if (!map[key]) map[key] = 0;

          if (selectedMetric === "gross_margin") {
            if (t.type === "Income" && t.category === "Revenue / Oil Sale") map[key] += t.amount;
            if (t.type === "Expense" && t.costType === "COGS") map[key] -= t.amount;
          } else if (selectedMetric === "burn_rate") {
            if (t.type === "Expense") map[key] += t.amount;
          }
        });
    }

    const entries = Object.entries(map).map(([date, value]) => ({ date, value }));
    return entries.length > 0 ? entries : [];
  }, [filteredPickups, filteredTransactions, selectedMetric, granularity]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartPoints.map((p) => p.value), 10);
    return Math.ceil(max * 1.15);
  }, [chartPoints]);

  // ── Realtime Sidebar Calculations ─────────────────────────────────────────
  const realtimeMetrics = useMemo(() => {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const recentPickups = pickups.filter(
      (p) => p.status === "completed" && new Date(p.picked_up_at) >= fortyEightHoursAgo
    );

    const recentLiters = recentPickups.reduce((sum, p) => sum + Number(p.liters || 0), 0);
    const activePickersCount = pickers.length;

    return {
      recentCount: recentPickups.length,
      recentLiters,
      activePickersCount,
    };
  }, [pickups, pickers]);

  // ── Advanced Mode Data Table Items ─────────────────────────────────────────
  const advancedTableData = useMemo(() => {
    if (advancedBreakdown === "fbo") {
      const map: Record<string, { name: string; liters: number; payout: number; count: number }> = {};
      filteredPickups
        .filter((p) => p.status === "completed")
        .forEach((p) => {
          const name = p.fbo?.business_name || "Unknown FBO";
          if (!map[name]) map[name] = { name, liters: 0, payout: 0, count: 0 };
          map[name].liters += Number(p.liters || 0);
          map[name].payout += Number(p.total_amount || 0);
          map[name].count += 1;
        });
      return Object.values(map).filter((item) =>
        item.name.toLowerCase().includes(advancedSearch.toLowerCase())
      );
    } else if (advancedBreakdown === "picker") {
      const map: Record<string, { name: string; liters: number; payout: number; count: number }> = {};
      filteredPickups
        .filter((p) => p.status === "completed")
        .forEach((p) => {
          const name = p.picker?.profile?.full_name || "Unassigned Driver";
          if (!map[name]) map[name] = { name, liters: 0, payout: 0, count: 0 };
          map[name].liters += Number(p.liters || 0);
          map[name].payout += Number(p.total_amount || 0);
          map[name].count += 1;
        });
      return Object.values(map).filter((item) =>
        item.name.toLowerCase().includes(advancedSearch.toLowerCase())
      );
    } else if (advancedBreakdown === "zone") {
      const map: Record<string, { name: string; liters: number; payout: number; count: number }> = {};
      filteredPickups
        .filter((p) => p.status === "completed")
        .forEach((p) => {
          const addr = p.fbo?.address || "";
          const parts = addr.split(",");
          const name = parts.length > 1 ? parts[parts.length - 2].trim() : "Central Zone";
          if (!map[name]) map[name] = { name, liters: 0, payout: 0, count: 0 };
          map[name].liters += Number(p.liters || 0);
          map[name].payout += Number(p.total_amount || 0);
          map[name].count += 1;
        });
      return Object.values(map).filter((item) =>
        item.name.toLowerCase().includes(advancedSearch.toLowerCase())
      );
    } else {
      const map: Record<string, { name: string; liters: number; payout: number; count: number }> = {};
      filteredTransactions.forEach((t) => {
        const name = `${t.type} (${t.category})`;
        if (!map[name]) map[name] = { name, liters: 0, payout: t.amount, count: 1 };
        else {
          map[name].payout += t.amount;
          map[name].count += 1;
        }
      });
      return Object.values(map).filter((item) =>
        item.name.toLowerCase().includes(advancedSearch.toLowerCase())
      );
    }
  }, [filteredPickups, filteredTransactions, advancedBreakdown, advancedSearch]);

  // FBO Churn & Activity Health Calculation for Collections Tab
  const fboHealthList = useMemo(() => {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    return fbos.map((fbo) => {
      const fboPickups = pickups.filter((p) => p.fbo?.id === fbo.id && p.status === "completed");
      const lastPickup = fboPickups[0];
      const lastPickupDate = lastPickup ? new Date(lastPickup.picked_up_at) : null;
      const isSilent = !lastPickupDate || lastPickupDate < fourteenDaysAgo;
      const totalLiters = fboPickups.reduce((sum, p) => sum + Number(p.liters || 0), 0);

      return {
        id: fbo.id,
        business_name: fbo.business_name,
        address: fbo.address,
        is_active: fbo.is_active,
        totalLiters,
        pickupCount: fboPickups.length,
        lastPickupDate,
        isSilent,
      };
    });
  }, [fbos, pickups]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredPickups.length === 0 && filteredTransactions.length === 0) return;

    const headers = ["Pickup ID / Tx ID", "Date", "Entity / Category", "Type / Status", "Liters (L)", "Amount (INR)"];
    const rows = filteredPickups.map((p) => [
      p.id,
      new Date(p.picked_up_at).toISOString().split("T")[0],
      `"${p.fbo?.business_name || "N/A"}"`,
      p.status,
      p.liters,
      p.total_amount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mellod_analytics_${timeRange}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMetricTitle = (m: SelectedMetric) => {
    switch (m) {
      case "volume":
        return "Total UCO Volume (L)";
      case "payout":
        return "Disbursed Payouts";
      case "gross_margin":
        return "Gross Margin";
      case "burn_rate":
        return "Monthly Burn Rate";
      case "pickups":
        return "Completed Pickups";
    }
  };

  const getMetricFormattedValue = (m: SelectedMetric) => {
    switch (m) {
      case "volume":
        return formatLiters(metrics.totalLiters);
      case "payout":
        return formatCurrency(metrics.totalPayout);
      case "gross_margin":
        return formatSignedCurrency(financialMetrics.grossMargin);
      case "burn_rate":
        return formatCurrency(financialMetrics.monthlyBurnRate);
      case "pickups":
        return `${metrics.completedCount} stops`;
    }
  };

  // ── SKELETON SHIMMER LOADING STATE ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-16 bg-gray-200 rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-80 bg-gray-200 rounded-2xl" />
          <div className="lg:col-span-4 h-80 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── RENDER ADVANCED MODE VIEW ─────────────────────────────────────────────
  if (isAdvancedMode) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 text-gray-900 flex flex-col overflow-hidden animate-fade-in font-sans">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAdvancedMode(false)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              title="Close Advanced Mode"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                M
              </div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight">Advanced Analytics Explorer</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              className="bg-gray-100 border border-gray-200 text-gray-800 text-xs rounded-xl px-3 py-2 outline-none font-semibold"
            >
              <option value="daily">Daily View</option>
              <option value="monthly">Monthly View</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Main Advanced Body Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Controls Panel */}
          <div className="w-72 bg-white border-r border-gray-200 p-5 space-y-6 overflow-y-auto">
            {/* Controls Section */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Controls & Filters</span>

              {/* FBO Filter */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-semibold">Filter FBO Partner</label>
                <select
                  value={selectedFboFilter}
                  onChange={(e) => setSelectedFboFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 outline-none font-medium"
                >
                  <option value="all">All FBO Partners</option>
                  {fbos.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.business_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Picker Filter */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-semibold">Filter Driver / Picker</label>
                <select
                  value={selectedPickerFilter}
                  onChange={(e) => setSelectedPickerFilter(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 outline-none font-medium"
                >
                  <option value="all">All Drivers / Pickers</option>
                  {pickers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.profile?.full_name || "Driver"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Range */}
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-semibold">Date Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 outline-none font-medium"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="ytd">Year to Date (YTD)</option>
                  <option value="all">Lifetime / All Time</option>
                </select>
              </div>
            </div>

            {/* Breakdown Section */}
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Breakdown By</span>
              <div className="space-y-1.5">
                {[
                  { id: "fbo", label: "FBO Supplier" },
                  { id: "picker", label: "Picker Driver" },
                  { id: "zone", label: "Collection Zone" },
                  { id: "transaction_type", label: "Financial Category" },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setAdvancedBreakdown(b.id as AdvancedBreakdown)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                      advancedBreakdown === b.id
                        ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                        : "text-gray-700 hover:bg-gray-50 font-semibold"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric Selector */}
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Primary Metric</span>
              <div className="space-y-1.5">
                {[
                  { id: "volume", label: "Volume (Liters)" },
                  { id: "payout", label: "Total Disbursed (₹)" },
                  { id: "gross_margin", label: "Gross Margin (₹)" },
                  { id: "pickups", label: "Pickup Stops" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMetric(m.id as SelectedMetric)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                      selectedMetric === m.id
                        ? "bg-emerald-600 text-white font-bold shadow-sm"
                        : "text-gray-700 hover:bg-gray-50 font-semibold"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Chart & Data Breakdown */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6 bg-slate-50/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {getMetricTitle(selectedMetric)} by{" "}
                {advancedBreakdown === "fbo"
                  ? "FBO Partner"
                  : advancedBreakdown === "picker"
                  ? "Picker Driver"
                  : advancedBreakdown === "zone"
                  ? "Zone"
                  : "Financial Category"}
              </h2>
              <div className="text-sm font-bold text-emerald-700">{getMetricFormattedValue(selectedMetric)}</div>
            </div>

            {/* SVG Line Chart */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-gray-200/80">
              <AnalyticsTrendChart
                points={chartPoints}
                selectedMetric={selectedMetric}
                maxVal={maxChartValue}
              />
            </div>

            {/* Breakdown Table */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-xl shadow-gray-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-900">Breakdown Details</span>
                </div>
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={advancedSearch}
                    onChange={(e) => setAdvancedSearch(e.target.value)}
                    placeholder="Search breakdown table..."
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-xl pl-9 pr-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="pb-3 px-3">Name / Entity</th>
                      <th className="pb-3 px-3 text-right">Liters Collected (L)</th>
                      <th className="pb-3 px-3 text-right">Total Payout (₹)</th>
                      <th className="pb-3 px-3 text-right">Stops / Entries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {advancedTableData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                          No matching breakdown data found.
                        </td>
                      </tr>
                    ) : (
                      advancedTableData.map((row) => (
                        <tr key={row.name} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-3 font-semibold text-gray-900">{row.name}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatLiters(row.liters)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-gray-800">
                            {formatCurrency(row.payout)}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-500">{row.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN REDESIGNED ANALYTICS PAGE ────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Persistent Sticky Global Filter Header ─────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 space-y-4 sticky top-0 z-20 backdrop-blur-md bg-white/95">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>System Analytics & Operations</span>
              {refreshing && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Real-time UCO collection telemetry, financial P&L metrics, and network activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Global Date Selector */}
            <div className="relative">
              <button
                onClick={() => setShowDatePickerDropdown(!showDatePickerDropdown)}
                className="bg-gray-100 hover:bg-gray-200/80 text-gray-800 text-xs font-bold px-3.5 py-2 rounded-xl transition-all border border-gray-200 flex items-center gap-2 shadow-sm"
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>
                  {timeRange === "7d"
                    ? "Last 7 Days"
                    : timeRange === "30d"
                    ? "Last 30 Days"
                    : timeRange === "90d"
                    ? "Last 90 Days"
                    : timeRange === "ytd"
                    ? "Year to Date (YTD)"
                    : timeRange === "custom"
                    ? "Custom Date Range"
                    : "Lifetime"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {/* Date Dropdown Modal */}
              {showDatePickerDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 z-40 space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
                    Select Time Horizon
                  </p>
                  <div className="space-y-1">
                    {[
                      { id: "7d", label: "Last 7 Days" },
                      { id: "30d", label: "Last 30 Days" },
                      { id: "90d", label: "Last 90 Days" },
                      { id: "ytd", label: "Year to Date (YTD)" },
                      { id: "all", label: "Lifetime (All Time)" },
                      { id: "custom", label: "Custom Date Range" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTimeRange(opt.id as TimeRange);
                          if (opt.id !== "custom") setShowDatePickerDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          timeRange === opt.id ? "bg-emerald-50 text-emerald-800 font-bold" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {timeRange === "custom" && (
                    <div className="pt-2 border-t border-gray-100 space-y-2 px-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-800"
                        />
                      </div>
                      <button
                        onClick={() => setShowDatePickerDropdown(false)}
                        className="w-full bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl mt-1 hover:bg-emerald-500"
                      >
                        Apply Custom Filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Global FBO Filter */}
            <select
              value={selectedFboFilter}
              onChange={(e) => setSelectedFboFilter(e.target.value)}
              className="bg-gray-100 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3 py-2 outline-none"
            >
              <option value="all">All FBO Partners</option>
              {fbos.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.business_name}
                </option>
              ))}
            </select>

            {/* Global Picker Filter */}
            <select
              value={selectedPickerFilter}
              onChange={(e) => setSelectedPickerFilter(e.target.value)}
              className="bg-gray-100 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3 py-2 outline-none"
            >
              <option value="all">All Drivers / Pickers</option>
              {pickers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.profile?.full_name || "Driver"}
                </option>
              ))}
            </select>

            {/* Refresh Data */}
            <button
              onClick={loadAnalyticsData}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              title="Refresh Analytics Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            {/* Advanced Mode Toggle */}
            <button
              onClick={() => setIsAdvancedMode(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <span>Advanced Explorer</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation Bar (Smooth Spring Pill Slider) ───────────────── */}
      <div className="flex bg-slate-100/90 p-1.5 rounded-2xl gap-1.5 border border-slate-200/80">
        {[
          { id: "overview", label: "Executive Overview" },
          { id: "collections", label: "Collections & Volume" },
          { id: "financials", label: "Financial P&L" },
          { id: "network", label: "Network Directory" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`relative z-10 flex-1 py-2.5 px-4 text-xs font-extrabold rounded-xl transition-colors text-center cursor-pointer ${
              activeTab === tab.id ? "text-emerald-950 font-black" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="analyticsActiveTabPill"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/60"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: EXECUTIVE OVERVIEW ──────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Chart Container (Left 8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-100 divide-x divide-gray-100">
              {/* Card 1: Volume */}
              <button
                onClick={() => setSelectedMetric("volume")}
                className={`p-5 text-left transition-all ${
                  selectedMetric === "volume" ? "bg-emerald-50/60 border-b-4 border-emerald-600" : "hover:bg-gray-50/60"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Volume (L)</span>
                  <Droplets className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-gray-900 mt-2">{formatLiters(metrics.totalLiters)}</div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{metrics.volumeTrendPct >= 0 ? `+${metrics.volumeTrendPct.toFixed(1)}%` : `${metrics.volumeTrendPct.toFixed(1)}%`} vs prior</span>
                </div>
              </button>

              {/* Card 2: Payout */}
              <button
                onClick={() => setSelectedMetric("payout")}
                className={`p-5 text-left transition-all ${
                  selectedMetric === "payout" ? "bg-blue-50/60 border-b-4 border-blue-600" : "hover:bg-gray-50/60"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Disbursed (₹)</span>
                  <IndianRupee className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-gray-900 mt-2">{formatCurrency(metrics.totalPayout)}</div>
                <p className="text-[11px] text-blue-600 font-semibold mt-1">Disbursed to FBOs</p>
              </button>

              {/* Card 3: Gross Margin */}
              <button
                onClick={() => setSelectedMetric("gross_margin")}
                className={`p-5 text-left transition-all ${
                  selectedMetric === "gross_margin" ? "bg-teal-50/60 border-b-4 border-teal-600" : "hover:bg-gray-50/60"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Gross Margin</span>
                  <BarChart3 className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-2xl font-black text-gray-900 mt-2">
                  {formatSignedCurrency(financialMetrics.grossMargin)}
                </div>
                <p className="text-[11px] text-teal-600 font-semibold mt-1">{financialMetrics.grossMarginPct.toFixed(1)}% Margin</p>
              </button>

              {/* Card 4: Burn Rate */}
              <button
                onClick={() => setSelectedMetric("burn_rate")}
                className={`p-5 text-left transition-all ${
                  selectedMetric === "burn_rate" ? "bg-rose-50/60 border-b-4 border-rose-600" : "hover:bg-gray-50/60"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Burn Rate</span>
                  <Flame className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-black text-gray-900 mt-2">{formatCurrency(financialMetrics.monthlyBurnRate)}</div>
                <p className="text-[11px] text-rose-600 font-semibold mt-1">Operating Expense</p>
              </button>
            </div>

            {/* Main Trend Chart */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>{getMetricTitle(selectedMetric)} Trend</span>
                </h3>
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as Granularity)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none font-medium"
                >
                  <option value="daily">Daily View</option>
                  <option value="monthly">Monthly View</option>
                </select>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-inner">
                <AnalyticsTrendChart
                  points={chartPoints}
                  selectedMetric={selectedMetric}
                  maxVal={maxChartValue}
                />
              </div>
            </div>

            {/* Target vs Actual Progress Bar */}
            <div className="p-6 pt-0 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Monthly UCO Volume Target (10,000 L Goal)
                </span>
                <span className="text-emerald-700 font-mono">
                  {((metrics.totalLiters / 10000) * 100).toFixed(1)}% Achieved
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((metrics.totalLiters / 10000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Realtime Operations Sidebar (Right 4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xl shadow-gray-200/50 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Live Activity</span>
                </div>
                <span className="text-[11px] font-mono text-gray-400">Last 48 Hours</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-xl">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Recent Stops</p>
                  <p className="text-xl font-black text-emerald-950 mt-1">{realtimeMetrics.recentCount}</p>
                </div>
                <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-800 uppercase">Recent Volume</p>
                  <p className="text-xl font-black text-blue-950 mt-1">{formatLiters(realtimeMetrics.recentLiters)}</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Active Drivers / Pickers</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  {realtimeMetrics.activePickersCount} On Duty
                </span>
              </div>
            </div>

            {/* Quick Leaderboard Preview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xl shadow-gray-200/50 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold uppercase text-gray-900 tracking-wider">Top FBO Partners</h3>
                <Award className="w-4 h-4 text-amber-500" />
              </div>

              <div className="space-y-2">
                {fbos.slice(0, 4).map((fbo, idx) => (
                  <div key={fbo.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">
                        {fbo.business_name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: COLLECTIONS & VOLUME ─────────────────────────────────── */}
      {activeTab === "collections" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Total Volume</span>
              <p className="text-2xl font-black text-gray-900">{formatLiters(metrics.totalLiters)}</p>
              <p className="text-[11px] text-emerald-600 font-semibold">UCO Collected in range</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Completed Stops</span>
              <p className="text-2xl font-black text-gray-900">{metrics.completedCount}</p>
              <p className="text-[11px] text-blue-600 font-semibold">Logistics pickups</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Avg Liters / Stop</span>
              <p className="text-2xl font-black text-gray-900">{formatLiters(metrics.avgLitersPerPickup)}</p>
              <p className="text-[11px] text-teal-600 font-semibold">Collection efficiency</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">CO2 Offset</span>
              <p className="text-2xl font-black text-gray-900">{metrics.co2OffsetTons.toFixed(2)} Tons</p>
              <p className="text-[11px] text-emerald-700 font-semibold">Environmental impact</p>
            </div>
          </div>

          {/* Volume Trend SVG Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">UCO Collection Trend Line</h3>
            <AnalyticsTrendChart
              points={chartPoints}
              selectedMetric="volume"
              maxVal={maxChartValue}
            />
          </div>

          {/* FBO Churn Risk & Retention Health Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">FBO Retention & Activity Health</h3>
                <p className="text-xs text-gray-500">Flags suppliers with no pickup activity for more than 14 days.</p>
              </div>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold">
                    <th className="pb-3 px-3">FBO Partner</th>
                    <th className="pb-3 px-3">Last Pickup Date</th>
                    <th className="pb-3 px-3 text-right">Lifetime Volume (L)</th>
                    <th className="pb-3 px-3 text-right">Activity Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {fboHealthList.map((fbo) => (
                    <tr key={fbo.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-gray-900">{fbo.business_name}</td>
                      <td className="py-3 px-3 text-gray-500 font-mono">
                        {fbo.lastPickupDate ? fbo.lastPickupDate.toLocaleDateString("en-IN") : "Never"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatLiters(fbo.totalLiters)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {fbo.isSilent ? (
                          <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-200">
                            Silent &gt; 14 Days
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: FINANCIAL P&L ────────────────────────────────────────── */}
      {activeTab === "financials" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Current Cash Balance</span>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(financialMetrics.currentCashBalance)}</p>
              <p className="text-[11px] text-emerald-600 font-semibold">Opening + Income - Expenses</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Monthly Burn Rate</span>
              <p className="text-2xl font-black text-rose-600">{formatCurrency(financialMetrics.monthlyBurnRate)}</p>
              <p className="text-[11px] text-rose-600 font-semibold">{financialMetrics.monthlyExpenseCount} expenses this month</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Net Cash Flow</span>
              <p className={`text-2xl font-black ${financialMetrics.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatSignedCurrency(financialMetrics.netCashFlow)}
              </p>
              <p className="text-[11px] text-gray-500 font-semibold">Total Income minus Expenses</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Gross Margin</span>
              <p className={`text-2xl font-black ${financialMetrics.grossMargin >= 0 ? "text-teal-600" : "text-rose-600"}`}>
                {formatSignedCurrency(financialMetrics.grossMargin)}
              </p>
              <p className="text-[11px] text-teal-600 font-semibold">{financialMetrics.grossMarginPct.toFixed(1)}% Gross Margin</p>
            </div>
          </div>

          {/* Financial Trend SVG Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Financial Trend Line</h3>
            <AnalyticsTrendChart
              points={chartPoints}
              selectedMetric="gross_margin"
              maxVal={maxChartValue}
            />
          </div>
        </div>
      )}

      {/* ── TAB 4: NETWORK DIRECTORY ────────────────────────────────────── */}
      {activeTab === "network" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Active FBO Partners</span>
              <p className="text-2xl font-black text-gray-900">{metrics.activeFboCount} / {metrics.totalFbos}</p>
              <p className="text-[11px] text-emerald-600 font-semibold">{metrics.fboActivityRate.toFixed(1)}% Active Rate</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Pickers / Drivers</span>
              <p className="text-2xl font-black text-gray-900">{pickers.length}</p>
              <p className="text-[11px] text-blue-600 font-semibold">Registered fleet drivers</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Collection Network Stops</span>
              <p className="text-2xl font-black text-gray-900">{metrics.completedCount}</p>
              <p className="text-[11px] text-teal-600 font-semibold">Pickup locations served</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase">Top Collection Zone</span>
              <p className="text-2xl font-black text-gray-900">Central</p>
              <p className="text-[11px] text-purple-600 font-semibold">Highest density area</p>
            </div>
          </div>

          {/* Network Activity Trend SVG Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Network Stop Activity Trend</h3>
            <AnalyticsTrendChart
              points={chartPoints}
              selectedMetric="pickups"
              maxVal={maxChartValue}
            />
          </div>
        </div>
      )}
    </div>
  );
}
