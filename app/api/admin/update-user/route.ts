import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    if (!profile || (requesterRole !== "admin" && requesterRole !== "sub_admin")) {
      return NextResponse.json({ error: "Forbidden: Admin or Sub-Admin role required" }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
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

    // Only Super Admin can modify or delete another Sub-Admin
    if (targetRole === "sub_admin" && requesterRole !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only Super Admin can manage Sub-Admin accounts" }, { status: 403 });
    }

    // 4. Execute requested action

    // ACTION: Delete Sub-Admin
    if (action === "delete") {
      if (targetRole !== "sub_admin") {
        return NextResponse.json({ error: "Delete action is currently only allowed for Sub-Admin accounts" }, { status: 400 });
      }

      // Delete permissions
      await adminClient.from("sub_admin_permissions").delete().eq("profile_id", userId);
      // Delete profile
      await adminClient.from("profiles").delete().eq("id", userId);
      // Delete auth user
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

      // Ban or unban user credentials in Supabase Auth across all roles (fbo, picker, sub_admin)
      if (!isActive) {
        await adminClient.auth.admin.updateUserById(userId, { ban_duration: "876000h" }); // Ban for ~100 yrs
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
      if (!password || password.trim().length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
      }

      const cleanPassword = password.trim();

      // Update auth system password
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: cleanPassword,
      });

      if (authUpdateError) {
        return NextResponse.json({ error: "Failed to update authentication password: " + authUpdateError.message }, { status: 500 });
      }

      // Update generated_password in profiles for directory tracking
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
      // Update profile fields
      const profileUpdates: Record<string, any> = {};
      if (fullName !== undefined) profileUpdates.full_name = fullName.trim();
      if (phone !== undefined) profileUpdates.phone = phone ? phone.trim() : null;
      if (username !== undefined && username.trim()) profileUpdates.username = username.trim().toLowerCase();

      if (Object.keys(profileUpdates).length > 0) {
        const { error: pErr } = await adminClient
          .from("profiles")
          .update(profileUpdates)
          .eq("id", userId);

        if (pErr) {
          return NextResponse.json({ error: "Failed to update profile details: " + pErr.message }, { status: 500 });
        }
      }

      // If username changed for sub_admin, sync Auth email
      if (targetRole === "sub_admin" && username !== undefined) {
        const newUsername = username.trim().toLowerCase();
        const internalEmail = `${newUsername}@mellod.internal`;
        await adminClient.auth.admin.updateUserById(userId, {
          email: internalEmail,
          email_confirm: true,
        });
      }

      // Update role-specific fields for FBO / Picker
      if (targetRole === "fbo") {
        const fboUpdates: Record<string, any> = {};
        if (businessName !== undefined) fboUpdates.business_name = businessName.trim();
        if (contactPerson !== undefined) fboUpdates.contact_person = contactPerson.trim();
        if (phone !== undefined) fboUpdates.phone = phone ? phone.trim() : null;
        if (address !== undefined) fboUpdates.address = address ? address.trim() : null;
        if (fssaiLicense !== undefined) fboUpdates.fssai_license = fssaiLicense ? fssaiLicense.trim() : null;
        if (latitude !== undefined) fboUpdates.latitude = latitude;
        if (longitude !== undefined) fboUpdates.longitude = longitude;

        if (Object.keys(fboUpdates).length > 0) {
          const { error: fboErr } = await adminClient
            .from("fbos")
            .update(fboUpdates)
            .eq("profile_id", userId);

          if (fboErr) {
            return NextResponse.json({ error: "Failed to update FBO details: " + fboErr.message }, { status: 500 });
          }
        }
      } else if (targetRole === "picker") {
        const pickerUpdates: Record<string, any> = {};
        if (vehicleInfo !== undefined) pickerUpdates.vehicle_info = vehicleInfo ? vehicleInfo.trim() : null;

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
