"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet,
  Flame,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Download,
  FileText,
  Eye,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Loader2,
  X,
  ShieldCheck,
  RefreshCw,
  Trash2,
} from "lucide-react";

// Types
type TransactionType = "Income" | "Expense" | "Asset" | "Transfer";

interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  reference: string;
  proofName: string | null;
  proofUrl: string | null;
  notes?: string;
}

// Preset Category options per Transaction Type
const CATEGORIES_BY_TYPE: Record<TransactionType, string[]> = {
  Income: ["Revenue / Oil Sale", "Grant / Subsidy", "Investment", "Other Income"],
  Expense: ["FBO Restaurant Payout", "Logistics & Fleet", "Payroll", "Infrastructure", "Marketing", "Utilities", "Procurement"],
  Asset: ["Equipment & Vehicles", "Depot Real Estate", "IT Hardware", "Storage Tanks"],
  Transfer: ["Bank Reserve", "Inter-Account Transfer", "Petty Cash"],
};

export default function FinancialsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState<Transaction | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All");

  // Form State
  const [formType, setFormType] = useState<TransactionType>("Expense");
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES_BY_TYPE["Expense"][0]);
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formReference, setFormReference] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formFile, setFormFile] = useState<File | null>(null);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchManualFinancials();
  }, []);

  async function fetchManualFinancials() {
    setLoading(true);
    try {
      // Query ONLY manually entered transactions from financial_transactions table
      let customTransactions: Transaction[] = [];
      try {
        const { data: dbCustom, error } = await supabase
          .from("financial_transactions")
          .select("*")
          .order("transaction_date", { ascending: false });

        if (!error && dbCustom && dbCustom.length > 0) {
          customTransactions = dbCustom.map((c: any) => ({
            id: c.id,
            date: c.transaction_date,
            type: c.type as TransactionType,
            category: c.category,
            amount: Number(c.amount),
            reference: c.reference_id,
            proofName: c.proof_name,
            proofUrl: c.proof_url,
            notes: c.notes,
          }));
        } else {
          // Fallback to local storage manually saved transactions
          const localSaved = localStorage.getItem("mellod_custom_financial_txs");
          if (localSaved) {
            try {
              customTransactions = JSON.parse(localSaved);
            } catch (e) {
              console.error(e);
            }
          }
        }
      } catch (err) {
        const localSaved = localStorage.getItem("mellod_custom_financial_txs");
        if (localSaved) {
          try {
            customTransactions = JSON.parse(localSaved);
          } catch (e) {
            console.error(e);
          }
        }
      }

      setTransactions(customTransactions);
    } catch (err) {
      console.error("Error fetching manual financial data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle category update when type changes in form
  const handleTypeChange = (type: TransactionType) => {
    setFormType(type);
    setFormCategory(CATEGORIES_BY_TYPE[type][0]);
  };

  // Save New Manual Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError("Please enter a valid numeric transaction amount greater than 0.");
      return;
    }

    if (!formReference.trim()) {
      setFormError("Reference / Invoice ID is required.");
      return;
    }

    setFormSubmitting(true);

    let photoUrl: string | null = null;
    if (formFile) {
      try {
        const fileName = `receipt_${Date.now()}_${formFile.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        const { data: uploadData } = await supabase.storage
          .from("pickup-photos")
          .upload(fileName, formFile);
        if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("pickup-photos")
            .getPublicUrl(uploadData.path);
          photoUrl = urlData.publicUrl;
        }
      } catch (e) {
        console.error("Storage upload warning:", e);
      }
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date: formDate,
      type: formType,
      category: formCategory,
      amount: amountNum,
      reference: formReference.trim().toUpperCase(),
      proofName: formFile ? formFile.name : null,
      proofUrl: photoUrl,
      notes: formNotes.trim() || undefined,
    };

    // Save to Supabase financial_transactions table & local storage fallback
    try {
      const { error: dbErr } = await supabase.from("financial_transactions").insert({
        type: formType,
        category: formCategory,
        amount: amountNum,
        transaction_date: formDate,
        reference_id: formReference.trim().toUpperCase(),
        notes: formNotes.trim() || null,
        proof_url: photoUrl,
        proof_name: formFile ? formFile.name : null,
      });

      if (dbErr) {
        const existingLocal = JSON.parse(localStorage.getItem("mellod_custom_financial_txs") || "[]");
        const updatedLocal = [newTx, ...existingLocal];
        localStorage.setItem("mellod_custom_financial_txs", JSON.stringify(updatedLocal));
      }
    } catch (err) {
      const existingLocal = JSON.parse(localStorage.getItem("mellod_custom_financial_txs") || "[]");
      const updatedLocal = [newTx, ...existingLocal];
      localStorage.setItem("mellod_custom_financial_txs", JSON.stringify(updatedLocal));
    }

    setFormSubmitting(false);
    setFormSuccess("Transaction saved successfully.");

    // Refresh live manual list
    await fetchManualFinancials();

    // Reset inputs
    setFormAmount("");
    setFormReference("");
    setFormNotes("");
    setFormFile(null);

    setTimeout(() => {
      setFormSuccess(null);
      setShowFormModal(false);
    }, 1200);
  };

  // Delete Custom Transaction
  const handleDeleteTransaction = async (tx: Transaction) => {
    if (confirm("Are you sure you want to delete this transaction record?")) {
      try {
        await supabase.from("financial_transactions").delete().eq("id", tx.id);
      } catch (e) {
        console.error(e);
      }

      const existingLocal = JSON.parse(localStorage.getItem("mellod_custom_financial_txs") || "[]");
      const updatedLocal = existingLocal.filter((item: any) => item.id !== tx.id);
      localStorage.setItem("mellod_custom_financial_txs", JSON.stringify(updatedLocal));

      await fetchManualFinancials();
    }
  };

  // ── KPI Dashboard Calculations (Derived ONLY from manual entries) ─────────
  const kpiData = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === "Income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === "Expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAsset = transactions
      .filter((t) => t.type === "Asset")
      .reduce((sum, t) => sum + t.amount, 0);

    const currentCashBalance = totalIncome - totalExpense - totalAsset;
    const monthlyBurnRate = totalExpense;
    const netCashFlow = totalIncome - totalExpense;

    return {
      currentCashBalance,
      monthlyBurnRate,
      netCashFlow,
    };
  }, [transactions]);

  // ── Filtered Ledger Data ──────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "All" && t.type !== typeFilter) return false;

      if (dateFilter !== "All") {
        const txDate = new Date(t.date);
        const now = new Date();
        if (dateFilter === "This Month") {
          if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (dateFilter === "This Year") {
          if (txDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRef = t.reference.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q) || false;
        if (!matchRef && !matchCat && !matchNotes) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, dateFilter, searchQuery]);

  // Export Ledger CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Date", "Type", "Category", "Amount", "Reference", "Notes", "Proof File"];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      t.type,
      `"${t.category}"`,
      t.amount,
      `"${t.reference}"`,
      `"${t.notes || ""}"`,
      `"${t.proofName || "None"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ── Header Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-green-700" />
            Financial Management Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manual entry ledger. Values appear only when entered by admin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchManualFinancials()}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-2.5 px-3 bg-white hover:bg-gray-50 border border-gray-200"
            title="Refresh entries"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-green-700" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-200"
          >
            <Download className="w-4 h-4 text-gray-600" />
            Export CSV
          </button>

          <button
            onClick={() => setShowFormModal(true)}
            className="btn btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 shadow-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Log New Transaction
          </button>
        </div>
      </div>

      {/* ── SECTION 1: KPI Dashboard (Derived ONLY from manual entries) ────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Current Cash Balance */}
        <div className="card p-6 bg-gradient-to-br from-emerald-800 via-green-800 to-teal-900 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-green-200">
              Current Cash Balance
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="my-4">
            <div className="text-3xl lg:text-4xl font-black tracking-tight text-white">
              {formatCurrency(kpiData.currentCashBalance)}
            </div>
            <p className="text-xs text-green-200 font-medium mt-1">
              Net balance from manual ledger entries
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-green-100">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green-300" /> Manual Ledger Active
            </span>
            <span className="font-semibold">{transactions.length} Total Entries</span>
          </div>
        </div>

        {/* Card 2: Monthly Burn Rate */}
        <div className="card p-6 bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Monthly Burn Rate
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          <div className="my-4">
            <div className="text-3xl font-black text-gray-900">
              {formatCurrency(kpiData.monthlyBurnRate)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total logged expenses outlays
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Logged Expenses</span>
            <span className="font-bold text-rose-600">
              {transactions.filter((t) => t.type === "Expense").length} items
            </span>
          </div>
        </div>

        {/* Card 3: Net Cash Flow */}
        <div
          className={`card p-6 border shadow-sm flex flex-col justify-between transition-colors ${
            kpiData.netCashFlow >= 0
              ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
              : "bg-rose-50/60 border-rose-200 text-rose-950"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                kpiData.netCashFlow >= 0 ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              Net Cash Flow
            </span>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                kpiData.netCashFlow >= 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {kpiData.netCashFlow >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
          </div>

          <div className="my-4">
            <div
              className={`text-3xl font-black ${
                kpiData.netCashFlow >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {kpiData.netCashFlow >= 0 ? "+" : ""}
              {formatCurrency(kpiData.netCashFlow)}
            </div>
            <p
              className={`text-xs mt-1 font-medium ${
                kpiData.netCashFlow >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {kpiData.netCashFlow >= 0
                ? "Net positive income flow"
                : "Operating deficit outlay"}
            </p>
          </div>

          <div
            className={`pt-3 border-t flex items-center justify-between text-xs ${
              kpiData.netCashFlow >= 0
                ? "border-emerald-200 text-emerald-800"
                : "border-rose-200 text-rose-800"
            }`}
          >
            <span>Period Margin Status</span>
            <span className="font-bold">
              {kpiData.netCashFlow >= 0 ? "★ Surplus" : "⚠️ Deficit"}
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2 & 3 Grid: Side Entry Form + Main Transaction Ledger ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Persistent Desktop Form Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-700" />
              <h2 className="font-bold text-gray-900 text-base">Log New Transaction</h2>
            </div>
            <span className="badge bg-green-50 text-green-800 text-[10px] uppercase font-bold">
              Manual Form
            </span>
          </div>

          <form onSubmit={handleSaveTransaction} className="space-y-4">
            {/* Field 1: Transaction Type Toggle Buttons */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Transaction Type *
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                {(["Income", "Expense", "Asset", "Transfer"] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`py-2 px-2 rounded-lg text-center transition-all ${
                      formType === t
                        ? t === "Income"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : t === "Expense"
                          ? "bg-rose-600 text-white shadow-sm"
                          : t === "Asset"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-purple-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 2: Locked Dropdown Category */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Category *
              </label>
              <select
                className="form-input text-sm font-semibold bg-white"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              >
                {CATEGORIES_BY_TYPE[formType].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 3: Amount Formatted for Currency */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  className="form-input !pl-8 font-bold text-base text-gray-900"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Field 4: Date Picker & Field 5: Reference ID */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  className="form-input text-xs font-semibold"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Reference ID *
                </label>
                <input
                  type="text"
                  placeholder="INV-2026-001"
                  className="form-input text-xs font-bold uppercase tracking-wider"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Field 6: Notes / Description */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Description / Notes
              </label>
              <input
                type="text"
                placeholder="e.g., FBO payout for Royal Diner, Fuel bill..."
                className="form-input text-xs"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>

            {/* Field 7: Receipt / Proof Upload File Input Zone */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Attach Receipt / Proof
              </label>
              <div className="relative border-2 border-dashed border-gray-200 hover:border-green-600 rounded-xl p-3 bg-gray-50 text-center transition-colors">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                  <UploadCloud className="w-4 h-4 text-green-700" />
                  {formFile ? (
                    <span className="font-semibold text-green-800 truncate max-w-[200px]">
                      {formFile.name}
                    </span>
                  ) : (
                    <span>Click or drag receipt file</span>
                  )}
                </div>
              </div>
            </div>

            {/* Feedback messages */}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
                {formSuccess}
              </div>
            )}

            {/* Save Transaction Button with Loading State */}
            <button
              type="submit"
              disabled={formSubmitting}
              className="btn btn-primary w-full py-3 text-xs flex items-center justify-center gap-2 font-bold shadow-md"
            >
              {formSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Transaction...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Save Transaction
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── SECTION 3: Transaction Ledger Table (8 cols) ────────────────── */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-base">Transaction Ledger</h2>
              <p className="text-xs text-gray-500">
                Displaying {filteredTransactions.length} of {transactions.length} total entries
              </p>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ref ID or category..."
                  className="form-input !pl-8 !py-1.5 text-xs bg-gray-50 border-gray-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="form-input !py-1.5 !px-3 text-xs bg-gray-50 border-gray-200 font-medium"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
                <option value="Asset">Asset</option>
                <option value="Transfer">Transfer</option>
              </select>

              <select
                className="form-input !py-1.5 !px-3 text-xs bg-gray-50 border-gray-200 font-medium"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="All">All Time</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
              </select>
            </div>
          </div>

          {/* Table View */}
          {loading ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-green-700" />
              <span>Loading financial ledger...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-gray-300" />
              <p className="font-semibold text-gray-600 text-sm">No transactions logged yet.</p>
              <p className="text-xs text-gray-400">Use the form on the left to manually record income, expenses (such as FBO restaurant payouts), assets, or transfers.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-center">Proof</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="py-3.5 px-4 font-medium text-gray-700 whitespace-nowrap">
                        {tx.date}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`badge font-bold text-[10px] px-2.5 py-1 ${
                            tx.type === "Income"
                              ? "bg-emerald-100 text-emerald-800"
                              : tx.type === "Expense"
                              ? "bg-rose-100 text-rose-800"
                              : tx.type === "Asset"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {tx.category}
                        {tx.notes && (
                          <p className="text-[10px] text-gray-400 font-normal truncate max-w-[180px]">
                            {tx.notes}
                          </p>
                        )}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-bold whitespace-nowrap text-sm ${
                          tx.type === "Income"
                            ? "text-emerald-700"
                            : tx.type === "Expense"
                            ? "text-rose-600"
                            : tx.type === "Asset"
                            ? "text-blue-700"
                            : "text-purple-700"
                        }`}
                      >
                        {tx.type === "Income" ? "+" : tx.type === "Expense" ? "-" : ""}
                        {formatCurrency(tx.amount)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-gray-600 text-[11px] whitespace-nowrap">
                        {tx.reference}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {tx.proofUrl || tx.proofName ? (
                          <button
                            onClick={() => setSelectedProof(tx)}
                            className="p-1.5 bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-800 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                            title="View Attached Proof"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-gray-300 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTransaction(tx)}
                          className="p-1 text-gray-300 hover:text-rose-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Proof Document Preview Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl space-y-4">
            <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-400" />
                <span className="font-bold text-sm">Receipt & Proof Verification</span>
              </div>
              <button
                onClick={() => setSelectedProof(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400">Reference:</span>
                  <p className="font-bold text-gray-900 font-mono text-sm">{selectedProof.reference}</p>
                </div>
                <div>
                  <span className="text-gray-400">Date:</span>
                  <p className="font-semibold text-gray-800">{selectedProof.date}</p>
                </div>
                <div>
                  <span className="text-gray-400">Type & Category:</span>
                  <p className="font-semibold text-gray-800">{selectedProof.type} — {selectedProof.category}</p>
                </div>
                <div>
                  <span className="text-gray-400">Amount:</span>
                  <p className="font-bold text-emerald-700 text-sm">{formatCurrency(selectedProof.amount)}</p>
                </div>
              </div>

              {selectedProof.proofUrl && (
                <div className="border rounded-xl overflow-hidden max-h-[300px] bg-gray-100 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProof.proofUrl}
                    alt="Receipt preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {selectedProof.proofName && (
                <p className="text-xs text-gray-500 text-center font-mono">
                  Attached file: <strong>{selectedProof.proofName}</strong>
                </p>
              )}
            </div>

            <div className="px-5 py-3 bg-gray-50 text-right border-t border-gray-100">
              <button
                onClick={() => setSelectedProof(null)}
                className="btn btn-secondary text-xs px-4 py-2"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Trigger for Mobile / Floating Access */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 lg:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-gray-900 text-base">Log New Transaction</h2>
              <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">Enter details to record financial transaction into ledger.</p>
          </div>
        </div>
      )}
    </div>
  );
}
