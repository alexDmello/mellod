"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatLiters, formatDate } from "@/lib/utils";
import { Truck, Calendar, Clock, AlertCircle, Plus, CheckCircle2, Loader2, X, FileText } from "lucide-react";
import type { PickupRequest } from "@/lib/types";

interface FBORequestPickupCardProps {
  fboId: string;
}

export default function FBORequestPickupCard({ fboId }: FBORequestPickupCardProps) {
  const [activeRequest, setActiveRequest] = useState<PickupRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [liters, setLiters] = useState<number>(50);
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [timeSlot, setTimeSlot] = useState<string>("Morning (9 AM - 12 PM)");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchActiveRequest();
  }, [fboId]);

  async function fetchActiveRequest() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pickup_requests")
        .select("*, picker:pickers(*, profile:profiles(*))")
        .eq("fbo_id", fboId)
        .in("status", ["pending", "scheduled", "assigned"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setActiveRequest(data as PickupRequest);
      } else {
        setActiveRequest(null);
      }
    } catch (e) {
      console.warn("fetchActiveRequest fallback:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!liters || liters <= 0) {
      setErrorMsg("Please enter a valid estimated volume in liters.");
      return;
    }
    if (!preferredDate) {
      setErrorMsg("Please select a preferred date.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase
        .from("pickup_requests")
        .insert({
          fbo_id: fboId,
          estimated_liters: Number(liters),
          preferred_date: preferredDate,
          preferred_time_slot: timeSlot,
          notes: notes.trim() || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSuccessMsg("Pickup request submitted successfully! Mellod Admin will review and schedule a picker.");
      setShowModal(false);
      fetchActiveRequest();
    } catch (err: any) {
      console.error("Submit pickup request error:", err);
      setErrorMsg(err.message || "Failed to submit pickup request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRequest() {
    if (!activeRequest) return;
    if (!confirm("Are you sure you want to cancel this pickup request?")) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from("pickup_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", activeRequest.id);

      if (error) throw error;

      setActiveRequest(null);
      setSuccessMsg("Pickup request cancelled.");
    } catch (err: any) {
      alert("Failed to cancel request: " + err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ACTIVE REQUEST CARD IF ONE EXISTS */}
      {activeRequest ? (
        <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-900 text-white rounded-2xl p-5 shadow-xl border border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-300/30 text-emerald-100 text-[10px] font-extrabold uppercase tracking-wider">
                  Active Request
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    activeRequest.status === "pending"
                      ? "bg-amber-400 text-amber-950"
                      : "bg-emerald-300 text-emerald-950"
                  }`}
                >
                  {activeRequest.status === "pending" ? "Pending Review ⏳" : "Scheduled 🚚"}
                </span>
              </div>

              <h3 className="text-xl font-black tracking-tight text-white mt-1">
                {formatLiters(Number(activeRequest.estimated_liters))} UCO Requested
              </h3>

              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100/90 font-medium pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                  Date: <strong className="text-white">{formatDate(activeRequest.preferred_date)}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-300" />
                  Slot: <strong className="text-white">{activeRequest.preferred_time_slot}</strong>
                </span>
              </div>

              {activeRequest.picker?.profile?.full_name && (
                <p className="text-xs text-emerald-200 font-bold pt-1 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-300" />
                  Assigned Picker: <span className="text-white">{activeRequest.picker.profile.full_name}</span>
                </p>
              )}

              {activeRequest.notes && (
                <p className="text-[11px] text-emerald-100/80 italic pt-0.5 line-clamp-1">
                  &ldquo;{activeRequest.notes}&rdquo;
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-white shadow-inner">
                <Truck className="w-6 h-6 text-white animate-bounce-subtle" />
              </div>

              {activeRequest.status === "pending" && (
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  disabled={cancelling}
                  className="mt-2 text-[10px] font-extrabold text-rose-200 hover:text-white bg-rose-900/40 hover:bg-rose-900/60 px-2.5 py-1 rounded-lg border border-rose-400/30 transition-all cursor-pointer flex items-center gap-1"
                >
                  {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cancel Request"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* MAIN PICKUP REQUEST PROMPT CARD */
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-5 text-white shadow-xl shadow-emerald-700/20 border border-emerald-500/30 flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10 max-w-[70%]">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-300/30 text-emerald-100 text-[10px] font-extrabold uppercase tracking-wider">
              Collection On Demand
            </span>
            <h3 className="text-xl font-black tracking-tight text-white mt-1">Request Oil Pickup</h3>
            <p className="text-xs text-emerald-100/90 font-medium">
              Have accumulated used cooking oil ready? Request a picker pickup directly.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-3 bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              Request Pickup Now
            </button>
          </div>

          <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner text-white flex-shrink-0 z-10">
            <Truck className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* REQUEST PICKUP MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Schedule Oil Pickup</h3>
                  <p className="text-xs text-slate-500 font-medium">Submit your UCO collection details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="space-y-4">
              {/* Estimated Volume */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Estimated Oil Volume (Liters) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={liters}
                    onChange={(e) => setLiters(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 font-black text-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 50"
                  />
                  <span className="absolute right-3.5 top-3 font-extrabold text-xs text-slate-400">Liters</span>
                </div>
                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-2 mt-2">
                  {[20, 50, 100, 200].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setLiters(v)}
                      className={`text-xs font-black py-1 px-3 rounded-lg border transition-all cursor-pointer ${
                        liters === v
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {v}L
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Date & Time Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Preferred Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                    <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                    <option value="Evening (4 PM - 7 PM)">Evening (4 PM - 7 PM)</option>
                    <option value="Anytime">Anytime</option>
                  </select>
                </div>
              </div>

              {/* Special Instructions / Notes */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Location / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Oil cans stored in back room. Ask for Manager Ramesh."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 font-extrabold rounded-xl transition-all border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 text-white" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
