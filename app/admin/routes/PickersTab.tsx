"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, UserCheck, UserX, Info, ShieldAlert, Sparkles, Gauge } from "lucide-react";
import type { RoutesData } from "./use-routes-data";
import { DEFAULT_DAILY_CAPACITY, PickerWithCapacity, computePickerWorkload } from "./route-utils";

export default function PickersTab({ data }: { data: RoutesData }) {
  const { dailyAssignments, weekAssignments, routeDefinitions, isPending, togglePickerActive, setPickerCapacity, fetchAllPickers } = data;

  const [allPickers, setAllPickers] = useState<PickerWithCapacity[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  async function refresh() {
    setLoadingList(true);
    try {
      const list = await fetchAllPickers();
      setAllPickers(list);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggle(pickerId: string, next: boolean) {
    if (!next) {
      const zoneNames = routeDefinitions.filter((d) => d.default_picker_id === pickerId).map((d) => d.name);
      if (zoneNames.length > 0) {
        const proceed = window.confirm(
          `${zoneNames.join(", ")} still ${zoneNames.length === 1 ? "has" : "have"} this picker set as default. ` +
            `Deactivating won't reassign ${zoneNames.length === 1 ? "it" : "them"} — you'll want to update the default picker in Zones & Schedules. Deactivate anyway?`
        );
        if (!proceed) return;
      }
    }
    await togglePickerActive(pickerId, next);
    await refresh();
  }

  async function handleCapacity(pickerId: string, capacity: number | null) {
    await setPickerCapacity(pickerId, capacity);
    await refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header Banner with Mesh Gradient and Index Tag */}
      <div className="mesh-gradient-emerald rounded-[2rem] p-6 border border-emerald-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-700">01/02</span>
              <h2 className="font-extrabold text-slate-900 text-lg">Pickers &amp; Workload Fleet</h2>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Monitor daily driver allocation, adjust pickup caps, and optimize field efficiency.
            </p>
          </div>
        </div>

        <span className="text-xs font-extrabold font-mono text-emerald-700 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-300/50">
          {allPickers.filter((p) => p.is_active).length} / {allPickers.length} Active Fleet
        </span>
      </div>

      {/* Info Tip */}
      <div className="p-4 bg-blue-500/10 border border-blue-200/60 text-blue-900 rounded-2xl text-xs font-medium flex items-start gap-3 shadow-2xs font-mono">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Staff credentials and driver accounts are created under <strong>Account Management</strong> settings. Once registered, activate drivers below and assign default zone responsibility in <strong>Zones &amp; Schedules</strong>.
        </p>
      </div>

      {/* Pickers Directory Cards Container */}
      <div className="bg-white/90 backdrop-blur-md rounded-[2rem] border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
        {loadingList ? (
          <div className="p-16 text-center text-slate-400 font-mono">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs font-bold">Fetching field pickers list...</p>
          </div>
        ) : allPickers.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 font-mono italic">No pickers registered in the system yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {allPickers.map((picker, idx) => {
              const workload = computePickerWorkload(picker, dailyAssignments, weekAssignments);
              const zones = routeDefinitions.filter((d) => d.default_picker_id === picker.id);
              const cap = picker.daily_capacity ?? DEFAULT_DAILY_CAPACITY;
              const capPercent = Math.min(100, Math.round((workload.todayCount / cap) * 100));

              return (
                <div key={picker.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50/70 transition-colors">
                  {/* Left: Driver Details */}
                  <div className="space-y-1.5 max-w-sm">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-400">P{String(idx + 1).padStart(2, "0")}</span>
                      <h4 className="font-extrabold text-slate-900 text-base">
                        {picker.profile?.full_name ?? "Unnamed Picker"}
                      </h4>
                      {!picker.is_active && (
                        <span className="px-3 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                      {picker.is_active && workload.nearCapacity && (
                        <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold font-mono bg-amber-500/10 text-amber-700 border border-amber-300/50 flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-amber-500" />
                          Near Capacity
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono font-medium text-slate-500">
                      {zones.length > 0
                        ? `Default zone driver for: ${zones.map((z) => z.name).join(", ")}`
                        : "No default zones assigned"}
                    </p>
                  </div>

                  {/* Center: Workload Capacity Bar */}
                  {picker.is_active && (
                    <div className="flex-1 max-w-xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold font-mono">
                        <span className="text-slate-500">Today's Load</span>
                        <span className={capPercent >= 90 ? "text-red-600" : capPercent >= 75 ? "text-amber-600" : "text-emerald-600"}>
                          {workload.todayCount} / {cap} stops ({capPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            capPercent >= 90
                              ? "bg-red-500"
                              : capPercent >= 75
                              ? "bg-amber-500"
                              : "bg-gradient-to-r from-emerald-500 to-teal-500"
                          }`}
                          style={{ width: `${capPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Right: Controls */}
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-center bg-slate-50/80 border border-slate-200/80 rounded-2xl px-4 py-2 font-mono">
                      <p className="text-xl font-black text-slate-900">{workload.todayCount}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</p>
                    </div>
                    <div className="text-center bg-slate-50/80 border border-slate-200/80 rounded-2xl px-4 py-2 font-mono">
                      <p className="text-xl font-black text-slate-900">{workload.weekCount}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Week</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wide">Daily Cap</label>
                      <input
                        type="number"
                        min={1}
                        className="w-16 text-xs font-bold font-mono bg-white border border-slate-300 rounded-full px-3 py-1.5 text-slate-900 text-center focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        defaultValue={picker.daily_capacity ?? DEFAULT_DAILY_CAPACITY}
                        onBlur={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          handleCapacity(picker.id, val);
                        }}
                      />
                    </div>

                    <button
                      onClick={() => handleToggle(picker.id, !picker.is_active)}
                      disabled={isPending(`picker-active-${picker.id}`)}
                      className={`px-5 py-2 rounded-full text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-2xs ${
                        picker.is_active
                          ? "bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-300/50"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                      }`}
                    >
                      {isPending(`picker-active-${picker.id}`) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : picker.is_active ? (
                        <UserX className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      {picker.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
