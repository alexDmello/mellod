import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { pickupId, liters, price_per_liter, notes, status, photo_url } = body;

    if (!pickupId) {
      return NextResponse.json({ error: "Missing pickupId." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const litersNum = parseFloat(liters);
    const priceNum = parseFloat(price_per_liter);
    const totalAmount = litersNum * priceNum;

    const updatePayload: Record<string, any> = {
      liters: litersNum,
      price_per_liter: priceNum,
      notes: notes !== undefined ? (notes?.trim() || null) : undefined,
      status: status || "completed",
    };

    if (photo_url !== undefined) {
      updatePayload.photo_url = photo_url;
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
    const pickupId = searchParams.get("pickupId");

    if (!pickupId) {
      return NextResponse.json({ error: "Missing pickupId." }, { status: 400 });
    }

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
