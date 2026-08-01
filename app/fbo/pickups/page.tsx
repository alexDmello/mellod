"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatLiters, formatDate, formatTime } from "@/lib/utils";
import {
  Clock,
  Droplets,
  IndianRupee,
  FileText,
  Printer,
  X,
  Loader2,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Receipt,
  CreditCard,
} from "lucide-react";
import type { Pickup, FBO, FBOPayment } from "@/lib/types";

export default function FBOPickupsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pickups" | "receipts">("pickups");
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [disbursements, setDisbursements] = useState<FBOPayment[]>([]);
  const [fbo, setFbo] = useState<FBO | null>(null);
  const [selectedDisbursement, setSelectedDisbursement] = useState<FBOPayment | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchFBOData();
  }, []);

  async function fetchFBOData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: fboData } = await supabase.from("fbos").select("*").eq("profile_id", user.id).single();
    if (fboData) {
      setFbo(fboData);

      // Fetch pickups
      const { data: pickupData } = await supabase
        .from("pickups")
        .select("*")
        .eq("fbo_id", fboData.id)
        .order("picked_up_at", { ascending: false });

      setPickups(pickupData ?? []);

      // Fetch disbursement receipts from fbo_payments
      try {
        const { data: payData } = await supabase
          .from("fbo_payments")
          .select("*")
          .eq("fbo_id", fboData.id)
          .order("paid_at", { ascending: false });

        setDisbursements(payData ?? []);
      } catch (e) {
        console.warn("fbo_payments query fallback:", e);
      }
    }
    setLoading(false);
  }

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin text-green-700 mr-2" />
        Loading collection logs & statements...
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 pb-8">
      {/* App Content — hidden during print */}
      <div className="no-print-content space-y-4">
        {/* Header Banner */}
        <div className="bg-green-700 px-4 pt-6 pb-10 text-white rounded-b-3xl shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Collections & Settlement Receipts</h1>
              <p className="text-green-200 text-xs mt-0.5">Track collection earnings and access monthly settlement receipts</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="px-4 -mt-6 space-y-4">
          {/* Sub-Tabs: Individual Pickups vs Monthly Settlement Receipts */}
          <div className="flex border border-gray-200 bg-white rounded-2xl p-1 shadow-sm gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("pickups")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "pickups"
                  ? "bg-green-700 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Droplets className="w-4 h-4" />
              Pickup Logs ({pickups.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("receipts")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "receipts"
                  ? "bg-green-700 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <FileText className="w-4 h-4" />
              Monthly Receipts ({disbursements.length})
            </button>
          </div>

          {/* TAB 1: INDIVIDUAL PICKUP LOGS (HOW MUCH MADE PER PICKUP, NO INDIVIDUAL RECEIPT BUTTON) */}
          {activeTab === "pickups" && (
            <div className="space-y-3">
              {pickups.length === 0 ? (
                <div className="card p-8 text-center text-gray-400 space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="font-semibold text-gray-700 text-sm">No pickups found</p>
                  <p className="text-xs text-gray-400">Oil collections logged by pickers will appear here with verification status.</p>
                </div>
              ) : (
                pickups.map((pickup) => (
                  <div key={pickup.id} className="card p-4 space-y-3 hover:border-green-200 transition-colors bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{formatDate(pickup.picked_up_at)}</span>
                        <span className="text-xs text-gray-400">· {formatTime(pickup.picked_up_at)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`badge text-[10px] font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-full ${
                            pickup.status === "completed"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-amber-100 text-amber-900 border border-amber-200"
                          }`}
                        >
                          {pickup.status === "completed" ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-green-700" />
                              Verified ✓
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-700" />
                              Pending Verification ⏳
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl text-xs">
                      <div>
                        <span className="text-gray-400 block font-medium">Oil Volume</span>
                        <span className="font-bold text-gray-900 text-sm flex items-center gap-1">
                          <Droplets className="w-4 h-4 text-blue-600" />
                          {formatLiters(Number(pickup.liters))}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block font-medium">Earned in Pickup</span>
                        <span className="font-extrabold text-green-700 text-sm flex items-center gap-1">
                          <IndianRupee className="w-4 h-4 text-green-600" />
                          {formatCurrency(Number(pickup.total_amount))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
                      <span className="font-mono text-[11px]">
                        Rate: {formatCurrency(Number(pickup.price_per_liter))}/L
                      </span>

                      <span
                        className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                          pickup.payment_status === "paid"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {pickup.payment_status === "paid" ? "Settled & Disbursed ✓" : "Outstanding / Unpaid ⏳"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: SEPARATE SECTION FOR MONTHLY / DISBURSEMENT SETTLEMENT RECEIPTS */}
          {activeTab === "receipts" && (
            <div className="space-y-3">
              {disbursements.length === 0 ? (
                <div className="card p-8 text-center text-gray-400 space-y-2 bg-white">
                  <FileText className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="font-semibold text-gray-700 text-sm">No monthly settlement receipts issued yet</p>
                  <p className="text-xs text-gray-400">Official monthly disbursement receipts issued by Mellod Admin will appear here.</p>
                </div>
              ) : (
                disbursements.map((pay) => (
                  <div key={pay.id} className="card p-4 space-y-3 bg-white border border-gray-200 hover:border-green-300 transition-all">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div>
                        <span className="font-mono font-bold text-green-800 text-xs block">
                          Receipt #{pay.receipt_number}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          Issued on {formatDate(pay.paid_at)}
                        </span>
                      </div>
                      <span className="badge bg-green-100 text-green-800 text-[10px] font-bold uppercase">
                        Official Statement
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-green-50/60 p-3 rounded-xl text-xs border border-green-100">
                      <div>
                        <span className="text-gray-500 block text-[11px]">Disbursed Amount</span>
                        <span className="font-black text-green-800 text-base">
                          {formatCurrency(Number(pay.amount))}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-500 block text-[11px]">Total Volume</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {formatLiters(Number(pay.total_liters))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="text-gray-500 text-[11px]">
                        <span>Method: </span>
                        <span className="font-bold uppercase text-gray-700">{pay.payment_method}</span>
                        {pay.reference_number && (
                          <span className="block font-mono text-[10px] text-gray-400">Ref: {pay.reference_number}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDisbursement(pay)}
                        className="btn btn-secondary text-xs py-1.5 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 flex items-center gap-1.5 font-bold shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5 text-green-700" />
                        View Statement Receipt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* OFFICIAL CONSOLIDATED DISBURSEMENT STATEMENT MODAL */}
      {selectedDisbursement && (
        <div className="printable-receipt-modal fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4">
          <div className="printable-receipt-card bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
            <div className="no-print flex-shrink-0 flex items-center justify-between px-4 py-3 bg-green-800 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-300" />
                <span className="font-bold text-sm">Official Monthly Settlement Statement</span>
              </div>
              <button
                onClick={() => setSelectedDisbursement(null)}
                className="text-green-200 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white text-gray-900">
              {/* Formal Letterhead */}
              <div className="border-b-2 border-green-800 pb-3 flex flex-row items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/logo.png" alt="Mellod Logo" className="w-10 h-10 object-contain mt-0.5" />
                  <div>
                    <h2 className="text-lg font-black text-green-900 tracking-tight leading-tight">
                      MELLOD BIOFUELS
                    </h2>
                    <p className="text-[11px] text-gray-600 font-medium">
                      FSSAI RUCO Registered Aggregator & Feedstock Supplier
                    </p>
                  </div>
                </div>

                <div className="text-right bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100">
                  <span className="inline-block bg-green-800 text-white text-[9px] uppercase font-black px-2 py-0.5 rounded">
                    Payment Statement
                  </span>
                  <p className="text-[11px] font-mono font-bold text-gray-800 mt-0.5">
                    {selectedDisbursement.receipt_number}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {formatDate(selectedDisbursement.paid_at)}
                  </p>
                </div>
              </div>

              {/* FBO & Settlement Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <span className="font-bold uppercase text-[9px] text-green-800 block border-b pb-0.5">
                    FBO Supplier Account
                  </span>
                  <p className="font-bold text-gray-900">{fbo?.business_name || "FBO Account"}</p>
                  <p className="text-gray-600 text-[11px]">{fbo?.address || "Address N/A"}</p>
                  <p className="text-gray-500 text-[10px]">FSSAI: {fbo?.fssai_license || "N/A"}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <span className="font-bold uppercase text-[9px] text-green-800 block border-b pb-0.5">
                    Disbursement Details
                  </span>
                  <p className="font-semibold text-gray-800">Method: <span className="uppercase font-bold">{selectedDisbursement.payment_method}</span></p>
                  {selectedDisbursement.reference_number && (
                    <p className="font-mono text-gray-700 text-[11px]">UTR / Ref: {selectedDisbursement.reference_number}</p>
                  )}
                  <p className="text-gray-500 text-[10px]">{selectedDisbursement.period_label}</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="border border-gray-300 rounded-xl overflow-hidden text-xs">
                <div className="bg-gray-100 p-2.5 font-bold text-gray-700 border-b border-gray-300 flex justify-between">
                  <span>Description</span>
                  <span>Quantity & Amount</span>
                </div>
                <div className="p-3 space-y-2 text-[11px]">
                  <div className="flex justify-between font-medium">
                    <span>Total UCO Volume Collected & Verified:</span>
                    <span className="font-bold text-gray-900">{formatLiters(Number(selectedDisbursement.total_liters))}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Pickups Covered in this Settlement:</span>
                    <span className="font-bold text-gray-900">{selectedDisbursement.pickup_ids?.length || 1} pickup(s)</span>
                  </div>
                </div>
                <div className="bg-green-50 p-3 border-t border-gray-300 flex items-center justify-between font-bold">
                  <span className="text-gray-800 uppercase text-[11px]">Total Net Amount Disbursed</span>
                  <span className="text-base text-green-900 font-mono font-black">
                    {formatCurrency(Number(selectedDisbursement.amount))}
                  </span>
                </div>
              </div>

              {/* Regulatory Declaration */}
              <div className="border-t border-gray-200 pt-3 text-[10px] text-gray-500 space-y-2">
                <p className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <strong>Declaration:</strong> This official statement confirms full payment disbursement for Used Cooking Oil collected under FSSAI RUCO standards.
                </p>
                <div className="text-right pt-2 font-mono text-[9px] text-green-800 font-bold">
                  Mellod Biofuels Digital Settlement Seal ✓
                </div>
              </div>
            </div>

            <div className="no-print flex-shrink-0 px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={handlePrintReceipt}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Print / Save Statement PDF
              </button>
              <button
                onClick={() => setSelectedDisbursement(null)}
                className="btn btn-ghost text-xs px-3 py-2 text-gray-600 hover:bg-gray-200 font-semibold"
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
