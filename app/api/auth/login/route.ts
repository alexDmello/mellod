import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAndSanitizeJson, sanitizeInput } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    const parseResult = parseAndSanitizeJson<{ username?: string; password?: string }>(rawText);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error }, { status: parseResult.status });
    }

    const { username, password } = parseResult.data;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const authEmail = `${cleanUsername}@mellod.internal`;

    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: String(password),
    });

    if (authError || !data.user) {
      const msg = authError?.message?.toLowerCase() || "";
      if (msg.includes("banned") || msg.includes("suspended")) {
        return NextResponse.json(
          { error: "This account has been offboarded or suspended. Contact Mellod admin." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Invalid username or password. Please try again." },
        { status: 401 }
      );
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { error: "Account configuration error: Profile record not found." },
        { status: 500 }
      );
    }

    const profile = sanitizeInput(profileData as { role: string });
    let destination = "/admin";

    if (profile.role !== "admin" && profile.role !== "picker" && profile.role !== "fbo") {
      const { data: roleData } = await supabase
        .from("custom_roles")
        .select("default_routes")
        .eq("role_key", profile.role)
        .maybeSingle();

      if (roleData?.default_routes && roleData.default_routes.length > 0) {
        destination = roleData.default_routes[0];
      }
    } else if (profile.role === "picker") {
      const { data: picker } = await supabase
        .from("pickers")
        .select("is_active")
        .eq("profile_id", data.user.id)
        .maybeSingle();

      if (picker && picker.is_active === false) {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: "This picker account has been offboarded or suspended." },
          { status: 403 }
        );
      }
      destination = "/picker";
    } else if (profile.role === "fbo") {
      const { data: fbo } = await supabase
        .from("fbos")
        .select("is_active")
        .eq("profile_id", data.user.id)
        .maybeSingle();

      if (fbo && fbo.is_active === false) {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: "This FBO account has been offboarded or suspended." },
          { status: 403 }
        );
      }
      destination = "/fbo";
    }

    return NextResponse.json({ success: true, destination });
  } catch (err: any) {
    console.error("Auth login API route error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
