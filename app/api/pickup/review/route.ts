import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAndSanitizeJson, sanitizeInput } from "@/lib/security";

export async function PATCH(request: Request) {
  try {
    const rawText = await request.text();
    const parseResult = parseAndSanitizeJson<{
      pickupId?: string;
      liters?: string | number;
      price_per_liter?: string | number;
      notes?: string;
      status?: string;
      photo_url?: string;
    }>(rawText);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error }, { status: parseResult.status });
    }

    const { pickupId, liters, price_per_liter, notes, status, photo_url } = parseResult.data;

    if (!pickupId) {
      return NextResponse.json({ error: "Missing pickupId." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const litersNum = parseFloat(String(liters || 0));
    const priceNum = parseFloat(String(price_per_liter || 0));

    const updatePayload: Record<string, any> = {
      liters: isNaN(litersNum) ? 0 : litersNum,
      price_per_liter: isNaN(priceNum) ? 0 : priceNum,
      notes: notes !== undefined ? (sanitizeInput(String(notes)).trim() || null) : undefined,
      status: status ? sanitizeInput(String(status)) : "completed",
    };

    if (photo_url !== undefined) {
      updatePayload.photo_url = photo_url ? sanitizeInput(String(photo_url)) : null;
    }

    const { data: updatedPickup, error } = await adminSupabase
      .from("pickups")
      .update(updatePayload)
      .eq("id", pickupId)
      .select(`
        *,
        fbo:fbos(business_name, address),
        picker:pickers(vehicle_info, profile:profiles(full_name))
      `)
      .single();

    if (error) {
      console.error("Error updating pickup:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pickup: updatedPickup });
  } catch (err: any) {
    console.error("API error in /api/pickup/review:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPickupId = searchParams.get("pickupId");

    if (!rawPickupId) {
      return NextResponse.json({ error: "Missing pickupId." }, { status: 400 });
    }

    const pickupId = sanitizeInput(rawPickupId);

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("pickups").delete().eq("id", pickupId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}
