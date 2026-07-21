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
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
        .order("picked_up_at", { ascending: false });

      setPickups(pickupData ?? []);
    }
    setLoading(false);
  }

  const filteredPickups = pickups.filter((p) => {
    if (statusFilter === "completed") return p.status === "completed";
    if (statusFilter === "pending") return p.status === "pending";
    return true;
  });

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
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-green-800 to-green-900 px-4 pt-6 pb-10 text-white rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Pickups & Receipts</h1>
            <p className="text-green-200 text-xs mt-0.5">Historical logs and official collection receipts</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Status Filters */}
        <div className="flex rounded-xl bg-gray-200 p-1 text-xs font-semibold">
          {(["all", "completed", "pending"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`flex-1 py-2 rounded-lg capitalize transition-all ${
                statusFilter === tab
                  ? "bg-white text-green-800 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "all" ? "All Pickups" : tab}
            </button>
          ))}
        </div>

        {/* Pickup List */}
        {filteredPickups.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700 text-sm">No pickups found</p>
            <p className="text-xs text-gray-400">Completed oil collections will appear here with downloadable receipts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPickups.map((pickup) => (
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

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl space-y-4">
            <div className="flex items-center justify-between px-5 py-3.5 bg-green-800 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-300" />
                <span className="font-bold text-sm">Official Pickup Receipt</span>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-green-200 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div className="p-6 space-y-5 text-gray-900 printable-area">
              {/* Receipt Header */}
              <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-lg text-green-800">
                    <img src="/icons/logo.png" alt="Mellod" className="w-6 h-6 object-contain" />
                    Mellod Logistics
                  </div>
                  <p className="text-[11px] text-gray-500">Used Cooking Oil Collection Receipt</p>
                </div>

                <div className="text-right">
                  <span className="badge bg-green-100 text-green-800 text-[10px] font-mono font-bold">
                    VERIFIED
                  </span>
                  <p className="text-[10px] font-mono text-gray-400 mt-1">
                    REC-{selectedReceipt.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Venue & Regulatory Details */}
              <div className="space-y-1.5 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-400">Partner Venue:</span>
                  <span className="font-bold text-gray-900">{fbo?.business_name}</span>
                </div>
                {fbo?.fssai_license && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">FSSAI License No:</span>
                    <span className="font-mono font-bold text-gray-800">{fbo.fssai_license}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Collection Date:</span>
                  <span className="font-semibold text-gray-800">{formatDate(selectedReceipt.picked_up_at)}</span>
                </div>
              </div>

              {/* Receipt Table */}
              <div className="border rounded-xl overflow-hidden text-xs">
                <div className="bg-gray-100 px-3.5 py-2 font-bold text-gray-600 flex justify-between border-b">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="p-3.5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Volume Collected:</span>
                    <span className="font-bold text-gray-900">{formatLiters(Number(selectedReceipt.liters))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rate per Liter:</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(Number(selectedReceipt.price_per_liter))}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-sm text-green-800">
                    <span>Total Payout:</span>
                    <span>{formatCurrency(Number(selectedReceipt.total_amount))}</span>
                  </div>
                </div>
              </div>

              {selectedReceipt.photo_url && (
                <div>
                  <p className="text-xs text-gray-400 mb-1 font-medium">Verification Photo Proof:</p>
                  <div className="h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedReceipt.photo_url}
                      alt="Pickup photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 text-right border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={handlePrintReceipt}
                className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-semibold bg-white hover:bg-gray-100 border border-gray-200"
              >
                <Printer className="w-3.5 h-3.5 text-gray-600" />
                Print / Download PDF
              </button>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="btn btn-ghost text-xs px-4 py-2"
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
