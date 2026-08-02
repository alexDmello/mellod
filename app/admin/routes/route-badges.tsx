import { Droplet, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { DailyStatus, DueStatus } from "./route-utils";

export function DueBadge({ status }: { status: DueStatus }) {
  let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";

  if (status.code === "overdue" || status.code === "never") {
    badgeStyle = "bg-red-500/10 text-red-600 border-red-200/80 font-bold";
  } else if (status.code === "early_requested") {
    badgeStyle = "bg-blue-500/10 text-blue-600 border-blue-200/80 font-bold";
  } else if (status.code === "due_today") {
    badgeStyle = "bg-amber-500/10 text-amber-600 border-amber-200/80 font-bold";
  } else if (status.code === "due_soon") {
    badgeStyle = "bg-amber-500/10 text-amber-600 border-amber-200/60";
  } else if (status.code === "not_due") {
    badgeStyle = "bg-emerald-500/10 text-emerald-600 border-emerald-200/60";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] tracking-wide border shadow-2xs font-semibold whitespace-nowrap ${badgeStyle}`}
    >
      {status.label}
    </span>
  );
}

export function DailyStatusPill({ status, liters }: { status: DailyStatus; liters: number | null }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-300/60 shadow-2xs whitespace-nowrap">
        <Droplet className="w-3 h-3 text-emerald-500 fill-emerald-500/30" />
        {liters != null ? `${liters}L collected` : "Collected"}
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-300/60 shadow-2xs whitespace-nowrap">
        <XCircle className="w-3 h-3 text-red-500" />
        Skipped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs whitespace-nowrap">
      <Clock className="w-3 h-3 text-slate-400" />
      Assigned
    </span>
  );
}
