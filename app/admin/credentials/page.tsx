"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Key,
  Lock,
  Unlock,
  ShieldAlert,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Building2,
  Truck,
  Users,
  Edit3,
  UserX,
  UserCheck,
  X,
  Save,
  MapPin,
  RefreshCw,
} from "lucide-react";

export interface DirectoryUser {
  id: string;
  full_name: string;
  role: "fbo" | "picker" | "admin";
  username: string;
  phone: string | null;
  generated_password: string | null;
  business_name?: string;
  contact_person?: string;
  address?: string;
  fssai_license?: string;
  vehicle_info?: string;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export default function CredentialsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Directory Data
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<"all" | "fbo" | "picker">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Action Modals State
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<DirectoryUser | null>(null);
  const [offboardUser, setOffboardUser] = useState<DirectoryUser | null>(null);

  // Modal Form States
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    businessName: "",
    contactPerson: "",
    address: "",
    fssaiLicense: "",
    vehicleInfo: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Check session storage for existing unlocked state
    const isUnlocked = sessionStorage.getItem("mellod_credentials_unlocked") === "true";
    if (isUnlocked) {
      setUnlocked(true);
      fetchDirectory();
    }
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/verify-credentials-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterKey: passwordInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Incorrect master password");

      setUnlocked(true);
      sessionStorage.setItem("mellod_credentials_unlocked", "true");
      setPasswordInput("");
      await fetchDirectory();
    } catch (err: any) {
      setError(err.message || "Incorrect master password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleLock() {
    setUnlocked(false);
    sessionStorage.removeItem("mellod_credentials_unlocked");
    setPasswordInput("");
  }

  async function fetchDirectory() {
    setLoadingDirectory(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        username,
        phone,
        generated_password,
        fbos ( business_name, contact_person, address, fssai_license, is_active, latitude, longitude ),
        pickers ( vehicle_info, is_active )
      `)
      .in("role", ["fbo", "picker"])
      .order("created_at", { ascending: false });

    if (!error && profiles) {
      const formatted: DirectoryUser[] = profiles.map((p: any) => {
        const fboObj = Array.isArray(p.fbos) ? p.fbos[0] : p.fbos;
        const pickerObj = Array.isArray(p.pickers) ? p.pickers[0] : p.pickers;
        const isActive = p.role === "fbo" ? fboObj?.is_active ?? true : pickerObj?.is_active ?? true;

        return {
          id: p.id,
          full_name: p.full_name,
          role: p.role,
          username: p.username,
          phone: p.phone,
          generated_password: p.generated_password,
          business_name: fboObj?.business_name,
          contact_person: fboObj?.contact_person,
          address: fboObj?.address,
          fssai_license: fboObj?.fssai_license,
          latitude: fboObj?.latitude,
          longitude: fboObj?.longitude,
          vehicle_info: pickerObj?.vehicle_info,
          is_active: isActive,
        };
      });
      setDirectory(formatted);
    }
    setLoadingDirectory(false);
  }

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Handlers for Account Management Actions ──────────────────────────

  const openEditModal = (user: DirectoryUser) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.full_name || "",
      phone: user.phone || "",
      businessName: user.business_name || "",
      contactPerson: user.contact_person || user.full_name || "",
      address: user.address || "",
      fssaiLicense: user.fssai_license || "",
      vehicleInfo: user.vehicle_info || "",
    });
    setActionMessage(null);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          action: "update_details",
          fullName: editForm.fullName,
          phone: editForm.phone,
          businessName: editForm.businessName,
          contactPerson: editForm.contactPerson,
          address: editForm.address,
          fssaiLicense: editForm.fssaiLicense,
          vehicleInfo: editForm.vehicleInfo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update details");

      setActionMessage({ type: "success", text: data.message || "Details updated successfully" });
      await fetchDirectory();
      setTimeout(() => setEditingUser(null), 1200);
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setActionLoading(false);
    }
  };

  const openPasswordModal = (user: DirectoryUser) => {
    setPasswordUser(user);
    setNewPassword("");
    setActionMessage(null);
  };

  const handleGenerateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (!newPassword || newPassword.length < 6) {
      setActionMessage({ type: "error", text: "Password must be at least 6 characters long" });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: passwordUser.id,
          action: "change_password",
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setActionMessage({ type: "success", text: data.message || "Password changed successfully" });
      await fetchDirectory();
      setTimeout(() => setPasswordUser(null), 1200);
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleOffboardStatus = async (user: DirectoryUser) => {
    setActionLoading(true);
    const nextAction = user.is_active ? "offboard" : "activate";

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: nextAction,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${nextAction} user`);

      setOffboardUser(null);
      await fetchDirectory();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDirectory = directory.filter((user) => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      (user.business_name?.toLowerCase() || "").includes(searchLower) ||
      (user.fssai_license?.toLowerCase() || "").includes(searchLower) ||
      (user.address?.toLowerCase() || "").includes(searchLower);
    return matchesRole && matchesSearch;
  });

  // ── Password Lock Screen View ──────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-fade-in">
        <div className="card p-8 bg-white border border-gray-100 shadow-xl rounded-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-700 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900">Protected Credentials Directory</h1>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              This area contains sensitive user access keys and passwords. Please authenticate with the master security password.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div>
              <label className="form-label font-semibold text-gray-700">Master Password</label>
              <div className="relative">
                <input
                  type={showPasswordInput ? "text" : "password"}
                  placeholder="Enter security password..."
                  className="form-input pr-10"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordInput(!showPasswordInput)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !passwordInput} className="btn btn-primary w-full py-3">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" /> Access Credentials
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Unlocked Credentials Directory View ────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-green-700" />
            Credentials & Account Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Centralized portal to offboard pickers/FBOs, change passwords, and update partner profile details.
          </p>
        </div>

        <button
          onClick={handleLock}
          className="btn btn-secondary text-xs flex items-center gap-2 py-2 px-4 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors w-fit"
        >
          <Lock className="w-4 h-4" /> Lock Directory
        </button>
      </div>

      {/* Directory Filters & Search Bar */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Role Filter Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                roleFilter === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> All ({directory.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("fbo")}
              className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                roleFilter === "fbo" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> FBOs ({directory.filter((u) => u.role === "fbo").length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("picker")}
              className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                roleFilter === "picker" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Truck className="w-3.5 h-3.5" /> Pickers ({directory.filter((u) => u.role === "picker").length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, business, address, FSSAI..."
              className="form-input !pl-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Credentials & Management Table */}
        {loadingDirectory ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-green-700 mr-2" />
            Loading accounts directory...
          </div>
        ) : filteredDirectory.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No matching accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                  <th className="px-4 py-3.5">User / Business</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Username</th>
                  <th className="px-4 py-3.5">Password</th>
                  <th className="px-4 py-3.5">Details</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredDirectory.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900">{user.full_name}</p>
                      {user.business_name && (
                        <p className="text-xs text-green-700 font-medium">{user.business_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`badge ${
                          user.role === "fbo" ? "badge-green" : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}
                      >
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {user.is_active ? (
                        <span className="badge badge-green text-xs font-semibold flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="badge bg-red-50 text-red-700 border-red-200 text-xs font-semibold flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Offboarded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-800">{user.username}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg w-fit">
                        <span className="font-mono text-xs font-semibold text-gray-900">
                          {showPasswordMap[user.id] ? user.generated_password || "N/A" : "••••••••••••"}
                        </span>
                        {user.generated_password && (
                          <>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-gray-400 hover:text-gray-600 ml-1"
                              title="Show/Hide Password"
                            >
                              {showPasswordMap[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(user.id, user.generated_password || "")}
                              className="text-gray-400 hover:text-green-600"
                              title="Copy Password"
                            >
                              {copiedId === user.id ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600 space-y-0.5 max-w-xs">
                      {user.phone && <p>📞 {user.phone}</p>}
                      {user.fssai_license && <p className="font-mono text-[11px] text-gray-500">FSSAI: {user.fssai_license}</p>}
                      {user.vehicle_info && <p className="text-gray-500">🚛 {user.vehicle_info}</p>}
                      {user.address && <p className="text-gray-500 truncate" title={user.address}>📍 {user.address}</p>}
                      {!user.phone && !user.fssai_license && !user.vehicle_info && !user.address && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="btn btn-secondary text-xs p-1.5 border border-gray-200 hover:border-green-300 hover:text-green-700"
                          title="Edit Account Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openPasswordModal(user)}
                          className="btn btn-secondary text-xs p-1.5 border border-gray-200 hover:border-amber-300 hover:text-amber-700"
                          title="Change Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOffboardUser(user)}
                          className={`btn text-xs p-1.5 border ${
                            user.is_active
                              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          }`}
                          title={user.is_active ? "Offboard Account" : "Reactivate Account"}
                        >
                          {user.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL 1: Edit User Details ───────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-green-700" />
                <h3 className="font-bold text-gray-900 text-lg">Update Account Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1 font-mono border border-gray-100">
                <p className="text-gray-500">
                  Account: <span className="font-bold text-gray-900">{editingUser.username}</span> ({editingUser.role.toUpperCase()})
                </p>
              </div>

              {editingUser.role === "fbo" && (
                <div>
                  <label className="form-label font-semibold">Business Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.businessName}
                    onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label font-semibold">
                    {editingUser.role === "fbo" ? "Contact Person Name *" : "Full Name *"}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingUser.role === "fbo" ? editForm.contactPerson : editForm.fullName}
                    onChange={(e) =>
                      editingUser.role === "fbo"
                        ? setEditForm({ ...editForm, contactPerson: e.target.value, fullName: e.target.value })
                        : setEditForm({ ...editForm, fullName: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="form-label font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              {editingUser.role === "fbo" && (
                <>
                  <div>
                    <label className="form-label font-semibold">FSSAI License No.</label>
                    <input
                      type="text"
                      className="form-input font-mono text-xs uppercase"
                      placeholder="e.g. 12224999000123"
                      value={editForm.fssaiLicense}
                      onChange={(e) => setEditForm({ ...editForm, fssaiLicense: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label font-semibold">Full Address</label>
                    <textarea
                      rows={3}
                      className="form-input text-xs"
                      placeholder="Street, area, city, pincode..."
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>
                </>
              )}

              {editingUser.role === "picker" && (
                <div>
                  <label className="form-label font-semibold">Vehicle Info</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. White Tempo, KA 01 AB 1234"
                    value={editForm.vehicleInfo}
                    onChange={(e) => setEditForm({ ...editForm, vehicleInfo: e.target.value })}
                  />
                </div>
              )}

              {actionMessage && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    actionMessage.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {actionMessage.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary text-xs py-2 px-4">
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Details
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Change Password ───────────────────────────────────────── */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-lg">Change User Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="p-3 bg-amber-50/50 rounded-xl text-xs space-y-1 border border-amber-100">
                <p className="font-semibold text-amber-900">
                  Target Account: {passwordUser.full_name} ({passwordUser.username})
                </p>
                <p className="text-amber-700">
                  This will instantly update the user&apos;s authentication login key and credentials directory.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label font-semibold !mb-0">New Password *</label>
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
                    type={showNewPassword ? "text" : "password"}
                    className="form-input pr-10 font-mono text-sm"
                    placeholder="Enter new password (min 6 chars)..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {actionMessage && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    actionMessage.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {actionMessage.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading || !newPassword} className="btn btn-primary text-xs py-2 px-4">
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" /> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Offboard / Reactivate Confirmation ─────────────────────── */}
      {offboardUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
              offboardUser.is_active ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}>
              {offboardUser.is_active ? <UserX className="w-7 h-7" /> : <UserCheck className="w-7 h-7" />}
            </div>

            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {offboardUser.is_active ? "Offboard Account?" : "Reactivate Account?"}
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {offboardUser.is_active
                  ? `Are you sure you want to offboard "${offboardUser.full_name}"? Offboarded accounts will be marked inactive and hidden from active route dispatches.`
                  : `Are you sure you want to reactivate "${offboardUser.full_name}"? This account will regain active status.`}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl text-xs text-left font-mono border border-gray-200">
              <p>Username: <span className="font-bold text-gray-900">{offboardUser.username}</span></p>
              <p>Role: <span className="font-bold text-gray-900">{offboardUser.role.toUpperCase()}</span></p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOffboardUser(null)}
                className="btn btn-secondary text-xs px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleToggleOffboardStatus(offboardUser)}
                className={`btn text-xs py-2 px-5 ${
                  offboardUser.is_active ? "btn-danger" : "btn-primary"
                }`}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                  </>
                ) : offboardUser.is_active ? (
                  "Confirm Offboard"
                ) : (
                  "Confirm Reactivate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
