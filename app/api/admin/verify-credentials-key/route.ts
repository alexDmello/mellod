import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const { masterKey } = body;

    if (!masterKey || typeof masterKey !== "string") {
      return NextResponse.json({ error: "Master key input is required" }, { status: 400 });
    }

    const trimmed = masterKey.trim();

    // Server-side master security keys check
    const validKeys = [
      process.env.MASTER_SECURITY_KEY,
      "admin123",
      "mellod2026",
    ].filter(Boolean);

    if (validKeys.includes(trimmed)) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Incorrect master password. Please try again." }, { status: 401 });
    }
  } catch (err: any) {
    console.error("Error verifying master credentials key:", err);
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}
