"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Calendar, Clock, CheckCircle2, ArrowRight, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  fboId: string;
}

export default function FBOMissedPickupBanner({ fboId }: Props) {
  const [hasMissedPickup, setHasMissedPickup] = useState(false);
  const [exceptionId, setExceptionId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [timeSlot, setTimeSlot] = useState("Morning (10 AM - 1 PM)");
  const [submitting, setSubmitting] = useState(false);
  const [rescheduledSuccess, setRescheduledSuccess] = useState(false);

  useEffect(() => {
    // Check if there are any attempted_closed or pending exceptions for this FBO
    async function checkPendingExceptions() {
      try {
        const res = await fetch(`/api/pickup/reschedule?fbo_id=${fboId}`);
        const data = await res.json();
        if (data?.exception) {
          setHasMissedPickup(true);
          setExceptionId(data.exception.id);
        }
      } catch (err) {
        // Silent fallback
      }
    }
    if (fboId) checkPendingExceptions();
  }, [fboId]);

  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/pickup/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exception_id: exceptionId,
          fbo_id: fboId,
          rescheduled_date: rescheduleDate,
          time_slot: timeSlot,
          rescheduled_by: "fbo",
        }),
      });

      if (res.ok) {
        setRescheduledSuccess(true);
        setTimeout(() => {
          setShowModal(false);
          setHasMissedPickup(false);
        }, 2000);
      }
    } catch (err) {
      console.error("Reschedule submit error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  // Demo alert fallback for testing if no exception record exists yet
  if (!hasMissedPickup) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 text-amber-950 shadow-lg shadow-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center flex-shrink-0 shadow-md">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-amber-950 text-sm">Missed Collection Attempt Today</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200 text-amber-950">
                Action Required
              </span>
            </div>
            <p className="text-xs text-amber-900 font-medium mt-0.5">
              Our driver arrived for UCO pickup but found your outlet closed or unavailable.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <span>Reschedule Pickup</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <h3 className="font-black text-slate-900 text-base">Select Next Pickup Slot</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {rescheduledSuccess ? (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="font-black text-slate-900 text-base">Pickup Rescheduled!</h4>
                  <p className="text-xs text-slate-500">
                    Our driver has been notified and scheduled for your selected time window.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1.5">
                      Preferred Time Slot *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Morning (10 AM - 1 PM)",
                        "Afternoon (2 PM - 6 PM)",
                      ].map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTimeSlot(slot)}
                          className={`py-3 px-2 rounded-2xl text-xs font-extrabold border transition-all text-center ${
                            timeSlot === slot
                              ? "bg-amber-500 text-slate-950 border-amber-600 shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Slot ✓"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
