import { Droplet } from "lucide-react";
import type { DailyStatus, DueStatus } from "./route-utils";

export function DueBadge({ status }: { status: DueStatus }) {
  return <span className={`badge ${status.badgeClass} text-[10px] whitespace-nowrap`}>{status.label}</span>;
}

export function DailyStatusPill({ status, liters }: { status: DailyStatus; liters: number | null }) {
  if (status === "completed") {
    return (
      <span className="badge badge-green text-[10px] flex items-center gap-1 whitespace-nowrap">
        <Droplet className="w-3 h-3" />
        {liters != null ? `${liters}L collected` : "Collected"}
      </span>
    );
  }
  if (status === "skipped") {
    return <span className="badge badge-red text-[10px] whitespace-nowrap">Skipped</span>;
  }
  return <span className="badge badge-gray text-[10px] whitespace-nowrap">Assigned</span>;
}
