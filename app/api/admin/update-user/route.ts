import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAndSanitizeJson, sanitizeInput } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Verify requester is authorized (admin or sub_admin)
    const userClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const requesterRole = (profile as any)?.role;
    if (!profile || requesterRole === "fbo" || requesterRole === "picker") {
      return NextResponse.json({ error: "Forbidden: Internal staff role required" }, { status: 403 });
    }

    // 2. Parse & sanitize request body
    const rawText = await request.text();
    const parseResult = parseAndSanitizeJson<Record<string, any>>(rawText);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error }, { status: parseResult.status });
    }

    const body = parseResult.data;
    const {
      userId,
      action,
      password,
      fullName,
      username,
      phone,
      vehicleInfo,
      businessName,
      contactPerson,
      address,
      fssaiLicense,
      latitude,
      longitude,
    } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing required fields: userId and action" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 3. Retrieve target user's profile
    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, role, full_name, username, generated_password")
      .eq("id", userId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: "Target user profile not found" }, { status: 404 });
    }

    const targetRole = targetProfile.role;

    // Only Super Admin can modify or delete staff/manager accounts
    if (targetRole !== "fbo" && targetRole !== "picker" && targetRole !== "admin" && requesterRole !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only Super Admin can manage staff accounts" }, { status: 403 });
    }

    // 4. Execute requested action

    // ACTION: Delete Staff Account
    if (action === "delete") {
      if (targetRole === "fbo" || targetRole === "picker" || targetRole === "admin") {
        return NextResponse.json({ error: "Delete action is currently only allowed for staff/sub-admin accounts" }, { status: 400 });
      }

      await adminClient.from("profiles").delete().eq("id", userId);
      const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteAuthErr) {
        console.error("Failed to delete auth user:", deleteAuthErr);
      }

      return NextResponse.json({
        success: true,
        message: `Sub-Admin account for ${targetProfile.full_name} deleted successfully.`,
      });
    }

    // ACTION: Offboard / Activate / Suspend
    if (action === "offboard" || action === "activate" || action === "suspend") {
      const isActive = action === "activate";

      if (targetRole === "fbo") {
        const { error: fboError } = await adminClient
          .from("fbos")
          .update({ is_active: isActive })
          .eq("profile_id", userId);

        if (fboError) {
          return NextResponse.json({ error: "Failed to update FBO status: " + fboError.message }, { status: 500 });
        }
      } else if (targetRole === "picker") {
        const { error: pickerError } = await adminClient
          .from("pickers")
          .update({ is_active: isActive })
          .eq("profile_id", userId);

        if (pickerError) {
          return NextResponse.json({ error: "Failed to update Picker status: " + pickerError.message }, { status: 500 });
        }
      }

      if (!isActive) {
        await adminClient.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      } else {
        await adminClient.auth.admin.updateUserById(userId, { ban_duration: "none" });
      }

      return NextResponse.json({
        success: true,
        message: `User ${targetProfile.full_name} has been ${isActive ? "activated" : action === "suspend" ? "suspended" : "offboarded"} successfully.`,
      });
    }

    // ACTION: Change Password
    if (action === "change_password") {
      if (!password || String(password).trim().length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
      }

      const cleanPassword = String(password).trim();

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: cleanPassword,
      });

      if (authUpdateError) {
        return NextResponse.json({ error: "Failed to update authentication password: " + authUpdateError.message }, { status: 500 });
      }

      const { error: profileUpdateError } = await adminClient
        .from("profiles")
        .update({ generated_password: cleanPassword })
        .eq("id", userId);

      if (profileUpdateError) {
        return NextResponse.json(
          { error: "Password updated in Auth, but failed to update profile record: " + profileUpdateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Password for ${targetProfile.full_name} updated successfully.`,
      });
    }

    // ACTION: Update Details
    if (action === "update_details") {
      const profileUpdates: Record<string, any> = {};
      if (fullName !== undefined) profileUpdates.full_name = sanitizeInput(fullName);
      if (phone !== undefined) profileUpdates.phone = phone ? sanitizeInput(phone) : null;
      if (username !== undefined && String(username).trim()) profileUpdates.username = sanitizeInput(username).toLowerCase();

      if (Object.keys(profileUpdates).length > 0) {
        const { error: pErr } = await adminClient
          .from("profiles")
          .update(profileUpdates)
          .eq("id", userId);

        if (pErr) {
          return NextResponse.json({ error: "Failed to update profile details: " + pErr.message }, { status: 500 });
        }
      }

      if (targetRole !== "fbo" && targetRole !== "picker" && targetRole !== "admin" && username !== undefined) {
        const newUsername = sanitizeInput(username).toLowerCase();
        const internalEmail = `${newUsername}@mellod.internal`;
        await adminClient.auth.admin.updateUserById(userId, {
          email: internalEmail,
          email_confirm: true,
        });
      }

      if (targetRole === "fbo") {
        const fboUpdates: Record<string, any> = {};
        if (businessName !== undefined) fboUpdates.business_name = sanitizeInput(businessName);
        if (contactPerson !== undefined) fboUpdates.contact_person = sanitizeInput(contactPerson);
        if (phone !== undefined) fboUpdates.phone = phone ? sanitizeInput(phone) : null;
        if (address !== undefined) fboUpdates.address = address ? sanitizeInput(address) : null;
        if (fssaiLicense !== undefined) fboUpdates.fssai_license = fssaiLicense ? sanitizeInput(fssaiLicense) : null;
        if (latitude !== undefined) fboUpdates.latitude = Number(latitude);
        if (longitude !== undefined) fboUpdates.longitude = Number(longitude);

        if (Object.keys(fboUpdates).length > 0) {
          const { error: fboErr } = await adminClient
            .from("fbos")
            .update(fboUpdates)
            .eq("profile_id", userId);

          if (fboErr) {
            return NextResponse.json({ error: "Failed to update FBO details: " + fboErr.message }, { status: 500 });
          }
        }

        if (body.upiId !== undefined) {
          const { data: fboRow } = await adminClient
            .from("fbos")
            .select("id")
            .eq("profile_id", userId)
            .single();

          if (fboRow?.id) {
            const cleanUpi = body.upiId ? sanitizeInput(String(body.upiId)) : null;

            const { data: existingMethods } = await adminClient
              .from("payment_methods")
              .select("id, method_type")
              .eq("fbo_id", fboRow.id);

            const upiMethod = (existingMethods || []).find((m: any) => m.method_type === "upi");

            if (cleanUpi) {
              if (upiMethod) {
                await adminClient
                  .from("payment_methods")
                  .update({ upi_id: cleanUpi })
                  .eq("id", upiMethod.id);
              } else {
                await adminClient.from("payment_methods").insert({
                  fbo_id: fboRow.id,
                  method_type: "upi",
                  upi_id: cleanUpi,
                  is_primary: true,
                });
              }
            } else if (upiMethod) {
              await adminClient.from("payment_methods").delete().eq("id", upiMethod.id);
            }
          }
        }

        if (
          body.accountHolder !== undefined ||
          body.bankName !== undefined ||
          body.accountNumber !== undefined ||
          body.ifscCode !== undefined
        ) {
          const { data: fboRow } = await adminClient
            .from("fbos")
            .select("id")
            .eq("profile_id", userId)
            .single();

          if (fboRow?.id) {
            const cleanHolder = body.accountHolder ? sanitizeInput(String(body.accountHolder)) : null;
            const cleanBank = body.bankName ? sanitizeInput(String(body.bankName)) : null;
            const cleanAcc = body.accountNumber ? sanitizeInput(String(body.accountNumber)) : null;
            const cleanIfsc = body.ifscCode ? sanitizeInput(String(body.ifscCode)).toUpperCase() : null;

            const { data: existingMethods } = await adminClient
              .from("payment_methods")
              .select("id, method_type")
              .eq("fbo_id", fboRow.id);

            const bankMethod = (existingMethods || []).find((m: any) => m.method_type === "bank");

            if (cleanAcc || cleanHolder || cleanBank || cleanIfsc) {
              if (bankMethod) {
                await adminClient
                  .from("payment_methods")
                  .update({
                    account_holder: cleanHolder,
                    bank_name: cleanBank,
                    account_number: cleanAcc,
                    ifsc_code: cleanIfsc,
                  })
                  .eq("id", bankMethod.id);
              } else {
                await adminClient.from("payment_methods").insert({
                  fbo_id: fboRow.id,
                  method_type: "bank",
                  account_holder: cleanHolder,
                  bank_name: cleanBank,
                  account_number: cleanAcc,
                  ifsc_code: cleanIfsc,
                  is_primary: false,
                });
              }
            } else if (bankMethod) {
              await adminClient.from("payment_methods").delete().eq("id", bankMethod.id);
            }
          }
        }
      } else if (targetRole === "picker") {
        const pickerUpdates: Record<string, any> = {};
        if (vehicleInfo !== undefined) pickerUpdates.vehicle_info = vehicleInfo ? sanitizeInput(vehicleInfo) : null;

        if (Object.keys(pickerUpdates).length > 0) {
          const { error: pickErr } = await adminClient
            .from("pickers")
            .update(pickerUpdates)
            .eq("profile_id", userId);

          if (pickErr) {
            return NextResponse.json({ error: "Failed to update Picker details: " + pickErr.message }, { status: 500 });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Details for ${targetProfile.full_name} updated successfully.`,
      });
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (err: any) {
    console.error("Error in update-user API route:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
