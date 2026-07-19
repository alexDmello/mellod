import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Verify the requester is an authorized admin
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

    if (!profile || (profile as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    // 2. Parse request parameters
    const body = await request.json();
    const { type, email, password, username, fullName, phone, vehicleInfo, businessName, address } = body;

    if (!email || !password || !username || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Initialize admin client to perform auth actions
    const adminClient = createAdminClient();

    // 4. Create auth user with pre-confirmed email (bypasses SMTP rate limits)
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !authData.user) {
      return NextResponse.json({ error: createError?.message ?? "Failed to create authentication account" }, { status: 500 });
    }

    const userId = authData.user.id;

    // 5. Insert profile row (with plain-text password for admin credentials directory visibility)
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      full_name: fullName,
      role: type.toLowerCase(),
      username,
      phone: phone || null,
      generated_password: password,
    });

    if (profileError) {
      // Clean up auth account on failure
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create profile: " + profileError.message }, { status: 500 });
    }

    // 6. Insert role-specific record
    if (type === "FBO") {
      const { error: fboError } = await adminClient.from("fbos").insert({
        profile_id: userId,
        business_name: businessName || fullName,
        contact_person: fullName,
        address: address || null,
        phone: phone || null,
      });

      if (fboError) {
        await adminClient.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: "Failed to create FBO record: " + fboError.message }, { status: 500 });
      }
    } else if (type === "Picker") {
      const { error: pickerError } = await adminClient.from("pickers").insert({
        profile_id: userId,
        vehicle_info: vehicleInfo || null,
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
