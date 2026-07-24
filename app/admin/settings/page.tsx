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
  AlertCircle
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
    "/admin/routes"
  ]);
  
  const [creatingSubAdmin, setCreatingSubAdmin] = useState(false);
  const [subAdminError, setSubAdminError] = useState<string | null>(null);
  const [subAdminSuccess, setSubAdminSuccess] = useState<string | null>(null);

  // Edit sub-admin permissions modal state
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdminProfile | null>(null);
  const [editRoutes, setEditRoutes] = useState<string[]>([]);
  const [updatingPerms, setUpdatingPerms] = useState(false);

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

    const { data: { user } } = await supabase.auth.getUser();
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
      setSelectedRoutes(["/admin", "/admin/routes", "/admin/onboarding"]);
      
      await fetchSubAdmins();
      setTimeout(() => setSubAdminSuccess(null), 5000);
    } catch (err: any) {
      setSubAdminError(err.message);
    } finally {
      setCreatingSubAdmin(false);
    }
  }

  async function handleUpdatePermissions() {
    if (!editingSubAdmin) return;

    setUpdatingPerms(true);
    try {
      const res = await fetch("/api/admin/sub-admins/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: editingSubAdmin.id,
          allowedRoutes: editRoutes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update permissions");
      }

      setSubAdminSuccess(`Permissions updated for ${editingSubAdmin.full_name}!`);
      setEditingSubAdmin(null);
      await fetchSubAdmins();
      setTimeout(() => setSubAdminSuccess(null), 4000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUpdatingPerms(false);
    }
  }

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
              <h2 className="text-lg font-bold text-gray-800">Sub-Admin Accounts</h2>
              <p className="text-xs text-gray-500">
                Grant custom access permissions for specific sections of the admin portal.
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

                return (
                  <div
                    key={subAdmin.id}
                    className="card p-5 border border-gray-200 hover:border-green-300 transition-all space-y-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center font-bold text-green-800 text-sm">
                          {subAdmin.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{subAdmin.full_name}</h3>
                          <p className="text-xs text-gray-500 font-mono">@{subAdmin.username}</p>
                        </div>
                      </div>
                      <span className="badge badge-green text-[10px]">Sub-Admin</span>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2.5 rounded-lg">
                      <p><strong>Phone:</strong> {subAdmin.phone || "Not provided"}</p>
                      {subAdmin.generated_password && (
                        <p className="font-mono text-[11px] text-gray-700">
                          <strong>Password:</strong> <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200">{subAdmin.generated_password}</span>
                        </p>
                      )}
                    </div>

                    {/* Permissions summary */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-gray-700">Access Rights ({allowedCount}/{totalSections}):</span>
                        <button
                          onClick={() => {
                            setEditingSubAdmin(subAdmin);
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MARKET PRICE SETTINGS */}
      {/* ========================================================= */}
      {activeTab === "marketprice" && (
        <div className="space-y-6 max-w-2xl">
          {/* Current price display */}
          <div className="bg-green-700 rounded-2xl p-6 text-white shadow-sm">
            {fetchingPrice ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-green-300" />
                <span className="text-green-200">Loading current price...</span>
              </div>
            ) : currentPrice ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm">Current Market Price</p>
                  <p className="text-4xl font-bold mt-1">
                    {formatCurrency(currentPrice.price_per_liter)}
                  </p>
                  <p className="text-green-300 text-xs mt-1.5">per liter of UCO</p>
                </div>
                <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center">
                  <IndianRupee className="w-8 h-8 text-white" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <IndianRupee className="w-6 h-6 text-green-300" />
                <div>
                  <p className="text-green-200 font-medium">No price set yet</p>
                  <p className="text-green-300 text-xs">Set the first market price below</p>
                </div>
              </div>
            )}
          </div>

          {/* Set new price form */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">Update Market Price</h2>
                <p className="text-xs text-gray-500">Sets a new effective price from now</p>
              </div>
            </div>

            <form onSubmit={handleSetPrice} className="space-y-4">
              <div>
                <label htmlFor="price" className="form-label">
                  New Price per Liter (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                  <input
                    id="price"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10000"
                    className="form-input !pl-8"
                    placeholder="0.00"
                    value={inputPrice}
                    onChange={(e) => setInputPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              {priceError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {priceError}
                </div>
              )}

              {priceSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Price updated successfully! FBOs will see the new rate immediately.
                </div>
              )}

              <button type="submit" disabled={loadingPrice || !inputPrice} className="btn btn-primary">
                {loadingPrice ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><TrendingUp className="w-4 h-4" /> Set New Price</>
                )}
              </button>
            </form>
          </div>

          {/* Price history */}
          {priceHistory.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 p-5 border-b border-gray-100">
                <History className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-800">Price History</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {priceHistory.map((record, idx) => (
                  <div key={record.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {formatCurrency(record.price_per_liter)}/L
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(record.effective_from).toLocaleString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    {idx === 0 && <span className="badge badge-green">Current</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE NEW SUB-ADMIN */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-fade-in overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-green-700 text-white">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-base">Create Sub-Admin Account</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-green-200 hover:text-white"
              >
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
      {/* MODAL: EDIT SUB-ADMIN PERMISSIONS */}
      {/* ========================================================= */}
      {editingSubAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Edit Access Rights — {editingSubAdmin.full_name}
                </h3>
                <p className="text-xs text-gray-500 font-mono">@{editingSubAdmin.username}</p>
              </div>
              <button onClick={() => setEditingSubAdmin(null)} className="text-gray-400 hover:text-gray-600">
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
                onClick={() => setEditingSubAdmin(null)}
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
    </div>
  );
}
