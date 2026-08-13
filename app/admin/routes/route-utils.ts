// route-utils.ts
//
// Pure, framework-free logic for the Routes Management feature.
// No React, no Supabase calls here — just types + math, so this stays easy
// to unit test and reuse.

import type { FBO, Picker, Profile } from "@/lib/types";

export interface ScheduledFBO extends FBO {
  /** How often this restaurant should be visited. Null = not configured yet. */
  collection_frequency_days: number | null;
  /** Date (YYYY-MM-DD) oil was last picked up. Null = never collected. */
  last_collected_at: string | null;
  /** Set when the FBO taps "request early pickup" in the WhatsApp bot. */
  early_pickup_requested_at: string | null;
}

export interface PickerWithCapacity extends Picker {
  profile: Profile;
  /** Soft daily stop limit used only to flag "near capacity" in the UI. */
  daily_capacity: number | null;
}

export interface RouteDefinition {
  id: string;
  name: string;
  default_picker_id: string | null;
  zone_id: string | null;
  description: string | null;
}

export interface RouteStop {
  id: string;
  route_definition_id: string;
  fbo_id: string;
  sort_order: number;
}

export function buildFbosById(fbos: ScheduledFBO[]): Map<string, ScheduledFBO> {
  return new Map(fbos.map((f) => [f.id, f]));
}

export type DailyStatus = "assigned" | "completed" | "skipped";

export interface DailyRouteAssignment {
  id: string;
  picker_id: string;
  fbo_id: string;
  route_date: string;
  sort_order: number;
  status: DailyStatus;
  collected_liters: number | null;
  completed_at: string | null;
}

export const FREQUENCY_PRESETS: { label: string; days: number | null }[] = [
  { label: "Not set", days: null },
  { label: "Weekly", days: 7 },
  { label: "Twice a month", days: 15 },
  { label: "Monthly", days: 30 },
  { label: "Every 45 days", days: 45 },
];

export const DEFAULT_DAILY_CAPACITY = 20;
const DUE_SOON_WINDOW_DAYS = 2;

export function diffDays(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00");
  const to = new Date(toISO + "T00:00:00");
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type DueCode =
  | "early_requested"
  | "never"
  | "overdue"
  | "due_today"
  | "due_soon"
  | "not_due"
  | "unscheduled";

export interface DueStatus {
  code: DueCode;
  label: string;
  badgeClass: string;
  priority: number;
  daysSinceLast: number | null;
  daysUntilDue: number | null;
}

export function getDueStatus(fbo: ScheduledFBO, todayISO: string): DueStatus {
  if (fbo.early_pickup_requested_at) {
    return {
      code: "early_requested",
      label: "Requested pickup",
      badgeClass: "badge-blue",
      priority: 0,
      daysSinceLast: fbo.last_collected_at ? diffDays(fbo.last_collected_at, todayISO) : null,
      daysUntilDue: null,
    };
  }

  if (!fbo.collection_frequency_days) {
    return {
      code: "unscheduled",
      label: "No schedule set",
      badgeClass: "badge-gray",
      priority: 6,
      daysSinceLast: fbo.last_collected_at ? diffDays(fbo.last_collected_at, todayISO) : null,
      daysUntilDue: null,
    };
  }

  if (!fbo.last_collected_at) {
    return {
      code: "never",
      label: "Never collected",
      badgeClass: "badge-red",
      priority: 1,
      daysSinceLast: null,
      daysUntilDue: null,
    };
  }

  const daysSinceLast = diffDays(fbo.last_collected_at, todayISO);
  const daysUntilDue = fbo.collection_frequency_days - daysSinceLast;

  if (daysUntilDue < 0) {
    return {
      code: "overdue",
      label: `Overdue ${Math.abs(daysUntilDue)}d`,
      badgeClass: "badge-red",
      priority: 2,
      daysSinceLast,
      daysUntilDue,
    };
  }
  if (daysUntilDue === 0) {
    return {
      code: "due_today",
      label: "Due today",
      badgeClass: "badge-yellow",
      priority: 3,
      daysSinceLast,
      daysUntilDue,
    };
  }
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) {
    return {
      code: "due_soon",
      label: `Due in ${daysUntilDue}d`,
      badgeClass: "badge-yellow",
      priority: 4,
      daysSinceLast,
      daysUntilDue,
    };
  }
  return {
    code: "not_due",
    label: `Due in ${daysUntilDue}d`,
    badgeClass: "badge-gray",
    priority: 5,
    daysSinceLast,
    daysUntilDue,
  };
}

export function shouldAutoInclude(code: DueCode): boolean {
  return code === "early_requested" || code === "never" || code === "overdue" || code === "due_today" || code === "due_soon";
}

export function sortStopsByUrgency<T extends { fbo: ScheduledFBO }>(stops: T[], todayISO: string): T[] {
  return [...stops].sort((a, b) => getDueStatus(a.fbo, todayISO).priority - getDueStatus(b.fbo, todayISO).priority);
}

export interface PickerWorkload {
  picker: PickerWithCapacity;
  todayCount: number;
  weekCount: number;
  capacity: number;
  nearCapacity: boolean;
}

export function computePickerWorkload(
  picker: PickerWithCapacity,
  todayAssignments: DailyRouteAssignment[],
  weekAssignments: DailyRouteAssignment[]
): PickerWorkload {
  const capacity = picker.daily_capacity ?? DEFAULT_DAILY_CAPACITY;
  const todayCount = todayAssignments.filter((a) => a.picker_id === picker.id).length;
  const weekCount = weekAssignments.filter((a) => a.picker_id === picker.id).length;
  return {
    picker,
    todayCount,
    weekCount,
    capacity,
    nearCapacity: todayCount >= capacity,
  };
}

export function weekRangeContaining(dateISO: string): { start: string; end: string } {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addDays(dateISO, mondayOffset);
  const end = addDays(start, 6);
  return { start, end };
}
