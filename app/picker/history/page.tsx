export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, formatLiters } from "@/lib/utils";
import { Droplets, History } from "lucide-react";
import PickerHeader from "@/components/PickerHeader";

export default async function PickerHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: picker } = await supabase
    .from("pickers")
    .select("id")
    .eq("profile_id", user?.id ?? "")
    .single();

  const { data: pickups } = await supabase
    .from("pickups")
    .select("*, fbo:fbos(business_name, address)")
    .eq("picker_id", picker?.id ?? "")
    .order("picked_up_at", { ascending: false })
    .limit(50);

  const totalLiters = (pickups ?? []).reduce((s, p) => s + Number(p.liters), 0);

  return (
    <div className="animate-fade-in space-y-5 pb-8 font-sans text-slate-900">
      {/* Unified Top Bar & History Header */}
      <PickerHeader subtitle="Field Agent App">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-300/40 text-emerald-100 text-[10px] font-extrabold uppercase tracking-wider">
            Collection History Log
          </span>
          <h1 className="text-white text-xl font-black tracking-tight mt-1 drop-shadow-sm">My Collection Records</h1>
          <p className="text-emerald-100/90 text-xs font-semibold">All logged oil collections and verified pickups</p>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/20">
            <div className="bg-white/12 backdrop-blur-md rounded-2xl p-3.5 border border-white/20">
              <p className="text-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">Total Volume</p>
              <p className="text-white font-black text-xl mt-0.5">{formatLiters(totalLiters)}</p>
            </div>
            <div className="bg-white/12 backdrop-blur-md rounded-2xl p-3.5 border border-white/20">
              <p className="text-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">Total Stops Logged</p>
              <p className="text-white font-black text-xl mt-0.5">{(pickups ?? []).length} Pickups</p>
            </div>
          </div>
        </div>
      </PickerHeader>

      <div className="px-4 -mt-6 relative z-10 space-y-3">
        {(pickups ?? []).length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-xl shadow-slate-200/60 space-y-2">
            <History className="w-12 h-12 text-emerald-600/50 mx-auto" />
            <p className="font-bold text-slate-800 text-sm">No Collection Logs Yet</p>
            <p className="text-xs text-slate-500 font-medium">Completed pickups logged on your daily routes will appear here.</p>
          </div>
        ) : (
          (pickups ?? []).map((pickup: any) => (
            <div
              key={pickup.id}
              className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all flex items-center justify-between gap-3"
            >
              <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-emerald-100">
                <Droplets className="w-5.5 h-5.5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 text-sm truncate">{pickup.fbo?.business_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {formatDate(pickup.picked_up_at)} · {formatTime(pickup.picked_up_at)}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      pickup.status === "completed"
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        : "bg-amber-100 text-amber-900 border border-amber-200"
                    }`}
                  >
                    {pickup.status === "completed" ? "Verified ✓" : "Pending ⏳"}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-slate-900">{formatLiters(Number(pickup.liters))}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
