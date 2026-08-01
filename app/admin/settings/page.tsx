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
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Lock,
  Key,
  Users,
  Eye,
  EyeOff,
  Check,
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
  AlertTriangle
} from "lucide-react";
import { ADMIN_SECTIONS } from "@/lib/types";

interface PriceRecord {
  id: string;
  price_per_liter: number;
  currency: string;
  effective_from: string;
  created_at: string;
}

interface SubAdminProfile {
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"subadmins" | "marketprice">("subadmins");

  // Market price state
  const [currentPrice, setCurrentPrice] = useState<PriceRecord | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [inputPrice, setInputPrice] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(true);
  const [priceSuccess, setPriceSuccess] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Sub-admin state
  const [subAdmins, setSubAdmins] = useState<SubAdminProfile[]>([]);
  const [fetchingSubAdmins, setFetchingSubAdmins] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Sub-admin form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([
    "/admin",
    "/admin/onboarding",
    "/admin/routes",
  ]);

  const [creatingSubAdmin, setCreatingSubAdmin] = useState(false);
  const [subAdminError, setSubAdminError] = useState<string | null>(null);
  const [subAdminSuccess, setSubAdminSuccess] = useState<string | null>(null);

  // Edit permissions modal state
  const [editingSubAdminPerms, setEditingSubAdminPerms] = useState<SubAdminProfile | null>(null);
  const [editRoutes, setEditRoutes] = useState<string[]>([]);
  const [updatingPerms, setUpdatingPerms] = useState(false);

  // Edit sub-admin details modal state
  const [editingSubAdminDetails, setEditingSubAdminDetails] = useState<SubAdminProfile | null>(null);
  const [editDetailForm, setEditDetailForm] = useState({ fullName: "", username: "", phone: "" });
  const [savingDetails, setSavingDetails] = useState(false);

  // Change sub-admin password modal state
  const [passwordSubAdmin, setPasswordSubAdmin] = useState<SubAdminProfile | null>(null);
  const [newSubAdminPassword, setNewSubAdminPassword] = useState("");
  const [showNewSubAdminPassword, setShowNewSubAdminPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete sub-admin modal state
  const [deletingSubAdmin, setDeletingSubAdmin] = useState<SubAdminProfile | null>(null);
  const [deletingSubAdminAction, setDeletingSubAdminAction] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchPrices();
    fetchSubAdmins();
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

  async function fetchSubAdmins() {
    setFetchingSubAdmins(true);
    try {
      const res = await fetch("/api/admin/sub-admins/permissions");
      const json = await res.json();
      if (json.subAdmins) {
        setSubAdmins(json.subAdmins);
      }
    } catch (err) {
      console.error("Failed to fetch sub-admins:", err);
    } finally {
      setFetchingSubAdmins(false);
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

  function toggleRouteSelection(route: string, isEdit = false) {
    if (isEdit) {
      setEditRoutes((prev) =>
        prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]
      );
    } else {
      setSelectedRoutes((prev) =>
        prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]
      );
    }
  }

  function handleSelectAllRoutes(isEdit = false) {
    const all = ADMIN_SECTIONS.map((s) => s.href);
    if (isEdit) setEditRoutes(all);
    else setSelectedRoutes(all);
  }

  function handleClearAllRoutes(isEdit = false) {
    if (isEdit) setEditRoutes([]);
    else setSelectedRoutes([]);
  }

  async function handleCreateSubAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !username || !password) {
      setSubAdminError("Please fill in all required fields.");
      return;
    }

    if (selectedRoutes.length === 0) {
      setSubAdminError("Please select at least one permission section for the sub-admin.");
      return;
    }

    setCreatingSubAdmin(true);
    setSubAdminError(null);

    const cleanUsername = username.trim().toLowerCase();

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "Sub-Admin",
          fullName,
          username: cleanUsername,
          email: `${cleanUsername}@mellod.internal`,
          phone,
          password,
          allowedRoutes: selectedRoutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create sub-admin account.");
      }

      setSubAdminSuccess(`Sub-Admin account '${cleanUsername}' created successfully!`);
      setShowCreateModal(false);

      // Reset form
      setFullName("");
      setUsername("");
      setEmail("");
      setPhone("");
      setPassword("");
      setSelectedRoutes(["/admin", "/admin/onboarding", "/admin/routes"]);

      await fetchSubAdmins();
      setTimeout(() => setSubAdminSuccess(null), 4000);
    } catch (err: any) {
      setSubAdminError(err.message);
    } finally {
      setCreatingSubAdmin(false);
    }
  }

  async function handleUpdatePermissions() {
    if (!editingSubAdminPerms) return;
    setUpdatingPerms(true);

    try {
      const res = await fetch("/api/admin/sub-admins/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: editingSubAdminPerms.id,
          allowedRoutes: editRoutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update permissions");

      setSubAdminSuccess(`Permissions updated for ${editingSubAdminPerms.full_name}!`);
      setEditingSubAdminPerms(null);
      await fetchSubAdmins();
      setTimeout(() => setSubAdminSuccess(null), 4000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUpdatingPerms(false);
    }
  }

  // ── Handlers for Sub-Admin Professional Control ──────────────────────────────
  const openEditDetailsModal = (subAdmin: SubAdminProfile) => {
    setEditingSubAdminDetails(subAdmin);
    setEditDetailForm({
      fullName: subAdmin.full_name || "",
      username: subAdmin.username || "",
      phone: subAdmin.phone || "",
    });
  };

  const handleSaveSubAdminDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubAdminDetails) return;
    setSavingDetails(true);

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingSubAdminDetails.id,
          action: "update_details",
          fullName: editDetailForm.fullName,
          username: editDetailForm.username,
          phone: editDetailForm.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update sub-admin details");

      setSubAdminSuccess(`Profile updated for ${editDetailForm.fullName}!`);
      setEditingSubAdminDetails(null);
      await fetchSubAdmins();
      setTimeout(() => setSubAdminSuccess(null), 3000);
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const openPasswordModal = (subAdmin: SubAdminProfile) => {
    setPasswordSubAdmin(subAdmin);
    setNewSubAdminPassword("");
  };

  const handleGenerateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewSubAdminPassword(pwd);
  };

  const handleSaveSubAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordSubAdmin) return;
    if (!newSubAdminPassword || newSubAdminPassword.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: passwordSubAdmin.id,
          action: "change_password",
          password: newSubAdminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setSubAdminSuccess(`Password updated for ${passwordSubAdmin.full_name}!`);
      setPasswordSubAdmin(null);
      await fetchSubAdmins();
      setTimeout(() => setSubAdminSuccess(null), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleStatus = async (subAdmin: SubAdminProfile) => {
    const isCurrentlyActive = subAdmin.is_active !== false;
    const nextAction = isCurrentlyActive ? "suspend" : "activate";

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: subAdmin.id,
          action: nextAction,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${nextAction} account`);

      setSubAdminSuccess(`Account ${isCurrentlyActive ? "suspended" : "activated"} for ${subAdmin.full_name}!`);
      await fetchSubAdmins();
      setTimeout(() => setSubAdminSuccess(null), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteSubAdmin = async () => {
    if (!deletingSubAdmin) return;
    setDeletingSubAdminAction(true);

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deletingSubAdmin.id,
          action: "delete",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete sub-admin");

      setSubAdminSuccess(`Sub-Admin account '${deletingSubAdmin.username}' deleted.`);
      setDeletingSubAdmin(null);
      await fetchSubAdmins();
      setTimeout(() => setSubAdminSuccess(null), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeletingSubAdminAction(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-green-700" />
            Admin Settings & Control
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage sub-admin access roles, page permissions, and live UCO market pricing.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("subadmins")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "subadmins"
                ? "bg-white text-green-800 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-green-700" />
            Sub-Admin Access ({subAdmins.length})
          </button>
          <button
            onClick={() => setActiveTab("marketprice")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "marketprice"
                ? "bg-white text-green-800 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-green-700" />
            Market Price
          </button>
        </div>
      </div>

      {subAdminSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span>{subAdminSuccess}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: SUB-ADMIN MANAGEMENT & ACCESS CONTROL */}
      {/* ========================================================= */}
      {activeTab === "subadmins" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Sub-Admin Accounts Directory</h2>
              <p className="text-xs text-gray-500">
                Grant, configure, and monitor team member credentials and section permissions.
              </p>
            </div>
            <button
              onClick={() => {
                setSubAdminError(null);
                setShowCreateModal(true);
              }}
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Create New Sub-Admin
            </button>
          </div>

          {/* Sub-Admins Grid / List */}
          {fetchingSubAdmins ? (
            <div className="card p-8 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-green-700" />
              <p className="text-sm text-gray-500 font-medium">Loading sub-admin permissions...</p>
            </div>
          ) : subAdmins.length === 0 ? (
            <div className="card p-10 text-center border-dashed border-2 border-gray-200">
              <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">No Sub-Admins Created Yet</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                Sub-admin accounts allow team members to log in and access assigned portal sections (like FBOs, Pickers, or Route Planner) without super-admin rights.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 font-bold"
              >
                <UserPlus className="w-4 h-4" />
                Create First Sub-Admin
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subAdmins.map((subAdmin) => {
                const allowedCount = subAdmin.allowed_routes.length;
                const totalSections = ADMIN_SECTIONS.length;
                const isActive = subAdmin.is_active !== false;

                return (
                  <div
                    key={subAdmin.id}
                    className={`card p-5 border transition-all space-y-4 shadow-sm ${
                      isActive ? "border-gray-200 hover:border-green-300" : "border-red-200 bg-red-50/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {subAdmin.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                            {subAdmin.full_name}
                          </h3>
                          <p className="text-xs text-gray-500 font-mono">@{subAdmin.username}</p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isActive ? (
                        <span className="badge badge-green text-[10px] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="badge bg-red-100 text-red-800 border-red-200 text-[10px] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Suspended
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <p className="flex items-center gap-1 text-gray-700">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <strong>Phone:</strong> {subAdmin.phone || "Not provided"}
                      </p>
                      {subAdmin.generated_password && (
                        <p className="font-mono text-[11px] text-gray-700 flex items-center gap-1">
                          <Key className="w-3 h-3 text-gray-400" />
                          <strong>Key:</strong>{" "}
                          <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-semibold">
                            {subAdmin.generated_password}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Permissions Summary */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-gray-700">
                          Access Rights ({allowedCount}/{totalSections}):
                        </span>
                        <button
                          onClick={() => {
                            setEditingSubAdminPerms(subAdmin);
                            setEditRoutes(subAdmin.allowed_routes);
                          }}
                          className="text-green-700 hover:text-green-900 font-bold text-[11px] hover:underline"
                        >
                          Edit Rights
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {ADMIN_SECTIONS.map((sec) => {
                          const isAllowed = subAdmin.allowed_routes.includes(sec.href);
                          return (
                            <span
                              key={sec.href}
                              className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                                isAllowed
                                  ? "bg-green-50 text-green-800 border-green-200"
                                  : "bg-gray-100 text-gray-400 border-gray-200 line-through opacity-60"
                              }`}
                            >
                              {sec.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDetailsModal(subAdmin)}
                          className="btn btn-secondary text-[11px] px-2 py-1 flex items-center gap-1 border border-gray-200 hover:border-green-300 hover:text-green-700"
                          title="Edit Profile Details"
                        >
                          <Edit3 className="w-3 h-3" /> Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openPasswordModal(subAdmin)}
                          className="btn btn-secondary text-[11px] px-2 py-1 flex items-center gap-1 border border-gray-200 hover:border-amber-300 hover:text-amber-700"
                          title="Change Password"
                        >
                          <Key className="w-3 h-3" /> Password
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(subAdmin)}
                          className={`btn text-[11px] px-2 py-1 flex items-center gap-1 border ${
                            isActive
                              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              : "bg-green-50 text-green-800 border-green-200 hover:bg-green-100"
                          }`}
                          title={isActive ? "Suspend Account" : "Activate Account"}
                        >
                          {isActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {isActive ? "Suspend" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSubAdmin(subAdmin)}
                          className="btn bg-red-50 text-red-700 border-red-200 hover:bg-red-100 text-[11px] px-2 py-1 flex items-center gap-1"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MARKET PRICE TAB */}
      {/* ========================================================= */}
      {activeTab === "marketprice" && (
        <MarketPriceTab
          currentPrice={currentPrice}
          priceHistory={priceHistory}
          inputPrice={inputPrice}
          setInputPrice={setInputPrice}
          loadingPrice={loadingPrice}
          fetchingPrice={fetchingPrice}
          priceSuccess={priceSuccess}
          priceError={priceError}
          handleSetPrice={handleSetPrice}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE NEW SUB-ADMIN */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-fade-in overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-green-700 text-white">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-base">Create Sub-Admin Account</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-green-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubAdmin} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-xs">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input text-xs"
                    placeholder="e.g. Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Username *</label>
                  <input
                    type="text"
                    required
                    className="form-input text-xs"
                    placeholder="e.g. ramesh_subadmin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-xs">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input text-xs"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Login Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="form-input text-xs pr-10"
                      placeholder="Set secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Access Permissions Checklist */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label text-xs mb-0 font-bold text-gray-900">
                    Assign Page Access Permissions:
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleSelectAllRoutes(false)}
                      className="text-green-700 font-bold hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleClearAllRoutes(false)}
                      className="text-gray-500 font-bold hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
                  {ADMIN_SECTIONS.map((sec) => {
                    const isChecked = selectedRoutes.includes(sec.href);
                    return (
                      <label
                        key={sec.href}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-white border-green-300 text-gray-900 shadow-sm"
                            : "bg-gray-100/60 border-transparent text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRouteSelection(sec.href, false)}
                          className="mt-0.5 text-green-700 rounded focus:ring-green-600"
                        />
                        <div>
                          <p className="text-xs font-bold leading-tight">{sec.label}</p>
                          <p className="text-[10px] text-gray-400 leading-tight">{sec.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {subAdminError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{subAdminError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSubAdmin}
                  className="btn btn-primary text-xs py-2 px-5 font-bold shadow-sm"
                >
                  {creatingSubAdmin ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Save & Create Account</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT SUB-ADMIN PERMISSIONS */}
      {/* ========================================================= */}
      {editingSubAdminPerms && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Edit Access Rights — {editingSubAdminPerms.full_name}
                </h3>
                <p className="text-xs text-gray-500 font-mono">@{editingSubAdminPerms.username}</p>
              </div>
              <button onClick={() => setEditingSubAdminPerms(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Allowed Sections:</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSelectAllRoutes(true)}
                    className="text-green-700 font-bold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleClearAllRoutes(true)}
                    className="text-gray-500 font-bold hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-64 overflow-y-auto">
                {ADMIN_SECTIONS.map((sec) => {
                  const isChecked = editRoutes.includes(sec.href);
                  return (
                    <label
                      key={sec.href}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-white border-green-300 text-gray-900 shadow-sm"
                          : "bg-gray-100/60 border-transparent text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRouteSelection(sec.href, true)}
                        className="mt-0.5 text-green-700 rounded focus:ring-green-600"
                      />
                      <div>
                        <p className="text-xs font-bold leading-tight">{sec.label}</p>
                        <p className="text-[10px] text-gray-400 leading-tight">{sec.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-200">
              <button
                onClick={() => setEditingSubAdminPerms(null)}
                className="btn btn-ghost text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePermissions}
                disabled={updatingPerms}
                className="btn btn-primary text-xs py-2 px-5 font-bold"
              >
                {updatingPerms ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-4 h-4" /> Update Rights</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: EDIT SUB-ADMIN PROFILE DETAILS */}
      {/* ========================================================= */}
      {editingSubAdminDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-green-700" />
                <h3 className="font-bold text-base text-gray-900">Edit Sub-Admin Details</h3>
              </div>
              <button onClick={() => setEditingSubAdminDetails(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubAdminDetails} className="space-y-3">
              <div>
                <label className="form-label text-xs font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-input text-xs"
                  value={editDetailForm.fullName}
                  onChange={(e) => setEditDetailForm({ ...editDetailForm, fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label text-xs font-semibold">Username *</label>
                <input
                  type="text"
                  required
                  className="form-input text-xs font-mono"
                  value={editDetailForm.username}
                  onChange={(e) => setEditDetailForm({ ...editDetailForm, username: e.target.value })}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Auth email will sync as: <span className="font-mono text-gray-600">{editDetailForm.username.toLowerCase()}@mellod.internal</span>
                </p>
              </div>

              <div>
                <label className="form-label text-xs font-semibold">Phone Number</label>
                <input
                  type="tel"
                  className="form-input text-xs"
                  placeholder="+91 98765 43210"
                  value={editDetailForm.phone}
                  onChange={(e) => setEditDetailForm({ ...editDetailForm, phone: e.target.value })}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingSubAdminDetails(null)}
                  className="btn btn-ghost text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" disabled={savingDetails} className="btn btn-primary text-xs py-2 px-4 font-bold">
                  {savingDetails ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><Save className="w-3.5 h-3.5" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: CHANGE SUB-ADMIN PASSWORD */}
      {/* ========================================================= */}
      {passwordSubAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-gray-900">Change Sub-Admin Password</h3>
              </div>
              <button onClick={() => setPasswordSubAdmin(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubAdminPassword} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl text-xs border border-amber-100">
                <p className="font-semibold text-amber-900">
                  Target Sub-Admin: {passwordSubAdmin.full_name} (@{passwordSubAdmin.username})
                </p>
                <p className="text-amber-700 text-[11px] mt-0.5">
                  Updating password instantly syncs Supabase Auth credentials.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label text-xs font-semibold !mb-0">New Password *</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] font-semibold text-green-700 flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" /> Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewSubAdminPassword ? "text" : "password"}
                    className="form-input text-xs pr-10 font-mono"
                    placeholder="Enter new password (min 6 chars)..."
                    value={newSubAdminPassword}
                    onChange={(e) => setNewSubAdminPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewSubAdminPassword(!showNewSubAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewSubAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setPasswordSubAdmin(null)}
                  className="btn btn-ghost text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" disabled={savingPassword || !newSubAdminPassword} className="btn btn-primary text-xs py-2 px-4 font-bold">
                  {savingPassword ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><Key className="w-3.5 h-3.5" /> Update Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: DELETE SUB-ADMIN CONFIRMATION */}
      {/* ========================================================= */}
      {deletingSubAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in border border-red-100">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-gray-900">Delete Sub-Admin Account</h3>
              </div>
              <button onClick={() => setDeletingSubAdmin(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <p>
                Are you sure you want to permanently delete the Sub-Admin account for{" "}
                <span className="font-bold text-gray-900">{deletingSubAdmin.full_name}</span> (
                <span className="font-mono text-gray-700">@{deletingSubAdmin.username}</span>)?
              </p>
              <p className="text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                ⚠️ This action cannot be undone. All assigned route permissions and authentication credentials will be revoked immediately.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDeletingSubAdmin(null)}
                className="btn btn-ghost text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubAdmin}
                disabled={deletingSubAdminAction}
                className="btn bg-red-600 text-white hover:bg-red-700 text-xs py-2 px-4 font-bold"
              >
                {deletingSubAdminAction ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Confirm Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Exported Component for Market Price Tab ──────────────────────────────────
export function MarketPriceTab(props?: {
  currentPrice?: PriceRecord | null;
  priceHistory?: PriceRecord[];
  inputPrice?: string;
  setInputPrice?: (val: string) => void;
  loadingPrice?: boolean;
  fetchingPrice?: boolean;
  priceSuccess?: boolean;
  priceError?: string | null;
  handleSetPrice?: (e: React.FormEvent) => void;
}) {
  const supabase = createClient();
  const [internalCurrentPrice, setInternalCurrentPrice] = useState<PriceRecord | null>(null);
  const [internalPriceHistory, setInternalPriceHistory] = useState<PriceRecord[]>([]);
  const [internalInputPrice, setInternalInputPrice] = useState("");
  const [internalLoadingPrice, setInternalLoadingPrice] = useState(false);
  const [internalFetchingPrice, setInternalFetchingPrice] = useState(true);
  const [internalPriceSuccess, setInternalPriceSuccess] = useState(false);
  const [internalPriceError, setInternalPriceError] = useState<string | null>(null);

  useEffect(() => {
    if (!props?.currentPrice && !props?.priceHistory) {
      fetchPrices();
    } else {
      setInternalFetchingPrice(false);
    }
  }, [props?.currentPrice, props?.priceHistory]);

  async function fetchPrices() {
    setInternalFetchingPrice(true);
    const { data } = await supabase
      .from("daily_prices")
      .select("*")
      .order("effective_from", { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      setInternalCurrentPrice(data[0]);
      setInternalPriceHistory(data);
    }
    setInternalFetchingPrice(false);
  }

  const currentPrice = props?.currentPrice !== undefined ? props.currentPrice : internalCurrentPrice;
  const priceHistory = props?.priceHistory !== undefined ? props.priceHistory : internalPriceHistory;
  const inputPrice = props?.inputPrice !== undefined ? props.inputPrice : internalInputPrice;
  const setInputPrice = props?.setInputPrice || setInternalInputPrice;
  const loadingPrice = props?.loadingPrice !== undefined ? props.loadingPrice : internalLoadingPrice;
  const fetchingPrice = props?.fetchingPrice !== undefined ? props.fetchingPrice : internalFetchingPrice;
  const priceSuccess = props?.priceSuccess !== undefined ? props.priceSuccess : internalPriceSuccess;
  const priceError = props?.priceError !== undefined ? props.priceError : internalPriceError;

  async function defaultHandleSetPrice(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(inputPrice);
    if (isNaN(price) || price <= 0) {
      setInternalPriceError("Please enter a valid price greater than 0.");
      return;
    }

    setInternalLoadingPrice(true);
    setInternalPriceError(null);

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
      setInternalPriceError(insertError.message);
    } else {
      setInternalPriceSuccess(true);
      setInternalInputPrice("");
      await fetchPrices();
      setTimeout(() => setInternalPriceSuccess(false), 3000);
    }
    setInternalLoadingPrice(false);
  }

  const handleSetPrice = props?.handleSetPrice || defaultHandleSetPrice;

  return (
    <div className="space-y-6">
      {/* Current Price Banner */}
      <div className="card p-6 bg-gradient-to-r from-green-800 to-green-700 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-green-200 font-semibold">
              Current Live Market Rate
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-extrabold font-mono">
                {fetchingPrice ? "..." : currentPrice ? formatCurrency(currentPrice.price_per_liter) : "Not Set"}
              </span>
              <span className="text-sm text-green-200 font-medium">/ Liter</span>
            </div>
            {currentPrice && (
              <p className="text-xs text-green-200 mt-2">
                Last updated: {new Date(currentPrice.effective_from).toLocaleString("en-IN")}
              </p>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
            <p className="text-xs text-green-100 font-medium mb-1">Standard Market Reference</p>
            <p className="text-xs text-green-200">
              This benchmark rate applies across all FBO procurement calculations & picker payouts.
            </p>
          </div>
        </div>
      </div>

      {/* Set New Price Form & History Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Price Update Form */}
        <div className="card p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-700" />
              Update Market Price
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Set a new purchase price per liter for Used Cooking Oil.
            </p>
          </div>

          <form onSubmit={handleSetPrice} className="space-y-4">
            <div>
              <label className="form-label font-semibold text-gray-700">
                New Rate (₹ per Liter) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  placeholder="e.g. 55.00"
                  className="form-input !pl-8 text-base font-bold font-mono"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                />
              </div>
            </div>

            {priceError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                {priceError}
              </div>
            )}

            {priceSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Market price updated!
              </div>
            )}

            <button
              type="submit"
              disabled={loadingPrice}
              className="btn btn-primary w-full py-3 text-sm font-bold shadow-md"
            >
              {loadingPrice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                </>
              ) : (
                "Publish New Price"
              )}
            </button>
          </form>
        </div>

        {/* Historical Rates Table */}
        <div className="md:col-span-2 card p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              Rate History Log
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Historical benchmark price adjustments for reference audit.
            </p>
          </div>

          {fetchingPrice ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-green-700 mr-2" />
              Loading price log...
            </div>
          ) : priceHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              No historical price updates found.
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                    <th className="px-4 py-3">Price / L</th>
                    <th className="px-4 py-3">Effective Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700 font-mono">
                  {priceHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-green-800 text-sm">
                        {formatCurrency(item.price_per_liter)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-sans">
                        {new Date(item.effective_from).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
