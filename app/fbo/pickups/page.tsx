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
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
  ShieldCheck,
  Eye,
} from "lucide-react";
import type { Pickup, FBO } from "@/lib/types";

export default function FBOPickupsPage() {
  const [loading, setLoading] = useState(true);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [fbo, setFbo] = useState<FBO | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Pickup | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchPickups();
  }, []);

  async function fetchPickups() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: fboData } = await supabase.from("fbos").select("*").eq("profile_id", user.id).single();
    if (fboData) {
      setFbo(fboData);
      const { data: pickupData } = await supabase
        .from("pickups")
        .select("*")
        .eq("fbo_id", fboData.id)
        .eq("status", "completed")
        .order("picked_up_at", { ascending: false });

      setPickups(pickupData ?? []);
    }
    setLoading(false);
  }

  const completedPickups = pickups;

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin text-green-700 mr-2" />
        Loading pickup records...
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
              <h1 className="text-xl font-bold">Completed Pickups & Receipts</h1>
              <p className="text-green-200 text-xs mt-0.5">Official collection logs and printable receipts</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="px-4 -mt-6 space-y-4">
          {/* Pickup List */}
          {completedPickups.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-gray-300" />
              <p className="font-semibold text-gray-700 text-sm">No pickups found</p>
              <p className="text-xs text-gray-400">Completed oil collections will appear here with downloadable receipts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedPickups.map((pickup) => (
                <div key={pickup.id} className="card p-4 space-y-3 hover:border-green-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">{formatDate(pickup.picked_up_at)}</span>
                      <span className="text-xs text-gray-400">· {formatTime(pickup.picked_up_at)}</span>
                    </div>

                    <span
                      className={`badge text-[10px] uppercase font-bold ${
                        pickup.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {pickup.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-gray-400 block font-medium">Oil Quantity</span>
                      <span className="font-bold text-gray-900 text-sm flex items-center gap-1">
                        <Droplets className="w-4 h-4 text-blue-600" />
                        {formatLiters(Number(pickup.liters))}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block font-medium">Total Payout</span>
                      <span className="font-bold text-green-700 text-sm flex items-center gap-1">
                        <IndianRupee className="w-4 h-4 text-green-600" />
                        {formatCurrency(Number(pickup.total_amount))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-gray-400 font-mono text-[11px]">
                      Rate: {formatCurrency(Number(pickup.price_per_liter))}/L
                    </span>

                    <button
                      onClick={() => setSelectedReceipt(pickup)}
                      className="btn btn-secondary text-xs py-1.5 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 flex items-center gap-1.5 font-semibold"
                    >
                      <FileText className="w-3.5 h-3.5 text-green-700" />
                      View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Official Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="printable-receipt-modal fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4">
          <div className="printable-receipt-card bg-white rounded-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl space-y-0 text-gray-900 border border-gray-200">
            {/* Modal Header — hidden on print */}
            <div className="no-print flex-shrink-0 flex items-center justify-between px-4 py-3 bg-green-800 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-300" />
                <span className="font-bold text-sm">Official Collection Receipt</span>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-green-200 hover:text-white p-1 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formal Printable Document Content (Scrollable if screen is small) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-white text-gray-900">
              {/* Formal Letterhead */}
              <div className="border-b-2 border-green-800 pb-3 flex flex-row items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <img src="/icons/logo.png" alt="Mellod Biofuels Logo" className="w-10 h-10 object-contain mt-0.5" />
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-green-900 tracking-tight leading-tight">
                      MELLOD BIOFUELS
                    </h2>
                    <p className="text-[11px] text-gray-600 font-medium">
                      FSSAI RUCO Registered Aggregator & Feedstock Supplier
                    </p>
                  </div>
                </div>

                <div className="text-right bg-green-50/80 px-2.5 py-1.5 rounded-lg border border-green-100 flex-shrink-0">
                  <span className="inline-block bg-green-800 text-white text-[9px] uppercase font-black px-2 py-0.5 rounded">
                    Certificate
                  </span>
                  <p className="text-[11px] font-mono font-bold text-gray-800 mt-0.5">
                    REC-{selectedReceipt.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {formatDate(selectedReceipt.picked_up_at)}
                  </p>
                </div>
              </div>

              {/* Two Column Business & Collector Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Issued To (FBO Details) */}
                <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 space-y-1.5">
                  <div className="border-b border-gray-200 pb-1 flex items-center justify-between">
                    <span className="font-bold uppercase text-[9px] text-green-800 tracking-wider">
                      Issued To (Supplier FBO)
                    </span>
                    <Building2 className="w-3.5 h-3.5 text-green-700" />
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-900 text-xs">{fbo?.business_name}</p>
                    <p className="text-gray-600 text-[11px]">Contact: {fbo?.contact_person || "Authorized Manager"}</p>
                    <p className="text-gray-600 text-[11px]">Phone: {fbo?.phone || "N/A"}</p>
                  </div>
                  <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-medium">FSSAI License:</span>
                    <span className="font-mono font-bold text-gray-900 bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                      {fbo?.fssai_license || "Pending"}
                    </span>
                  </div>
                </div>

                {/* Collector & Transport Details */}
                <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 space-y-1.5">
                  <div className="border-b border-gray-200 pb-1 flex items-center justify-between">
                    <span className="font-bold uppercase text-[9px] text-green-800 tracking-wider">
                      Collection & Transport
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-xs">Mellod Biofuels Collection Fleet</p>
                    <p className="text-gray-600 text-[11px]">Volumetric Verification: Verified</p>
                    <p className="text-gray-600 text-[11px]">Status: Completed & Disbursed</p>
                  </div>
                  <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-medium">Standard:</span>
                    <span className="font-bold text-green-800 bg-green-100/70 px-1.5 py-0.5 rounded text-[10px]">
                      FSSAI RUCO Compliant
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Financial Breakdown Table */}
              <div className="border border-gray-300 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b border-gray-300 font-bold text-[11px]">
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-right">Volume (L)</th>
                      <th className="p-2.5 text-right">Rate (₹/L)</th>
                      <th className="p-2.5 text-right">Net Payout (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[11px]">
                    <tr>
                      <td className="p-2.5 font-medium text-gray-900">
                        Used Cooking Oil (UCO) Feedstock
                      </td>
                      <td className="p-2.5 text-right font-bold text-gray-900">
                        {formatLiters(Number(selectedReceipt.liters))}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-gray-700">
                        {formatCurrency(Number(selectedReceipt.price_per_liter))}
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-green-800 text-xs">
                        {formatCurrency(Number(selectedReceipt.total_amount))}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Total Summary Footer */}
                <div className="bg-green-50/80 p-2.5 border-t border-gray-300 flex items-center justify-between">
                  <span className="font-bold text-gray-800 text-[11px] uppercase tracking-wide">Total Disbursed Payout</span>
                  <span className="font-black text-base text-green-900 font-mono">
                    {formatCurrency(Number(selectedReceipt.total_amount))}
                  </span>
                </div>
              </div>

              {/* Photo Proof (if available) */}
              {selectedReceipt.photo_url && (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    On-Site Photo Verification Proof
                  </p>
                  <div className="h-28 rounded-lg overflow-hidden border border-gray-300 max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedReceipt.photo_url}
                      alt="Collection photo proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Formal Regulatory Declaration & Sign-off */}
              <div className="border-t border-gray-200 pt-3 space-y-3 text-[10px] text-gray-600">
                <p className="leading-snug bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-gray-700">
                  <strong>Declaration:</strong> This certificate confirms that the specified volume of Used Cooking Oil (UCO) has been legally collected and transferred to Mellod Biofuels for eco-friendly processing into Biodiesel under FSSAI RUCO standards.
                </p>

                {/* Authorization Signature Block */}
                <div className="flex justify-end pt-1">
                  <div className="text-right min-w-[180px]">
                    <div className="border-b border-gray-400 h-6 flex items-end justify-end pb-0.5 font-mono text-[9px] text-green-800 font-bold">
                      Mellod Biofuels Digital Seal ✓
                    </div>
                    <p className="font-bold text-gray-800 text-[10px] mt-0.5">Authorized Signatory — Mellod Biofuels</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Controls — ALWAYS STICKY ON SCREEN, hidden on print */}
            <div className="no-print flex-shrink-0 sticky bottom-0 z-20 px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shadow-lg">
              <button
                onClick={handlePrintReceipt}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Print / Save Formal PDF
              </button>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="btn btn-ghost text-xs px-3 py-2 font-semibold text-gray-600 hover:bg-gray-200"
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
