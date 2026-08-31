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
  Truck,
  Calendar,
} from "lucide-react";
import type { Pickup, FBO, FBOPayment, PickupRequest } from "@/lib/types";

import FBOHeader from "@/components/FBOHeader";
import FBOPickupsLoading from "./loading";

export default function FBOPickupsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pickups" | "requests" | "receipts">("pickups");
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
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

      // Fetch pickup requests
      try {
        const { data: reqData } = await supabase
          .from("pickup_requests")
          .select("*, picker:pickers(*, profile:profiles(*))")
          .eq("fbo_id", fboData.id)
          .order("created_at", { ascending: false });

        setPickupRequests((reqData as PickupRequest[]) ?? []);
      } catch (e) {
        console.warn("pickup_requests fetch error:", e);
      }

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
    return <FBOPickupsLoading />;
  }

  return (
    <div className="animate-fade-in space-y-5 pb-8 font-sans text-slate-900">
      {/* App Content — hidden during print */}
      <div className="no-print-content space-y-4">
        {/* Modern Unified Header matching Home page */}
        <FBOHeader subtitle="Verified Partner Hub">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-300/40 text-emerald-100 text-[10px] font-extrabold uppercase tracking-wider">
                Financial Audit Trail
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">Collections & Receipts</h1>
              <p className="text-emerald-100/90 text-xs font-semibold">Track oil collection earnings, pickup requests, and settlement receipts</p>
            </div>
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner text-white flex-shrink-0">
              <Receipt className="w-6 h-6 text-white" />
            </div>
          </div>
        </FBOHeader>

        <div className="px-4 -mt-6 relative z-10 space-y-4">
          {/* Sub-Tabs: Individual Pickups vs Pickup Requests vs Monthly Settlement Receipts */}
          <div className="flex bg-white rounded-2xl p-1.5 border border-slate-100 shadow-lg shadow-slate-200/50 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("pickups")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === "pickups"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              Pickups ({pickups.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === "requests"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Requests ({pickupRequests.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("receipts")}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === "receipts"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Statements ({disbursements.length})
            </button>
          </div>

          {/* TAB 2: PICKUP REQUESTS */}
          {activeTab === "requests" && (
            <div className="space-y-3.5">
              {pickupRequests.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-lg shadow-slate-200/50 space-y-2 text-slate-500">
                  <Truck className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-black text-slate-900 text-sm">No Pickup Requests Submitted</p>
                  <p className="text-xs text-slate-500 font-medium">Use the &ldquo;Request Oil Pickup&rdquo; feature on your Home dashboard to schedule a collection.</p>
                </div>
              ) : (
                pickupRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-lg shadow-slate-200/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-black text-slate-900 text-sm">
                          {formatLiters(Number(req.estimated_liters))} UCO Requested
                        </span>
                        <p className="text-xs text-slate-400 font-medium">
                          Submitted on {formatDate(req.created_at)}
                        </p>
                      </div>

                      <span
                        className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                          req.status === "pending"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : req.status === "scheduled" || req.status === "assigned"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : req.status === "completed"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {req.status === "pending" && "Pending Admin Review ⏳"}
                        {(req.status === "scheduled" || req.status === "assigned") && "Scheduled 🚚"}
                        {req.status === "completed" && "Completed ✓"}
                        {req.status === "cancelled" && "Cancelled ✖"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs border border-slate-100">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Preferred Date</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{formatDate(req.preferred_date)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Time Window</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{req.preferred_time_slot}</span>
                      </div>
                    </div>

                    {req.picker?.profile?.full_name && (
                      <div className="text-xs font-bold text-slate-700 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <span>Assigned Picker: <strong className="text-emerald-950">{req.picker.profile.full_name}</strong></span>
                      </div>
                    )}

                    {req.notes && (
                      <p className="text-xs text-slate-500 font-medium italic border-t border-slate-100 pt-2">
                        &ldquo;{req.notes}&rdquo;
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 1: INDIVIDUAL PICKUP LOGS */}
          {activeTab === "pickups" && (
            <div className="space-y-3.5">
              {pickups.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-lg shadow-slate-200/50 space-y-2 text-slate-500">
                  <Clock className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-black text-slate-900 text-sm">No Pickups Found</p>
                  <p className="text-xs text-slate-500 font-medium">Oil collections logged by pickers will appear here with verification status.</p>
                </div>
              ) : (
                pickups.map((pickup) => (
                  <div key={pickup.id} className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-lg shadow-slate-200/50 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{formatDate(pickup.picked_up_at)}</span>
                        <span className="text-xs text-slate-400 font-medium">· {formatTime(pickup.picked_up_at)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-extrabold flex items-center gap-1 px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                            pickup.status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {pickup.status === "completed" ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Verified ✓
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Review ⏳
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Oil Volume</span>
                        <span className="font-black text-slate-900 text-base flex items-center gap-1 mt-0.5">
                          <Droplets className="w-4 h-4 text-emerald-600" />
                          {formatLiters(Number(pickup.liters))}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Collection Earnings</span>
                        <span className="font-black text-emerald-700 text-base flex items-center gap-1 mt-0.5">
                          <IndianRupee className="w-4 h-4 text-emerald-600" />
                          {formatCurrency(Number(pickup.total_amount))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="font-mono text-[11px] font-bold text-slate-700">
                        Rate: {formatCurrency(Number(pickup.price_per_liter))}/L
                      </span>

                      <span
                        className={`font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-md border ${
                          pickup.payment_status === "paid"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            : "bg-amber-100 text-amber-900 border border-amber-200"
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
            <div className="space-y-3.5">
              {disbursements.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-lg shadow-slate-200/50 space-y-2 text-slate-500">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-black text-slate-900 text-sm">No Monthly Statements Issued Yet</p>
                  <p className="text-xs text-slate-500 font-medium">Official monthly disbursement receipts issued by Mellod Admin will appear here.</p>
                </div>
              ) : (
                disbursements.map((pay) => (
                  <div key={pay.id} className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-lg shadow-slate-200/50 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="font-mono font-black text-emerald-700 text-xs block">
                          Statement #{pay.receipt_number}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Issued on {formatDate(pay.paid_at)}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">
                        Official Statement
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Disbursed Amount</span>
                        <span className="font-black text-slate-900 text-lg mt-0.5 block">
                          {formatCurrency(Number(pay.amount))}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Total Volume</span>
                        <span className="font-black text-slate-900 text-base mt-0.5 block">
                          {formatLiters(Number(pay.total_liters))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="text-slate-600 text-[11px]">
                        <span>Method: </span>
                        <span className="font-bold uppercase text-slate-900">{pay.payment_method}</span>
                        {pay.reference_number && (
                          <span className="block font-mono text-[10px] text-slate-500 font-semibold">Ref: {pay.reference_number}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDisbursement(pay)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-3.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
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
        <div className="printable-receipt-modal fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="printable-receipt-card bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="no-print flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-white" />
                <span className="font-black text-sm tracking-tight">Official Monthly Settlement Statement</span>
              </div>
              <button
                onClick={() => setSelectedDisbursement(null)}
                className="text-white/80 hover:text-white p-1 font-black cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white text-slate-900">
              {/* Formal Letterhead */}
              <div className="border-b border-slate-200 pb-3.5 flex flex-row items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/logo.png" alt="Mellod Logo" className="w-10 h-10 object-contain mt-0.5" />
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                      MELLOD BIOFUELS
                    </h2>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      FSSAI RUCO Registered Aggregator &amp; Feedstock Supplier
                    </p>
                  </div>
                </div>

                <div className="text-right bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <span className="inline-block bg-emerald-700 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded shadow-xs">
                    Payment Statement
                  </span>
                  <p className="text-[11px] font-mono font-black text-slate-900 mt-0.5">
                    {selectedDisbursement.receipt_number}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {formatDate(selectedDisbursement.paid_at)}
                  </p>
                </div>
              </div>

              {/* FBO & Settlement Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="font-extrabold uppercase text-[9px] text-slate-500 tracking-wider block border-b border-slate-200 pb-0.5">
                    FBO Supplier Account
                  </span>
                  <p className="font-black text-slate-900">{fbo?.business_name || "FBO Account"}</p>
                  <p className="text-slate-600 text-[11px] font-medium">{fbo?.address || "Address N/A"}</p>
                  <p className="text-slate-500 text-[10px] font-medium">FSSAI: {fbo?.fssai_license || "N/A"}</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="font-extrabold uppercase text-[9px] text-slate-500 tracking-wider block border-b border-slate-200 pb-0.5">
                    Disbursement Details
                  </span>
                  <p className="font-bold text-slate-900">Method: <span className="uppercase font-black">{selectedDisbursement.payment_method}</span></p>
                  {selectedDisbursement.reference_number && (
                    <p className="font-mono text-slate-600 text-[11px] font-bold">UTR / Ref: {selectedDisbursement.reference_number}</p>
                  )}
                  <p className="text-slate-500 text-[10px] font-medium">{selectedDisbursement.period_label}</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-3 font-bold text-slate-900 border-b border-slate-200 flex justify-between">
                  <span>Description</span>
                  <span>Quantity &amp; Amount</span>
                </div>
                <div className="p-3.5 space-y-2 text-[11px]">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total UCO Volume Collected &amp; Verified:</span>
                    <span className="font-black text-slate-900">{formatLiters(Number(selectedDisbursement.total_liters))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Pickups Covered in this Settlement:</span>
                    <span className="font-black text-slate-900">{selectedDisbursement.pickup_ids?.length || 1} pickup(s)</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between font-black">
                  <span className="text-slate-700 uppercase text-[11px]">Total Net Amount Disbursed</span>
                  <span className="text-base text-emerald-700 font-mono font-black">
                    {formatCurrency(Number(selectedDisbursement.amount))}
                  </span>
                </div>
              </div>

              {/* Regulatory Declaration */}
              <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-500 space-y-2">
                <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium text-slate-600">
                  <strong>Declaration:</strong> This official statement confirms full payment disbursement for Used Cooking Oil collected under FSSAI RUCO standards.
                </p>
                <div className="text-right pt-2 font-mono text-[9px] text-slate-400 font-bold">
                  Mellod Biofuels Digital Settlement Seal ✓
                </div>
              </div>
            </div>

            <div className="no-print flex-shrink-0 px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handlePrintReceipt}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-white" />
                Print / Save Statement PDF
              </button>
              <button
                onClick={() => setSelectedDisbursement(null)}
                className="px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-200 font-extrabold rounded-xl transition-all border border-slate-200 bg-white cursor-pointer"
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

