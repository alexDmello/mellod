import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeInput } from "@/lib/security";

// In-memory fallback cache for environments before DB migration
let inMemoryEnquiries: Array<{
  id: string;
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  business_type: string;
  message: string;
  status: "pending" | "reviewed" | "contacted" | "converted" | "archived";
  notes: string;
  created_at: string;
  updated_at: string;
}> = [];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { business_name, contact_person, email, phone, business_type, message } = body;

    if (!business_name || !contact_person || !email || !phone) {
      return NextResponse.json(
        { error: "Business name, contact person, email, and phone number are required." },
        { status: 400 }
      );
    }

    const cleanBusinessName = sanitizeInput(business_name);
    const cleanContactPerson = sanitizeInput(contact_person);
    const cleanEmail = sanitizeInput(email);
    const cleanPhone = sanitizeInput(phone);
    const cleanBusinessType = business_type ? sanitizeInput(business_type) : "Other";
    const cleanMessage = message ? sanitizeInput(message) : "";

    const newEnquiry = {
      id: `enq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      business_name: cleanBusinessName,
      contact_person: cleanContactPerson,
      email: cleanEmail,
      phone: cleanPhone,
      business_type: cleanBusinessType,
      message: cleanMessage,
      status: "pending" as const,
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Attempt Supabase DB insert first
    try {
      const adminSupabase = createAdminClient();
      const { data, error } = await adminSupabase
        .from("website_enquiries")
        .insert({
          business_name: cleanBusinessName,
          contact_person: cleanContactPerson,
          email: cleanEmail,
          phone: cleanPhone,
          business_type: cleanBusinessType,
          message: cleanMessage,
          status: "pending",
        })
        .select("*")
        .single();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          message: "Enquiry submitted successfully.",
          enquiry: data,
        });
      }
    } catch (dbErr) {
      console.warn("Supabase website_enquiries table not available, using fallback storage:", dbErr);
    }

    // Fallback in-memory storage
    inMemoryEnquiries.unshift(newEnquiry);

    return NextResponse.json({
      success: true,
      message: "Enquiry submitted successfully.",
      enquiry: newEnquiry,
    });
  } catch (err: any) {
    console.error("Error submitting website enquiry:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit enquiry." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("search");

    // Try Supabase first
    try {
      const adminSupabase = createAdminClient();
      let query = adminSupabase.from("website_enquiries").select("*").order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (searchQuery) {
        query = query.or(`business_name.ilike.%${searchQuery}%,contact_person.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        const pendingCount = data.filter((e: any) => e.status === "pending").length;
        return NextResponse.json({
          success: true,
          enquiries: data,
          pending_count: pendingCount,
        });
      }
    } catch (dbErr) {
      console.warn("Supabase website_enquiries query fallback:", dbErr);
    }

    // Fallback search & filter on in-memory array
    let result = [...inMemoryEnquiries];
    if (statusFilter && statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.business_name.toLowerCase().includes(q) ||
          e.contact_person.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.phone.toLowerCase().includes(q)
      );
    }

    const pendingCount = inMemoryEnquiries.filter((e) => e.status === "pending").length;

    return NextResponse.json({
      success: true,
      enquiries: result,
      pending_count: pendingCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch website enquiries." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Enquiry ID is required." }, { status: 400 });
    }

    // Try Supabase first
    try {
      const adminSupabase = createAdminClient();
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (status) updatePayload.status = status;
      if (notes !== undefined) updatePayload.notes = sanitizeInput(notes);

      const { data, error } = await adminSupabase
        .from("website_enquiries")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          message: "Enquiry updated successfully.",
          enquiry: data,
        });
      }
    } catch (dbErr) {
      console.warn("Supabase website_enquiries patch fallback:", dbErr);
    }

    // In-memory update fallback
    const target = inMemoryEnquiries.find((e) => e.id === id);
    if (!target) {
      return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
    }

    if (status) target.status = status;
    if (notes !== undefined) target.notes = sanitizeInput(notes);
    target.updated_at = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: "Enquiry updated successfully.",
      enquiry: target,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update enquiry." },
      { status: 500 }
    );
  }
}
