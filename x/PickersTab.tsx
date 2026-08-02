"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, UserCheck, UserX, Info } from "lucide-react";
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
      <div className="card p-5 bg-white border border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-700">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-gray-800">Pickers &amp; Workload</h2>
          <p className="text-xs text-gray-500">See who's stretched thin before deciding to bring on another picker.</p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-sm flex items-start gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          A new picker's login still gets created wherever you manage staff accounts today. Once their account exists and
          shows up in the list below, activate them here — then go to <strong>Zones &amp; Schedules</strong> and use the
          bulk-move tool to shift some stops onto their name.
        </p>
      </div>

      <div className="card bg-white border border-gray-100">
        {loadingList ? (
          <div className="p-10 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : allPickers.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-400 italic">No pickers found yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {allPickers.map((picker) => {
              const workload = computePickerWorkload(picker, dailyAssignments, weekAssignments);
              const zones = routeDefinitions.filter((d) => d.default_picker_id === picker.id);
              return (
                <div key={picker.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm flex items-center gap-2 flex-wrap">
                      {picker.profile?.full_name ?? "Unnamed picker"}
                      {!picker.is_active && <span className="badge badge-gray text-[10px]">Inactive</span>}
                      {picker.is_active && workload.nearCapacity && (
                        <span className="badge badge-yellow text-[10px]">Near capacity</span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {zones.length > 0 ? `Default for: ${zones.map((z) => z.name).join(", ")}` : "Not a default picker for any zone"}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{workload.todayCount}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Today</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{workload.weekCount}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">This week</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide">Capacity/day</label>
                      <input
                        type="number"
                        min={1}
                        className="form-input !py-1 !px-2 text-xs w-16"
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
                      className={`btn btn-sm ${picker.is_active ? "btn-danger" : "btn-primary"} flex items-center gap-1.5`}
                    >
                      {isPending(`picker-active-${picker.id}`) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : picker.is_active ? (
                        <UserX className="w-3.5 h-3.5" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
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
