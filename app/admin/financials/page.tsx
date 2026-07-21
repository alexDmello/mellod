"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatLiters } from "@/lib/utils";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Save,
  Fuel,
  Building,
  Zap,
  Users,
  Wrench,
  Package,
  Calculator,
  PieChart,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface ExpenseItem {
  id: string;
  category: "fuel" | "rent" | "electricity" | "salaries" | "maintenance" | "other";
  title: string;
  amount: number;
  dateAdded: string;
}

const EXPENSE_CATEGORIES = [
  { id: "fuel", label: "Fuel & Transport", icon: Fuel, color: "text-amber-600 bg-amber-50" },
  { id: "rent", label: "Warehouse / Rent", icon: Building, color: "text-blue-600 bg-blue-50" },
  { id: "electricity", label: "Electricity & Utilities", icon: Zap, color: "text-yellow-600 bg-yellow-50" },
  { id: "salaries", label: "Driver & Staff Salaries", icon: Users, color: "text-purple-600 bg-purple-50" },
  { id: "maintenance", label: "Vehicle Maintenance", icon: Wrench, color: "text-rose-600 bg-rose-50" },
  { id: "other", label: "Miscellaneous Overhead", icon: Package, color: "text-gray-600 bg-gray-50" },
];

export default function FinancialsPage() {
  const [loading, setLoading] = useState(true);
  const [fboBuyingPrice, setFboBuyingPrice] = useState<number>(0);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(0);

  // UCO Refinery Selling Price (what Admin gets per kg/liter)
  const [sellingPriceInput, setSellingPriceInput] = useState<string>("75");
  const [sellingPrice, setSellingPrice] = useState<number>(75);
  const [priceSaved, setPriceSaved] = useState(false);

  // Operating Expenses state
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [newExpCategory, setNewExpCategory] = useState<ExpenseItem["category"]>("fuel");
  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");

  // Projections simulator state
  const [simulatedVolume, setSimulatedVolume] = useState<number>(10000);

  const supabase = createClient();

  useEffect(() => {
    // Load saved selling price and expenses from localStorage
    const savedSellingPrice = localStorage.getItem("mellod_uco_selling_price");
    if (savedSellingPrice) {
      const price = parseFloat(savedSellingPrice);
      if (!isNaN(price) && price > 0) {
        setSellingPrice(price);
        setSellingPriceInput(savedSellingPrice);
      }
    }

    const savedExpenses = localStorage.getItem("mellod_operating_expenses");
    if (savedExpenses) {
      try {
        setExpenses(JSON.parse(savedExpenses));
      } catch (e) {
        console.error("Failed to parse saved expenses:", e);
      }
    }

    fetchDatabaseFinancials();
  }, []);

  async function fetchDatabaseFinancials() {
    setLoading(true);
    try {
      // 1. Fetch current FBO buying price
      const { data: priceData } = await supabase
        .from("daily_prices")
        .select("price_per_liter")
        .order("effective_from", { ascending: false })
        .limit(1)
        .single();

      if (priceData) {
        setFboBuyingPrice(Number(priceData.price_per_liter) || 0);
      }

      // 2. Fetch total volume collected in current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: pickupData } = await supabase
        .from("pickups")
        .select("liters")
        .eq("status", "completed")
        .gte("picked_up_at", startOfMonth.toISOString());

      if (pickupData) {
        const total = pickupData.reduce((sum, p) => sum + Number(p.liters || 0), 0);
        setMonthlyVolume(total);
        if (total > 0) {
          setSimulatedVolume(total);
        }
      }
    } catch (err) {
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Save Refinery Selling Price
  const handleSaveSellingPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(sellingPriceInput);
    if (!isNaN(val) && val > 0) {
      setSellingPrice(val);
      localStorage.setItem("mellod_uco_selling_price", val.toString());
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 3000);
    }
  };

  // Add Expense Item
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newExpAmount);
    if (!newExpTitle.trim() || isNaN(amt) || amt <= 0) return;

    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      category: newExpCategory,
      title: newExpTitle.trim(),
      amount: amt,
      dateAdded: new Date().toISOString(),
    };

    const updated = [newItem, ...expenses];
    setExpenses(updated);
    localStorage.setItem("mellod_operating_expenses", JSON.stringify(updated));

    setNewExpTitle("");
    setNewExpAmount("");
  };

  // Delete Expense Item
  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    localStorage.setItem("mellod_operating_expenses", JSON.stringify(updated));
  };

  // ── Financial Calculations ────────────────────────────────────────────────
  const totalOpEx = useMemo(() => {
    return expenses.reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  const unitGrossMargin = useMemo(() => {
    return Math.max(sellingPrice - fboBuyingPrice, 0);
  }, [sellingPrice, fboBuyingPrice]);

  // Actual Monthly P&L
  const actualRevenue = useMemo(() => monthlyVolume * sellingPrice, [monthlyVolume, sellingPrice]);
  const actualCogs = useMemo(() => monthlyVolume * fboBuyingPrice, [monthlyVolume, fboBuyingPrice]);
  const actualGrossProfit = useMemo(() => actualRevenue - actualCogs, [actualRevenue, actualCogs]);
  const actualNetEarnings = useMemo(() => actualGrossProfit - totalOpEx, [actualGrossProfit, totalOpEx]);
  const actualProfitMargin = useMemo(() => (actualRevenue > 0 ? (actualNetEarnings / actualRevenue) * 100 : 0), [actualNetEarnings, actualRevenue]);

  // Simulated Projections
  const simRevenue = useMemo(() => simulatedVolume * sellingPrice, [simulatedVolume, sellingPrice]);
  const simCogs = useMemo(() => simulatedVolume * fboBuyingPrice, [simulatedVolume, fboBuyingPrice]);
  const simGrossProfit = useMemo(() => simRevenue - simCogs, [simRevenue, simCogs]);
  const simNetEarnings = useMemo(() => simGrossProfit - totalOpEx, [simGrossProfit, totalOpEx]);

  // Break-even volume calculation (Liters needed to cover total OpEx)
  const breakEvenVolume = useMemo(() => {
    if (unitGrossMargin <= 0) return 0;
    return Math.ceil(totalOpEx / unitGrossMargin);
  }, [totalOpEx, unitGrossMargin]);

  // Per Liter Metrics
  const opexPerLiter = useMemo(() => {
    return monthlyVolume > 0 ? totalOpEx / monthlyVolume : (simulatedVolume > 0 ? totalOpEx / simulatedVolume : 0);
  }, [totalOpEx, monthlyVolume, simulatedVolume]);

  const netProfitPerLiter = useMemo(() => {
    return monthlyVolume > 0 ? actualNetEarnings / monthlyVolume : (simulatedVolume > 0 ? simNetEarnings / simulatedVolume : unitGrossMargin);
  }, [monthlyVolume, actualNetEarnings, simulatedVolume, simNetEarnings, unitGrossMargin]);

  const simOpexPerLiter = useMemo(() => {
    return simulatedVolume > 0 ? totalOpEx / simulatedVolume : 0;
  }, [totalOpEx, simulatedVolume]);

  const simNetProfitPerLiter = useMemo(() => {
    return simulatedVolume > 0 ? simNetEarnings / simulatedVolume : 0;
  }, [simNetEarnings, simulatedVolume]);

  // CSV Export
  const handleExportStatement = () => {
    const lines = [
      ["MELLOD UCO LOGISTICS - FINANCIAL STATEMENT"],
      [`Generated Date: ${new Date().toLocaleDateString()}`],
      [""],
      ["UNIT PRICING SUMMARY"],
      [`FBO Buying Price (COGS/Kg)`, `INR ${fboBuyingPrice}`],
      [`Refinery Selling Price (Revenue/Kg)`, `INR ${sellingPrice}`],
      [`Gross Margin per Kg`, `INR ${unitGrossMargin}`],
      [""],
      ["MONTHLY P&L SUMMARY"],
      [`Total Monthly Volume Collected (Kg)`, monthlyVolume],
      [`Gross Revenue`, `INR ${actualRevenue}`],
      [`FBO Payouts (COGS)`, `INR ${actualCogs}`],
      [`Gross Profit`, `INR ${actualGrossProfit}`],
      [`Total Operating Expenses (OpEx)`, `INR ${totalOpEx}`],
      [`Net Potential Monthly Earnings`, `INR ${actualNetEarnings}`],
      [`Net Profit Margin`, `${actualProfitMargin.toFixed(2)}%`],
      [""],
      ["LOGGED OPERATING EXPENSES"],
      ["Category", "Description", "Amount (INR)"],
      ...expenses.map((e) => [e.category, `"${e.title}"`, e.amount]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + lines.map((l) => l.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mellod_financial_statement_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ── Top Header Controls ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-green-700" />
            Financials & Profitability
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure refinery selling price, track monthly OpEx (rent, fuel, salaries), and calculate potential net earnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDatabaseFinancials}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-green-600" : ""}`} />
            Refresh
          </button>

          <button onClick={handleExportStatement} className="btn btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm">
            <Download className="w-3.5 h-3.5" />
            Export Statement
          </button>
        </div>
      </div>

      {/* ── 1. Unit Pricing & Margin Analysis ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Set Selling Price Card */}
        <div className="card p-6 bg-white border border-gray-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Refinery Selling Price</h2>
              <p className="text-xs text-gray-500">Price you receive per kg/liter from buyers</p>
            </div>
          </div>

          <form onSubmit={handleSaveSellingPrice} className="space-y-4">
            <div>
              <label className="form-label text-xs font-semibold text-gray-700">
                Sale Price per Kg/Liter (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-gray-400">₹</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  className="form-input !pl-8 font-bold text-lg"
                  placeholder="75.00"
                  value={sellingPriceInput}
                  onChange={(e) => setSellingPriceInput(e.target.value)}
                  required
                />
              </div>
            </div>

            {priceSaved && (
              <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Refinery selling price saved successfully!
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-2">
              <Save className="w-3.5 h-3.5" /> Save Selling Rate
            </button>
          </form>
        </div>

        {/* Pricing Breakdown & Unit Margin */}
        <div className="lg:col-span-2 card p-6 bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 text-white flex flex-col justify-between space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-green-200">Margin Breakdown</span>
            </div>
            <span className="badge bg-white/20 text-white text-xs font-semibold px-3 py-1">Per Kg / Liter</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-y border-white/10 py-4">
            <div>
              <p className="text-xs text-green-200">FBO Buy Rate (Cost)</p>
              <p className="text-2xl font-black mt-1 text-white">{formatCurrency(fboBuyingPrice)}</p>
              <p className="text-[10px] text-green-300">Paid to restaurants</p>
            </div>

            <div className="border-l border-white/10 pl-4">
              <p className="text-xs text-green-200">Refinery Sell Rate</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">{formatCurrency(sellingPrice)}</p>
              <p className="text-[10px] text-green-300">Revenue per kg</p>
            </div>

            <div className="border-l border-white/10 pl-4">
              <p className="text-xs text-green-200">Gross Margin / Kg</p>
              <p className="text-2xl font-black mt-1 text-yellow-300">+{formatCurrency(unitGrossMargin)}</p>
              <p className="text-[10px] text-green-300">Gross spread per kg</p>
            </div>

            <div className="border-l border-white/10 pl-4">
              <p className="text-xs text-green-200">Net Profit / Liter</p>
              <p className="text-2xl font-black mt-1 text-lime-300">+{formatCurrency(netProfitPerLiter)}</p>
              <p className="text-[10px] text-green-200 font-semibold">Net profit after OpEx</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-green-100">
            <span>Current Month Volume Collected: <strong>{formatLiters(monthlyVolume)}</strong></span>
            <span>Break-Even Volume: <strong>{formatLiters(breakEvenVolume)}</strong></span>
          </div>
        </div>
      </div>

      {/* ── 2. Executive P&L & Potential Net Earnings Summary ───────────────────── */}
      <div className="card p-6 bg-white border border-gray-100 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-700" />
              Monthly Profit & Loss Statement (P&L)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Summary of actual gross revenue, FBO payouts, OpEx, and potential net earnings.</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-gray-500">Net Profit Margin</span>
            <div className={`text-xl font-black ${actualNetEarnings >= 0 ? "text-green-700" : "text-red-600"}`}>
              {actualProfitMargin.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Gross Revenue */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Revenue</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(actualRevenue)}</p>
            <p className="text-[11px] text-gray-400 mt-1">{formatLiters(monthlyVolume)} × {formatCurrency(sellingPrice)}</p>
          </div>

          {/* FBO Payouts */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">FBO Payouts (COGS)</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(actualCogs)}</p>
            <p className="text-[11px] text-gray-400 mt-1">{formatLiters(monthlyVolume)} × {formatCurrency(fboBuyingPrice)}</p>
          </div>

          {/* Total OpEx */}
          <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total OpEx</p>
            <p className="text-2xl font-black text-rose-900 mt-1">-{formatCurrency(totalOpEx)}</p>
            <p className="text-[11px] text-rose-600 mt-1">{expenses.length} expense categories</p>
          </div>

          {/* Net Profit per Liter */}
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Net Profit / Liter</p>
            <p className="text-2xl font-black text-emerald-900 mt-1">+{formatCurrency(netProfitPerLiter)}</p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1">
              ₹{sellingPrice} - ₹{fboBuyingPrice} - ₹{opexPerLiter.toFixed(1)} OpEx
            </p>
          </div>

          {/* Net Potential Earnings */}
          <div className={`p-4 rounded-xl border ${actualNetEarnings >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <p className={`text-xs font-bold uppercase tracking-wider ${actualNetEarnings >= 0 ? "text-green-800" : "text-red-800"}`}>
              Net Potential Earnings
            </p>
            <p className={`text-2xl font-black mt-1 ${actualNetEarnings >= 0 ? "text-green-900" : "text-red-900"}`}>
              {formatCurrency(actualNetEarnings)}
            </p>
            <p className={`text-[11px] font-semibold mt-1 ${actualNetEarnings >= 0 ? "text-green-700" : "text-red-600"}`}>
              {actualNetEarnings >= 0 ? "★ Net Monthly Profit" : "⚠️ Operating Loss"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Operating Expenses Manager (OpEx Log) ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Expense Form (1 Col) */}
        <div className="card p-6 bg-white border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Plus className="w-5 h-5 text-green-700" />
            <h2 className="font-bold text-gray-900 text-base">Log Operating Expense</h2>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="form-label text-xs">Expense Category</label>
              <select
                className="form-input text-sm"
                value={newExpCategory}
                onChange={(e) => setNewExpCategory(e.target.value as any)}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label text-xs">Title / Description *</label>
              <input
                type="text"
                placeholder="e.g. Fuel for Tempo, Depot Rent"
                className="form-input text-sm"
                value={newExpTitle}
                onChange={(e) => setNewExpTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label text-xs">Monthly Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="2000"
                  className="form-input !pl-8 text-sm font-semibold"
                  value={newExpAmount}
                  onChange={(e) => setNewExpAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Expense Line
            </button>
          </form>
        </div>

        {/* Expenses List (2 Cols) */}
        <div className="lg:col-span-2 card p-6 bg-white border border-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="font-bold text-gray-900 text-base">Monthly Operating Expenses Log</h2>
              <p className="text-xs text-gray-500">Fixed & variable operational overhead items</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">Total Monthly OpEx</span>
              <p className="text-lg font-black text-rose-600">{formatCurrency(totalOpEx)}</p>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No operating expenses logged yet. Add items on the left to track fuel, rent, utilities, and salaries.
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[340px] overflow-y-auto pr-1">
              {expenses.map((exp) => {
                const catMeta = EXPENSE_CATEGORIES.find((c) => c.id === exp.category) || EXPENSE_CATEGORIES[5];
                const IconComp = catMeta.icon;

                return (
                  <div key={exp.id} className="flex items-center justify-between py-3 hover:bg-gray-50/50 px-2 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${catMeta.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{exp.title}</p>
                        <p className="text-xs text-gray-400">{catMeta.label}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-rose-600">-{formatCurrency(exp.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-gray-300 hover:text-red-600 transition-colors p-1"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Earnings Simulator & Volume Projections ───────────────────────── */}
      <div className="card p-6 bg-white border border-gray-100 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-700" />
              Potential Volume & Profitability Simulator
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Drag the slider to project earnings at different collection scale targets.</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400">Target Monthly Volume</span>
            <div className="text-lg font-black text-gray-900">{formatLiters(simulatedVolume)}</div>
          </div>
        </div>

        {/* Volume Slider */}
        <div className="space-y-3 bg-gray-50 p-5 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span>1,000 Kg / Month</span>
            <span>25,000 Kg / Month</span>
            <span>50,000 Kg / Month</span>
          </div>
          <input
            type="range"
            min="1000"
            max="50000"
            step="500"
            value={simulatedVolume}
            onChange={(e) => setSimulatedVolume(Number(e.target.value))}
            className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-700"
          />
        </div>

        {/* Projected P&L Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase">Projected Revenue</p>
            <p className="text-xl font-black text-gray-900 mt-1">{formatCurrency(simRevenue)}</p>
            <p className="text-[11px] text-gray-400 mt-1">{formatLiters(simulatedVolume)} × {formatCurrency(sellingPrice)}</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase">Projected COGS (FBO)</p>
            <p className="text-xl font-black text-gray-900 mt-1">{formatCurrency(simCogs)}</p>
            <p className="text-[11px] text-gray-400 mt-1">{formatLiters(simulatedVolume)} × {formatCurrency(fboBuyingPrice)}</p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-xs font-bold text-rose-800 uppercase">Simulated OpEx / Liter</p>
            <p className="text-xl font-black text-rose-600 mt-1">-{formatCurrency(simOpexPerLiter)}</p>
            <p className="text-[11px] text-gray-400 mt-1">-{formatCurrency(totalOpEx)} total OpEx</p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Simulated Profit / Liter</p>
            <p className="text-2xl font-black text-emerald-900 mt-1">
              {simNetProfitPerLiter >= 0 ? "+" : ""}{formatCurrency(simNetProfitPerLiter)}
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1">
              ₹{unitGrossMargin} - ₹{simOpexPerLiter.toFixed(1)} OpEx
            </p>
          </div>

          <div className="p-4 bg-green-700 text-white rounded-xl shadow-md">
            <p className="text-xs font-bold uppercase text-green-200">Projected Net Profit</p>
            <p className="text-2xl font-black mt-1">{formatCurrency(simNetEarnings)}</p>
            <p className="text-[11px] text-green-200 mt-1">At {formatLiters(simulatedVolume)}/mo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
