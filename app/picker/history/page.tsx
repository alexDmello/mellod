export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, formatLiters } from "@/lib/utils";
import { Droplets, History } from "lucide-react";

export default async function PickerHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: picker } = await supabase
    .from("pickers")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: pickups } = await supabase
    .from("pickups")
    .select("*, fbo:fbos(business_name)")
    .eq("picker_id", picker?.id ?? "")
    .order("picked_up_at", { ascending: false })
    .limit(50);

  const totalLiters = (pickups ?? []).reduce((s, p) => s + Number(p.liters), 0);

  return (
    <div className="animate-fade-in">
      <div className="bg-green-700 px-4 py-5">
        <h1 className="text-white text-xl font-bold">My History</h1>
        <p className="text-green-200 text-sm mt-0.5">All your completed pickups</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-green-200 text-xs">Total Collected</p>
            <p className="text-white font-bold text-lg">{formatLiters(totalLiters)}</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-green-200 text-xs">Total Stops</p>
            <p className="text-white font-bold text-lg">{(pickups ?? []).length}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {(pickups ?? []).length === 0 ? (
          <div className="card p-10 text-center mt-4">
            <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No pickups yet</p>
          </div>
        ) : (
          (pickups ?? []).map((pickup: any) => (
            <div key={pickup.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Droplets className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{pickup.fbo?.business_name}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(pickup.picked_up_at)} · {formatTime(pickup.picked_up_at)}
                </p>
              </div>
              <div className="text-right flex-shrink-0 animate-fade-in">
                <p className="text-sm font-bold text-gray-800">{formatLiters(Number(pickup.liters))}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
