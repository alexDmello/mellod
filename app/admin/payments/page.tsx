"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatLiters, formatDate, formatTime } from "@/lib/utils";
import {
  CreditCard,
  IndianRupee,
  Droplets,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building2,
  FileText,
  Printer,
  X,
  Search,
  Eye,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { FBOPayment } from "@/lib/types";

interface FBOSummary {
  fbo: {
    id: string;
    business_name: string;
    phone: string | null;
    address: string | null;
    contact_person: string | null;
    fssai_license: string | null;
  };
  paymentMethod: {
    method_type: "bank" | "upi" | "cash";
    bank_name: string | null;
    account_number: string | null;
    ifsc_code: string | null;
    account_holder: string | null;
    upi_id: string | null;
  } | null;
  unpaidPickups: any[];
  paidPickups: any[];
  unpaidAmount: number;
  unpaidLiters: number;
  paidAmount: number;
  paidLiters: number;
}

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [summaries, setSummaries] = useState<FBOSummary[]>([]);
  const [receipts, setReceipts] = useState<FBOPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals local state
  const [viewEntriesFbo, setViewEntriesFbo] = useState<FBOSummary | null>(null);
  const [payoutFbo, setPayoutFbo] = useState<FBOSummary | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Payment Form local state
  const [payMethod, setPayMethod] = useState<"bank" | "upi" | "cash">("bank");
  const [referenceNo, setReferenceNo] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  async function fetchPaymentsData() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/payments");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load payments data");
      }
      setSummaries(data.summaries || []);
      setReceipts(data.receipts || []);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Error loading payments data." });
    } finally {
      setLoading(false);
    }
  }

  // Filter pending summaries
  const pendingSummaries = summaries.filter(
    (s) => s.unpaidPickups.length > 0 && s.unpaidAmount > 0
  );

  const filteredPending = pendingSummaries.filter(
    (s) =>
      s.fbo.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.fbo.contact_person && s.fbo.contact_person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredReceipts = receipts.filter(
    (r) =>
      r.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.fbo && r.fbo.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.reference_number && r.reference_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalUnpaidBalance = pendingSummaries.reduce((sum, s) => sum + s.unpaidAmount, 0);
  const totalUnpaidLiters = pendingSummaries.reduce((sum, s) => sum + s.unpaidLiters, 0);
  const totalDisbursedAmount = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  async function handleConfirmPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!payoutFbo) return;

    setSubmittingPay(true);
    setMessage(null);

    const pickupIds = payoutFbo.unpaidPickups.map((p) => p.id);

    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fboId: payoutFbo.fbo.id,
          pickupIds,
          paymentMethod: payMethod,
          referenceNumber: referenceNo.trim() || null,
          periodLabel: periodLabel.trim() || `Payout Statement for ${payoutFbo.unpaidPickups.length} Pickups`,
          notes: payNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to disburse payment.");
      }

      setMessage({
        type: "success",
        text: `Payment of ${formatCurrency(data.amount)} disbursed successfully for ${payoutFbo.fbo.business_name}! Statement Receipt #${data.receiptNumber} generated.`,
      });

      setPayoutFbo(null);
      setReferenceNo("");
      setPeriodLabel("");
      setPayNotes("");
      await fetchPaymentsData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to process payment." });
    } finally {
      setSubmittingPay(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              FBO Payment & Settlement Portal
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Review accumulated unpaid balances, inspect verified pickup entries, disburse payouts, and issue official receipts.
          </p>
        </div>

        <button
          onClick={fetchPaymentsData}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 shadow-md ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold"
              : "bg-rose-50 border border-rose-200 text-rose-800 font-semibold"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Overview Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group relative overflow-hidden rounded-2xl p-5 bg-white border border-amber-200 shadow-xl shadow-amber-950/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 font-bold group-hover:scale-110 transition-transform">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Total Pending Payouts</p>
            <p className="text-2xl font-black text-amber-950 mt-0.5">{formatCurrency(totalUnpaidBalance)}</p>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">{pendingSummaries.length} FBO(s) awaiting disbursement</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl p-5 bg-white border border-blue-100 shadow-xl shadow-blue-950/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold group-hover:scale-110 transition-transform">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-blue-800 font-bold uppercase tracking-wider">Unsettled Volume</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{formatLiters(totalUnpaidLiters)}</p>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Verified UCO collected</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl p-5 bg-white border border-emerald-100 shadow-xl shadow-emerald-950/5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Total Settled Disbursements</p>
            <p className="text-2xl font-black text-emerald-900 mt-0.5">{formatCurrency(totalDisbursedAmount)}</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{receipts.length} Receipts issued</p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "pending"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Zap className="w-4 h-4" />
            Pending FBO Payouts ({pendingSummaries.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            Settlement Receipts & History ({receipts.length})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search FBO name or receipt #..."
            className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-16 text-center text-gray-400 flex flex-col items-center gap-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Calculating FBO payment balances...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: PENDING FBO PAYOUTS */}
          {activeTab === "pending" && (
            <div className="space-y-4">
              {filteredPending.length === 0 ? (
                <div className="rounded-2xl p-12 text-center text-gray-400 bg-white border border-gray-100 shadow-sm">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-bold text-gray-800 text-base">All verified pickups are fully settled!</p>
                  <p className="text-xs text-gray-400 mt-1">There are no pending balances awaiting payout to FBOs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredPending.map((item) => (
                    <div key={item.fbo.id} className="rounded-2xl p-5 bg-white border border-gray-100 shadow-xl shadow-gray-200/80 hover:shadow-2xl transition-all duration-300 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold flex-shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-base">{item.fbo.business_name}</h3>
                            <p className="text-xs text-gray-500">{item.fbo.address || "Address not listed"}</p>
                            {item.fbo.contact_person && (
                              <p className="text-[11px] text-gray-400 mt-0.5">Contact: {item.fbo.contact_person} ({item.fbo.phone || "No phone"})</p>
                            )}
                          </div>
                        </div>

                        {/* Financial summary for this FBO */}
                        <div className="flex items-center gap-4 bg-amber-50/90 px-4 py-2.5 rounded-xl border border-amber-100">
                          <div>
                            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Total Amount Due</span>
                            <span className="text-lg font-black text-amber-950">{formatCurrency(item.unpaidAmount)}</span>
                          </div>
                          <div className="h-8 w-px bg-amber-200" />
                          <div>
                            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Volume</span>
                            <span className="text-sm font-extrabold text-amber-950">{formatLiters(item.unpaidLiters)}</span>
                          </div>
                          <div className="h-8 w-px bg-amber-200" />
                          <div>
                            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Pickups</span>
                            <span className="text-sm font-extrabold text-amber-950">{item.unpaidPickups.length} entries</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Bank / UPI Info Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-gray-500 font-semibold">Registered Payment Method: </span>
                          {item.paymentMethod ? (
                            <span className="font-bold text-gray-800">
                              {item.paymentMethod.method_type === "bank" && `Bank (${item.paymentMethod.bank_name || "Bank"}) — A/C: ${item.paymentMethod.account_number || "N/A"} (IFSC: ${item.paymentMethod.ifsc_code || "N/A"})`}
                              {item.paymentMethod.method_type === "upi" && `UPI ID: ${item.paymentMethod.upi_id || "N/A"}`}
                              {item.paymentMethod.method_type === "cash" && "Cash Disbursement"}
                            </span>
                          ) : (
                            <span className="text-amber-700 italic font-medium">Bank details pending from FBO</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewEntriesFbo(item)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 font-semibold text-xs flex items-center gap-1.5 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            View Pickups ({item.unpaidPickups.length})
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPayoutFbo(item);
                              setPayMethod(item.paymentMethod?.method_type || "bank");
                              setReferenceNo("");
                              setPeriodLabel(`Settlement for ${item.unpaidPickups.length} verified pickup(s)`);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Disburse Payment
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SETTLEMENT RECEIPTS & HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {filteredReceipts.length === 0 ? (
                <div className="rounded-2xl p-12 text-center text-gray-400 bg-white border border-gray-100 shadow-sm">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-bold text-gray-800 text-base">No payment receipts issued yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Disbursed FBO payments will generate official settlement receipts listed here.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xl shadow-gray-200/80">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-xs border-b border-gray-200 font-bold uppercase tracking-wider">
                        <th className="p-4">Receipt #</th>
                        <th className="p-4">FBO Supplier</th>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4 text-right">Volume</th>
                        <th className="p-4 text-right">Disbursed Amount</th>
                        <th className="p-4">Method & Reference</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {filteredReceipts.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-4 font-mono font-bold text-emerald-800">
                            {r.receipt_number}
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-gray-900 block">{r.fbo?.business_name || "FBO"}</span>
                            <span className="text-[10px] text-gray-400">{r.period_label}</span>
                          </td>
                          <td className="p-4 text-gray-600">
                            {formatDate(r.paid_at)}
                          </td>
                          <td className="p-4 text-right font-bold text-gray-800">
                            {formatLiters(Number(r.total_liters))}
                          </td>
                          <td className="p-4 text-right font-black text-emerald-800 text-sm">
                            {formatCurrency(Number(r.amount))}
                          </td>
                          <td className="p-4">
                            <span className="capitalize font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">
                              {r.payment_method}
                            </span>
                            {r.reference_number && (
                              <span className="block font-mono text-[10px] text-gray-500 mt-0.5">
                                UTR: {r.reference_number}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setSelectedReceipt(r)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 text-xs font-semibold flex items-center justify-center gap-1.5 mx-auto transition-all shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              Statement
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: VIEW ENTRIES */}
      {viewEntriesFbo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-base">{viewEntriesFbo.fbo.business_name}</h3>
                  <p className="text-xs text-gray-400">Verified Pickup Entries Awaiting Payment</p>
                </div>
              </div>
              <button
                onClick={() => setViewEntriesFbo(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-600 block">Total Unpaid Balance:</span>
                  <span className="font-extrabold text-amber-900 text-lg">{formatCurrency(viewEntriesFbo.unpaidAmount)}</span>
                </div>
                <div>
                  <span className="text-gray-600 block">Total Volume:</span>
                  <span className="font-extrabold text-amber-900 text-base">{formatLiters(viewEntriesFbo.unpaidLiters)}</span>
                </div>
                <div>
                  <span className="text-gray-600 block">Entries Count:</span>
                  <span className="font-extrabold text-amber-900 text-base">{viewEntriesFbo.unpaidPickups.length} pickups</span>
                </div>
              </div>

              <div className="space-y-3">
                {viewEntriesFbo.unpaidPickups.map((p) => (
                  <div key={p.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{formatDate(p.picked_up_at)}</span>
                        <span className="text-gray-400">· {formatTime(p.picked_up_at)}</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                          Verified ✓
                        </span>
                      </div>
                      <p className="text-gray-500 text-[11px]">
                        Picker: {p.picker?.profile?.full_name || "Assigned Picker"} {p.notes ? `(${p.notes})` : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-gray-900 block text-sm">{formatLiters(Number(p.liters))}</span>
                      <span className="font-mono text-gray-500 text-[11px]">@ {formatCurrency(Number(p.price_per_liter))}/L = </span>
                      <span className="font-black text-emerald-700 text-sm">{formatCurrency(Number(p.total_amount))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setViewEntriesFbo(null)}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = viewEntriesFbo;
                  setViewEntriesFbo(null);
                  setPayoutFbo(target);
                  setPayMethod(target.paymentMethod?.method_type || "bank");
                  setPeriodLabel(`Settlement for ${target.unpaidPickups.length} verified pickup(s)`);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <CreditCard className="w-4 h-4" />
                Proceed to Payment Disbursal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM PAYMENT DISBURSAL */}
      {payoutFbo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0 border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Confirm Payment Disbursal</h3>
              </div>
              <button
                onClick={() => setPayoutFbo(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayout} className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <p className="font-extrabold text-emerald-950 text-sm">{payoutFbo.fbo.business_name}</p>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-emerald-900 font-semibold">
                  <span>Disbursing Amount:</span>
                  <span className="text-base font-black font-mono">{formatCurrency(payoutFbo.unpaidAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-700 text-[11px]">
                  <span>Total Volume Covered:</span>
                  <span className="font-bold">{formatLiters(payoutFbo.unpaidLiters)} ({payoutFbo.unpaidPickups.length} Pickups)</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["bank", "upi", "cash"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-2 px-3 rounded-xl font-bold uppercase tracking-wider text-center transition-all ${
                        payMethod === m
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Transaction Reference / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9876543210 or Bank Transfer Ref"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Period / Settlement Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Settlement for July 2026"
                  className="w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Processed via HDFC Corporate Banking"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutFbo(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {submittingPay ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Disbursing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Payment & Issue Statement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE CONSOLIDATED DISBURSEMENT STATEMENT */}
      {selectedReceipt && (
        <div className="printable-receipt-modal fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="printable-receipt-card bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
            <div className="no-print flex-shrink-0 flex items-center justify-between px-5 py-4 bg-slate-950 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Official Settlement Receipt & Statement</span>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white text-gray-900">
              {/* Formal Letterhead */}
              <div className="border-b-2 border-emerald-800 pb-3 flex flex-row items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <img src="/icons/logo.png" alt="Mellod Logo" className="w-10 h-10 object-contain mt-0.5" />
                  <div>
                    <h2 className="text-lg font-black text-emerald-950 tracking-tight leading-tight">
                      MELLOD BIOFUELS
                    </h2>
                    <p className="text-[11px] text-gray-600 font-medium">
                      FSSAI RUCO Registered Aggregator & Feedstock Supplier
                    </p>
                  </div>
                </div>

                <div className="text-right bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                  <span className="inline-block bg-emerald-800 text-white text-[9px] uppercase font-black px-2 py-0.5 rounded">
                    Payment Statement
                  </span>
                  <p className="text-[11px] font-mono font-bold text-gray-800 mt-0.5">
                    {selectedReceipt.receipt_number}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {formatDate(selectedReceipt.paid_at)}
                  </p>
                </div>
              </div>

              {/* FBO & Payment Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <span className="font-bold uppercase text-[9px] text-emerald-800 block border-b pb-0.5">
                    Issued To (FBO)
                  </span>
                  <p className="font-bold text-gray-900">{selectedReceipt.fbo?.business_name || "FBO Account"}</p>
                  <p className="text-gray-600 text-[11px]">{selectedReceipt.fbo?.address || "Address N/A"}</p>
                  <p className="text-gray-500 text-[10px]">FSSAI: {selectedReceipt.fbo?.fssai_license || "N/A"}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <span className="font-bold uppercase text-[9px] text-emerald-800 block border-b pb-0.5">
                    Disbursement Details
                  </span>
                  <p className="font-semibold text-gray-800">Method: <span className="uppercase font-bold">{selectedReceipt.payment_method}</span></p>
                  {selectedReceipt.reference_number && (
                    <p className="font-mono text-gray-700 text-[11px]">Ref/UTR: {selectedReceipt.reference_number}</p>
                  )}
                  <p className="text-gray-500 text-[10px]">{selectedReceipt.period_label}</p>
                </div>
              </div>

              {/* Financial Settlement Breakdown */}
              <div className="border border-gray-300 rounded-xl overflow-hidden text-xs">
                <div className="bg-gray-100 p-2.5 font-bold text-gray-700 border-b border-gray-300 flex justify-between">
                  <span>Description</span>
                  <span>Quantity & Amount</span>
                </div>
                <div className="p-3 space-y-2 text-[11px]">
                  <div className="flex justify-between font-medium">
                    <span>Total UCO Volume Collected & Verified:</span>
                    <span className="font-bold text-gray-900">{formatLiters(Number(selectedReceipt.total_liters))}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Number of Collection Pickups Included:</span>
                    <span className="font-bold text-gray-900">{selectedReceipt.pickup_ids?.length || 1} pickup(s)</span>
                  </div>
                </div>
                <div className="bg-emerald-50 p-3 border-t border-gray-300 flex items-center justify-between font-bold">
                  <span className="text-gray-800 uppercase text-[11px]">Total Net Amount Disbursed</span>
                  <span className="text-base text-emerald-950 font-mono font-black">
                    {formatCurrency(Number(selectedReceipt.amount))}
                  </span>
                </div>
              </div>

              {/* Declaration */}
              <div className="border-t border-gray-200 pt-3 text-[10px] text-gray-500 space-y-2">
                <p className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <strong>Declaration:</strong> This official receipt confirms full payment disbursement for the specified Used Cooking Oil volume collected under FSSAI RUCO standards.
                </p>
                <div className="text-right pt-2 font-mono text-[9px] text-emerald-800 font-bold">
                  Mellod Biofuels Digital Settlement Seal ✓
                </div>
              </div>
            </div>

            <div className="no-print flex-shrink-0 px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" />
                Print / Save Formal PDF
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
