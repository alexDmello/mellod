"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import {
  IndianRupee,
  TrendingUp,
  History,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  Lock,
  Key,
  Users,
  Eye,
  EyeOff,
  Settings,
  X,
  AlertCircle,
  Edit3,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Phone,
  Shield,
  Save,
  Plus,
  Sliders,
  ChevronRight,
  Building2,
} from "lucide-react";
import { ADMIN_SECTIONS } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

interface PriceRecord {
  id: string;
  price_per_liter: number;
  currency: string;
  effective_from: string;
  created_at: string;
}

interface StaffProfile {
  id: string;
  full_name: string;
  username: string;
  phone: string | null;
  role: string;
  created_at: string;
  generated_password?: string;
  allowed_routes: string[];
  is_active?: boolean;
}

interface RoleTemplate {
  id: string;
  role_key: string;
  role_name: string;
  description: string | null;
  default_routes: string[];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "roles" | "marketprice">("staff");

  // Market price state
  const [currentPrice, setCurrentPrice] = useState<PriceRecord | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [inputPrice, setInputPrice] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(true);
  const [priceSuccess, setPriceSuccess] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Staff accounts & Roles state
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [rolesList, setRolesList] = useState<RoleTemplate[]>([]);
  const [fetchingStaff, setFetchingStaff] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Staff creation form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("sub_admin");
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([
    "/admin",
    "/admin/onboarding",
    "/admin/routes",
  ]);

  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);

  // Role creation form state
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleRoutes, setNewRoleRoutes] = useState<string[]>([
    "/admin",
    "/admin/pickers",
    "/admin/routes",
  ]);
  const [creatingRole, setCreatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Edit Role modal state
  const [editingRole, setEditingRole] = useState<RoleTemplate | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDesc, setEditRoleDesc] = useState("");
  const [editRoleRoutes, setEditRoleRoutes] = useState<string[]>([]);
  const [savingRole, setSavingRole] = useState(false);

  // Delete Role modal state
  const [deletingRole, setDeletingRole] = useState<RoleTemplate | null>(null);
  const [deletingRoleAction, setDeletingRoleAction] = useState(false);

  // Edit staff details modal state
  const [editingStaffDetails, setEditingStaffDetails] = useState<StaffProfile | null>(null);
  const [editDetailForm, setEditDetailForm] = useState({ fullName: "", username: "", phone: "", role: "sub_admin" });
  const [savingDetails, setSavingDetails] = useState(false);

  // Change staff password modal state
  const [passwordStaff, setPasswordStaff] = useState<StaffProfile | null>(null);
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [showNewStaffPassword, setShowNewStaffPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete staff modal state
  const [deletingStaff, setDeletingStaff] = useState<StaffProfile | null>(null);
  const [deletingStaffAction, setDeletingStaffAction] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchPrices();
    fetchStaffAndRoles();
  }, []);

  async function fetchPrices() {
    setFetchingPrice(true);
    const { data } = await supabase
      .from("daily_prices")
      .select("*")
      .order("effective_from", { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      setCurrentPrice(data[0]);
      setPriceHistory(data);
    }
    setFetchingPrice(false);
  }

  async function fetchStaffAndRoles() {
    setFetchingStaff(true);
    try {
      // 1. Fetch staff accounts
      const resStaff = await fetch("/api/admin/sub-admins/permissions");
      const jsonStaff = await resStaff.json();
      if (jsonStaff.staff) {
        setStaffList(jsonStaff.staff);
      }

      // 2. Fetch role templates
      const resRoles = await fetch("/api/admin/roles");
      const jsonRoles = await resRoles.json();
      if (jsonRoles.roles) {
        setRolesList(jsonRoles.roles);
      }
    } catch (err) {
      console.error("Failed to fetch staff/roles:", err);
    } finally {
      setFetchingStaff(false);
    }
  }

  function openCreateStaffModal() {
    const firstRole = rolesList[0];
    if (firstRole) {
      setSelectedRole(firstRole.role_key);
      if (Array.isArray(firstRole.default_routes)) {
        setSelectedRoutes(firstRole.default_routes);
      }
    } else {
      setSelectedRole("sub_admin");
      setSelectedRoutes(["/admin"]);
    }
    setStaffError(null);
    setShowCreateModal(true);
  }

  // When role selection changes during creation, auto-fill default routes for that role
  function handleRoleSelectChange(roleKey: string) {
    setSelectedRole(roleKey);
    const matchedRole = rolesList.find((r) => r.role_key === roleKey);
    if (matchedRole && Array.isArray(matchedRole.default_routes)) {
      setSelectedRoutes(matchedRole.default_routes);
    }
  }

  async function handleSetPrice(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(inputPrice);
    if (isNaN(price) || price <= 0) {
      setPriceError("Please enter a valid price greater than 0.");
      return;
    }

    setLoadingPrice(true);
    setPriceError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("daily_prices").insert({
      price_per_liter: price,
      currency: "INR",
      set_by: user?.id ?? null,
      effective_from: new Date().toISOString(),
    });

    if (insertError) {
      setPriceError(insertError.message);
    } else {
      setPriceSuccess(true);
      setInputPrice("");
      await fetchPrices();
      setTimeout(() => setPriceSuccess(false), 3000);
    }
    setLoadingPrice(false);
  }

  function toggleRouteSelection(route: string, target: "create" | "newrole" | "editrole") {
    if (target === "newrole") {
      setNewRoleRoutes((prev) =>
        prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]
      );
    } else if (target === "editrole") {
      setEditRoleRoutes((prev) =>
        prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]
      );
    } else {
      setSelectedRoutes((prev) =>
        prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]
      );
    }
  }

  function handleSelectAllRoutes(target: "create" | "newrole" | "editrole") {
    const all = ADMIN_SECTIONS.map((s) => s.href);
    if (target === "newrole") setNewRoleRoutes(all);
    else if (target === "editrole") setEditRoleRoutes(all);
    else setSelectedRoutes(all);
  }

  function handleClearAllRoutes(target: "create" | "newrole" | "editrole") {
    if (target === "newrole") setNewRoleRoutes([]);
    else if (target === "editrole") setEditRoleRoutes([]);
    else setSelectedRoutes([]);
  }

  async function handleCreateStaffAccount(e: React.FormEvent) {
    e.preventDefault();
    setStaffError(null);
    setStaffSuccess(null);

    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setStaffError("Full name, username, and password are required.");
      return;
    }

    if (selectedRoutes.length === 0) {
      setStaffError("Please select at least one accessible option/section.");
      return;
    }

    setCreatingStaff(true);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedRole,
          username: username.trim(),
          password: password.trim(),
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          allowedRoutes: selectedRoutes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create staff account");
      }

      setStaffSuccess(`Account created for ${fullName} with role '${selectedRole}'!`);
      setFullName("");
      setUsername("");
      setPassword("");
      setPhone("");
      setShowCreateModal(false);
      await fetchStaffAndRoles();
    } catch (err: any) {
      setStaffError(err.message || "Failed to create staff account.");
    } finally {
      setCreatingStaff(false);
    }
  }

  async function handleCreateRoleTemplate(e: React.FormEvent) {
    e.preventDefault();
    setRoleError(null);

    if (!newRoleName.trim()) {
      setRoleError("Role name is required.");
      return;
    }

    if (newRoleRoutes.length === 0) {
      setRoleError("Select at least one default option/route for this role.");
      return;
    }

    setCreatingRole(true);

    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: newRoleName.trim(),
          description: newRoleDesc.trim() || null,
          defaultRoutes: newRoleRoutes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create role template.");
      }

      setNewRoleName("");
      setNewRoleDesc("");
      setShowRoleModal(false);
      await fetchStaffAndRoles();
    } catch (err: any) {
      setRoleError(err.message || "Failed to create role template.");
    } finally {
      setCreatingRole(false);
    }
  }

  async function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRole || !editRoleName.trim()) return;
    setSavingRole(true);

    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleKey: editingRole.role_key,
          roleName: editRoleName.trim(),
          description: editRoleDesc.trim() || null,
          defaultRoutes: editRoleRoutes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update role.");
      }

      setEditingRole(null);
      await fetchStaffAndRoles();
    } catch (err: any) {
      alert(err.message || "Error updating role");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleDeleteRole() {
    if (!deletingRole) return;
    setDeletingRoleAction(true);

    try {
      const res = await fetch(`/api/admin/roles?roleKey=${encodeURIComponent(deletingRole.role_key)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete role.");
      }

      setDeletingRole(null);
      await fetchStaffAndRoles();
    } catch (err: any) {
      alert(err.message || "Error deleting role");
    } finally {
      setDeletingRoleAction(false);
    }
  }

  async function handleSaveDetails() {
    if (!editingStaffDetails) return;
    setSavingDetails(true);

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingStaffDetails.id,
          action: "update_details",
          fullName: editDetailForm.fullName.trim(),
          username: editDetailForm.username.trim(),
          phone: editDetailForm.phone.trim() || null,
          role: editDetailForm.role,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user details.");
      }

      // Sync route permissions with the assigned role template
      const matchedRole = rolesList.find((r) => r.role_key === editDetailForm.role);
      if (matchedRole && Array.isArray(matchedRole.default_routes)) {
        await fetch("/api/admin/sub-admins/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: editingStaffDetails.id,
            allowedRoutes: matchedRole.default_routes,
          }),
        });
      }

      setEditingStaffDetails(null);
      await fetchStaffAndRoles();
    } catch (err: any) {
      alert(err.message || "Error saving user details");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleSavePassword() {
    if (!passwordStaff || !newStaffPassword.trim()) return;
    setSavingPassword(true);

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: passwordStaff.id,
          action: "reset_password",
          newPassword: newStaffPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPasswordStaff(null);
      setNewStaffPassword("");
      await fetchStaffAndRoles();
    } catch (err: any) {
      alert(err.message || "Error updating password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleToggleOffboard(staff: StaffProfile) {
    setDeletingStaffAction(true);
    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: staff.id,
          action: "toggle_status",
          isActive: staff.is_active === false ? true : false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to toggle status.");
      }

      setDeletingStaff(null);
      await fetchStaffAndRoles();
    } catch (err: any) {
      alert(err.message || "Error toggling account status");
    } finally {
      setDeletingStaffAction(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="mesh-gradient-emerald p-6 rounded-[2rem] border border-emerald-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-300/50 px-3 py-1 rounded-full">
              SETTINGS // SYS.ROLES
            </span>
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Roles &amp; System Settings
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Manage custom role templates, staff user accounts, and baseline market UCO procurement rates.
          </p>
        </div>

        <button
          onClick={fetchStaffAndRoles}
          className="p-2.5 px-4 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-bold font-mono transition-all shadow-2xs flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${fetchingStaff ? "animate-spin text-emerald-600" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {staffSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center gap-2 font-mono font-semibold">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {staffSuccess}
        </div>
      )}

      {/* Pill Tabs Bar */}
      <div className="flex p-1.5 rounded-full bg-slate-200/60 backdrop-blur-md border border-slate-300/60 self-start flex-wrap shadow-inner gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`relative z-10 px-5 py-2.5 rounded-full text-xs font-bold font-mono transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === "staff" ? "text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {activeTab === "staff" && (
            <motion.div
              layoutId="settingsTabActivePill"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 bg-slate-900 rounded-full shadow-md shadow-slate-900/20"
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff &amp; User Accounts ({staffList.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`relative z-10 px-5 py-2.5 rounded-full text-xs font-bold font-mono transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === "roles" ? "text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {activeTab === "roles" && (
            <motion.div
              layoutId="settingsTabActivePill"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 bg-slate-900 rounded-full shadow-md shadow-slate-900/20"
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Role Templates &amp; Presets ({rolesList.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("marketprice")}
          className={`relative z-10 px-5 py-2.5 rounded-full text-xs font-bold font-mono transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === "marketprice" ? "text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {activeTab === "marketprice" && (
            <motion.div
              layoutId="settingsTabActivePill"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 bg-slate-900 rounded-full shadow-md shadow-slate-900/20"
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Market UCO Pricing
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* TAB 1: STAFF & USER ACCOUNTS */}
          {activeTab === "staff" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-5 rounded-[2rem] border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">01/03</span>
                    <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-700" />
                      Staff Accounts &amp; Roles
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Create staff credentials by assigning a defined Role Template. Section access permissions are automatically inherited from the selected role.
                  </p>
                </div>

                <button
                  onClick={openCreateStaffModal}
                  className="btn btn-primary text-xs py-2.5 px-5 font-bold font-mono rounded-full flex items-center gap-2 shadow-sm self-start sm:self-auto"
                >
                  <UserPlus className="w-4 h-4" />
                  + Create Staff Account
                </button>
              </div>

              {fetchingStaff ? (
                <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
                  <Loader2 className="w-6 h-6 animate-spin text-green-700 mx-auto mb-2" />
                  Loading staff accounts...
                </div>
              ) : staffList.length === 0 ? (
                <div className="card p-12 text-center text-gray-400 bg-white">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="font-bold text-gray-700 text-sm">No internal staff accounts found</p>
                  <p className="text-xs text-gray-400 mt-1">Create accounts for staff or sub-admins to delegate portal access.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {staffList.map((sa) => (
                    <div key={sa.id} className="card p-5 bg-white border border-gray-200 shadow-sm space-y-4 hover:border-green-300 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-100 text-green-800 flex items-center justify-center font-bold flex-shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 text-base">{sa.full_name}</h3>
                              <span className="badge bg-green-100 text-green-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
                                Role: {sa.role}
                              </span>
                              {sa.is_active === false && (
                                <span className="badge bg-red-100 text-red-700 text-[10px] font-bold">Offboarded</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Username: <span className="font-mono font-bold text-gray-700">{sa.username}</span> {sa.phone ? `· Phone: ${sa.phone}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingStaffDetails(sa);
                              setEditDetailForm({ fullName: sa.full_name, username: sa.username, phone: sa.phone || "", role: sa.role });
                            }}
                            className="btn btn-secondary text-xs py-1.5 px-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold flex items-center gap-1.5"
                            title="Edit Details"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit Details</span>
                          </button>

                          <button
                            onClick={() => {
                              setPasswordStaff(sa);
                              setNewStaffPassword("");
                            }}
                            className="btn btn-secondary text-xs py-1.5 px-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold"
                            title="Change Password"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                          </button>

                          <button
                            onClick={() => setDeletingStaff(sa)}
                            className={`btn text-xs py-1.5 px-2.5 border font-semibold ${
                              sa.is_active === false
                                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                            }`}
                            title={sa.is_active === false ? "Reactivate Account" : "Offboard Account"}
                          >
                            {sa.is_active === false ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Section Access Preview Pills */}
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">
                          Authorized Admin Sections ({sa.allowed_routes?.length || 0}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ADMIN_SECTIONS.map((sec) => {
                            const isAllowed = sa.allowed_routes?.includes(sec.href);
                            return (
                              <span
                                key={sec.href}
                                className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-all ${
                                  isAllowed
                                    ? "bg-green-700 text-white font-bold"
                                    : "bg-gray-200 text-gray-400 line-through opacity-60"
                                }`}
                              >
                                {sec.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ROLE TEMPLATES & PRESETS */}
          {activeTab === "roles" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                  <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-700" />
                    Role Templates & Default Presets
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Create, edit, or delete role templates (e.g., Regional Supervisor, Auditor) and define their default section permissions.
                  </p>
                </div>

                <button
                  onClick={() => setShowRoleModal(true)}
                  className="btn btn-primary text-xs py-2 px-4 font-bold flex items-center gap-2 shadow-sm self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  + Create New Role Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rolesList.map((rt) => (
                  <div key={rt.role_key} className="card p-5 bg-white border border-gray-200 shadow-sm space-y-3 hover:border-green-300 transition-all">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{rt.role_name}</h3>
                        <span className="font-mono text-[11px] text-gray-400">role_key: {rt.role_key}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="badge bg-green-100 text-green-800 text-[10px] font-bold">
                          {rt.default_routes?.length || 0} Sections
                        </span>

                        <button
                          onClick={() => {
                            setEditingRole(rt);
                            setEditRoleName(rt.role_name);
                            setEditRoleDesc(rt.description || "");
                            setEditRoleRoutes(rt.default_routes || []);
                          }}
                          className="btn btn-secondary text-xs p-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold"
                          title="Edit Role Template"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        </button>

                        <button
                          onClick={() => setDeletingRole(rt)}
                          className="btn btn-secondary text-xs p-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold"
                          title="Delete Role Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {rt.description && (
                      <p className="text-xs text-gray-600">{rt.description}</p>
                    )}

                    <div className="bg-gray-50 p-3 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Default Allowed Sections:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {ADMIN_SECTIONS.map((sec) => {
                          const isAllowed = rt.default_routes?.includes(sec.href);
                          return (
                            <span
                              key={sec.href}
                              className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                isAllowed ? "bg-green-100 text-green-900 border border-green-200 font-bold" : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {sec.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MARKET PRICE SETTINGS */}
          {activeTab === "marketprice" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card p-6 bg-white space-y-4 lg:col-span-1">
                <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-green-700" />
                  Update Daily UCO Price
                </h2>
                <p className="text-xs text-gray-500">
                  Set the benchmark rate (₹/Liter) offered to FBOs for verified oil collections.
                </p>

                <form onSubmit={handleSetPrice} className="space-y-4">
                  <div>
                    <label className="font-semibold text-xs text-gray-700 block mb-1">New Price per Liter (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 52.50"
                      className="form-input text-base font-bold font-mono"
                      value={inputPrice}
                      onChange={(e) => setInputPrice(e.target.value)}
                    />
                  </div>

                  {priceError && <p className="text-xs text-red-600 font-semibold">{priceError}</p>}
                  {priceSuccess && <p className="text-xs text-green-700 font-bold">Daily market price updated successfully!</p>}

                  <button
                    type="submit"
                    disabled={loadingPrice}
                    className="btn btn-primary w-full text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                  >
                    {loadingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Publish New Benchmark Rate
                  </button>
                </form>
              </div>

              <div className="card p-6 bg-white lg:col-span-2 space-y-4">
                <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-700" />
                  Recent UCO Price History
                </h2>

                {fetchingPrice ? (
                  <div className="p-8 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-green-700 mx-auto" />
                  </div>
                ) : priceHistory.length === 0 ? (
                  <p className="text-xs text-gray-400">No price records found.</p>
                ) : (
                  <div className="space-y-2">
                    {priceHistory.map((ph, idx) => (
                      <div key={ph.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-gray-900 text-sm">{formatCurrency(ph.price_per_liter)} / Liter</span>
                          <span className="text-gray-400 block text-[11px]">Effective from {new Date(ph.effective_from).toLocaleString()}</span>
                        </div>
                        {idx === 0 && <span className="badge bg-green-100 text-green-800 text-[10px] font-bold">Active Rate</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* MODAL 1: CREATE STAFF ACCOUNT */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 bg-green-800 text-white">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-300" />
                <h3 className="font-bold text-base">Create Staff Account & Assign Access</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-green-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaffAccount} className="p-5 space-y-4 text-xs overflow-y-auto">
              {staffError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {staffError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    className="form-input text-xs"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Username *</label>
                  <input
                    type="text"
                    placeholder="e.g. ramesh_mgr"
                    className="form-input text-xs font-mono"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Assigned Role *</label>
                  <select
                    className="form-select text-xs font-bold"
                    value={selectedRole}
                    onChange={(e) => handleRoleSelectChange(e.target.value)}
                  >
                    {rolesList.map((r) => (
                      <option key={r.role_key} value={r.role_key}>
                        {r.role_name} ({r.role_key})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    className="form-input text-xs"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Initial Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Set account password"
                    className="form-input text-xs pr-8 font-mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Inherited Role Template Permissions Summary */}
              <div className="border border-green-200 p-4 rounded-xl bg-green-50/50 space-y-2">
                <div className="flex items-center justify-between border-b border-green-200/60 pb-2">
                  <div>
                    <span className="font-bold text-gray-900 block">Inherited Role Section Access</span>
                    <span className="text-[11px] text-gray-500">Accessible sections are assigned directly from the selected Role Template.</span>
                  </div>
                  <span className="badge bg-green-100 text-green-800 text-[10px] font-bold">
                    {selectedRoutes.length} Accessible Sections
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ADMIN_SECTIONS.map((sec) => {
                    const isAllowed = selectedRoutes.includes(sec.href);
                    return (
                      <span
                        key={sec.href}
                        className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-all ${
                          isAllowed
                            ? "bg-green-700 text-white font-bold shadow-sm"
                            : "bg-gray-200/70 text-gray-400 line-through opacity-50"
                        }`}
                      >
                        {sec.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={creatingStaff} className="btn btn-primary text-xs px-5 py-2 font-bold flex items-center gap-1.5">
                  {creatingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE ROLE TEMPLATE */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 bg-green-800 text-white">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-300" />
                <h3 className="font-bold text-base">Create New Role Template</h3>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="text-green-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoleTemplate} className="p-5 space-y-4 text-xs">
              {roleError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {roleError}
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Role Title / Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Regional Supervisor or Quality Inspector"
                  className="form-input text-xs"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Oversees quality checks, picker routes, and onboarding"
                  className="form-input text-xs"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                />
              </div>

              <div className="border border-gray-200 p-3.5 rounded-xl bg-gray-50 space-y-2">
                <span className="font-bold text-gray-900 block">Default Allowed Sections for this Role</span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {ADMIN_SECTIONS.map((sec) => {
                    const checked = newRoleRoutes.includes(sec.href);
                    return (
                      <label
                        key={sec.href}
                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 cursor-pointer ${
                          checked ? "bg-green-50 border-green-300 text-green-900 font-bold" : "bg-white border-gray-200 text-gray-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRouteSelection(sec.href, "newrole")}
                          className="rounded text-green-700 focus:ring-green-700"
                        />
                        <span>{sec.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setShowRoleModal(false)} className="btn btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={creatingRole} className="btn btn-primary text-xs px-5 py-2 font-bold">
                  {creatingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Role Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2B: EDIT ROLE TEMPLATE */}
      {editingRole && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 bg-green-800 text-white">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-300" />
                <h3 className="font-bold text-base">Edit Role Template ({editingRole.role_name})</h3>
              </div>
              <button onClick={() => setEditingRole(null)} className="text-green-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Role Title / Name *</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Description</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                />
              </div>

              <div className="border border-gray-200 p-3.5 rounded-xl bg-gray-50 space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-gray-900 block">Default Allowed Sections for this Role</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button type="button" onClick={() => handleSelectAllRoutes("editrole")} className="text-green-700 font-bold hover:underline">
                      Select All
                    </button>
                    <span>·</span>
                    <button type="button" onClick={() => handleClearAllRoutes("editrole")} className="text-red-600 font-bold hover:underline">
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {ADMIN_SECTIONS.map((sec) => {
                    const checked = editRoleRoutes.includes(sec.href);
                    return (
                      <label
                        key={sec.href}
                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 cursor-pointer ${
                          checked ? "bg-green-50 border-green-300 text-green-900 font-bold" : "bg-white border-gray-200 text-gray-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRouteSelection(sec.href, "editrole")}
                          className="rounded text-green-700 focus:ring-green-700"
                        />
                        <span>{sec.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setEditingRole(null)} className="btn btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={savingRole} className="btn btn-primary text-xs px-5 py-2 font-bold flex items-center gap-1.5">
                  {savingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Role Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2C: DELETE ROLE TEMPLATE CONFIRMATION */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 bg-red-800 text-white">
              <h3 className="font-bold text-base">Confirm Role Template Deletion</h3>
              <button onClick={() => setDeletingRole(null)} className="text-red-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-gray-700 font-medium">
                Are you sure you want to delete the role template <strong className="text-gray-900">{deletingRole.role_name}</strong>?
              </p>
              <p className="text-[11px] text-gray-500">
                This will remove the role template preset. Existing staff accounts assigned to this role key will retain their individual section permissions.
              </p>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setDeletingRole(null)} className="btn btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRole}
                  disabled={deletingRoleAction}
                  className="btn btn-danger text-xs px-5 py-2 font-bold flex items-center gap-1.5"
                >
                  {deletingRoleAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Confirm Delete Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* MODAL 4: EDIT DETAILS */}
      {editingStaffDetails && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
              <h3 className="font-bold text-base">Edit Account Details</h3>
              <button onClick={() => setEditingStaffDetails(null)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  value={editDetailForm.fullName}
                  onChange={(e) => setEditDetailForm({ ...editDetailForm, fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Username</label>
                <input
                  type="text"
                  className="form-input text-xs font-mono"
                  value={editDetailForm.username}
                  onChange={(e) => setEditDetailForm({ ...editDetailForm, username: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Assigned Role</label>
                <select
                  className="form-select text-xs font-bold"
                  value={editDetailForm.role}
                  onChange={(e) => setEditDetailForm({ ...editDetailForm, role: e.target.value })}
                >
                  {rolesList.map((r) => (
                    <option key={r.role_key} value={r.role_key}>
                      {r.role_name} ({r.role_key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Phone</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  value={editDetailForm.phone}
                  onChange={(e) => setEditDetailForm({ ...editDetailForm, phone: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setEditingStaffDetails(null)} className="btn btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveDetails} disabled={savingDetails} className="btn btn-primary text-xs px-5 py-2 font-bold">
                  {savingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CHANGE PASSWORD */}
      {passwordStaff && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 bg-amber-800 text-white">
              <h3 className="font-bold text-base">Change Password ({passwordStaff.full_name})</h3>
              <button onClick={() => setPasswordStaff(null)} className="text-amber-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewStaffPassword ? "text" : "password"}
                    className="form-input text-xs pr-8 font-mono"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewStaffPassword(!showNewStaffPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showNewStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setPasswordStaff(null)} className="btn btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
                <button type="button" onClick={handleSavePassword} disabled={savingPassword} className="btn btn-primary text-xs px-5 py-2 font-bold">
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: OFFBOARD/REACTIVATE CONFIRMATION */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 bg-red-800 text-white">
              <h3 className="font-bold text-base">Confirm Status Toggle</h3>
              <button onClick={() => setDeletingStaff(null)} className="text-red-200 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-gray-700 font-medium">
                Are you sure you want to {deletingStaff.is_active === false ? "reactivate" : "offboard"} account for{" "}
                <strong className="text-gray-900">{deletingStaff.full_name}</strong>?
              </p>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setDeletingStaff(null)} className="btn btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleOffboard(deletingStaff)}
                  disabled={deletingStaffAction}
                  className="btn btn-danger text-xs px-5 py-2 font-bold"
                >
                  {deletingStaffAction ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Toggle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MarketPriceTab() {
  const [currentPrice, setCurrentPrice] = useState<PriceRecord | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [inputPrice, setInputPrice] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(true);
  const [priceSuccess, setPriceSuccess] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchPrices();
  }, []);

  async function fetchPrices() {
    setFetchingPrice(true);
    const { data } = await supabase
      .from("daily_prices")
      .select("*")
      .order("effective_from", { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      setCurrentPrice(data[0]);
      setPriceHistory(data);
    }
    setFetchingPrice(false);
  }

  async function handleSetPrice(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(inputPrice);
    if (isNaN(price) || price <= 0) {
      setPriceError("Please enter a valid price greater than 0.");
      return;
    }

    setLoadingPrice(true);
    setPriceError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("daily_prices").insert({
      price_per_liter: price,
      currency: "INR",
      set_by: user?.id ?? null,
      effective_from: new Date().toISOString(),
    });

    if (insertError) {
      setPriceError(insertError.message);
    } else {
      setPriceSuccess(true);
      setInputPrice("");
      await fetchPrices();
      setTimeout(() => setPriceSuccess(false), 3000);
    }
    setLoadingPrice(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card p-6 bg-white space-y-4 lg:col-span-1 border border-gray-200">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-green-700" />
          Update Daily UCO Price
        </h2>
        <p className="text-xs text-gray-500">
          Set the benchmark rate (₹/Liter) offered to FBOs for verified oil collections.
        </p>

        <form onSubmit={handleSetPrice} className="space-y-4">
          <div>
            <label className="font-semibold text-xs text-gray-700 block mb-1">New Price per Liter (₹)</label>
            <input
              type="number"
              step="0.5"
              placeholder="e.g. 52.50"
              className="form-input text-base font-bold font-mono"
              value={inputPrice}
              onChange={(e) => setInputPrice(e.target.value)}
            />
          </div>

          {priceError && <p className="text-xs text-red-600 font-semibold">{priceError}</p>}
          {priceSuccess && <p className="text-xs text-green-700 font-bold">Daily market price updated successfully!</p>}

          <button
            type="submit"
            disabled={loadingPrice}
            className="btn btn-primary w-full text-xs py-2.5 font-bold flex items-center justify-center gap-2"
          >
            {loadingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Publish New Benchmark Rate
          </button>
        </form>
      </div>

      <div className="card p-6 bg-white lg:col-span-2 space-y-4 border border-gray-200">
        <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
          <History className="w-5 h-5 text-gray-700" />
          Recent UCO Price History
        </h2>

        {fetchingPrice ? (
          <div className="p-8 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-green-700 mx-auto" />
          </div>
        ) : priceHistory.length === 0 ? (
          <p className="text-xs text-gray-400">No price records found.</p>
        ) : (
          <div className="space-y-2">
            {priceHistory.map((ph, idx) => (
              <div key={ph.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-900 text-sm">{formatCurrency(ph.price_per_liter)} / Liter</span>
                  <span className="text-gray-400 block text-[11px]">Effective from {new Date(ph.effective_from).toLocaleString()}</span>
                </div>
                {idx === 0 && <span className="badge bg-green-100 text-green-800 text-[10px] font-bold">Active Rate</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
