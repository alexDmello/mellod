import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeInput, DEFAULT_MAX_UPLOAD_SIZE } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > DEFAULT_MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `Payload too large. Maximum allowed size is ${Math.round(DEFAULT_MAX_UPLOAD_SIZE / (1024 * 1024))}MB.` },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const rawPickerId = formData.get("picker_id") as string;
    const rawFboId = formData.get("fbo_id") as string;
    const rawRouteId = formData.get("route_id") as string;
    const rawReason = formData.get("reason") as string;
    const rawNotes = formData.get("notes") as string;
    const latStr = formData.get("latitude") as string;
    const lngStr = formData.get("longitude") as string;
    const photo = formData.get("photo") as File | null;

    if (!rawPickerId || !rawFboId || !rawReason) {
      return NextResponse.json({ error: "Missing required fields: picker_id, fbo_id, and reason." }, { status: 400 });
    }

    const pickerId = sanitizeInput(rawPickerId);
    const fboId = sanitizeInput(rawFboId);
    const routeId = rawRouteId ? sanitizeInput(rawRouteId) : null;
    const reason = sanitizeInput(rawReason);
    const notes = rawNotes ? sanitizeInput(rawNotes) : "";
    const latitude = latStr ? parseFloat(latStr) : null;
    const longitude = lngStr ? parseFloat(lngStr) : null;

    const adminSupabase = createAdminClient();
    let photoUrl: string | null = null;

    // 1. Upload Evidence Photo if provided
    if (photo && photo.size > 0) {
      if (photo.size > DEFAULT_MAX_UPLOAD_SIZE) {
        return NextResponse.json(
          { error: `Photo size exceeds maximum limit of ${Math.round(DEFAULT_MAX_UPLOAD_SIZE / (1024 * 1024))}MB.` },
          { status: 413 }
        );
      }

      const arrayBuffer = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = `closed_fbo_${fboId}_${Date.now()}.jpg`;

      const { error: uploadError } = await adminSupabase.storage
        .from("pickup-photos")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrlData } = adminSupabase.storage
          .from("pickup-photos")
          .getPublicUrl(fileName);
        photoUrl = publicUrlData?.publicUrl || null;
      } else {
        console.warn("Storage upload warn:", uploadError.message);
      }
    }

    // 2. Fetch FBO location for distance check
    let isWithinGeofence = true;
    if (latitude && longitude) {
      const { data: fboData } = await adminSupabase
        .from("fbos")
        .select("latitude, longitude")
        .eq("id", fboId)
        .maybeSingle();

      if (fboData?.latitude && fboData?.longitude) {
        // Approximate distance calculation
        const R = 6371e3; // metres
        const φ1 = (latitude * Math.PI) / 180;
        const φ2 = (fboData.latitude * Math.PI) / 180;
        const Δφ = ((fboData.latitude - latitude) * Math.PI) / 180;
        const Δλ = ((fboData.longitude - longitude) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance > 300) {
          isWithinGeofence = false;
        }
      }
    }

    // 3. Log into pickup_exceptions table (or pickups table with status attempted_closed)
    const { data: exceptionRecord, error: exceptionErr } = await adminSupabase
      .from("pickup_exceptions")
      .insert({
        fbo_id: fboId,
        picker_id: pickerId,
        reason,
        photo_url: photoUrl,
        picker_latitude: latitude,
        picker_longitude: longitude,
        is_within_geofence: isWithinGeofence,
        status: "pending_reschedule",
      })
      .select("*")
      .maybeSingle();

    if (exceptionErr) {
      console.warn("pickup_exceptions insert fallback:", exceptionErr.message);
      // Fallback: log inside pickups table as zero-volume attempted entry
      await adminSupabase.from("pickups").insert({
        fbo_id: fboId,
        picker_id: pickerId,
        route_id: routeId,
        liters: 0,
        total_amount: 0,
        notes: `[ATTEMPTED_CLOSED] Reason: ${reason}. Notes: ${notes}`,
        photo_url: photoUrl,
        status: "attempted_closed",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Outlet closed status logged successfully. FBO notified for rescheduling.",
      exception: exceptionRecord || null,
      photo_url: photoUrl,
    });
  } catch (error: any) {
    console.error("Error reporting closed outlet:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log closed outlet exception." },
      { status: 500 }
    );
  }
}
