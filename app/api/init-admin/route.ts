import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient();

    // Check if any admin already exists
    const { count } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Admin account already exists. Please log in or manage admins in Settings." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password, fullName } = body;

    if (!username || !password || !fullName) {
      return NextResponse.json({ error: "Missing required fields: username, password, fullName" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const authEmail = `${cleanUsername}@mellod.internal`;

    // Create auth account via admin client
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });

    if (createError || !authData.user) {
      return NextResponse.json({ error: createError?.message || "Failed to create auth user" }, { status: 500 });
    }

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      full_name: fullName,
      role: "admin",
      username: cleanUsername,
      generated_password: password,
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create profile: " + profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, username: cleanUsername });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
