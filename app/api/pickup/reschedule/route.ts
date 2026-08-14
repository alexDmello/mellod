import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeInput } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { exception_id, fbo_id, rescheduled_date, time_slot, rescheduled_by } = body;

    if (!fbo_id || !rescheduled_date) {
      return NextResponse.json(
        { error: "Missing required parameters: fbo_id and rescheduled_date." },
        { status: 400 }
      );
    }

    const cleanFboId = sanitizeInput(fbo_id);
    const cleanDate = sanitizeInput(rescheduled_date);
    const cleanSlot = time_slot ? sanitizeInput(time_slot) : "Morning (10 AM - 1 PM)";
    const cleanBy = rescheduled_by ? sanitizeInput(rescheduled_by) : "fbo";

    const adminSupabase = createAdminClient();

    // 1. Update exception record status if exception_id provided
    if (exception_id) {
      await adminSupabase
        .from("pickup_exceptions")
        .update({
          rescheduled_date: cleanDate,
          rescheduled_time_slot: cleanSlot,
          rescheduled_by: cleanBy,
          status: "rescheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", exception_id);
    }

    // 2. Find active picker assigned to FBO zone or get last picker
    let targetPickerId: string | null = null;
    const { data: fboData } = await adminSupabase
      .from("fbos")
      .select("zone_id")
      .eq("id", cleanFboId)
      .maybeSingle();

    if (fboData?.zone_id) {
      const { data: zonePickers } = await adminSupabase
        .from("pickers")
        .select("id")
        .eq("is_active", true)
        .limit(1);
      if (zonePickers && zonePickers.length > 0) {
        targetPickerId = zonePickers[0].id;
      }
    }

    if (!targetPickerId) {
      const { data: fallbackPicker } = await adminSupabase
        .from("pickers")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      targetPickerId = fallbackPicker?.id || null;
    }

    // 3. Insert or update route record for rescheduled target date
    if (targetPickerId) {
      const { data: existingRoute } = await adminSupabase
        .from("routes")
        .select("id")
        .eq("fbo_id", cleanFboId)
        .eq("route_date", cleanDate)
        .maybeSingle();

      if (!existingRoute) {
        await adminSupabase.from("routes").insert({
          fbo_id: cleanFboId,
          picker_id: targetPickerId,
          route_date: cleanDate,
          sort_order: 1, // Prioritized top of queue
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pickup rescheduled successfully for ${cleanDate} (${cleanSlot}).`,
      rescheduled_date: cleanDate,
      time_slot: cleanSlot,
    });
  } catch (error: any) {
    console.error("Error rescheduling pickup:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reschedule pickup." },
      { status: 500 }
    );
  }
}
