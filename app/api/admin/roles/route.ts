import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET: Fetch role templates strictly from the database (excluding Super Admin)
export async function GET() {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("custom_roles")
      .select("*")
      .neq("role_key", "admin")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("custom_roles query error:", error.message);
      return NextResponse.json({ success: true, roles: [] });
    }

    // Filter out Super Admin if any exists
    const cleanRoles = (data || []).filter(
      (r) => r.role_key !== "admin" && r.role_name?.toLowerCase() !== "super admin"
    );

    return NextResponse.json({ success: true, roles: cleanRoles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST / PUT: Create or update a custom role template in the database
export async function POST(request: Request) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: requesterProfile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
    }

    const body = await request.json();
    const { roleKey: existingRoleKey, roleName, description, defaultRoutes } = body;

    if (!roleName || !Array.isArray(defaultRoutes)) {
      return NextResponse.json({ error: "Invalid payload: roleName and defaultRoutes required" }, { status: 400 });
    }

    const roleKey = existingRoleKey
      ? existingRoleKey
      : roleName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");

    if (roleKey === "admin" || roleName.trim().toLowerCase() === "super admin") {
      return NextResponse.json({ error: "Super Admin role is top level and cannot be modified." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("custom_roles")
      .upsert(
        {
          role_key: roleKey,
          role_name: roleName.trim(),
          description: description || null,
          default_routes: defaultRoutes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "role_key" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save role to database: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete a custom role template strictly from the database
export async function DELETE(request: Request) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: requesterProfile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleKey = searchParams.get("roleKey");

    if (!roleKey) {
      return NextResponse.json({ error: "Missing required parameter: roleKey" }, { status: 400 });
    }

    if (roleKey === "admin") {
      return NextResponse.json({ error: "Super Admin role cannot be deleted." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("custom_roles")
      .delete()
      .eq("role_key", roleKey);

    if (error) {
      return NextResponse.json({ error: "Failed to delete role from database: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, roleKey });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
