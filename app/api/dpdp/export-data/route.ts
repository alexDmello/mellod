import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DPDP Act 2023 - Section 11 Right to Access Personal Data Payload Export API
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // 2. Fetch Consent Log History
    const { data: consents } = await supabase
      .from("user_consents")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 3. Fetch FBO or Picker Details if relevant
    const { data: fbo } = await supabase
      .from("fbos")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle();

    const { data: picker } = await supabase
      .from("pickers")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle();

    // 4. Fetch Pickups (Transactions tied to user)
    let pickups = [];
    if (fbo?.id) {
      const { data } = await supabase.from("pickups").select("*").eq("fbo_id", fbo.id);
      pickups = data || [];
    } else if (picker?.id) {
      const { data } = await supabase.from("pickups").select("*").eq("picker_id", picker.id);
      pickups = data || [];
    }

    // 5. Construct DPDP Compliant Data Principal Export Payload
    const payload = {
      export_metadata: {
        act: "Digital Personal Data Protection Act, 2023 (India)",
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
      },
      personal_profile: profile || null,
      consent_records: consents || null,
      fbo_entity: fbo || null,
      picker_entity: picker || null,
      pickup_logs_count: pickups.length,
      pickup_logs: pickups,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="dpdp_data_export_${user.id}.json"`,
      },
    });
  } catch (error: any) {
    console.error("[DPDP Export API Error]:", error);
    return NextResponse.json({ error: "Failed to generate personal data export payload" }, { status: 500 });
  }
}
