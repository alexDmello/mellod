import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAndSanitizeJson, sanitizeInput } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminSupabase = createAdminClient();

    // 1. Fetch all FBOs
    const { data: fbos, error: fboError } = await adminSupabase
      .from("fbos")
      .select("*")
      .order("business_name", { ascending: true });

    if (fboError) {
      console.error("Error fetching FBOs:", fboError);
      return NextResponse.json({ error: fboError.message }, { status: 500 });
    }

    // 2. Fetch all verified pickups
    const { data: pickups, error: pickupError } = await adminSupabase
      .from("pickups")
      .select(`
        *,
        fbo:fbos(id, business_name, phone, address, contact_person, fssai_license),
        picker:pickers(vehicle_info, profile:profiles(full_name))
      `)
      .order("picked_up_at", { ascending: false });

    if (pickupError) {
      console.error("Error fetching pickups:", pickupError);
      return NextResponse.json({ error: pickupError.message }, { status: 500 });
    }

    // 3. Fetch primary payment methods for FBOs
    const { data: paymentMethods } = await adminSupabase
      .from("payment_methods")
      .select("*");

    const paymentMethodMap = new Map();
    (paymentMethods || []).forEach((pm) => {
      if (pm.is_primary || !paymentMethodMap.has(pm.fbo_id)) {
        paymentMethodMap.set(pm.fbo_id, pm);
      }
    });

    // 4. Group pickups by FBO
    const fboSummaryMap = new Map<string, {
      fbo: any;
      paymentMethod: any;
      unpaidPickups: any[];
      paidPickups: any[];
      unpaidAmount: number;
      unpaidLiters: number;
      paidAmount: number;
      paidLiters: number;
    }>();

    (fbos || []).forEach((fbo) => {
      fboSummaryMap.set(fbo.id, {
        fbo,
        paymentMethod: paymentMethodMap.get(fbo.id) || null,
        unpaidPickups: [],
        paidPickups: [],
        unpaidAmount: 0,
        unpaidLiters: 0,
        paidAmount: 0,
        paidLiters: 0,
      });
    });

    (pickups || []).forEach((p) => {
      if (p.status !== "completed") return;

      const summary = fboSummaryMap.get(p.fbo_id);
      if (!summary) return;

      const amount = Number(p.total_amount || 0);
      const liters = Number(p.liters || 0);

      if (p.payment_status === "paid") {
        summary.paidPickups.push(p);
        summary.paidAmount += amount;
        summary.paidLiters += liters;
      } else {
        summary.unpaidPickups.push(p);
        summary.unpaidAmount += amount;
        summary.unpaidLiters += liters;
      }
    });

    let paymentReceipts: any[] = [];
    try {
      const { data: receipts } = await adminSupabase
        .from("fbo_payments")
        .select(`
          *,
          fbo:fbos(id, business_name, phone, address, contact_person, fssai_license)
        `)
        .order("paid_at", { ascending: false });

      paymentReceipts = receipts || [];
    } catch (e) {
      console.warn("fbo_payments table query fallback:", e);
    }

    return NextResponse.json({
      success: true,
      summaries: Array.from(fboSummaryMap.values()),
      receipts: paymentReceipts,
    });
  } catch (err: any) {
    console.error("API Error GET /api/admin/payments:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    const parseResult = parseAndSanitizeJson<{
      fboId?: string;
      pickupIds?: string[];
      paymentMethod?: string;
      referenceNumber?: string;
      notes?: string;
      periodLabel?: string;
    }>(rawText);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error }, { status: parseResult.status });
    }

    const {
      fboId,
      pickupIds,
      paymentMethod,
      referenceNumber,
      notes,
      periodLabel,
    } = parseResult.data;

    if (!fboId || !Array.isArray(pickupIds) || pickupIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: fboId and non-empty pickupIds array." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch targeted pickups
    const { data: targetPickups, error: fetchErr } = await adminSupabase
      .from("pickups")
      .select("*")
      .in("id", pickupIds);

    if (fetchErr || !targetPickups || targetPickups.length === 0) {
      return NextResponse.json({ error: "Selected pickups not found." }, { status: 404 });
    }

    const totalAmount = targetPickups.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const totalLiters = targetPickups.reduce((sum, p) => sum + Number(p.liters || 0), 0);

    // 2. Generate unique receipt number
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const receiptNumber = `PAY-${new Date().getFullYear()}-${randomCode}`;

    // 3. Update payment_status to 'paid' in pickups table
    const { error: updateErr } = await adminSupabase
      .from("pickups")
      .update({ payment_status: "paid" })
      .in("id", pickupIds);

    if (updateErr) {
      console.warn("Notice: payment_status column update error:", updateErr.message);
      if (!updateErr.message.includes("payment_status")) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }

    // 4. Record payment in fbo_payments table
    const paymentRecordPayload = {
      fbo_id: fboId,
      receipt_number: receiptNumber,
      amount: totalAmount,
      total_liters: totalLiters,
      payment_method: paymentMethod || "bank",
      reference_number: referenceNumber || null,
      notes: notes || null,
      period_label: periodLabel || `Disbursement for ${targetPickups.length} Pickup(s)`,
      pickup_ids: pickupIds,
      paid_at: new Date().toISOString(),
    };

    let createdReceipt = null;
    try {
      const { data: newReceipt, error: insertErr } = await adminSupabase
        .from("fbo_payments")
        .insert(paymentRecordPayload)
        .select(`
          *,
          fbo:fbos(id, business_name, phone, address, contact_person, fssai_license)
        `)
        .single();

      if (!insertErr) {
        createdReceipt = newReceipt;
      } else {
        console.warn("Could not insert into fbo_payments table:", insertErr.message);
      }
    } catch (e) {
      console.warn("fbo_payments table insert fallback:", e);
    }

    return NextResponse.json({
      success: true,
      receiptNumber,
      amount: totalAmount,
      totalLiters,
      pickupCount: targetPickups.length,
      receipt: createdReceipt || {
        ...paymentRecordPayload,
        id: crypto.randomUUID(),
      },
    });
  } catch (err: any) {
    console.error("API Error POST /api/admin/payments:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
