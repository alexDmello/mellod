// use-routes-data.ts
//
// All Supabase reads/writes for Routes Management live here.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils";
import type { Zone, SubZone, RouteSchedule } from "@/lib/types";
import {
  DailyRouteAssignment,
  PickerWithCapacity,
  RouteDefinition,
  RouteStop,
  ScheduledFBO,
  weekRangeContaining,
} from "./route-utils";
import { detectZoneFromCoordsWithFallback } from "./zone-data";

export type RoutesData = ReturnType<typeof useRoutesData>;


export function useRoutesData() {
  const supabase = useMemo(() => createClient(), []);

  const [pickers, setPickers] = useState<PickerWithCapacity[]>([]);
  const [fbos, setFbos] = useState<ScheduledFBO[]>([]);
  const [routeDefinitions, setRouteDefinitions] = useState<RouteDefinition[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [dailyAssignments, setDailyAssignments] = useState<DailyRouteAssignment[]>([]);
  const [weekAssignments, setWeekAssignments] = useState<DailyRouteAssignment[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [subZones, setSubZones] = useState<SubZone[]>([]);
  const [schedules, setSchedules] = useState<RouteSchedule[]>([]);

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

  const fetchPickers = useCallback(async () => {
    const { data, error } = await supabase
      .from("pickers")
      .select("*, profile:profiles(*)")
      .eq("is_active", true);
    if (error) throw error;
    setPickers((data as PickerWithCapacity[]) ?? []);
  }, [supabase]);

  const fetchAllPickers = useCallback(async () => {
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

  const fetchZones = useCallback(async () => {
    const { data, error } = await supabase.from("zones").select("*").order("name");
    if (error) throw error;
    setZones((data as Zone[]) ?? []);
  }, [supabase]);

  const fetchSubZones = useCallback(async () => {
    const { data, error } = await supabase.from("sub_zones").select("*").order("name");
    if (error) throw error;
    setSubZones((data as SubZone[]) ?? []);
  }, [supabase]);

  const fetchSchedules = useCallback(async () => {
    const { data, error } = await supabase
      .from("route_schedules")
      .select("*")
      .order("scheduled_date");
    if (error) throw error;
    setSchedules((data as RouteSchedule[]) ?? []);
  }, [supabase]);

  const fetchBaseData = useCallback(async () => {
    setFetching(true);
    try {
      await Promise.all([fetchPickers(), fetchFbos(), fetchRouteDefinitions(), fetchRouteStops(), fetchZones(), fetchSubZones(), fetchSchedules()]);
    } catch (e: any) {
      setErrorMessage(e?.message ?? "Error loading routes data.");
    } finally {
      setFetching(false);
    }
  }, [fetchPickers, fetchFbos, fetchRouteDefinitions, fetchRouteStops, fetchZones, fetchSubZones, fetchSchedules]);

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
    fetchWeekAssignments(selectedDate).catch(() => {});
  }, [selectedDate, fetchDailyAssignments, fetchWeekAssignments]);

  const refreshDay = useCallback(async () => {
    await Promise.all([fetchDailyAssignments(selectedDate), fetchWeekAssignments(selectedDate)]);
  }, [selectedDate, fetchDailyAssignments, fetchWeekAssignments]);

  async function createTemplate(
    name: string,
    defaultPickerId: string,
    zoneId?: string,
    subZoneId?: string,
    description?: string
  ): Promise<RouteDefinition | null> {
    let created: RouteDefinition | null = null;
    await withPending("create-template", async () => {
      const { data, error } = await supabase
        .from("route_definitions")
        .insert({
          name: name.trim(),
          default_picker_id: defaultPickerId || null,
          zone_id: zoneId || null,
          sub_zone_id: subZoneId || null,
          description: description?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      created = data as RouteDefinition;
      triggerSuccess(`Route "${name}" created.`);
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

  // Auto-assign a single FBO to a zone/sub-zone based on its coordinates
  async function autoAssignFboZone(fboId: string, lat: number, lng: number) {
    await withPending(`auto-zone-${fboId}`, async () => {
      const detectedZoneName = detectZoneFromCoordsWithFallback(lat, lng);
      // Find the zone record matching the detected zone name
      const { data: zoneData } = await supabase
        .from("zones")
        .select("id, name")
        .eq("name", detectedZoneName)
        .single();
      if (!zoneData) throw new Error("Zone not found in database. Run the migration first.");

      // Find sub-zone for this zone
      const { data: subZoneData } = await supabase
        .from("sub_zones")
        .select("id")
        .eq("zone_id", zoneData.id)
        .single();

      const { error } = await supabase
        .from("fbos")
        .update({
          zone_id: zoneData.id,
          sub_zone_id: subZoneData?.id ?? null,
        })
        .eq("id", fboId);
      if (error) throw error;
      triggerSuccess(`FBO assigned to ${detectedZoneName} zone.`);
      await fetchFbos();
    });
  }

  // Manually override an FBO's zone
  async function overrideFboZone(fboId: string, zoneId: string, subZoneId: string) {
    await withPending(`override-zone-${fboId}`, async () => {
      const { error } = await supabase
        .from("fbos")
        .update({ zone_id: zoneId || null, sub_zone_id: subZoneId || null })
        .eq("id", fboId);
      if (error) throw error;
      triggerSuccess("Zone assignment updated.");
      await fetchFbos();
    });
  }

  // Bulk re-detect zones for all FBOs that have lat/lng
  async function bulkRedetectZones() {
    await withPending("bulk-redetect", async () => {
      const { data: zoneRecords } = await supabase.from("zones").select("id, name");
      const { data: subZoneRecords } = await supabase.from("sub_zones").select("id, zone_id");
      if (!zoneRecords || !subZoneRecords) throw new Error("Zone data not found.");

      const zoneMap = new Map(zoneRecords.map((z) => [z.name, z.id]));
      const subZoneMap = new Map(subZoneRecords.map((sz) => [sz.zone_id, sz.id]));

      const geoFbos = fbos.filter((f) => f.latitude != null && f.longitude != null);
      let updatedCount = 0;

      await Promise.all(
        geoFbos.map(async (fbo) => {
          const zoneName = detectZoneFromCoordsWithFallback(fbo.latitude!, fbo.longitude!);
          const zoneId = zoneMap.get(zoneName) ?? null;
          const subZoneId = zoneId ? (subZoneMap.get(zoneId) ?? null) : null;
          if (fbo.zone_id !== zoneId || fbo.sub_zone_id !== subZoneId) {
            await supabase.from("fbos").update({ zone_id: zoneId, sub_zone_id: subZoneId }).eq("id", fbo.id);
            updatedCount++;
          }
        })
      );
      triggerSuccess(`Re-detected zones for ${updatedCount} FBO${updatedCount === 1 ? "" : "s"}.`);
      await fetchFbos();
    });
  }


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

  // ── Schedule Functions ──────────────────────────────────────────────────

  async function createSchedule(
    routeDefinitionId: string,
    scheduledDate: string,
    pickerId: string,
    fboIds: string[],
    notes?: string
  ) {
    await withPending(`create-schedule-${routeDefinitionId}-${scheduledDate}`, async () => {
      const { error } = await supabase.from("route_schedules").upsert(
        {
          route_definition_id: routeDefinitionId,
          scheduled_date: scheduledDate,
          picker_id: pickerId || null,
          fbo_ids: fboIds,
          notes: notes?.trim() || null,
          is_executed: false,
          executed_at: null,
        },
        { onConflict: "route_definition_id,scheduled_date" }
      );
      if (error) throw error;
      triggerSuccess(`Route scheduled for ${scheduledDate}.`);
      await fetchSchedules();
    });
  }

  async function deleteSchedule(scheduleId: string) {
    await withPending(`delete-schedule-${scheduleId}`, async () => {
      const { error } = await supabase.from("route_schedules").delete().eq("id", scheduleId);
      if (error) throw error;
      triggerSuccess("Schedule removed.");
      await fetchSchedules();
    });
  }

  // Execute all unexecuted schedules for a given date (called on page load / date change)
  async function executeSchedulesForDate(date: string) {
    const pending = schedules.filter((s) => s.scheduled_date === date && !s.is_executed);
    if (pending.length === 0) return 0;

    let executed = 0;
    for (const schedule of pending) {
      if (!schedule.picker_id || schedule.fbo_ids.length === 0) continue;
      try {
        // Remove any existing routes for these FBOs on this date to avoid duplicates
        await supabase.from("routes").delete().eq("route_date", date).in("fbo_id", schedule.fbo_ids);

        // Insert the dispatch rows
        const inserts = schedule.fbo_ids.map((fboId, index) => ({
          picker_id: schedule.picker_id,
          fbo_id: fboId,
          route_date: date,
          sort_order: index,
          status: "assigned" as const,
          collected_liters: null,
          completed_at: null,
        }));
        const { error } = await supabase.from("routes").insert(inserts);
        if (error) throw error;

        // Mark as executed
        await supabase
          .from("route_schedules")
          .update({ is_executed: true, executed_at: new Date().toISOString() })
          .eq("id", schedule.id);

        executed++;
      } catch (e: any) {
        setErrorMessage(`Auto-dispatch failed for schedule: ${e?.message}`);
      }
    }

    if (executed > 0) {
      triggerSuccess(`Auto-dispatched ${executed} scheduled route${executed === 1 ? "" : "s"} for ${date}.`);
      await Promise.all([fetchSchedules(), fetchDailyAssignments(date)]);
    }
    return executed;
  }

  return {
    pickers,
    fbos,
    routeDefinitions,
    routeStops,
    dailyAssignments,
    weekAssignments,
    zones,
    subZones,
    selectedDate,
    setSelectedDate,
    fetching,
    isPending,
    successMessage,
    errorMessage,
    setErrorMessage,
    createTemplate,
    deleteTemplate,
    addStop,
    removeStop,
    moveStop,
    bulkMoveStops,
    setDefaultPicker,
    setFboFrequency,
    autoAssignFboZone,
    overrideFboZone,
    bulkRedetectZones,
    schedules,
    createSchedule,
    deleteSchedule,
    executeSchedulesForDate,
    dispatchZone,
    singleStopReassign,
    clearDispatch,
    markCollected,
    skipStop,
    togglePickerActive,
    setPickerCapacity,
    fetchAllPickers,
  };
}
