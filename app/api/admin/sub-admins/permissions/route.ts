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

    // Fetch role templates mapping for default routes
    const { data: customRoles } = await adminClient
      .from("custom_roles")
      .select("role_key, default_routes");

    const roleRouteMap = new Map((customRoles || []).map((r) => [r.role_key, r.default_routes]));

    const result = (staffProfiles || []).map((profile) => ({
      ...profile,
      allowed_routes: roleRouteMap.get(profile.role) || ["/admin"],
    }));

    return NextResponse.json({ subAdmins: result, staff: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Update staff role / permissions
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
    const { profileId, role } = body;

    if (profileId && role) {
      const adminClient = createAdminClient();
      await adminClient.from("profiles").update({ role }).eq("id", profileId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
