"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Key,
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
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";
import { motion, AnimatePresence } from "framer-motion";

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
  upi_id?: string;
  account_holder?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  vehicle_info?: string;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export default function CredentialsPage() {
  // Directory Data
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<"all" | "fbo" | "picker">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active Edit View State
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);

  // Form States for Unified Edit Page
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    businessName: "",
    contactPerson: "",
    address: "",
    fssaiLicense: "",
    upiId: "",
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    vehicleInfo: "",
    latitude: 12.9716,
    longitude: 77.5946,
  });

  // Password Update State within Edit Page
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Status Change State within Edit Page
  const [statusLoading, setStatusLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchDirectory();
  }, []);

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
        fbos ( business_name, contact_person, address, fssai_license, is_active, latitude, longitude, payment_methods ( id, method_type, upi_id, account_holder, bank_name, account_number, ifsc_code, is_primary ) ),
        pickers ( vehicle_info, is_active )
      `)
      .in("role", ["fbo", "picker"])
      .order("created_at", { ascending: false });

    if (!error && profiles) {
      const formatted: DirectoryUser[] = profiles.map((p: any) => {
        const fboObj = Array.isArray(p.fbos) ? p.fbos[0] : p.fbos;
        const pickerObj = Array.isArray(p.pickers) ? p.pickers[0] : p.pickers;
        const isActive = p.role === "fbo" ? fboObj?.is_active ?? true : pickerObj?.is_active ?? true;

        const pmList = fboObj?.payment_methods || [];
        const pmArray = Array.isArray(pmList) ? pmList : [pmList];

        const upiObj = pmArray.find((m: any) => m?.method_type === "upi") || pmArray.find((m: any) => m?.upi_id);
        const bankObj = pmArray.find((m: any) => m?.method_type === "bank") || pmArray.find((m: any) => m?.account_number);

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
          upi_id: upiObj?.upi_id || undefined,
          account_holder: bankObj?.account_holder || undefined,
          bank_name: bankObj?.bank_name || undefined,
          account_number: bankObj?.account_number || undefined,
          ifsc_code: bankObj?.ifsc_code || undefined,
          latitude: fboObj?.latitude,
          longitude: fboObj?.longitude,
          vehicle_info: pickerObj?.vehicle_info,
          is_active: isActive,
        };
      });
      setDirectory(formatted);

      // Refresh active editingUser if currently editing
      if (editingUser) {
        const updatedUser = formatted.find((u) => u.id === editingUser.id);
        if (updatedUser) setEditingUser(updatedUser);
      }
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

  // Open Full Page Edit View
  const openEditPage = (user: DirectoryUser) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.full_name || "",
      phone: user.phone || "",
      businessName: user.business_name || "",
      contactPerson: user.contact_person || user.full_name || "",
      address: user.address || "",
      fssaiLicense: user.fssai_license || "",
      upiId: user.upi_id || "",
      accountHolder: user.account_holder || "",
      bankName: user.bank_name || "",
      accountNumber: user.account_number || "",
      ifscCode: user.ifsc_code || "",
      vehicleInfo: user.vehicle_info || "",
      latitude: user.latitude ? Number(user.latitude) : 12.9716,
      longitude: user.longitude ? Number(user.longitude) : 77.5946,
    });
    setNewPassword("");
    setShowNewPassword(false);
    setActionMessage(null);
  };

  const closeEditPage = () => {
    setEditingUser(null);
    setActionMessage(null);
  };

  // Save All Core Details (Profile, Address, Location, Banking, UPI)
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
          upiId: editForm.upiId,
          accountHolder: editForm.accountHolder,
          bankName: editForm.bankName,
          accountNumber: editForm.accountNumber,
          ifscCode: editForm.ifscCode,
          vehicleInfo: editForm.vehicleInfo,
          latitude: editForm.latitude,
          longitude: editForm.longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update details");

      setActionMessage({ type: "success", text: data.message || "Account & financial details updated successfully" });
      await fetchDirectory();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setActionLoading(false);
    }
  };

  // Password Update inside Edit Page
  const handleGenerateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleSavePasswordInsideEdit = async () => {
    if (!editingUser) return;
    if (!newPassword || newPassword.length < 6) {
      setActionMessage({ type: "error", text: "Password must be at least 6 characters long" });
      return;
    }

    setPasswordLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          action: "change_password",
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setActionMessage({ type: "success", text: data.message || "Password updated successfully" });
      setNewPassword("");
      await fetchDirectory();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Offboard / Reactivate inside Edit Page
  const handleToggleStatusInsideEdit = async () => {
    if (!editingUser) return;
    setStatusLoading(true);
    setActionMessage(null);
    const nextAction = editingUser.is_active ? "offboard" : "activate";

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          action: nextAction,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${nextAction} account`);

      setActionMessage({
        type: "success",
        text: `Account has been ${editingUser.is_active ? "offboarded/deactivated" : "reactivated"} successfully.`,
      });
      await fetchDirectory();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setStatusLoading(false);
    }
  };

  // Analytics Metrics Summary
  const metrics = useMemo(() => {
    const total = directory.length;
    const active = directory.filter((u) => u.is_active).length;
    const fbosCount = directory.filter((u) => u.role === "fbo").length;
    const pickersCount = directory.filter((u) => u.role === "picker").length;
    const configuredFinancials = directory.filter((u) => u.upi_id || u.account_number).length;

    return { total, active, fbosCount, pickersCount, configuredFinancials };
  }, [directory]);

  const filteredDirectory = useMemo(() => {
    return directory.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        user.full_name.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower) ||
        (user.business_name?.toLowerCase() || "").includes(searchLower) ||
        (user.fssai_license?.toLowerCase() || "").includes(searchLower) ||
        (user.upi_id?.toLowerCase() || "").includes(searchLower) ||
        (user.bank_name?.toLowerCase() || "").includes(searchLower) ||
        (user.address?.toLowerCase() || "").includes(searchLower);
      return matchesRole && matchesSearch;
    });
  }, [directory, roleFilter, searchTerm]);

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW B: UNIFIED FULL SEPARATE EDIT PAGE (Profile, Password, Offboard & Financials)
  // ─────────────────────────────────────────────────────────────────────────
  if (editingUser) {
    return (
      <div className="space-y-6 animate-fade-in pb-16 font-sans">
        {/* Top Header Bar matching Analytics Language */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={closeEditPage}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 transition-all border border-gray-200"
              title="Back to Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20 font-black">
                {editingUser.role === "fbo" ? <Building2 className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">
                    {editingUser.role === "fbo" ? editingUser.business_name || editingUser.full_name : editingUser.full_name}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      editingUser.role === "fbo"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {editingUser.role.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      editingUser.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {editingUser.is_active ? "Active" : "Offboarded"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Username: <span className="font-mono text-gray-700 font-bold">{editingUser.username}</span> · User ID: {editingUser.id.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeEditPage}
              className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
            >
              Done / Exit
            </button>
            <button
              type="button"
              onClick={handleSaveDetails}
              disabled={actionLoading}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-700/20 transition-all"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Details
            </button>
          </div>
        </div>

        {actionMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border shadow-sm ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            )}
            {actionMessage.text}
          </div>
        )}

        {/* Main Grid for Unified Edit View */}
        <form onSubmit={handleSaveDetails} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Profile & Security (col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Core Profile Details */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700" />
                  Account & Profile Information
                </h2>
                <span className="text-[11px] text-gray-400 font-medium">Basic Identifiers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {editingUser.role === "fbo" ? (
                  <>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Business Name *</label>
                      <input
                        type="text"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-900"
                        value={editForm.businessName}
                        onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Contact Person Name *</label>
                      <input
                        type="text"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-900"
                        value={editForm.contactPerson}
                        onChange={(e) =>
                          setEditForm({ ...editForm, contactPerson: e.target.value, fullName: e.target.value })
                        }
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-900"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-900"
                    placeholder="+91 98765 43210"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                {editingUser.role === "fbo" && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">FSSAI License No.</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs uppercase font-medium text-gray-900"
                      placeholder="e.g. 12224999000123"
                      value={editForm.fssaiLicense}
                      onChange={(e) => setEditForm({ ...editForm, fssaiLicense: e.target.value })}
                    />
                  </div>
                )}

                {editingUser.role === "picker" && (
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Vehicle / Transport Info</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-900"
                      placeholder="e.g. Auto Rickshaw KA-01-AB-1234"
                      value={editForm.vehicleInfo}
                      onChange={(e) => setEditForm({ ...editForm, vehicleInfo: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Security & Password Management */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" />
                  Security & Password Control
                </h2>
                <span className="text-[11px] font-mono text-gray-500">
                  Current Password:{" "}
                  <span className="font-bold text-gray-900">
                    {editingUser.generated_password || "••••••••"}
                  </span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-800">Set New Password</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Generate
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-10 font-mono font-medium text-gray-900"
                      placeholder="Min 6 characters..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSavePasswordInsideEdit}
                    disabled={passwordLoading || !newPassword}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    {passwordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                    Update Password
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Account Status & Offboarding Controls */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gray-700" />
                  Account Lifecycle & Access Status
                </h2>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                    editingUser.is_active
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-rose-100 text-rose-800 border border-rose-200"
                  }`}
                >
                  {editingUser.is_active ? "Active Partner" : "Offboarded Account"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-900">
                    {editingUser.is_active ? "Offboard / Deactivate Partner" : "Reactivate Partner Account"}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {editingUser.is_active
                      ? "Deactivating revokes login privileges and suspends operational activity."
                      : "Reactivating restores login credentials and enables active pickup assignment."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleStatusInsideEdit}
                  disabled={statusLoading}
                  className={`px-4 py-2.5 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all flex-shrink-0 ${
                    editingUser.is_active
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  }`}
                >
                  {statusLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingUser.is_active ? (
                    <>
                      <UserX className="w-4 h-4" /> Deactivate Account
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" /> Reactivate Account
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 4: Location & Address (FBO Only) */}
            {editingUser.role === "fbo" && (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    Physical Location & Map Pinpoint
                  </h2>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Full Street Address</label>
                  <textarea
                    rows={3}
                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-900"
                    placeholder="Door No, Street name, Locality, City - Pincode"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <LocationPicker
                    coords={{ lat: editForm.latitude, lng: editForm.longitude }}
                    onChange={(coords) =>
                      setEditForm((prev) => ({
                        ...prev,
                        latitude: coords.lat,
                        longitude: coords.lng,
                      }))
                    }
                    label="Pinpoint FBO Location on Map"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Payout Banking Controls (col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 5: Administrative Payout & Banking Options */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-700" />
                    Payout & Banking Options
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    Centrally managed payout details for UCO disbursements
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Admin Control
                </span>
              </div>

              {/* Sub-Card A: UPI Account */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    UPI Payout ID
                  </span>
                  {editForm.upiId && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 text-[10px] font-extrabold">
                      Active UPI
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    UPI ID <span className="text-gray-400 font-normal">(Virtual Payment Address)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-bold text-emerald-900"
                    placeholder="e.g. restaurant@upi or 9876543210@paytm"
                    value={editForm.upiId}
                    onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
                  />
                </div>
              </div>

              {/* Sub-Card B: Bank Account Details */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-gray-700" />
                    Direct Bank Account Details
                  </span>
                  {editForm.accountNumber && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-800 text-[10px] font-extrabold">
                      Bank Linked
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-900"
                      placeholder="Name as printed in bank passbook"
                      value={editForm.accountHolder}
                      onChange={(e) => setEditForm({ ...editForm, accountHolder: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-900"
                      placeholder="e.g. State Bank of India, HDFC Bank"
                      value={editForm.bankName}
                      onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Account Number</label>
                      <input
                        type="text"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-medium text-gray-900"
                        placeholder="Account number"
                        value={editForm.accountNumber}
                        onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono uppercase font-bold text-gray-900"
                        placeholder="SBIN0001234"
                        value={editForm.ifscCode}
                        onChange={(e) => setEditForm({ ...editForm, ifscCode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeEditPage}
                className="flex-1 py-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl shadow-sm transition-all"
              >
                Exit Management
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save All Details
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW A: MAIN DIRECTORY & ACCOUNT MANAGEMENT DASHBOARD (ANALYTICS STYLE)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* Top Banner matching Analytics Design Language */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 font-black">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Account & Financial Management
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Manage partner credentials, edit profiles, update passwords, offboard accounts, and configure banking & UPI.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDirectory}
            disabled={loadingDirectory}
            className="px-3.5 py-2.5 text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-700 transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDirectory ? "animate-spin text-emerald-600" : ""}`} />
            Sync Directory
          </button>
        </div>
      </div>

      {/* Analytics KPI Summary Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Accounts</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900">{metrics.total}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
              {metrics.active} Active
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">FBO Partners</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900">{metrics.fbosCount}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
              Verified
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Picker Drivers</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900">{metrics.pickersCount}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
              Onboarded
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Payout Configured</span>
            <Landmark className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900">{metrics.configuredFinancials}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
              UPI & Bank
            </span>
          </div>
        </div>
      </div>

      {/* Directory Filters & Search Bar Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Role Tabs Pill (Smooth Spring Slider) */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full md:w-auto relative">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`relative z-10 flex-1 md:flex-initial px-4 py-2 text-xs font-extrabold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                roleFilter === "all" ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {roleFilter === "all" && (
                <motion.div
                  layoutId="credentialsRoleFilterActivePill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/60"
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> All ({directory.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("fbo")}
              className={`relative z-10 flex-1 md:flex-initial px-4 py-2 text-xs font-extrabold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                roleFilter === "fbo" ? "text-emerald-900" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {roleFilter === "fbo" && (
                <motion.div
                  layoutId="credentialsRoleFilterActivePill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/60"
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> FBOs ({metrics.fbosCount})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("picker")}
              className={`relative z-10 flex-1 md:flex-initial px-4 py-2 text-xs font-extrabold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                roleFilter === "picker" ? "text-blue-900" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {roleFilter === "picker" && (
                <motion.div
                  layoutId="credentialsRoleFilterActivePill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/60"
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600" /> Pickers ({metrics.pickersCount})
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, username, UPI ID, bank or license..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Directory Table View */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 overflow-hidden">
        {loadingDirectory ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-600">Loading Account Directory & Banking Details...</p>
          </div>
        ) : filteredDirectory.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <Users className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700">No accounts match your filter criteria</p>
            <p className="text-xs text-gray-400">Try adjusting your search terms or role filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5">Account / Entity</th>
                  <th className="px-5 py-3.5">Credentials</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Payout & Banking Details</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDirectory.map((user) => (
                  <tr key={user.id} className="hover:bg-emerald-50/20 transition-colors group">
                    {/* Entity Info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs ${
                            user.role === "fbo"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {user.role === "fbo" ? <Building2 className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs">
                            {user.role === "fbo" ? user.business_name || user.full_name : user.full_name}
                          </p>
                          {user.role === "fbo" && user.contact_person && (
                            <p className="text-[11px] text-gray-500">Contact: {user.contact_person}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Username & Password */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="font-mono text-xs font-bold text-gray-800">{user.username}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                          <span>
                            {showPasswordMap[user.id]
                              ? user.generated_password || "••••••••"
                              : "••••••••"}
                          </span>
                          {user.generated_password && (
                            <>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(user.id)}
                                className="text-gray-400 hover:text-gray-700 p-0.5"
                                title="Show / Hide"
                              >
                                {showPasswordMap[user.id] ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(user.id, user.generated_password || "")}
                                className="text-gray-400 hover:text-emerald-700 p-0.5"
                                title="Copy Password"
                              >
                                {copiedId === user.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact & License */}
                    <td className="px-5 py-4 text-xs text-gray-600 space-y-0.5 max-w-xs">
                      {user.phone && <p className="font-medium">📞 {user.phone}</p>}
                      {user.fssai_license && (
                        <p className="font-mono text-[11px] text-gray-500">FSSAI: {user.fssai_license}</p>
                      )}
                      {user.vehicle_info && <p className="text-gray-500">🚛 {user.vehicle_info}</p>}
                      {user.address && (
                        <p className="text-gray-400 text-[11px] truncate max-w-[180px]" title={user.address}>
                          📍 {user.address}
                        </p>
                      )}
                    </td>

                    {/* Payout & Banking Details */}
                    <td className="px-5 py-4 text-xs space-y-1">
                      {user.upi_id && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 w-fit">
                          <CreditCard className="w-3 h-3 text-emerald-600" />
                          <span>{user.upi_id}</span>
                        </div>
                      )}
                      {user.account_number && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 w-fit">
                          <Landmark className="w-3 h-3 text-gray-500" />
                          <span>
                            {user.bank_name || "Bank"} (··{user.account_number.slice(-4)})
                          </span>
                        </div>
                      )}
                      {!user.upi_id && !user.account_number && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 inline-block">
                          Pending Setup
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          user.is_active
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {user.is_active ? "Active" : "Offboarded"}
                      </span>
                    </td>

                    {/* Actions: Clean single Manage Account button */}
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditPage(user)}
                        className="px-3.5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-700/20 ml-auto"
                        title="Manage Account, Passwords & Banking"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Manage Account
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
