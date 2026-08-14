import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAndSanitizeJson, sanitizeInput } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Verify requester is an authorized admin
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const requesterRole = (profile as any)?.role;
    if (!profile || requesterRole === "fbo" || requesterRole === "picker") {
      return NextResponse.json({ error: "Forbidden: Internal staff role required" }, { status: 403 });
    }

    // 2. Parse & sanitize request body
    const rawText = await request.text();
    const parseResult = parseAndSanitizeJson<Record<string, any>>(rawText);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error }, { status: parseResult.status });
    }

    const body = parseResult.data;
    const { type, password, username, fullName, phone, vehicleInfo, businessName, address, latitude, longitude, fssaiLicense, upiId } = body;

    if (!password || !username || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const authEmail = `${cleanUsername}@mellod.internal`;
    
    const rawRole = type ? String(type).trim().toLowerCase() : "sub_admin";
    let normalizedRole = rawRole.replace(/[^a-z0-9_]/g, "_");
    if (rawRole === "sub-admin" || rawRole === "sub_admin" || rawRole === "fbo" || rawRole === "picker" || rawRole === "admin") {
      normalizedRole = rawRole === "sub-admin" ? "sub_admin" : rawRole;
    }

    // 3. Initialize admin client to perform auth actions
    const adminClient = createAdminClient();

    // 4. Create auth user with pre-confirmed email
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password: String(password),
      email_confirm: true,
    });

    if (createError || !authData.user) {
      return NextResponse.json({ error: createError?.message ?? "Failed to create authentication account" }, { status: 500 });
    }

    const userId = authData.user.id;

    // 5. Insert profile row
    let { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      full_name: sanitizeInput(fullName),
      role: normalizedRole,
      username: cleanUsername,
      phone: phone ? sanitizeInput(phone) : null,
      generated_password: String(password),
    });

    if (profileError && profileError.message.includes("profiles_role_check")) {
      const fallbackResult = await adminClient.from("profiles").insert({
        id: userId,
        full_name: sanitizeInput(fullName),
        role: "sub_admin",
        username: cleanUsername,
        phone: phone ? sanitizeInput(phone) : null,
        generated_password: String(password),
      });
      profileError = fallbackResult.error;
    }

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create profile: " + profileError.message }, { status: 500 });
    }

    // 6. Insert role-specific record
    if (type === "FBO") {
      const { data: createdFbo, error: fboError } = await adminClient.from("fbos").insert({
        profile_id: userId,
        business_name: sanitizeInput(businessName || fullName),
        contact_person: sanitizeInput(fullName),
        address: address ? sanitizeInput(address) : null,
        phone: phone ? sanitizeInput(phone) : null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        fssai_license: fssaiLicense ? sanitizeInput(fssaiLicense) : null,
      }).select().single();

      if (fboError) {
        await adminClient.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: "Failed to create FBO record: " + fboError.message }, { status: 500 });
      }

      if (upiId && createdFbo?.id) {
        await adminClient.from("payment_methods").insert({
          fbo_id: createdFbo.id,
          method_type: "upi",
          upi_id: sanitizeInput(String(upiId)),
          is_primary: true,
        });
      }
    } else if (type === "Picker") {
      const { error: pickerError } = await adminClient.from("pickers").insert({
        profile_id: userId,
        vehicle_info: vehicleInfo ? sanitizeInput(vehicleInfo) : null,
      });

      if (pickerError) {
        await adminClient.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: "Failed to create Picker record: " + pickerError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error("Error in create-user API route:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
