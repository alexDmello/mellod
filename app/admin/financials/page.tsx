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
  FilterX,
  ChevronDown,
  Landmark,
  CreditCard,
  Lock,
  BarChart3,
  Pencil,
  Ban,
  CloudOff,
  CloudCheck,
} from "lucide-react";

// Types
type TransactionType = "Income" | "Expense" | "Asset" | "Transfer" | "Liability";
type CostType = "COGS" | "OPEX";
type PaymentMode = "Cash" | "UPI" | "Bank Transfer" | "Cheque";

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
  costType?: CostType | null;
  paymentMode?: PaymentMode | null;
  taxableAmount?: number | null;
  gstRate?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  isOpeningBalance?: boolean;
  isVoided?: boolean;
  voidedReason?: string | null;
  voidedAt?: string | null;
}

// Preset Category options per Transaction Type
const CATEGORIES_BY_TYPE: Record<TransactionType, string[]> = {
  Income: ["Revenue / Oil Sale", "Grant / Subsidy", "Investment", "Other Income"],
  Expense: [
    "FBO Restaurant Payout", "Logistics & Fleet", "Payroll", "Infrastructure",
    "Marketing", "Utilities", "Procurement", "Insurance",
    "Licenses & Compliance", "Taxes & Government Fees", "Professional Fees (CA/Legal)",
  ],
  Asset: ["Equipment & Vehicles", "Depot Real Estate", "IT Hardware", "Storage Tanks"],
  Transfer: ["Bank Reserve", "Inter-Account Transfer", "Petty Cash"],
  Liability: ["Loan Received", "Loan Repayment (Principal)", "Interest Paid"],
};

// COGS vs OPEX classification for Expense categories
const COST_TYPE_MAP: Record<string, CostType> = {
  "FBO Restaurant Payout": "COGS",
  "Logistics & Fleet": "COGS",
  "Procurement": "COGS",
  "Payroll": "OPEX",
  "Infrastructure": "OPEX",
  "Marketing": "OPEX",
  "Utilities": "OPEX",
  "Insurance": "OPEX",
  "Licenses & Compliance": "OPEX",
  "Taxes & Government Fees": "OPEX",
  "Professional Fees (CA/Legal)": "OPEX",
};

const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Bank Transfer", "Cheque"];

// Color map for transaction type badges
const TYPE_BADGE_COLORS: Record<TransactionType, string> = {
  Income: "bg-emerald-100 text-emerald-800",
  Expense: "bg-rose-100 text-rose-800",
  Asset: "bg-blue-100 text-blue-800",
  Transfer: "bg-purple-100 text-purple-800",
  Liability: "bg-amber-100 text-amber-800",
};

const TYPE_AMOUNT_COLORS: Record<TransactionType, string> = {
  Income: "text-emerald-700",
  Expense: "text-rose-600",
  Asset: "text-blue-700",
  Transfer: "text-purple-700",
  Liability: "text-amber-700",
};

const TYPE_BTN_ACTIVE: Record<TransactionType, string> = {
  Income: "bg-emerald-600 text-white shadow-sm",
  Expense: "bg-rose-600 text-white shadow-sm",
  Asset: "bg-blue-600 text-white shadow-sm",
  Transfer: "bg-purple-600 text-white shadow-sm",
  Liability: "bg-amber-600 text-white shadow-sm",
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
  const [showVoided, setShowVoided] = useState(false);

  // Form State & Edit State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<TransactionType>("Expense");
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES_BY_TYPE["Expense"][0]);
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formReference, setFormReference] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPaymentMode, setFormPaymentMode] = useState<PaymentMode | "">("UPI");
  const [formGstRate, setFormGstRate] = useState<number>(0);
  const [showGstFields, setShowGstFields] = useState(false);

  // Void Modal State
  const [voidModalTx, setVoidModalTx] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  // Sync State
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncingLocal, setSyncingLocal] = useState(false);

  // Opening Balance Modal State
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState<string>("");
  const [openingBalanceDate, setOpeningBalanceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [openingBalanceSaving, setOpeningBalanceSaving] = useState(false);

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
      // Check local storage items count
      const localSavedStr = localStorage.getItem("mellod_custom_financial_txs");
      let localItems: Transaction[] = [];
      if (localSavedStr) {
        try {
          localItems = JSON.parse(localSavedStr);
          setUnsyncedCount(localItems.length);
        } catch (e) {
          console.error(e);
        }
      } else {
        setUnsyncedCount(0);
      }

      let customTransactions: Transaction[] = [];
      const { data: dbCustom, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (!error && dbCustom) {
        setIsLocalFallback(false);
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
          costType: c.cost_type || null,
          paymentMode: c.payment_mode || null,
          taxableAmount: c.taxable_amount ? Number(c.taxable_amount) : null,
          gstRate: c.gst_rate ? Number(c.gst_rate) : null,
          cgst: c.cgst ? Number(c.cgst) : null,
          sgst: c.sgst ? Number(c.sgst) : null,
          igst: c.igst ? Number(c.igst) : null,
          isOpeningBalance: c.is_opening_balance || false,
          isVoided: c.is_voided || false,
          voidedReason: c.voided_reason || null,
          voidedAt: c.voided_at || null,
        }));
      } else {
        setIsLocalFallback(true);
        if (localItems.length > 0) {
          customTransactions = localItems;
        }
      }

      setTransactions(customTransactions);
    } catch (err) {
      console.error("Error fetching manual financial data:", err);
      setIsLocalFallback(true);
    } finally {
      setLoading(false);
    }
  }

  // Handle category update when type changes in form
  const handleTypeChange = (type: TransactionType) => {
    setFormType(type);
    setFormCategory(CATEGORIES_BY_TYPE[type][0]);
  };

  // Edit existing transaction
  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormAmount(tx.amount.toString());
    setFormDate(tx.date);
    setFormReference(tx.reference);
    setFormNotes(tx.notes || "");
    setFormPaymentMode(tx.paymentMode || "");
    setFormGstRate(tx.gstRate || 0);
    setShowGstFields(Boolean(tx.gstRate && tx.gstRate > 0));
    setShowFormModal(true);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingTx(null);
    setFormAmount("");
    setFormReference("");
    setFormNotes("");
    setFormFile(null);
    setFormPaymentMode("UPI");
    setFormGstRate(0);
    setShowGstFields(false);
    setFormError(null);
  };

  // Void / Soft-Delete Transaction
  const handleConfirmVoid = async () => {
    if (!voidModalTx) return;
    if (!voidReason.trim()) {
      alert("Please provide a reason for voiding this transaction.");
      return;
    }
    setVoidSubmitting(true);
    try {
      await supabase
        .from("financial_transactions")
        .update({
          is_voided: true,
          voided_reason: voidReason.trim(),
          voided_at: new Date().toISOString(),
        })
        .eq("id", voidModalTx.id);

      const existingLocal = JSON.parse(localStorage.getItem("mellod_custom_financial_txs") || "[]");
      const updatedLocal = existingLocal.map((item: any) =>
        item.id === voidModalTx.id
          ? { ...item, isVoided: true, voidedReason: voidReason.trim(), voidedAt: new Date().toISOString() }
          : item
      );
      localStorage.setItem("mellod_custom_financial_txs", JSON.stringify(updatedLocal));

      await fetchManualFinancials();
      setVoidModalTx(null);
      setVoidReason("");
    } catch (e) {
      console.error("Failed to void transaction:", e);
    } finally {
      setVoidSubmitting(false);
    }
  };

  // Force Sync Unsynced Local Transactions
  const handleForceSync = async () => {
    const localSavedStr = localStorage.getItem("mellod_custom_financial_txs");
    if (!localSavedStr) return;
    let localItems: Transaction[] = [];
    try {
      localItems = JSON.parse(localSavedStr);
    } catch (e) {
      return;
    }
    if (localItems.length === 0) return;

    setSyncingLocal(true);
    try {
      const inserts = localItems.map((item) => ({
        type: item.type,
        category: item.category,
        amount: item.amount,
        transaction_date: item.date,
        reference_id: item.reference,
        notes: item.notes || null,
        proof_url: item.proofUrl || null,
        proof_name: item.proofName || null,
        cost_type: item.costType || null,
        payment_mode: item.paymentMode || null,
        taxable_amount: item.taxableAmount || null,
        gst_rate: item.gstRate || null,
        cgst: item.cgst || null,
        sgst: item.sgst || null,
        igst: item.igst || null,
        is_opening_balance: item.isOpeningBalance || false,
        is_voided: item.isVoided || false,
        voided_reason: item.voidedReason || null,
        voided_at: item.voidedAt || null,
      }));

      const { error } = await supabase.from("financial_transactions").insert(inserts);
      if (!error) {
        localStorage.removeItem("mellod_custom_financial_txs");
        setUnsyncedCount(0);
        await fetchManualFinancials();
      } else {
        alert(`Sync failed: ${error.message}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to connect to Supabase database.");
    } finally {
      setSyncingLocal(false);
    }
  };

  // Save / Update Manual Transaction
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

    const uppercaseRef = formReference.trim().toUpperCase();

    // Check for duplicate Reference ID
    const duplicate = transactions.find(
      (t) =>
        t.reference.toUpperCase() === uppercaseRef &&
        (!editingTx || t.id !== editingTx.id) &&
        !t.isVoided
    );
    if (duplicate) {
      setFormError(`Reference ID '${uppercaseRef}' is already used by an active transaction.`);
      return;
    }

    setFormSubmitting(true);

    let photoUrl: string | null = editingTx ? (editingTx.proofUrl || null) : null;
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

    // Compute GST splits
    const computedCostType = formType === "Expense" ? (COST_TYPE_MAP[formCategory] || null) : null;
    const computedTaxableAmount = formGstRate > 0 ? amountNum / (1 + formGstRate / 100) : null;
    const computedGstAmount = computedTaxableAmount ? amountNum - computedTaxableAmount : null;
    const computedCgst = computedGstAmount ? computedGstAmount / 2 : null;
    const computedSgst = computedGstAmount ? computedGstAmount / 2 : null;

    const newTx: Transaction = {
      id: editingTx ? editingTx.id : `tx-${Date.now()}`,
      date: formDate,
      type: formType,
      category: formCategory,
      amount: amountNum,
      reference: uppercaseRef,
      proofName: formFile ? formFile.name : editingTx ? editingTx.proofName : null,
      proofUrl: photoUrl,
      notes: formNotes.trim() || undefined,
      costType: computedCostType,
      paymentMode: formPaymentMode || null,
      taxableAmount: computedTaxableAmount,
      gstRate: formGstRate > 0 ? formGstRate : null,
      cgst: computedCgst,
      sgst: computedSgst,
      igst: null,
    };

    const payload = {
      type: formType,
      category: formCategory,
      amount: amountNum,
      transaction_date: formDate,
      reference_id: uppercaseRef,
      notes: formNotes.trim() || null,
      proof_url: photoUrl,
      proof_name: formFile ? formFile.name : editingTx ? editingTx.proofName : null,
      cost_type: computedCostType,
      payment_mode: formPaymentMode || null,
      taxable_amount: computedTaxableAmount,
      gst_rate: formGstRate > 0 ? formGstRate : null,
      cgst: computedCgst,
      sgst: computedSgst,
      igst: null,
    };

    try {
      if (editingTx) {
        const { error: dbErr } = await supabase
          .from("financial_transactions")
          .update(payload)
          .eq("id", editingTx.id);

        if (dbErr) {
          const existingLocal = JSON.parse(localStorage.getItem("mellod_custom_financial_txs") || "[]");
          const updatedLocal = existingLocal.map((item: any) =>
            item.id === editingTx.id ? { ...item, ...newTx } : item
          );
          localStorage.setItem("mellod_custom_financial_txs", JSON.stringify(updatedLocal));
        }
      } else {
        const { error: dbErr } = await supabase.from("financial_transactions").insert(payload);

        if (dbErr) {
          const existingLocal = JSON.parse(localStorage.getItem("mellod_custom_financial_txs") || "[]");
          const updatedLocal = [newTx, ...existingLocal];
          localStorage.setItem("mellod_custom_financial_txs", JSON.stringify(updatedLocal));
        }
      }
    } catch (err) {
      const existingLocal = JSON.parse(localStorage.getItem("mellod_custom_financial_txs") || "[]");
      const updatedLocal = [newTx, ...existingLocal];
      localStorage.setItem("mellod_custom_financial_txs", JSON.stringify(updatedLocal));
    }

    setFormSubmitting(false);
    setFormSuccess(editingTx ? "Transaction updated successfully." : "Transaction saved successfully.");
    setEditingTx(null);

    // Refresh live manual list
    await fetchManualFinancials();

    // Reset inputs
    setFormAmount("");
    setFormReference("");
    setFormNotes("");
    setFormFile(null);
    setFormPaymentMode("UPI");
    setFormGstRate(0);
    setShowGstFields(false);

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

  // Save Opening Balance
  const handleSaveOpeningBalance = async () => {
    const amt = parseFloat(openingBalanceAmount);
    if (isNaN(amt)) return;
    setOpeningBalanceSaving(true);
    try {
      await supabase.from("financial_transactions").insert({
        type: "Income",
        category: "Opening Balance",
        amount: amt,
        transaction_date: openingBalanceDate,
        reference_id: "OB-OPENING",
        notes: "Opening cash balance — system entry",
        is_opening_balance: true,
        cost_type: null,
        payment_mode: null,
      });
      await fetchManualFinancials();
      setShowOpeningBalanceModal(false);
    } catch (e) {
      console.error("Failed to save opening balance:", e);
    } finally {
      setOpeningBalanceSaving(false);
    }
  };

  const hasOpeningBalance = transactions.some((t) => t.isOpeningBalance);

  // ── KPI Dashboard Calculations (All-time, derived ONLY from manual entries) ─
  const kpiData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Exclude opening balance and voided entries from standard type sums
    const activeTransactions = transactions.filter((t) => !t.isOpeningBalance && !t.isVoided);

    const totalIncome = activeTransactions
      .filter((t) => t.type === "Income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = activeTransactions
      .filter((t) => t.type === "Expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAsset = activeTransactions
      .filter((t) => t.type === "Asset")
      .reduce((sum, t) => sum + t.amount, 0);

    // Liability: Loan Received adds cash; Loan Repayment/Interest reduces it
    const loanReceived = activeTransactions
      .filter((t) => t.type === "Liability" && t.category === "Loan Received")
      .reduce((sum, t) => sum + t.amount, 0);
    const loanOutflow = activeTransactions
      .filter((t) => t.type === "Liability" && t.category !== "Loan Received")
      .reduce((sum, t) => sum + t.amount, 0);

    // Opening balance (excluding voided)
    const openingBalance = transactions
      .filter((t) => t.isOpeningBalance && !t.isVoided)
      .reduce((sum, t) => sum + t.amount, 0);

    // Monthly burn rate: only active expenses in the current calendar month
    const currentMonthExpenses = activeTransactions.filter((t) => {
      if (t.type !== "Expense") return false;
      const txDate = new Date(t.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
    const monthlyBurnRate = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenseCount = currentMonthExpenses.length;

    // Cash balance: OB + income + loans received − expenses − assets − loan outflows
    const currentCashBalance = openingBalance + totalIncome + loanReceived - totalExpense - totalAsset - loanOutflow;
    const netCashFlow = totalIncome - totalExpense;

    // Gross Margin: Revenue / Oil Sale income − COGS expenses
    const revenueIncome = activeTransactions
      .filter((t) => t.type === "Income" && t.category === "Revenue / Oil Sale")
      .reduce((sum, t) => sum + t.amount, 0);
    const cogsExpense = activeTransactions
      .filter((t) => t.type === "Expense" && t.costType === "COGS")
      .reduce((sum, t) => sum + t.amount, 0);
    const grossMargin = revenueIncome - cogsExpense;
    const grossMarginPct = revenueIncome > 0 ? (grossMargin / revenueIncome) * 100 : 0;

    // Format current month label (e.g., "Jul 2026")
    const monthLabel = now.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

    return {
      currentCashBalance,
      monthlyBurnRate,
      monthlyExpenseCount,
      monthLabel,
      netCashFlow,
      grossMargin,
      grossMarginPct,
      openingBalance,
    };
  }, [transactions]);

  // ── Filtered Ledger Data ──────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!showVoided && t.isVoided) return false;

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
  }, [transactions, typeFilter, dateFilter, searchQuery, showVoided]);

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
          {/* Sync Status Badge */}
          {isLocalFallback ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
              <CloudOff className="w-4 h-4 text-amber-600" />
              <span>Offline ({unsyncedCount} local)</span>
              {unsyncedCount > 0 && (
                <button
                  onClick={handleForceSync}
                  disabled={syncingLocal}
                  className="ml-1 text-[11px] underline font-bold hover:text-amber-900"
                >
                  {syncingLocal ? "Syncing..." : "Sync Now"}
                </button>
              )}
            </div>
          ) : unsyncedCount > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-semibold">
              <CloudOff className="w-4 h-4 text-blue-600" />
              <span>{unsyncedCount} Unsynced Local</span>
              <button
                onClick={handleForceSync}
                disabled={syncingLocal}
                className="ml-1 text-[11px] underline font-bold hover:text-blue-900"
              >
                {syncingLocal ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold" title="All transactions synced with database">
              <CloudCheck className="w-4 h-4 text-emerald-600" />
              <span>Synced</span>
            </div>
          )}

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
            onClick={() => {
              handleCancelEdit();
              setShowFormModal(true);
            }}
            className="btn btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 shadow-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Log New Transaction
          </button>
        </div>
      </div>

      {/* Opening Balance Banner */}
      {!hasOpeningBalance && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Set Opening Balance</p>
              <p className="text-xs text-amber-700">Cash balance starts at \u20b90 without an opening balance entry.</p>
            </div>
          </div>
          <button
            onClick={() => setShowOpeningBalanceModal(true)}
            className="btn btn-sm text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
          >
            Set Opening Balance
          </button>
        </div>
      )}

      {/* ── SECTION 1: KPI Dashboard (Derived ONLY from manual entries) ────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
              All-time net balance from ledger entries
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-green-100">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green-300" />
              {kpiData.openingBalance > 0 ? `OB: ${formatCurrency(kpiData.openingBalance)}` : "Manual Ledger"}
            </span>
            <span className="font-semibold">{transactions.length} Entries</span>
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
              Expenses logged in {kpiData.monthLabel}
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>This Month</span>
            <span className="font-bold text-rose-600">
              {kpiData.monthlyExpenseCount} items
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
                ? "All-time net positive income flow"
                : "All-time operating deficit outlay"}
            </p>
          </div>

          <div
            className={`pt-3 border-t flex items-center justify-between text-xs ${
              kpiData.netCashFlow >= 0
                ? "border-emerald-200 text-emerald-800"
                : "border-rose-200 text-rose-800"
            }`}
          >
            <span>All-Time Margin Status</span>
            <span className="font-bold">
              {kpiData.netCashFlow >= 0 ? "★ Surplus" : "⚠️ Deficit"}
            </span>
          </div>
        </div>

        {/* Card 4: Gross Margin */}
        <div
          className={`card p-6 border shadow-sm flex flex-col justify-between transition-colors ${
            kpiData.grossMargin >= 0
              ? "bg-sky-50/60 border-sky-200 text-sky-950"
              : "bg-rose-50/60 border-rose-200 text-rose-950"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                kpiData.grossMargin >= 0 ? "text-sky-800" : "text-rose-800"
              }`}
            >
              Gross Margin
            </span>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                kpiData.grossMargin >= 0
                  ? "bg-sky-100 text-sky-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          <div className="my-4">
            <div
              className={`text-3xl font-black ${
                kpiData.grossMargin >= 0 ? "text-sky-700" : "text-rose-700"
              }`}
            >
              {kpiData.grossMargin >= 0 ? "+" : ""}
              {formatCurrency(kpiData.grossMargin)}
            </div>
            <p
              className={`text-xs mt-1 font-medium ${
                kpiData.grossMargin >= 0 ? "text-sky-700" : "text-rose-700"
              }`}
            >
              Revenue − COGS (unit economics)
            </p>
          </div>

          <div
            className={`pt-3 border-t flex items-center justify-between text-xs ${
              kpiData.grossMargin >= 0
                ? "border-sky-200 text-sky-800"
                : "border-rose-200 text-rose-800"
            }`}
          >
            <span>Margin %</span>
            <span className="font-bold">{kpiData.grossMarginPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2 & 3 Grid: Side Entry Form + Main Transaction Ledger ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Persistent Desktop Form Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              {editingTx ? <Pencil className="w-5 h-5 text-amber-600" /> : <ShieldCheck className="w-5 h-5 text-green-700" />}
              <h2 className="font-bold text-gray-900 text-base">
                {editingTx ? "Edit Transaction" : "Log New Transaction"}
              </h2>
            </div>
            {editingTx ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline"
              >
                Cancel Edit
              </button>
            ) : (
              <span className="badge bg-green-50 text-green-800 text-[10px] uppercase font-bold">
                Manual Form
              </span>
            )}
          </div>

          <form onSubmit={handleSaveTransaction} className="space-y-4">
            {/* Field 1: Transaction Type Toggle Buttons */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Transaction Type *
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                {(["Income", "Expense", "Asset", "Transfer", "Liability"] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`py-2 px-1.5 rounded-lg text-center transition-all ${
                      formType === t
                        ? TYPE_BTN_ACTIVE[t]
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

            {/* Field 6b: Payment Mode */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Payment Mode
              </label>
              <div className="relative">
                <CreditCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  className="form-input !pl-8 text-xs font-semibold bg-white"
                  value={formPaymentMode}
                  onChange={(e) => setFormPaymentMode(e.target.value as PaymentMode | "")}
                >
                  <option value="">— Not specified —</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Field 6c: GST (collapsible) */}
            <div>
              <button
                type="button"
                onClick={() => setShowGstFields(!showGstFields)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGstFields ? "rotate-180" : ""}`} />
                {showGstFields ? "Hide GST Details" : "Add GST Details"}
              </button>
              {showGstFields && (
                <div className="mt-2 space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">GST Rate %</label>
                    <select
                      className="form-input text-xs font-semibold bg-white !py-1.5"
                      value={formGstRate}
                      onChange={(e) => setFormGstRate(Number(e.target.value))}
                    >
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>{r === 0 ? "No GST (0%)" : `${r}%`}</option>
                      ))}
                    </select>
                  </div>
                  {formGstRate > 0 && formAmount && (
                    <div className="text-[10px] text-gray-500 space-y-0.5 pt-1 border-t border-gray-200">
                      <p>Taxable: <span className="font-bold text-gray-700">{formatCurrency(parseFloat(formAmount) / (1 + formGstRate / 100))}</span></p>
                      <p>CGST ({formGstRate / 2}%): <span className="font-bold text-gray-700">{formatCurrency((parseFloat(formAmount) - parseFloat(formAmount) / (1 + formGstRate / 100)) / 2)}</span></p>
                      <p>SGST ({formGstRate / 2}%): <span className="font-bold text-gray-700">{formatCurrency((parseFloat(formAmount) - parseFloat(formAmount) / (1 + formGstRate / 100)) / 2)}</span></p>
                    </div>
                  )}
                </div>
              )}
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

            {/* Save / Update Transaction Button with Loading State */}
            <button
              type="submit"
              disabled={formSubmitting}
              className={`btn text-xs font-bold w-full py-3 shadow-md flex items-center justify-center gap-2 ${
                editingTx ? "bg-amber-600 hover:bg-amber-700 text-white" : "btn-primary"
              }`}
            >
              {formSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingTx ? "Updating..." : "Saving Transaction..."}
                </>
              ) : (
                <>
                  {editingTx ? <Pencil className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  {editingTx ? "Update Transaction" : "Save Transaction"}
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
                <option value="Liability">Liability</option>
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

              <button
                type="button"
                onClick={() => setShowVoided(!showVoided)}
                className={`py-1.5 px-2.5 text-xs rounded-lg font-semibold border transition-colors ${
                  showVoided
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {showVoided ? "Hide Voided" : "Show Voided"}
              </button>
            </div>
          </div>

          {/* Table View */}
          {loading ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-green-700" />
              <span>Loading financial ledger...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-gray-300" />
              <p className="font-semibold text-gray-600 text-sm">No transactions logged yet.</p>
              <p className="text-xs text-gray-400">Use the form on the left to manually record income, expenses (such as FBO restaurant payouts), assets, or transfers.</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-3">
              <FilterX className="w-10 h-10 mx-auto text-gray-300" />
              <p className="font-semibold text-gray-600 text-sm">No transactions match your current filters.</p>
              <p className="text-xs text-gray-400">Try adjusting the search query, type, or date range filters above.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("All");
                  setDateFilter("All");
                }}
                className="btn btn-secondary text-xs py-2 px-4 font-semibold inline-flex items-center gap-1.5 mt-1"
              >
                <FilterX className="w-3.5 h-3.5" />
                Clear All Filters
              </button>
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
                    <tr
                      key={tx.id}
                      className={`transition-colors group ${
                        tx.isVoided
                          ? "bg-rose-50/30 opacity-60 hover:bg-rose-50/50"
                          : "hover:bg-gray-50/80"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-medium text-gray-700 whitespace-nowrap">
                        {tx.date}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`badge font-bold text-[10px] px-2.5 py-1 ${TYPE_BADGE_COLORS[tx.type]}`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          {tx.isOpeningBalance && <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                          <span className={tx.isVoided ? "line-through text-gray-400" : ""}>
                            {tx.category}
                          </span>
                          {tx.isVoided && (
                            <span
                              className="badge bg-rose-100 text-rose-800 text-[9px] uppercase font-bold"
                              title={tx.voidedReason ? `Reason: ${tx.voidedReason}` : "Voided"}
                            >
                              VOIDED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {tx.costType && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tx.costType === "COGS" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                              {tx.costType}
                            </span>
                          )}
                          {tx.paymentMode && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                              {tx.paymentMode}
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <p className="text-[10px] text-gray-400 font-normal truncate max-w-[180px] mt-0.5">
                            {tx.notes}
                          </p>
                        )}
                        {tx.isVoided && tx.voidedReason && (
                          <p className="text-[10px] text-rose-600 font-semibold truncate max-w-[180px] mt-0.5">
                            Reason: {tx.voidedReason}
                          </p>
                        )}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-bold whitespace-nowrap text-sm ${
                          tx.isVoided ? "line-through text-gray-400" : TYPE_AMOUNT_COLORS[tx.type]
                        }`}
                      >
                        {tx.type === "Income" ? "+" : tx.type === "Expense" || tx.type === "Liability" ? "-" : ""}
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
                        {tx.isOpeningBalance ? (
                          <span className="text-amber-400 text-[10px] font-semibold" title="Opening balance cannot be modified">
                            <Lock className="w-3.5 h-3.5 inline" />
                          </span>
                        ) : tx.isVoided ? (
                          <span className="text-gray-400 text-[10px] italic">Voided</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditTransaction(tx)}
                              className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              title="Edit transaction"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setVoidModalTx(tx);
                                setVoidReason("");
                              }}
                              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Void entry"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
                        )}
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

      {/* Opening Balance Setup Modal */}
      {showOpeningBalanceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-base">Set Opening Cash Balance</h3>
              </div>
              <button
                onClick={() => setShowOpeningBalanceModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Establish the baseline starting cash balance for Mellod. This creates a special protected entry in your ledger.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Opening Balance Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 50000"
                    className="form-input !pl-8 font-bold text-base text-gray-900"
                    value={openingBalanceAmount}
                    onChange={(e) => setOpeningBalanceAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  As of Date *
                </label>
                <input
                  type="date"
                  className="form-input text-xs font-semibold"
                  value={openingBalanceDate}
                  onChange={(e) => setOpeningBalanceDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowOpeningBalanceModal(false)}
                className="btn btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={openingBalanceSaving || !openingBalanceAmount}
                onClick={handleSaveOpeningBalance}
                className="btn btn-primary text-xs px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5"
              >
                {openingBalanceSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Landmark className="w-3.5 h-3.5" />
                    Save Opening Balance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Reason Confirmation Modal */}
      {voidModalTx && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-gray-900 text-base">Void Transaction Entry</h3>
              </div>
              <button
                onClick={() => {
                  setVoidModalTx(null);
                  setVoidReason("");
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Voiding transaction <span className="font-mono font-bold text-gray-800">{voidModalTx.reference}</span> ({formatCurrency(voidModalTx.amount)}). It will be marked inactive and excluded from all cash calculations while retaining an audit trail.
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Reason for Voiding *
              </label>
              <input
                type="text"
                placeholder="e.g. Duplicate entry, incorrect FBO payout..."
                className="form-input text-xs font-medium"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setVoidModalTx(null);
                  setVoidReason("");
                }}
                className="btn btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={voidSubmitting || !voidReason.trim()}
                onClick={handleConfirmVoid}
                className="btn text-xs px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5"
              >
                {voidSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Voiding...
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    Confirm Void
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
