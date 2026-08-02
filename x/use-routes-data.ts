// use-routes-data.ts
//
// All Supabase reads/writes for Routes Management live here, so the tab
// components below stay declarative (they call a function and render state,
// they never touch `supabase` directly). Mirrors the original file's
// "mutate then refetch" pattern rather than optimistic updates — simpler to
// reason about correctly at solo-operator scale, and it's the pattern this
// codebase already uses elsewhere.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils";
import {
  DailyRouteAssignment,
  PickerWithCapacity,
  RouteDefinition,
  RouteStop,
  ScheduledFBO,
  weekRangeContaining,
} from "./route-utils";

export type RoutesData = ReturnType<typeof useRoutesData>;

export function useRoutesData() {
  const supabase = useMemo(() => createClient(), []);

  const [pickers, setPickers] = useState<PickerWithCapacity[]>([]);
  const [fbos, setFbos] = useState<ScheduledFBO[]>([]);
  const [routeDefinitions, setRouteDefinitions] = useState<RouteDefinition[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [dailyAssignments, setDailyAssignments] = useState<DailyRouteAssignment[]>([]);
  const [weekAssignments, setWeekAssignments] = useState<DailyRouteAssignment[]>([]);

  const [selectedDate, setSelectedDate] = useState(todayISO());

  const [fetching, setFetching] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function triggerSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  function isPending(key: string) {
    return pendingIds.has(key);
  }

  /** Runs `fn`, tracking `key` in pendingIds so only the relevant row/card
   *  shows a spinner instead of freezing the whole board. */
  async function withPending(key: string, fn: () => Promise<void>) {
    setPendingIds((prev) => new Set(prev).add(key));
    setErrorMessage(null);
    try {
      await fn();
    } catch (e: any) {
      setErrorMessage(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  // ---------------------------------------------------------------------
  // Fetchers
  // ---------------------------------------------------------------------

  const fetchPickers = useCallback(async () => {
    const { data, error } = await supabase
      .from("pickers")
      .select("*, profile:profiles(*)")
      .eq("is_active", true);
    if (error) throw error;
    setPickers((data as PickerWithCapacity[]) ?? []);
  }, [supabase]);

  const fetchAllPickers = useCallback(async () => {
    // Used by the Pickers tab, which also needs to show inactive pickers
    // (so someone can be reactivated instead of duplicated).
    const { data, error } = await supabase.from("pickers").select("*, profile:profiles(*)");
    if (error) throw error;
    return (data as PickerWithCapacity[]) ?? [];
  }, [supabase]);

  const fetchFbos = useCallback(async () => {
    const { data, error } = await supabase
      .from("fbos")
      .select("*")
      .eq("is_active", true)
      .order("business_name");
    if (error) throw error;
    setFbos((data as ScheduledFBO[]) ?? []);
  }, [supabase]);

  const fetchRouteDefinitions = useCallback(async () => {
    const { data, error } = await supabase.from("route_definitions").select("*").order("name");
    if (error) throw error;
    setRouteDefinitions((data as RouteDefinition[]) ?? []);
    return (data as RouteDefinition[]) ?? [];
  }, [supabase]);

  const fetchRouteStops = useCallback(async () => {
    const { data, error } = await supabase.from("route_stops").select("*").order("sort_order");
    if (error) throw error;
    setRouteStops((data as RouteStop[]) ?? []);
  }, [supabase]);

  const fetchBaseData = useCallback(async () => {
    setFetching(true);
    try {
      await Promise.all([fetchPickers(), fetchFbos(), fetchRouteDefinitions(), fetchRouteStops()]);
    } catch (e: any) {
      setErrorMessage(e?.message ?? "Error loading routes data.");
    } finally {
      setFetching(false);
    }
  }, [fetchPickers, fetchFbos, fetchRouteDefinitions, fetchRouteStops]);

  const fetchDailyAssignments = useCallback(
    async (date: string) => {
      const { data, error } = await supabase.from("routes").select("*").eq("route_date", date);
      if (error) throw error;
      setDailyAssignments((data as DailyRouteAssignment[]) ?? []);
    },
    [supabase]
  );

  const fetchWeekAssignments = useCallback(
    async (date: string) => {
      const { start, end } = weekRangeContaining(date);
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .gte("route_date", start)
        .lte("route_date", end);
      if (error) throw error;
      setWeekAssignments((data as DailyRouteAssignment[]) ?? []);
    },
    [supabase]
  );

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  useEffect(() => {
    fetchDailyAssignments(selectedDate).catch((e) => setErrorMessage(e?.message ?? "Error loading today's board."));
    fetchWeekAssignments(selectedDate).catch(() => {
      /* non-critical: only powers the workload strip, fail quietly */
    });
  }, [selectedDate, fetchDailyAssignments, fetchWeekAssignments]);

  const refreshDay = useCallback(async () => {
    await Promise.all([fetchDailyAssignments(selectedDate), fetchWeekAssignments(selectedDate)]);
  }, [selectedDate, fetchDailyAssignments, fetchWeekAssignments]);

  // ---------------------------------------------------------------------
  // Zone / template operations
  // ---------------------------------------------------------------------

  async function createTemplate(name: string, defaultPickerId: string): Promise<RouteDefinition | null> {
    let created: RouteDefinition | null = null;
    await withPending("create-template", async () => {
      const { data, error } = await supabase
        .from("route_definitions")
        .insert({ name: name.trim(), default_picker_id: defaultPickerId || null })
        .select()
        .single();
      if (error) throw error;
      created = data as RouteDefinition;
      triggerSuccess(`Zone "${name}" created.`);
      await fetchRouteDefinitions();
    });
    return created;
  }

  async function deleteTemplate(id: string, name: string) {
    await withPending(`delete-template-${id}`, async () => {
      const { error } = await supabase.from("route_definitions").delete().eq("id", id);
      if (error) throw error;
      triggerSuccess(`Zone "${name}" deleted.`);
      await Promise.all([fetchRouteDefinitions(), fetchRouteStops()]);
    });
  }

  async function addStop(templateId: string, fboId: string) {
    await withPending("add-stop", async () => {
      const stopsInTemplate = routeStops.filter((s) => s.route_definition_id === templateId);
      const { error } = await supabase.from("route_stops").insert({
        route_definition_id: templateId,
        fbo_id: fboId,
        sort_order: stopsInTemplate.length,
      });
      if (error) throw error;
      triggerSuccess("Stop added to zone.");
      await fetchRouteStops();
    });
  }

  async function removeStop(stopId: string) {
    await withPending(`remove-stop-${stopId}`, async () => {
      const { error } = await supabase.from("route_stops").delete().eq("id", stopId);
      if (error) throw error;
      triggerSuccess("Stop removed.");
      await fetchRouteStops();
    });
  }

  async function moveStop(templateId: string, stopId: string, direction: "up" | "down") {
    await withPending(`reorder-${stopId}`, async () => {
      const activeStops = [...routeStops.filter((s) => s.route_definition_id === templateId)].sort(
        (a, b) => a.sort_order - b.sort_order
      );
      const index = activeStops.findIndex((s) => s.id === stopId);
      if (index === -1) return;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= activeStops.length) return;

      const itemA = activeStops[index];
      const itemB = activeStops[swapIndex];
      const [orderA, orderB] = [itemA.sort_order, itemB.sort_order];

      const [resA, resB] = await Promise.all([
        supabase.from("route_stops").update({ sort_order: orderB }).eq("id", itemA.id),
        supabase.from("route_stops").update({ sort_order: orderA }).eq("id", itemB.id),
      ]);
      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;
      await fetchRouteStops();
    });
  }

  /** Moves selected stops into another (existing) zone, appended to its end. */
  async function bulkMoveStops(stopIds: string[], destinationTemplateId: string, destinationName: string) {
    await withPending("bulk-move", async () => {
      const destStops = routeStops.filter((s) => s.route_definition_id === destinationTemplateId);
      let nextOrder = destStops.length;
      const updates = stopIds.map((id) =>
        supabase
          .from("route_stops")
          .update({ route_definition_id: destinationTemplateId, sort_order: nextOrder++ })
          .eq("id", id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      triggerSuccess(`Moved ${stopIds.length} stop${stopIds.length === 1 ? "" : "s"} to "${destinationName}".`);
      await fetchRouteStops();
    });
  }

  async function setDefaultPicker(templateId: string, pickerId: string) {
    await withPending(`default-picker-${templateId}`, async () => {
      const { error } = await supabase
        .from("route_definitions")
        .update({ default_picker_id: pickerId || null })
        .eq("id", templateId);
      if (error) throw error;
      triggerSuccess("Default picker updated.");
      await fetchRouteDefinitions();
    });
  }

  async function setFboFrequency(fboId: string, days: number | null) {
    await withPending(`frequency-${fboId}`, async () => {
      const { error } = await supabase
        .from("fbos")
        .update({ collection_frequency_days: days })
        .eq("id", fboId);
      if (error) throw error;
      await fetchFbos();
    });
  }

  // ---------------------------------------------------------------------
  // Daily dispatch operations
  // ---------------------------------------------------------------------

  /** Dispatches a zone to a picker for `selectedDate`. The caller (DispatchBoard)
   *  decides which fboIds to pass — normally the due/overdue/requested subset
   *  the checkboxes pre-select, but any subset works, including "all of them"
   *  if the admin manually checks every box as a deliberate override. */
  async function dispatchZone(def: RouteDefinition, pickerId: string, fboIds: string[]) {
    if (!pickerId) {
      setErrorMessage("Choose a picker before dispatching.");
      return;
    }
    if (fboIds.length === 0) {
      setErrorMessage(`No stops to dispatch for "${def.name}" on this date.`);
      return;
    }
    await withPending(`dispatch-${def.id}`, async () => {
      await supabase.from("routes").delete().eq("route_date", selectedDate).in("fbo_id", fboIds);
      const inserts = fboIds.map((fboId, index) => ({
        picker_id: pickerId,
        fbo_id: fboId,
        route_date: selectedDate,
        sort_order: index,
        status: "assigned" as const,
        collected_liters: null,
        completed_at: null,
      }));
      const { error } = await supabase.from("routes").insert(inserts);
      if (error) throw error;
      const pickerName = pickers.find((p) => p.id === pickerId)?.profile?.full_name ?? "picker";
      triggerSuccess(`"${def.name}" dispatched to ${pickerName} (${fboIds.length} stop${fboIds.length === 1 ? "" : "s"}).`);
      await refreshDay();
    });
  }

  async function singleStopReassign(fboId: string, pickerId: string) {
    await withPending(`stop-${fboId}`, async () => {
      if (!pickerId) {
        const { error } = await supabase
          .from("routes")
          .delete()
          .eq("route_date", selectedDate)
          .eq("fbo_id", fboId);
        if (error) throw error;
        triggerSuccess("Stop unassigned for this date.");
      } else {
        const existing = dailyAssignments.find((a) => a.fbo_id === fboId);
        if (existing) {
          const { error } = await supabase.from("routes").update({ picker_id: pickerId }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("routes").insert({
            picker_id: pickerId,
            fbo_id: fboId,
            route_date: selectedDate,
            sort_order: 0,
            status: "assigned",
            collected_liters: null,
            completed_at: null,
          });
          if (error) throw error;
        }
        triggerSuccess("Stop assigned.");
      }
      await refreshDay();
    });
  }

  async function clearDispatch(def: RouteDefinition, fboIds: string[]) {
    if (fboIds.length === 0) return;
    await withPending(`clear-${def.id}`, async () => {
      const { error } = await supabase
        .from("routes")
        .delete()
        .eq("route_date", selectedDate)
        .in("fbo_id", fboIds);
      if (error) throw error;
      triggerSuccess(`Cleared "${def.name}" for this date.`);
      await refreshDay();
    });
  }

  async function markCollected(assignment: DailyRouteAssignment, liters: number | null) {
    await withPending(`collect-${assignment.id}`, async () => {
      const { error } = await supabase
        .from("routes")
        .update({ status: "completed", collected_liters: liters, completed_at: new Date().toISOString() })
        .eq("id", assignment.id);
      if (error) throw error;
      // A DB trigger (see migration.sql) stamps fbos.last_collected_at and
      // clears early_pickup_requested_at — refetch fbos so due-badges update.
      triggerSuccess("Marked collected.");
      await Promise.all([fetchFbos(), refreshDay()]);
    });
  }

  async function skipStop(assignment: DailyRouteAssignment) {
    await withPending(`skip-${assignment.id}`, async () => {
      const { error } = await supabase
        .from("routes")
        .update({ status: "skipped", completed_at: new Date().toISOString() })
        .eq("id", assignment.id);
      if (error) throw error;
      triggerSuccess("Stop marked skipped.");
      await refreshDay();
    });
  }

  // ---------------------------------------------------------------------
  // Picker operations
  // ---------------------------------------------------------------------

  async function togglePickerActive(pickerId: string, nextActive: boolean) {
    await withPending(`picker-active-${pickerId}`, async () => {
      const { error } = await supabase.from("pickers").update({ is_active: nextActive }).eq("id", pickerId);
      if (error) throw error;
      triggerSuccess(nextActive ? "Picker activated." : "Picker deactivated.");
      await fetchPickers();
    });
  }

  async function setPickerCapacity(pickerId: string, capacity: number | null) {
    await withPending(`picker-capacity-${pickerId}`, async () => {
      const { error } = await supabase.from("pickers").update({ daily_capacity: capacity }).eq("id", pickerId);
      if (error) throw error;
      await fetchPickers();
    });
  }

  return {
    // data
    pickers,
    fbos,
    routeDefinitions,
    routeStops,
    dailyAssignments,
    weekAssignments,
    selectedDate,
    setSelectedDate,
    // status
    fetching,
    isPending,
    successMessage,
    errorMessage,
    setErrorMessage,
    // zone ops
    createTemplate,
    deleteTemplate,
    addStop,
    removeStop,
    moveStop,
    bulkMoveStops,
    setDefaultPicker,
    setFboFrequency,
    // dispatch ops
    dispatchZone,
    singleStopReassign,
    clearDispatch,
    markCollected,
    skipStop,
    // picker ops
    togglePickerActive,
    setPickerCapacity,
    fetchAllPickers,
  };
}
