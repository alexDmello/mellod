import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET: Fetch list of all internal staff/manager/sub-admin profiles & permissions
export async function GET() {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Fetch all internal staff profiles (exclude external FBO and Picker roles, keep admin/sub_admin/manager/staff/custom)
    const { data: staffProfiles, error: staffError } = await adminClient
      .from("profiles")
      .select("id, full_name, username, phone, role, created_at, generated_password")
      .neq("role", "fbo")
      .neq("role", "picker")
      .neq("role", "admin")
      .order("created_at", { ascending: false });

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // Ensure all internal auth emails and passwords are synced to internal auth format
    for (const sa of staffProfiles || []) {
      if (sa.username && sa.generated_password) {
        const internalEmail = `${sa.username.trim().toLowerCase()}@mellod.internal`;
        try {
          await adminClient.auth.admin.updateUserById(sa.id, {
            email: internalEmail,
            password: sa.generated_password,
            email_confirm: true,
          });
        } catch (e) {
          console.error(`Failed to sync auth for ${sa.username}:`, e);
        }
      }
    }

    // Fetch custom route permissions
    const { data: permissions } = await adminClient
      .from("sub_admin_permissions")
      .select("*");

    const permMap = new Map((permissions || []).map((p) => [p.profile_id, p.allowed_routes]));

    const result = (staffProfiles || []).map((profile) => ({
      ...profile,
      allowed_routes: permMap.get(profile.id) || ["/admin"],
    }));

    return NextResponse.json({ subAdmins: result, staff: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Update allowed routes for a specific staff/sub-admin profile
export async function POST(request: Request) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure requester is Super Admin
    const { data: requesterProfile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin role required" }, { status: 403 });
    }

    const body = await request.json();
    const { profileId, allowedRoutes } = body;

    if (!profileId || !Array.isArray(allowedRoutes)) {
      return NextResponse.json({ error: "Invalid payload: profileId and allowedRoutes array required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Upsert into sub_admin_permissions
    const { error: upsertError } = await adminClient
      .from("sub_admin_permissions")
      .upsert(
        {
          profile_id: profileId,
          allowed_routes: allowedRoutes,
        },
        { onConflict: "profile_id" }
      );

    if (upsertError) {
      return NextResponse.json({ error: "Failed to update permissions: " + upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
