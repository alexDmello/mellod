import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeInput, DEFAULT_MAX_UPLOAD_SIZE } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > DEFAULT_MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `Payload too large. Maximum allowed size for log upload is ${Math.round(DEFAULT_MAX_UPLOAD_SIZE / (1024 * 1024))}MB.` },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const rawPickerId = formData.get("picker_id") as string;
    const rawFboId = formData.get("fbo_id") as string;
    const rawRouteId = formData.get("route_id") as string;
    const litersStr = formData.get("liters") as string;
    const pricePerLiterStr = formData.get("price_per_liter") as string;
    const rawNotes = formData.get("notes") as string;
    const photo = formData.get("photo") as File | null;

    if (!rawPickerId || !rawFboId || !litersStr) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const pickerId = sanitizeInput(rawPickerId);
    const fboId = sanitizeInput(rawFboId);
    const routeId = rawRouteId ? sanitizeInput(rawRouteId) : null;
    const notes = rawNotes ? sanitizeInput(rawNotes) : "";

    const liters = parseFloat(litersStr);
    const pricePerLiter = parseFloat(pricePerLiterStr || "0");

    if (isNaN(liters) || liters <= 0) {
      return NextResponse.json({ error: "Malformed payload: liters must be a positive number." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    let photoUrl: string | null = null;

    if (photo && photo.size > 0) {
      if (photo.size > DEFAULT_MAX_UPLOAD_SIZE) {
        return NextResponse.json(
          { error: `Photo payload too large. Maximum size is ${Math.round(DEFAULT_MAX_UPLOAD_SIZE / (1024 * 1024))}MB.` },
          { status: 413 }
        );
      }

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

    const { data: pickup, error: insertError } = await adminSupabase
      .from("pickups")
      .insert({
        picker_id: pickerId,
        fbo_id: fboId,
        route_id: routeId,
        liters: liters,
        price_per_liter: isNaN(pricePerLiter) ? 0 : pricePerLiter,
        photo_url: photoUrl,
        notes: notes.trim() || null,
        status: "pending",
        picked_up_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Pickup insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Auto-update any matching active pickup request for this FBO to completed
    try {
      await adminSupabase
        .from("pickup_requests")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("fbo_id", fboId)
        .in("status", ["pending", "scheduled", "assigned", "in_transit"]);
    } catch (reqUpdateErr) {
      console.warn("Could not update pickup_requests status to completed:", reqUpdateErr);
    }

    return NextResponse.json({ success: true, pickup });
  } catch (err: any) {
    console.error("API error in /api/pickup/log:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}
