import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET: Fetch list of sub-admins with their profiles & permissions
export async function GET() {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Fetch all sub-admin profiles
    const { data: subAdmins, error: subAdminError } = await adminClient
      .from("profiles")
      .select("id, full_name, username, phone, role, created_at, generated_password")
      .eq("role", "sub_admin")
      .order("created_at", { ascending: false });

    if (subAdminError) {
      return NextResponse.json({ error: subAdminError.message }, { status: 500 });
    }

    // Fetch permissions
    const { data: permissions, error: permError } = await adminClient
      .from("sub_admin_permissions")
      .select("*");

    if (permError) {
      return NextResponse.json({ error: permError.message }, { status: 500 });
    }

    const permMap = new Map(permissions.map((p) => [p.profile_id, p.allowed_routes]));

    const result = subAdmins.map((profile) => ({
      ...profile,
      allowed_routes: permMap.get(profile.id) || ["/admin"],
    }));

    return NextResponse.json({ subAdmins: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Update allowed routes for a specific sub-admin profile
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
