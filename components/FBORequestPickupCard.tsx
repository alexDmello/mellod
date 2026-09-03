"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatLiters, formatDate } from "@/lib/utils";
import {
  Truck,
  AlertCircle,
  Plus,
  CheckCircle2,
  Loader2,
  X,
  Navigation,
  Clock,
  UserCheck,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import type { PickupRequest } from "@/lib/types";

interface FBORequestPickupCardProps {
  fboId: string;
}

export default function FBORequestPickupCard({ fboId }: FBORequestPickupCardProps) {
  const [activeRequest, setActiveRequest] = useState<PickupRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchActiveRequest();

    // Supabase Realtime channel for instant sync across Admin, Picker & FBO
    const channel = supabase
      .channel(`fbo_pickup_req_${fboId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pickup_requests",
          filter: `fbo_id=eq.${fboId}`,
        },
        () => {
          fetchActiveRequest();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fboId]);

  async function fetchActiveRequest() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pickup_requests")
        .select("*, picker:pickers(*, profile:profiles(*))")
        .eq("fbo_id", fboId)
        .in("status", ["pending", "scheduled", "assigned", "in_transit", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        // If request was completed over 1 hour ago, auto-reset to clean request prompt state
        if (data.status === "completed") {
          const completedTime = new Date(data.updated_at || data.created_at).getTime();
          if (Date.now() - completedTime > 60 * 60 * 1000) {
            setActiveRequest(null);
            return;
          }
        }
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

  async function handleConfirmRequest() {
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const todayDate = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("pickup_requests")
        .insert({
          fbo_id: fboId,
          estimated_liters: 50, // default placeholder batch size
          preferred_date: todayDate,
          preferred_time_slot: "As soon as possible",
          notes: "On-demand direct pickup request",
          status: "pending",
        })
        .select("*, picker:pickers(*, profile:profiles(*))")
        .single();

      if (error) throw error;

      setActiveRequest(data as PickupRequest);
      setSuccessMsg("Pickup requested! A picker will be assigned shortly.");
      setShowConfirmModal(false);
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

  function handleAcknowledgeCompleted() {
    setActiveRequest(null);
    setSuccessMsg(null);
  }

  // Calculate current progress stage
  const getStageInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          step: 1,
          pct: 25,
          badge: "Request Received ⏳",
          badgeColor: "bg-amber-400 text-amber-950",
          title: "Waiting for Picker Assignment",
          subtitle: "Your request is registered! Mellod Admin is assigning a nearby picker.",
        };
      case "scheduled":
      case "assigned":
        return {
          step: 2,
          pct: 50,
          badge: "Picker Assigned 🚚",
          badgeColor: "bg-blue-400 text-blue-950",
          title: "Picker Assigned & Scheduled",
          subtitle: activeRequest?.picker?.profile?.full_name
            ? `Picker ${activeRequest.picker.profile.full_name} ${
                activeRequest.picker.vehicle_info ? `(${activeRequest.picker.vehicle_info})` : ""
              } has been assigned.`
            : "A picker has been assigned to collect your UCO.",
        };
      case "in_transit":
        return {
          step: 3,
          pct: 75,
          badge: "Picker On The Way 📍",
          badgeColor: "bg-emerald-400 text-emerald-950 animate-pulse",
          title: "Picker is En-Route to Your Outlet",
          subtitle: activeRequest?.picker?.profile?.full_name
            ? `${activeRequest.picker.profile.full_name} is navigating to your address right now.`
            : "Your assigned picker is currently on the way!",
        };
      case "completed":
        return {
          step: 4,
          pct: 100,
          badge: "Pickup Completed 🎉",
          badgeColor: "bg-emerald-500 text-white font-black",
          title: "Collection Successfully Completed",
          subtitle: "Your Used Cooking Oil (UCO) was collected by our team.",
        };
      default:
        return {
          step: 1,
          pct: 25,
          badge: "Pending ⏳",
          badgeColor: "bg-amber-400 text-amber-950",
          title: "Processing Request",
          subtitle: "Mellod Admin is reviewing your pickup request.",
        };
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading && !activeRequest ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-md text-center space-y-2">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Checking active pickup requests...</p>
        </div>
      ) : activeRequest ? (
        /* REALTIME DYNAMIC PROGRESS STEPPER WIDGET */
        (() => {
          const stage = getStageInfo(activeRequest.status);

          return (
            <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-500/30 relative overflow-hidden space-y-5">
              {/* Top Row: Live Sync Header & Status Badge */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                    Live Logistics Tracker
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm ${stage.badgeColor}`}>
                    {stage.badge}
                  </span>
                  <button
                    onClick={fetchActiveRequest}
                    className="p-1 text-emerald-200 hover:text-white transition-colors"
                    title="Refresh status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Stepper Visual Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-100">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-emerald-300" />
                    Pickup Lifecycle
                  </span>
                  <span>{stage.pct}% Progress</span>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full bg-slate-950/60 rounded-full h-3 p-0.5 border border-white/20 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 h-full rounded-full transition-all duration-700 ease-out shadow-md"
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>

                {/* 4 Step Markers */}
                <div className="grid grid-cols-4 gap-1 pt-1 text-center">
                  {[
                    { num: 1, label: "Request", stepNum: 1, icon: Clock },
                    { num: 2, label: "Assigned", stepNum: 2, icon: UserCheck },
                    { num: 3, label: "On The Way", stepNum: 3, icon: Navigation },
                    { num: 4, label: "Completed", stepNum: 4, icon: CheckCircle2 },
                  ].map((s) => {
                    const isPassed = stage.step >= s.stepNum;
                    const isCurrent = stage.step === s.stepNum;
                    const IconComp = s.icon;

                    return (
                      <div key={s.num} className="flex flex-col items-center gap-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                            isCurrent
                              ? "bg-white text-emerald-950 ring-4 ring-emerald-400/40 shadow-lg scale-110"
                              : isPassed
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-white/10 text-emerald-300/60 border border-white/10"
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className={`text-[9px] font-bold ${
                            isCurrent ? "text-white font-black" : isPassed ? "text-emerald-200" : "text-emerald-300/50"
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Info Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2">
                <h4 className="font-black text-white text-base tracking-tight flex items-center gap-2">
                  {stage.title}
                </h4>
                <p className="text-xs text-emerald-100/90 font-medium leading-relaxed">
                  {stage.subtitle}
                </p>

                {/* Driver / Picker Detail Bar if Assigned */}
                {activeRequest.picker?.profile?.full_name && (
                  <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                        👨‍🌾
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-emerald-300 block leading-none">
                          Assigned Picker
                        </span>
                        <span className="font-black text-white mt-0.5 block">
                          {activeRequest.picker.profile.full_name}
                        </span>
                      </div>
                    </div>

                    {activeRequest.picker.vehicle_info && (
                      <span className="text-[11px] font-mono font-bold bg-white/15 px-2.5 py-1 rounded-lg border border-white/20 text-emerald-100">
                        {activeRequest.picker.vehicle_info}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-emerald-300/80 font-bold">
                  Requested: {formatDate(activeRequest.created_at)}
                </span>

                {activeRequest.status === "pending" ? (
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    disabled={cancelling}
                    className="text-xs font-bold text-rose-200 hover:text-white bg-rose-900/50 hover:bg-rose-900/80 px-3 py-1.5 rounded-xl border border-rose-400/30 transition-all cursor-pointer flex items-center gap-1"
                  >
                    {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cancel Request"}
                  </button>
                ) : activeRequest.status === "completed" ? (
                  <button
                    type="button"
                    onClick={handleAcknowledgeCompleted}
                    className="bg-white text-emerald-950 hover:bg-emerald-50 font-black text-xs px-4 py-2 rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Done &amp; Request Again
                  </button>
                ) : null}
              </div>
            </div>
          );
        })()
      ) : (
        /* MAIN 1-CLICK PICKUP REQUEST PROMPT CARD */
        <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-900 rounded-3xl p-6 text-white shadow-2xl border border-emerald-500/30 flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10 max-w-[70%]">
            <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-emerald-100 text-[10px] font-black uppercase tracking-wider">
              Collection On Demand
            </span>
            <h3 className="text-xl font-black tracking-tight text-white mt-1">Request Oil Pickup</h3>
            <p className="text-xs text-emerald-100/90 font-medium leading-relaxed">
              Have accumulated Used Cooking Oil ready? Request a picker pickup with 1-click.
            </p>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="mt-3 bg-white text-emerald-950 hover:bg-emerald-50 font-black text-xs px-4 py-2.5 rounded-xl shadow-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
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

      {/* 1-CLICK CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Confirm Oil Pickup</h3>
                  <p className="text-xs text-slate-500 font-medium">Mellod On-Demand Dispatch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
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

            <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl space-y-2 text-center">
              <Sparkles className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-black text-slate-900 text-sm">
                Request UCO Pickup for Your Outlet?
              </p>
              <p className="text-xs text-slate-600 font-medium">
                Mellod Admin will be notified immediately and a picker will be assigned to collect your Used Cooking Oil.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 font-extrabold rounded-xl transition-all border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRequest}
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
                    Yes, Request Pickup
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

