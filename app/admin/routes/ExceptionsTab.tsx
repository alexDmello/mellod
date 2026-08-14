"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Phone, Calendar, CheckCircle2, MapPin, Camera, RefreshCw, Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ExceptionsTab() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedException, setSelectedException] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("Morning (10 AM - 1 PM)");
  const [actionPending, setActionPending] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchExceptions();
  }, []);

  async function fetchExceptions() {
    setLoading(true);
    try {
      const { data: excData } = await supabase
        .from("pickup_exceptions")
        .select(`
          *,
          fbo:fbos(business_name, address, phone, contact_person),
          picker:pickers(profile_id, profiles(full_name, phone))
        `)
        .order("created_at", { ascending: false });

      if (excData && excData.length > 0) {
        setExceptions(excData);
      } else {
        // Fallback: search pickups table for attempted_closed status
        const { data: attemptedPickups } = await supabase
          .from("pickups")
          .select(`
            *,
            fbo:fbos(business_name, address, phone, contact_person),
            picker:pickers(profile_id, profiles(full_name, phone))
          `)
          .eq("status", "attempted_closed")
          .order("created_at", { ascending: false });

        setExceptions(attemptedPickups || []);
      }
    } catch (err) {
      console.error("Error fetching exceptions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedException || !rescheduleDate) return;

    setActionPending(true);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/pickup/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exception_id: selectedException.id,
          fbo_id: selectedException.fbo_id,
          rescheduled_date: rescheduleDate,
          time_slot: rescheduleSlot,
          rescheduled_by: "admin",
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setActionSuccess(`Successfully rescheduled ${selectedException.fbo?.business_name || "FBO"} for ${rescheduleDate}!`);
        fetchExceptions();
        setTimeout(() => setSelectedException(null), 1500);
      }
    } catch (err) {
      console.error("Reschedule error:", err);
    } finally {
      setActionPending(false);
    }
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Closed Outlets &amp; Pickup Exception Queue
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Audit missed collection attempts, geotagged evidence, and trigger manual dispatch rescheduling.
          </p>
        </div>
        <button
          onClick={fetchExceptions}
          className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-sm cursor-pointer"
          title="Refresh Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Loading exception reports...</span>
        </div>
      ) : exceptions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-extrabold text-slate-900 text-sm">Zero Closed Outlet Exceptions</h3>
          <p className="text-xs text-slate-400 font-medium">All driver routes are executing smoothly with no missed pickups reported today.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exceptions.map((exc) => {
            const fboName = exc.fbo?.business_name || "Unknown FBO";
            const pickerName = exc.picker?.profiles?.full_name || "Field Agent";
            const fboPhone = exc.fbo?.phone ? `tel:${exc.fbo.phone.replace(/[^0-9+]/g, "")}` : null;

            return (
              <div
                key={exc.id}
                className="bg-white rounded-3xl p-5 border border-amber-200/80 shadow-lg shadow-amber-500/5 space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                      {exc.status || "Attempted Closed"}
                    </span>
                    <h3 className="font-black text-slate-900 text-sm mt-1.5">{fboName}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1 font-medium">{exc.fbo?.address}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700 font-bold">
                    <span>Reason:</span>
                    <span className="text-amber-900 font-black">{exc.reason || "Outlet Closed"}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Field Driver:</span>
                    <span className="font-bold text-slate-800">{pickerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Reported At:</span>
                    <span className="font-bold text-slate-800">
                      {new Date(exc.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {exc.photo_url && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={exc.photo_url} alt="Proof of closure" className="w-full h-32 object-cover" />
                  </div>
                )}

                <div className="flex gap-2">
                  {fboPhone ? (
                    <a
                      href={fboPhone}
                      className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Call FBO</span>
                    </a>
                  ) : (
                    <button disabled className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-100 text-slate-400 text-xs font-bold">
                      No Phone
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedException(exc);
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setRescheduleDate(tomorrow.toISOString().split("T")[0]);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Reschedule</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Reschedule Modal */}
      {selectedException && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Admin Manual Reschedule</h3>
                <p className="text-xs text-slate-400 font-bold">{selectedException.fbo?.business_name}</p>
              </div>
              <button onClick={() => setSelectedException(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                ✕
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl">
                ✓ {actionSuccess}
              </div>
            )}

            <form onSubmit={handleAdminReschedule} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Target Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Target Time Slot</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900"
                >
                  <option value="Morning (10 AM - 1 PM)">Morning (10 AM - 1 PM)</option>
                  <option value="Afternoon (2 PM - 6 PM)">Afternoon (2 PM - 6 PM)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedException(null)}
                  className="flex-1 py-3 rounded-2xl border text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5"
                >
                  {actionPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule Dispatch ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
