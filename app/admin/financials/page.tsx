"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Transaction,
  TransactionType,
  ReconciliationStatus,
  TransactionFormValues,
  COST_TYPE_MAP,
} from "./types";
import { KPIRibbon } from "./components/KPIRibbon";
import { FilterBar } from "./components/FilterBar";
import { LedgerTable } from "./components/LedgerTable";
import { TransactionDrawer } from "./components/TransactionDrawer";
import {
  Wallet,
  CloudOff,
  Eye,
  X,
  Ban,
  Loader2,
  FileText,
  AlertTriangle,
} from "lucide-react";

export default function FinancialsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Drawer & Form State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [reconciliationFilter, setReconciliationFilter] = useState("All");
  const [showVoided, setShowVoided] = useState(false);

  // Void Modal State
  const [voidModalTx, setVoidModalTx] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  // Proof Viewer Modal State
  const [selectedProof, setSelectedProof] = useState<Transaction | null>(null);

  // Local Sync State
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncingLocal, setSyncingLocal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchManualFinancials();
  }, []);

  async function fetchManualFinancials() {
    setLoading(true);
    try {
      // Read local storage fallback entries
      const localSavedStr = localStorage.getItem("mellod_custom_financial_txs");
      let localItems: Transaction[] = [];
      if (localSavedStr) {
        try {
          localItems = JSON.parse(localSavedStr);
          setUnsyncedCount(localItems.length);
        } catch (e) {
          console.error("Local storage parse error:", e);
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
          vendorName: c.vendor_name || c.vendorName || null,
          amount: Number(c.amount),
          reference: c.reference_id || c.reference || "",
          paymentMode: c.payment_mode || c.paymentMode || null,
          reconciliationStatus:
            (c.reconciliation_status as ReconciliationStatus) ||
            (c.reconciliationStatus as ReconciliationStatus) ||
            "Pending",
          proofName: c.proof_name || c.proofName || null,
          proofUrl: c.proof_url || c.proofUrl || null,
          notes: c.notes || undefined,
          costType: c.cost_type || c.costType || null,
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
      console.error("Error fetching financial data:", err);
      setIsLocalFallback(true);
    } fontally: {
      setLoading(false);
    }
  }

  // Open Drawer for New Entry
  const handleOpenNewDrawer = () => {
    setEditingTx(null);
    setDrawerOpen(true);
  };

  // Open Drawer for Edit Entry
  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setDrawerOpen(true);
  };

  // Save / Update Transaction Payload
  const handleSaveTransaction = async (
    data: TransactionFormValues,
    file: File | null
  ) => {
    let photoUrl: string | null = editingTx ? editingTx.proofUrl || null : null;
    let photoName: string | null = file
      ? file.name
      : editingTx
      ? editingTx.proofName || null
      : null;

    if (file) {
      try {
        const fileName = `receipt_${Date.now()}_${file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          ""
        )}`;
        const { data: uploadData } = await supabase.storage
          .from("pickup-photos")
          .upload(fileName, file);

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

    // Compute GST & Cost Type
    const computedCostType =
      data.type === "Expense" ? COST_TYPE_MAP[data.category] || null : null;
    const computedTaxableAmount =
      data.gstRate > 0 ? data.amount / (1 + data.gstRate / 100) : null;
    const computedGstAmount = computedTaxableAmount
      ? data.amount - computedTaxableAmount
      : null;
    const computedCgst = computedGstAmount ? computedGstAmount / 2 : null;
    const computedSgst = computedGstAmount ? computedGstAmount / 2 : null;

    const uppercaseRef = data.reference.trim().toUpperCase();

    const newTx: Transaction = {
      id: editingTx ? editingTx.id : `tx-${Date.now()}`,
      date: data.date,
      type: data.type,
      category: data.category,
      vendorName: data.vendorName?.trim() || null,
      amount: data.amount,
      reference: uppercaseRef,
      paymentMode: data.paymentMode || null,
      reconciliationStatus: data.reconciliationStatus,
      proofName: photoName,
      proofUrl: photoUrl,
      notes: data.notes?.trim() || undefined,
      costType: computedCostType,
      taxableAmount: computedTaxableAmount,
      gstRate: data.gstRate > 0 ? data.gstRate : null,
      cgst: computedCgst,
      sgst: computedSgst,
      igst: null,
      isVoided: editingTx ? editingTx.isVoided : false,
    };

    const payload = {
      type: data.type,
      category: data.category,
      vendor_name: data.vendorName?.trim() || null,
      amount: data.amount,
      transaction_date: data.date,
      reference_id: uppercaseRef,
      payment_mode: data.paymentMode || null,
      reconciliation_status: data.reconciliationStatus,
      notes: data.notes?.trim() || null,
      proof_url: photoUrl,
      proof_name: photoName,
      cost_type: computedCostType,
      taxable_amount: computedTaxableAmount,
      gst_rate: data.gstRate > 0 ? data.gstRate : null,
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
          const existingLocal = JSON.parse(
            localStorage.getItem("mellod_custom_financial_txs") || "[]"
          );
          const updatedLocal = existingLocal.map((item: any) =>
            item.id === editingTx.id ? { ...item, ...newTx } : item
          );
          localStorage.setItem(
            "mellod_custom_financial_txs",
            JSON.stringify(updatedLocal)
          );
        }
      } else {
        const { error: dbErr } = await supabase
          .from("financial_transactions")
          .insert(payload);

        if (dbErr) {
          const existingLocal = JSON.parse(
            localStorage.getItem("mellod_custom_financial_txs") || "[]"
          );
          const updatedLocal = [newTx, ...existingLocal];
          localStorage.setItem(
            "mellod_custom_financial_txs",
            JSON.stringify(updatedLocal)
          );
        }
      }
    } catch (err) {
      const existingLocal = JSON.parse(
        localStorage.getItem("mellod_custom_financial_txs") || "[]"
      );
      const updatedLocal = [newTx, ...existingLocal];
      localStorage.setItem(
        "mellod_custom_financial_txs",
        JSON.stringify(updatedLocal)
      );
    }

    await fetchManualFinancials();
  };

  // Void / Soft-Delete Handler
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

      const existingLocal = JSON.parse(
        localStorage.getItem("mellod_custom_financial_txs") || "[]"
      );
      const updatedLocal = existingLocal.map((item: any) =>
        item.id === voidModalTx.id
          ? {
              ...item,
              isVoided: true,
              voidedReason: voidReason.trim(),
              voidedAt: new Date().toISOString(),
            }
          : item
      );
      localStorage.setItem(
        "mellod_custom_financial_txs",
        JSON.stringify(updatedLocal)
      );

      await fetchManualFinancials();
      setVoidModalTx(null);
      setVoidReason("");
    } catch (e) {
      console.error("Failed to void transaction:", e);
    } finally {
      setVoidSubmitting(false);
    }
  };

  // Permanent Delete Handler
  const handleDeleteTransaction = async (tx: Transaction) => {
    if (confirm("Are you sure you want to permanently delete this transaction record?")) {
      try {
        await supabase.from("financial_transactions").delete().eq("id", tx.id);
      } catch (e) {
        console.error(e);
      }

      const existingLocal = JSON.parse(
        localStorage.getItem("mellod_custom_financial_txs") || "[]"
      );
      const updatedLocal = existingLocal.filter((item: any) => item.id !== tx.id);
      localStorage.setItem(
        "mellod_custom_financial_txs",
        JSON.stringify(updatedLocal)
      );

      await fetchManualFinancials();
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
        vendor_name: item.vendorName || null,
        amount: item.amount,
        transaction_date: item.date,
        reference_id: item.reference,
        payment_mode: item.paymentMode || null,
        reconciliation_status: item.reconciliationStatus || "Pending",
        notes: item.notes || null,
        proof_url: item.proofUrl || null,
        proof_name: item.proofName || null,
        cost_type: item.costType || null,
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

      const { error } = await supabase
        .from("financial_transactions")
        .insert(inserts);

      if (!error) {
        localStorage.removeItem("mellod_custom_financial_txs");
        setUnsyncedCount(0);
        await fetchManualFinancials();
      } else {
        alert(`Sync failed: ${error.message}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to connect to database.");
    } finally {
      setSyncingLocal(false);
    }
  };

  // Filtered Transactions Calculation
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!showVoided && t.isVoided) return false;

      if (typeFilter !== "All" && t.type !== typeFilter) return false;

      if (reconciliationFilter !== "All" && t.reconciliationStatus !== reconciliationFilter) {
        return false;
      }

      if (dateFilter !== "All") {
        const txDate = new Date(t.date);
        const now = new Date();
        if (dateFilter === "This Month") {
          if (
            txDate.getMonth() !== now.getMonth() ||
            txDate.getFullYear() !== now.getFullYear()
          ) {
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
        const matchVendor = t.vendorName?.toLowerCase().includes(q) || false;
        const matchNotes = t.notes?.toLowerCase().includes(q) || false;
        if (!matchRef && !matchCat && !matchVendor && !matchNotes) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, dateFilter, reconciliationFilter, searchQuery, showVoided]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Date",
      "Type",
      "Category",
      "Vendor",
      "Amount",
      "Reference",
      "Payment Mode",
      "Reconciliation",
      "Notes",
    ];

    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      t.type,
      `"${t.category}"`,
      `"${t.vendorName || "N/A"}"`,
      t.amount,
      `"${t.reference}"`,
      `"${t.paymentMode || "N/A"}"`,
      `"${t.reconciliationStatus}"`,
      `"${t.notes || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `financial_ledger_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const existingReferences = useMemo(
    () => transactions.map((t) => t.reference),
    [transactions]
  );

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── 1. Top Header Bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Financial Management Ledger
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Enterprise-grade financial dashboard, audit tracking, and reconciliation portal.
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-3">
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
              <span>{unsyncedCount} Unsynced Entries</span>
              <button
                onClick={handleForceSync}
                disabled={syncingLocal}
                className="ml-1 text-[11px] underline font-bold hover:text-blue-900"
              >
                {syncingLocal ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── 2. KPI Summary Ribbon ──────────────────────────────────────────── */}
      <KPIRibbon transactions={filteredTransactions} />

      {/* ── 3. Filter Controls Bar ──────────────────────────────────────────── */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        reconciliationFilter={reconciliationFilter}
        setReconciliationFilter={setReconciliationFilter}
        showVoided={showVoided}
        setShowVoided={setShowVoided}
        onRefresh={fetchManualFinancials}
        onExportCSV={handleExportCSV}
        onOpenNewDrawer={handleOpenNewDrawer}
        totalFilteredCount={filteredTransactions.length}
      />

      {/* ── 4. Full Width Ledger Table (100% Width) ────────────────────────── */}
      <LedgerTable
        loading={loading}
        transactions={filteredTransactions}
        onEdit={handleEditTransaction}
        onVoid={(tx) => setVoidModalTx(tx)}
        onDelete={handleDeleteTransaction}
        onViewProof={(tx) => setSelectedProof(tx)}
      />

      {/* ── 5. Slide-Out Transaction Form Drawer (Sheet) ───────────────────── */}
      <TransactionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editingTx={editingTx}
        onSubmitTx={handleSaveTransaction}
        existingReferences={existingReferences}
      />

      {/* ── 6. Void Confirmation Reason Modal ───────────────────────────────── */}
      {voidModalTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  Void Transaction Record
                </h3>
                <p className="text-xs text-gray-500">
                  You are voiding reference{" "}
                  <span className="font-mono font-bold text-gray-800">
                    {voidModalTx.reference}
                  </span>
                  . This soft-deletes the entry while retaining audit logs.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">
                Reason for Voiding *
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Duplicate entry, canceled invoice, bank mismatch..."
                rows={3}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setVoidModalTx(null);
                  setVoidReason("");
                }}
                disabled={voidSubmitting}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={voidSubmitting || !voidReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-1.5"
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

      {/* ── 7. Attached Proof Viewer Modal ─────────────────────────────────── */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">
                    Attached Receipt / Proof Document
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Ref: {selectedProof.reference} — {selectedProof.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProof(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              {selectedProof.proofUrl ? (
                selectedProof.proofUrl.endsWith(".pdf") ? (
                  <iframe
                    src={selectedProof.proofUrl}
                    className="w-full h-[500px] rounded-lg"
                    title="Attached Proof PDF"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedProof.proofUrl}
                    alt={selectedProof.proofName || "Attached Proof"}
                    className="max-h-[500px] object-contain rounded-lg shadow-md"
                  />
                )
              ) : (
                <p className="text-xs text-gray-400">No proof URL available.</p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>Document: {selectedProof.proofName || "receipt.jpg"}</span>
              <a
                href={selectedProof.proofUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 font-bold hover:underline"
              >
                Open Original in New Tab ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
