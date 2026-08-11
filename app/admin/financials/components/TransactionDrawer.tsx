"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Transaction,
  TransactionType,
  PaymentMode,
  ReconciliationStatus,
  CATEGORIES_BY_TYPE,
  GST_RATES,
  PAYMENT_MODES,
  RECONCILIATION_STATUSES,
  transactionSchema,
  TransactionFormValues,
} from "../types";
import { formatCurrency } from "@/lib/utils";
import {
  X,
  Plus,
  Pencil,
  FileText,
  UploadCloud,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building,
  CreditCard,
  Calendar,
  Hash,
  Layers,
  Percent,
} from "lucide-react";

interface TransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editingTx: Transaction | null;
  onSubmitTx: (data: TransactionFormValues, file: File | null) => Promise<void>;
  existingReferences: string[];
}

export function TransactionDrawer({
  isOpen,
  onClose,
  editingTx,
  onSubmitTx,
  existingReferences,
}: TransactionDrawerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showGstFields, setShowGstFields] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "Expense",
      category: CATEGORIES_BY_TYPE["Expense"][0],
      vendorName: "",
      amount: undefined as any,
      date: new Date().toISOString().split("T")[0],
      reference: "",
      paymentMode: "UPI",
      reconciliationStatus: "Pending",
      notes: "",
      gstRate: 0,
    },
  });

  const selectedType = watch("type");
  const selectedAmount = watch("amount");
  const selectedGstRate = watch("gstRate");
  const selectedCategory = watch("category");

  // Populate form when editing or opening
  useEffect(() => {
    if (editingTx) {
      reset({
        type: editingTx.type,
        category: editingTx.category,
        vendorName: editingTx.vendorName || "",
        amount: editingTx.amount,
        date: editingTx.date,
        reference: editingTx.reference,
        paymentMode: editingTx.paymentMode || "UPI",
        reconciliationStatus: editingTx.reconciliationStatus || "Pending",
        notes: editingTx.notes || "",
        gstRate: editingTx.gstRate || 0,
      });
      setShowGstFields(Boolean(editingTx.gstRate && editingTx.gstRate > 0));
      setSelectedFile(null);
    } else {
      reset({
        type: "Expense",
        category: CATEGORIES_BY_TYPE["Expense"][0],
        vendorName: "",
        amount: "" as any,
        date: new Date().toISOString().split("T")[0],
        reference: "",
        paymentMode: "UPI",
        reconciliationStatus: "Pending",
        notes: "",
        gstRate: 0,
      });
      setShowGstFields(false);
      setSelectedFile(null);
    }
    setServerError(null);
  }, [editingTx, isOpen, reset]);

  // Update default category when type changes
  const handleTypeChange = (type: TransactionType) => {
    setValue("type", type);
    setValue("category", CATEGORIES_BY_TYPE[type][0]);
  };

  // Compute live GST breakdowns
  const amountNum = Number(selectedAmount) || 0;
  const gstRateNum = Number(selectedGstRate) || 0;
  const taxableAmount = gstRateNum > 0 && amountNum > 0 ? amountNum / (1 + gstRateNum / 100) : null;
  const gstAmount = taxableAmount ? amountNum - taxableAmount : null;
  const cgstAmount = gstAmount ? gstAmount / 2 : null;
  const sgstAmount = gstAmount ? gstAmount / 2 : null;

  const onFormSubmit = async (data: TransactionFormValues) => {
    setServerError(null);

    // Duplicate reference check
    const uppercaseRef = data.reference.trim().toUpperCase();
    const isDuplicate = existingReferences.some(
      (ref) => ref.toUpperCase() === uppercaseRef && (!editingTx || editingTx.reference.toUpperCase() !== uppercaseRef)
    );

    if (isDuplicate) {
      setServerError(`Reference ID '${uppercaseRef}' is already assigned to an active transaction.`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitTx(data, selectedFile);
      onClose();
    } catch (err: any) {
      console.error("Form submit error:", err);
      setServerError(err?.message || "Failed to save transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between transform transition-transform duration-300">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {editingTx ? (
                  <Pencil className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Plus className="w-5 h-5 text-emerald-400" />
                )}
                <h2 className="text-lg font-black tracking-tight">
                  {editingTx ? "Edit Ledger Entry" : "Log New Transaction"}
                </h2>
              </div>
              <p className="text-xs text-slate-300">
                {editingTx ? `Updating ${editingTx.reference}` : "Record financial disbursement or inflow"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content Scroll Area */}
          <form id="drawer-form" onSubmit={handleSubmit(onFormSubmit)} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            {serverError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* 1. Transaction Type Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                Transaction Type
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl">
                {(["Income", "Expense", "Asset", "Transfer", "Liability"] as TransactionType[]).map((t) => {
                  const isActive = selectedType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(t)}
                      className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center text-[11px] ${
                        isActive
                          ? t === "Income"
                            ? "bg-emerald-600 text-white shadow"
                            : t === "Expense"
                            ? "bg-rose-600 text-white shadow"
                            : t === "Asset"
                            ? "bg-blue-600 text-white shadow"
                            : t === "Transfer"
                            ? "bg-purple-600 text-white shadow"
                            : "bg-amber-600 text-white shadow"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Category Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                Category
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  {...register("category")}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {(CATEGORIES_BY_TYPE[selectedType] || []).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              {errors.category && (
                <p className="text-rose-600 text-[10px] font-semibold">{errors.category.message}</p>
              )}
            </div>

            {/* 3. Vendor / Entity Name (NEW FIELD) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                Vendor / Billed Entity Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  {...register("vendorName")}
                  placeholder="e.g. Royal Restaurant, HDFC Fleet, CA Services"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* 4. Amount & Date Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {errors.amount && (
                  <p className="text-rose-600 text-[10px] font-semibold">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    {...register("date")}
                    className="w-full pl-9 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {errors.date && (
                  <p className="text-rose-600 text-[10px] font-semibold">{errors.date.message}</p>
                )}
              </div>
            </div>

            {/* 5. Reference ID */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                Reference / Invoice ID *
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  {...register("reference")}
                  placeholder="e.g. INV-2026-0891"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 uppercase placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              {errors.reference && (
                <p className="text-rose-600 text-[10px] font-semibold">{errors.reference.message}</p>
              )}
            </div>

            {/* 6. Payment Mode & Reconciliation Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Payment Mode
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    {...register("paymentMode")}
                    className="w-full pl-9 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {PAYMENT_MODES.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* NEW FIELD: Reconciliation Status */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Reconciliation
                </label>
                <select
                  {...register("reconciliationStatus")}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {RECONCILIATION_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 7. GST Calculation Fields */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowGstFields(!showGstFields)}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Percent className="w-3.5 h-3.5" />
                  {showGstFields ? "Hide GST Tax Breakdown" : "+ Add GST Tax Split"}
                </button>
                {showGstFields && (
                  <span className="text-[10px] font-mono text-gray-400">CGST/SGST Auto-split</span>
                )}
              </div>

              {showGstFields && (
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/60 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[11px] font-bold text-emerald-900">GST Rate (%)</label>
                    <select
                      {...register("gstRate", { valueAsNumber: true })}
                      className="bg-white border border-emerald-300 rounded-lg px-2 py-1 font-mono font-bold text-emerald-800"
                    >
                      {GST_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </div>

                  {taxableAmount !== null && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-[10px] font-mono text-emerald-900">
                      <div>
                        <span className="text-gray-500 block">Taxable</span>
                        <span className="font-bold">{formatCurrency(taxableAmount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">CGST</span>
                        <span className="font-bold">{formatCurrency(cgstAmount || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">SGST</span>
                        <span className="font-bold">{formatCurrency(sgstAmount || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 8. Receipt / Invoice Upload */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                Attach Proof / Invoice Receipt
              </label>
              <div className="border-2 border-dashed border-gray-200 hover:border-emerald-400 rounded-xl p-3 text-center transition-colors">
                <input
                  type="file"
                  id="receipt-file-input"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="receipt-file-input" className="cursor-pointer flex flex-col items-center gap-1">
                  <UploadCloud className="w-5 h-5 text-gray-400" />
                  <span className="text-xs font-semibold text-emerald-700 hover:underline">
                    {selectedFile
                      ? selectedFile.name
                      : editingTx?.proofName
                      ? `File attached: ${editingTx.proofName}`
                      : "Upload invoice PDF or image"}
                  </span>
                  <span className="text-[10px] text-gray-400">PDF, PNG, JPG up to 5MB</span>
                </label>
              </div>
            </div>

            {/* 9. Internal Audit Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                Audit Notes / Description
              </label>
              <textarea
                {...register("notes")}
                rows={2}
                placeholder="Disbursement purpose or audit comments..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </form>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="drawer-form"
              disabled={submitting}
              className="px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {editingTx ? "Update Entry" : "Save Entry"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
