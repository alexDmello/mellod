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
  CheckCircle,
} from "lucide-react";
import type { Pickup, FBO, FBOPayment } from "@/lib/types";

import FBOHeader from "@/components/FBOHeader";

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
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-gray-600">Loading collection logs & statements...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5 pb-8 font-sans text-emerald-950">
      {/* App Content — hidden during print */}
      <div className="no-print-content space-y-4">
        {/* Modern Unified Header */}
        <FBOHeader subtitle="FBO Partner Portal">
          <div className="flex items-center justify-between">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-emerald-950 border border-emerald-950 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0px_#064e3b]">
                Financial Audit Trail
              </span>
              <h1 className="text-xl font-black tracking-tight mt-1 text-white drop-shadow-xs">Collections & Receipts</h1>
              <p className="text-emerald-100 text-xs mt-0.5 font-bold">Track oil collection earnings and settlement receipts</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center border-2 border-emerald-950 shadow-[2px_2px_0px_#064e3b]">
              <Receipt className="w-6 h-6 text-emerald-700" />
            </div>
          </div>
        </FBOHeader>

        <div className="px-4 -mt-6 relative z-10 space-y-4">
          {/* Sub-Tabs: Individual Pickups vs Monthly Settlement Receipts */}
          <div className="flex border-1.5 border-emerald-950 bg-white rounded-2xl p-1.5 shadow-[3px_3px_0px_#064e3b] gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("pickups")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "pickups"
                  ? "bg-emerald-600 text-white border border-emerald-950 shadow-xs"
                  : "text-emerald-900 hover:bg-emerald-50"
              }`}
            >
              <Droplets className="w-4 h-4" />
              Pickup Logs ({pickups.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("receipts")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "receipts"
                  ? "bg-emerald-600 text-white border border-emerald-950 shadow-xs"
                  : "text-emerald-900 hover:bg-emerald-50"
              }`}
            >
              <FileText className="w-4 h-4" />
              Monthly Statements ({disbursements.length})
            </button>
          </div>

          {/* TAB 1: INDIVIDUAL PICKUP LOGS */}
          {activeTab === "pickups" && (
            <div className="space-y-3">
              {pickups.length === 0 ? (
                <div className="paper-card p-10 text-center text-emerald-800 space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-emerald-700/50" />
                  <p className="font-black text-emerald-950 text-sm">No Pickups Found</p>
                  <p className="text-xs text-emerald-800/80 font-semibold">Oil collections logged by pickers will appear here with verification status.</p>
                </div>
              ) : (
                pickups.map((pickup) => (
                  <div key={pickup.id} className="paper-card p-4.5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-950 text-sm">{formatDate(pickup.picked_up_at)}</span>
                        <span className="text-xs text-emerald-800/80 font-bold">· {formatTime(pickup.picked_up_at)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black flex items-center gap-1 px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                            pickup.status === "completed"
                              ? "bg-emerald-100 text-emerald-950 border-emerald-950 shadow-[1px_1px_0px_#064e3b]"
                              : "bg-amber-100 text-amber-950 border-emerald-950 shadow-[1px_1px_0px_#064e3b]"
                          }`}
                        >
                          {pickup.status === "completed" ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-800" />
                              Verified ✓
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-800" />
                              Pending Review ⏳
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-emerald-50/50 p-3.5 rounded-xl text-xs border border-emerald-950/20">
                      <div>
                        <span className="text-emerald-800/80 block font-extrabold text-[10px] uppercase">Oil Volume</span>
                        <span className="font-black text-emerald-950 text-base flex items-center gap-1 mt-0.5">
                          <Droplets className="w-4 h-4 text-emerald-700" />
                          {formatLiters(Number(pickup.liters))}
                        </span>
                      </div>

                      <div>
                        <span className="text-emerald-800/80 block font-extrabold text-[10px] uppercase">Collection Earnings</span>
                        <span className="font-black text-emerald-700 text-base flex items-center gap-1 mt-0.5">
                          <IndianRupee className="w-4 h-4 text-emerald-700" />
                          {formatCurrency(Number(pickup.total_amount))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs text-emerald-800">
                      <span className="font-mono text-[11px] font-black text-emerald-950">
                        Rate: {formatCurrency(Number(pickup.price_per_liter))}/L
                      </span>

                      <span
                        className={`font-black text-[9px] uppercase px-2.5 py-0.5 rounded-md border ${
                          pickup.payment_status === "paid"
                            ? "bg-emerald-100 text-emerald-950 border-emerald-950"
                            : "bg-amber-100 text-amber-950 border-emerald-950"
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
                <div className="paper-card p-10 text-center text-emerald-800 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-emerald-700/50" />
                  <p className="font-black text-emerald-950 text-sm">No Monthly Statements Issued Yet</p>
                  <p className="text-xs text-emerald-800/80 font-semibold">Official monthly disbursement receipts issued by Mellod Admin will appear here.</p>
                </div>
              ) : (
                disbursements.map((pay) => (
                  <div key={pay.id} className="paper-card p-4.5 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-emerald-950/15 pb-2.5">
                      <div>
                        <span className="font-mono font-black text-emerald-700 text-xs block">
                          Statement #{pay.receipt_number}
                        </span>
                        <span className="text-[11px] text-emerald-800/80 font-semibold">
                          Issued on {formatDate(pay.paid_at)}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 text-[10px] font-black uppercase tracking-wider border border-emerald-950 shadow-[1px_1px_0px_#064e3b]">
                        Official Statement
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-emerald-50/50 p-3.5 rounded-xl text-xs border border-emerald-950/20">
                      <div>
                        <span className="text-emerald-800/80 block text-[10px] font-extrabold uppercase">Disbursed Amount</span>
                        <span className="font-black text-emerald-950 text-lg mt-0.5 block">
                          {formatCurrency(Number(pay.amount))}
                        </span>
                      </div>

                      <div>
                        <span className="text-emerald-800/80 block text-[10px] font-extrabold uppercase">Total Volume</span>
                        <span className="font-black text-emerald-950 text-base mt-0.5 block">
                          {formatLiters(Number(pay.total_liters))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="text-emerald-800 text-[11px]">
                        <span>Method: </span>
                        <span className="font-black uppercase text-emerald-950">{pay.payment_method}</span>
                        {pay.reference_number && (
                          <span className="block font-mono text-[10px] text-emerald-700 font-semibold">Ref: {pay.reference_number}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDisbursement(pay)}
                        className="btn-paper-primary py-2 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-white" />
                        View Statement
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
        <div className="printable-receipt-modal fixed inset-0 z-50 bg-emerald-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="printable-receipt-card bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-[8px_8px_0px_#064e3b] border-2 border-emerald-950">
            <div className="no-print flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-emerald-700 text-white border-b-2 border-emerald-950">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-white" />
                <span className="font-black text-sm tracking-tight">Official Monthly Settlement Statement</span>
              </div>
              <button
                onClick={() => setSelectedDisbursement(null)}
                className="text-white hover:text-emerald-200 p-1 font-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white text-emerald-950">
              {/* Formal Letterhead */}
              <div className="border-b-2 border-emerald-950 pb-3.5 flex flex-row items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/logo.png" alt="Mellod Logo" className="w-10 h-10 object-contain mt-0.5" />
                  <div>
                    <h2 className="text-lg font-black text-emerald-950 tracking-tight leading-tight">
                      MELLOD BIOFUELS
                    </h2>
                    <p className="text-[11px] text-emerald-800 font-semibold">
                      FSSAI RUCO Registered Aggregator &amp; Feedstock Supplier
                    </p>
                  </div>
                </div>

                <div className="text-right bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-950">
                  <span className="inline-block bg-emerald-700 text-white text-[9px] uppercase font-black px-2 py-0.5 rounded shadow-xs border border-emerald-950">
                    Payment Statement
                  </span>
                  <p className="text-[11px] font-mono font-black text-emerald-950 mt-0.5">
                    {selectedDisbursement.receipt_number}
                  </p>
                  <p className="text-[10px] text-emerald-800 font-bold">
                    {formatDate(selectedDisbursement.paid_at)}
                  </p>
                </div>
              </div>

              {/* FBO & Settlement Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-950/20 space-y-1">
                  <span className="font-black uppercase text-[9px] text-emerald-800 block border-b border-emerald-950/20 pb-0.5">
                    FBO Supplier Account
                  </span>
                  <p className="font-black text-emerald-950">{fbo?.business_name || "FBO Account"}</p>
                  <p className="text-emerald-800 text-[11px] font-semibold">{fbo?.address || "Address N/A"}</p>
                  <p className="text-emerald-800 text-[10px] font-semibold">FSSAI: {fbo?.fssai_license || "N/A"}</p>
                </div>

                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-950/20 space-y-1">
                  <span className="font-black uppercase text-[9px] text-emerald-800 block border-b border-emerald-950/20 pb-0.5">
                    Disbursement Details
                  </span>
                  <p className="font-bold text-emerald-950">Method: <span className="uppercase font-black">{selectedDisbursement.payment_method}</span></p>
                  {selectedDisbursement.reference_number && (
                    <p className="font-mono text-emerald-800 text-[11px] font-bold">UTR / Ref: {selectedDisbursement.reference_number}</p>
                  )}
                  <p className="text-emerald-800 text-[10px] font-semibold">{selectedDisbursement.period_label}</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="border border-emerald-950 rounded-xl overflow-hidden text-xs">
                <div className="bg-emerald-100/70 p-3 font-black text-emerald-950 border-b border-emerald-950 flex justify-between">
                  <span>Description</span>
                  <span>Quantity &amp; Amount</span>
                </div>
                <div className="p-3.5 space-y-2 text-[11px]">
                  <div className="flex justify-between font-bold text-emerald-950">
                    <span>Total UCO Volume Collected &amp; Verified:</span>
                    <span className="font-black">{formatLiters(Number(selectedDisbursement.total_liters))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-950">
                    <span>Pickups Covered in this Settlement:</span>
                    <span className="font-black">{selectedDisbursement.pickup_ids?.length || 1} pickup(s)</span>
                  </div>
                </div>
                <div className="bg-emerald-50 p-3.5 border-t border-emerald-950 flex items-center justify-between font-black">
                  <span className="text-emerald-950 uppercase text-[11px]">Total Net Amount Disbursed</span>
                  <span className="text-base text-emerald-950 font-mono font-black">
                    {formatCurrency(Number(selectedDisbursement.amount))}
                  </span>
                </div>
              </div>

              {/* Regulatory Declaration */}
              <div className="border-t border-emerald-950/15 pt-3 text-[10px] text-emerald-800 space-y-2">
                <p className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-950/20 font-semibold">
                  <strong>Declaration:</strong> This official statement confirms full payment disbursement for Used Cooking Oil collected under FSSAI RUCO standards.
                </p>
                <div className="text-right pt-2 font-mono text-[9px] text-emerald-800 font-black">
                  Mellod Biofuels Digital Settlement Seal ✓
                </div>
              </div>
            </div>

            <div className="no-print flex-shrink-0 px-5 py-3.5 bg-emerald-50/50 border-t border-emerald-950/20 flex items-center justify-between">
              <button
                onClick={handlePrintReceipt}
                className="btn-paper-primary py-2.5 px-4 text-xs flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-white" />
                Print / Save Statement PDF
              </button>
              <button
                onClick={() => setSelectedDisbursement(null)}
                className="px-4 py-2.5 text-xs text-emerald-950 hover:bg-emerald-100 font-black rounded-xl transition-all border border-emerald-950 bg-white cursor-pointer"
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
