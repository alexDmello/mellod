import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pickerId = formData.get("picker_id") as string;
    const fboId = formData.get("fbo_id") as string;
    const routeId = (formData.get("route_id") as string) || null;
    const litersStr = formData.get("liters") as string;
    const pricePerLiterStr = formData.get("price_per_liter") as string;
    const notes = (formData.get("notes") as string) || "";
    const photo = formData.get("photo") as File | null;

    if (!pickerId || !fboId || !litersStr) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const liters = parseFloat(litersStr);
    const pricePerLiter = parseFloat(pricePerLiterStr || "0");
    const totalAmount = liters * pricePerLiter;

    const adminSupabase = createAdminClient();

    let photoUrl: string | null = null;

    // Handle photo upload bypassing RLS using admin client
    if (photo && photo.size > 0) {
      const arrayBuffer = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = `pickup_${pickerId}_${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await adminSupabase.storage
        .from("pickup-photos")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json(
          { error: `Photo storage error: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data: urlData } = adminSupabase.storage
        .from("pickup-photos")
        .getPublicUrl(uploadData.path);

      photoUrl = urlData.publicUrl;
    }

    // Insert pickup record with status "pending" for Admin review
    // Note: total_amount is a GENERATED ALWAYS column in PostgreSQL, so we omit it from insert
    const { data: pickup, error: insertError } = await adminSupabase
      .from("pickups")
      .insert({
        picker_id: pickerId,
        fbo_id: fboId,
        route_id: routeId,
        liters: liters,
        price_per_liter: pricePerLiter,
        photo_url: photoUrl,
        notes: notes.trim() || null,
        status: "pending", // Sent for Admin Review
        picked_up_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Pickup insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pickup });
  } catch (err: any) {
    console.error("API error in /api/pickup/log:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}
