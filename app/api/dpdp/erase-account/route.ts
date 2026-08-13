import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DPDP Act 2023 - Section 12 Right to Erasure / Right to be Forgotten API Route
 * Invokes erase_user_data RPC procedure to anonymize and erase user personal data
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Call stored procedure to anonymize and erase user data
    const { error: rpcError } = await supabase.rpc("erase_user_data", {
      target_user_id: user.id,
    });

    if (rpcError) {
      console.error("[DPDP Erasure RPC Error]:", rpcError);
      return NextResponse.json({ error: `Erasure failed: ${rpcError.message}` }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: "User personal data erased and account anonymized under DPDP Act Section 12." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[DPDP Erasure API Error]:", error);
    return NextResponse.json({ error: "Failed to execute account erasure" }, { status: 500 });
  }
}
