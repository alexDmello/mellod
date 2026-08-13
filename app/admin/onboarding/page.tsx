"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/client";
import { createBrowserClient } from "@supabase/ssr";
import { generateCredentials } from "@/lib/utils";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  UserPlus, Copy, Check, Eye, EyeOff, Loader2,
  Building2, Truck, Search, Key, Lock, MapPin, Edit3, X, Save
} from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";

// ── Schemas ──────────────────────────────────────────────────────────────────
const fboSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  contact_person: z.string().min(2, "Contact person name is required"),
  street: z.string().min(2, "Street address / door no is required"),
  area: z.string().min(2, "Area / Locality is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^[0-9]{6}$/, "Pincode must be exactly 6 digits"),
  phone: z.string().optional(),
  fssai_license: z.string().optional(),
  upi_id: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const pickerSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z.string().optional(),
  vehicle_info: z.string().optional(),
});

type FBOForm = z.infer<typeof fboSchema>;
type PickerForm = z.infer<typeof pickerSchema>;

export interface GeneratedAccount {
  type: "FBO" | "Picker";
  name: string;
  username: string;
  password: string;
  email: string;
}

export interface DirectoryUser {
  id: string;
  full_name: string;
  role: "fbo" | "picker" | "admin";
  username: string;
  phone: string | null;
  generated_password: string | null;
  business_name?: string;
}

function createNonPersistingClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

// ── Credential Result Card ───────────────────────────────────────────────────
export function CredentialCard({ account }: { account: GeneratedAccount }) {
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const copy = async (text: string, type: "user" | "pass" | "all") => {
    await navigator.clipboard.writeText(text);
    if (type === "user") { setCopiedUser(true); setTimeout(() => setCopiedUser(false), 2000); }
    if (type === "pass") { setCopiedPass(true); setTimeout(() => setCopiedPass(false), 2000); }
    if (type === "all") { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000); }
  };

  const allDetails = `Name: ${account.name}\nRole: ${account.type}\nUsername: ${account.username}\nPassword: ${account.password}`;

  return (
    <div className="card border border-green-200 bg-green-50/50 p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-green text-xs font-semibold">{account.type}</span>
          <h3 className="font-bold text-gray-900">{account.name}</h3>
        </div>
        <button
          onClick={() => copy(allDetails, "all")}
          className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 bg-white hover:bg-gray-50 border border-gray-200"
        >
          {copiedAll ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedAll ? "Copied All" : "Copy Credentials"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-green-100 font-mono text-sm">
        <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
          <div>
            <p className="text-[10px] uppercase font-sans font-bold text-gray-400">Username</p>
            <p className="text-gray-900 font-semibold">{account.username}</p>
          </div>
          <button onClick={() => copy(account.username, "user")} className="text-gray-400 hover:text-green-700 p-1">
            {copiedUser ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
          <div>
            <p className="text-[10px] uppercase font-sans font-bold text-gray-400">Password</p>
            <p className="text-gray-900 font-semibold">
              {showPass ? account.password : "••••••••••••"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-gray-700 p-1">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={() => copy(account.password, "pass")} className="text-gray-400 hover:text-green-700 p-1">
              {copiedPass ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Interactive Location Picker ──────────────────────────────────────────────


// ── FBO Registration Form ─────────────────────────────────────────────────────
export function FBORegistrationForm({ onSuccess }: { onSuccess: (acc: GeneratedAccount) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FBOForm>({
    resolver: zodResolver(fboSchema),
  });

  async function onSubmit(data: FBOForm) {
    setLoading(true);
    setError(null);
    const dbClient = createClient();

    const { count } = await dbClient.from("fbos").select("id", { count: "exact", head: true });
    const creds = generateCredentials("fbo", data.contact_person, count ?? 0);
    const fullAddress = `${data.street.trim()}, ${data.area.trim()}, ${data.city.trim()}, ${data.state.trim()} - ${data.pincode.trim()}`;

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FBO",
          email: creds.email,
          password: creds.password,
          username: creds.username,
          fullName: data.contact_person,
          phone: data.phone,
          businessName: data.business_name,
          address: fullAddress,
          latitude: selectedCoords.lat,
          longitude: selectedCoords.lng,
          fssaiLicense: data.fssai_license?.trim() || null,
          upiId: data.upi_id?.trim() || null,
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Failed to create FBO account");

      onSuccess({
        type: "FBO",
        name: data.business_name,
        username: creds.username,
        password: creds.password,
        email: creds.email,
      });
      reset();
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Business Name *</label>
          <input className="form-input" placeholder="e.g. Green Bites Restaurant" {...register("business_name")} />
          {errors.business_name && <p className="form-error">{errors.business_name.message}</p>}
        </div>
        <div>
          <label className="form-label">Contact Person *</label>
          <input className="form-input" placeholder="Owner/Manager name" {...register("contact_person")} />
          {errors.contact_person && <p className="form-error">{errors.contact_person.message}</p>}
        </div>
        <div>
          <label className="form-label">Phone Number</label>
          <input className="form-input" type="tel" placeholder="+91 98765 43210" {...register("phone")} />
        </div>
        <div>
          <label className="form-label">FSSAI License No. <span className="text-gray-400 font-normal">(Optional)</span></label>
          <input className="form-input font-mono text-xs uppercase" placeholder="e.g. 12224999000123" {...register("fssai_license")} />
        </div>
        <div className="md:col-span-2">
          <label className="form-label font-bold text-gray-700">FBO UPI ID <span className="text-gray-400 font-normal">(Admin Managed Payout ID)</span></label>
          <input className="form-input font-mono text-xs" placeholder="e.g. merchant@upi or 9876543210@paytm" {...register("upi_id")} />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Address Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="form-label">Street / Building / Door No. *</label>
            <input className="form-input" placeholder="e.g. #42, 1st Main Road, Indiranagar" {...register("street")} />
            {errors.street && <p className="form-error">{errors.street.message}</p>}
          </div>
          <div>
            <label className="form-label">Area / Locality *</label>
            <input className="form-input" placeholder="e.g. Indiranagar 1st Stage" {...register("area")} />
            {errors.area && <p className="form-error">{errors.area.message}</p>}
          </div>
          <div>
            <label className="form-label">City *</label>
            <input className="form-input" placeholder="e.g. Bengaluru" {...register("city")} />
            {errors.city && <p className="form-error">{errors.city.message}</p>}
          </div>
          <div>
            <label className="form-label">State *</label>
            <input className="form-input" placeholder="e.g. Karnataka" {...register("state")} />
            {errors.state && <p className="form-error">{errors.state.message}</p>}
          </div>
          <div>
            <label className="form-label">Pincode *</label>
            <input className="form-input" placeholder="e.g. 560038" maxLength={6} {...register("pincode")} />
            {errors.pincode && <p className="form-error">{errors.pincode.message}</p>}
          </div>
        </div>

        <LocationPicker coords={selectedCoords} onChange={setSelectedCoords} />
      </div>

      {error && <p className="form-error bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <><UserPlus className="w-4 h-4" /> Register FBO</>}
      </button>
    </form>
  );
}

// ── Picker Registration Form ──────────────────────────────────────────────────
export function PickerRegistrationForm({ onSuccess }: { onSuccess: (acc: GeneratedAccount) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PickerForm>({
    resolver: zodResolver(pickerSchema),
  });

  async function onSubmit(data: PickerForm) {
    setLoading(true);
    setError(null);
    const dbClient = createClient();

    const { count } = await dbClient.from("pickers").select("id", { count: "exact", head: true });
    const creds = generateCredentials("picker", data.full_name, count ?? 0);

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "Picker",
          email: creds.email,
          password: creds.password,
          username: creds.username,
          fullName: data.full_name,
          phone: data.phone,
          vehicleInfo: data.vehicle_info,
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Failed to create Picker account");

      onSuccess({
        type: "Picker",
        name: data.full_name,
        username: creds.username,
        password: creds.password,
        email: creds.email,
      });
      reset();
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Full Name *</label>
          <input className="form-input" placeholder="Driver's full name" {...register("full_name")} />
          {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
        </div>
        <div>
          <label className="form-label">Phone Number</label>
          <input className="form-input" type="tel" placeholder="+91 98765 43210" {...register("phone")} />
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Vehicle Info</label>
          <input className="form-input" placeholder="e.g. White Tempo, MH12 AB 1234" {...register("vehicle_info")} />
        </div>
      </div>

      {error && <p className="form-error bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <><UserPlus className="w-4 h-4" /> Register Picker</>}
      </button>
    </form>
  );
}

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
  vehicle_info?: string;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

// ── Shared Directory Component ────────────────────────────────────────────────
export function DirectoryList({ roleFilter }: { roleFilter?: "fbo" | "picker" }) {
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Action states
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<DirectoryUser | null>(null);
  const [offboardUser, setOffboardUser] = useState<DirectoryUser | null>(null);

  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    businessName: "",
    contactPerson: "",
    address: "",
    fssaiLicense: "",
    upiId: "",
    vehicleInfo: "",
    latitude: 12.9716,
    longitude: 77.5946,
  });
  const [newPassword, setNewPassword] = useState("");
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
        fbos ( business_name, contact_person, address, fssai_license, is_active, latitude, longitude, payment_methods ( upi_id, method_type ) ),
        pickers ( vehicle_info, is_active )
      `)
      .in("role", roleFilter ? [roleFilter] : ["fbo", "picker"])
      .order("created_at", { ascending: false });

    if (!error && profiles) {
      const formatted: DirectoryUser[] = profiles.map((p: any) => {
        const fboObj = Array.isArray(p.fbos) ? p.fbos[0] : p.fbos;
        const pickerObj = Array.isArray(p.pickers) ? p.pickers[0] : p.pickers;
        const isActive = p.role === "fbo" ? fboObj?.is_active ?? true : pickerObj?.is_active ?? true;
        const pmList = fboObj?.payment_methods || [];
        const upiObj = (Array.isArray(pmList) ? pmList : [pmList]).find((m: any) => m?.method_type === "upi") || pmList?.[0];

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

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const openEditModal = (user: DirectoryUser) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.full_name || "",
      phone: user.phone || "",
      businessName: user.business_name || "",
      contactPerson: user.contact_person || user.full_name || "",
      address: user.address || "",
      fssaiLicense: user.fssai_license || "",
      upiId: user.upi_id || "",
      vehicleInfo: user.vehicle_info || "",
      latitude: user.latitude ? Number(user.latitude) : 12.9716,
      longitude: user.longitude ? Number(user.longitude) : 77.5946,
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
          upiId: editForm.upiId,
          vehicleInfo: editForm.vehicleInfo,
          latitude: editForm.latitude,
          longitude: editForm.longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update details");

      setActionMessage({ type: "success", text: data.message || "Details updated" });
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

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (!newPassword || newPassword.length < 6) {
      setActionMessage({ type: "error", text: "Password must be at least 6 characters" });
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

      setActionMessage({ type: "success", text: data.message || "Password updated" });
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
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      (user.business_name?.toLowerCase() || "").includes(searchLower) ||
      (user.address?.toLowerCase() || "").includes(searchLower)
    );
  });

  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Key className="w-5 h-5 text-green-700" />
            {roleFilter === "fbo" ? "FBO Accounts Directory" : roleFilter === "picker" ? "Picker Accounts Directory" : "Credentials Directory"}
          </h2>
          <p className="text-xs text-gray-500">
            View active credentials, offboard/reactivate users, change passwords, and update partner details.
          </p>
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search credentials..."
            className="form-input !pl-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadingDirectory ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin text-green-700 mr-2" />
          Loading accounts directory...
        </div>
      ) : filteredDirectory.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No accounts found.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                <th className="px-4 py-3">User/Business</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Generated Password</th>
                <th className="px-4 py-3">Contact/Info</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {filteredDirectory.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{user.full_name}</p>
                    {user.business_name && (
                      <p className="text-xs text-green-700 font-medium">{user.business_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.role === "fbo" ? "badge-green" : "bg-blue-50 text-blue-800"}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="badge badge-green text-xs font-semibold">Active</span>
                    ) : (
                      <span className="badge bg-red-50 text-red-700 border-red-200 text-xs font-semibold">Offboarded</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{user.username}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {showPasswordMap[user.id] ? user.generated_password || "N/A" : "••••••••"}
                      </span>
                      {user.generated_password && (
                        <>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Show/Hide"
                          >
                            {showPasswordMap[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.generated_password || "")}
                            className="text-gray-400 hover:text-green-600"
                            title="Copy Password"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.phone && <p>📞 {user.phone}</p>}
                    {user.fssai_license && <p>FSSAI: {user.fssai_license}</p>}
                    {user.upi_id && <p className="font-mono text-emerald-700">UPI: {user.upi_id}</p>}
                    {user.vehicle_info && <p>🚛 {user.vehicle_info}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 text-gray-700"
                        title="Edit Details"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openPasswordModal(user)}
                        className="px-2 py-1 text-xs border rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                        title="Change Password"
                      >
                        Key
                      </button>
                      <button
                        type="button"
                        onClick={() => setOffboardUser(user)}
                        className={`px-2 py-1 text-xs border rounded ${
                          user.is_active ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200" : "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        }`}
                        title={user.is_active ? "Offboard" : "Reactivate"}
                      >
                        {user.is_active ? "Offboard" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                    <label className="form-label font-semibold">FBO UPI ID <span className="text-gray-400 font-normal">(Payout UPI)</span></label>
                    <input
                      type="text"
                      className="form-input font-mono text-xs"
                      placeholder="e.g. merchant@upi"
                      value={editForm.upiId}
                      onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
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

                  <div className="pt-2 border-t border-gray-100">
                    <LocationPicker
                      coords={{ lat: editForm.latitude, lng: editForm.longitude }}
                      onChange={(coords) =>
                        setEditForm((prev) => ({
                          ...prev,
                          latitude: coords.lat,
                          longitude: coords.lng,
                        }))
                      }
                      label="Update FBO Location on Map"
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
                  This will instantly update the user&apos;s password in Auth and directory.
                </p>
              </div>

              <div>
                <label className="form-label font-semibold">New Password *</label>
                <input
                  type="password"
                  className="form-input font-mono text-sm"
                  placeholder="Enter new password (min 6 chars)..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
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
                <button type="submit" disabled={actionLoading} className="btn btn-primary text-xs py-2 px-4">
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Update Password"
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
          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">
              {offboardUser.is_active ? "Offboard Account?" : "Reactivate Account?"}
            </h3>
            <p className="text-xs text-gray-600">
              {offboardUser.is_active
                ? `Are you sure you want to offboard ${offboardUser.full_name} (${offboardUser.username})? They will be blocked from logging in.`
                : `Reactivate ${offboardUser.full_name} (${offboardUser.username}) to restore platform access.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOffboardUser(null)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleToggleOffboardStatus(offboardUser)}
                className={`btn text-xs py-2 px-4 ${
                  offboardUser.is_active
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-700 hover:bg-green-800 text-white"
                }`}
              >
                {actionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : offboardUser.is_active ? (
                  "Offboard Account"
                ) : (
                  "Reactivate Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dedicated FBO Onboarding Tab Component ───────────────────────────────────
export function FBOOnboardingTab() {
  const [generatedAccounts, setGeneratedAccounts] = useState<GeneratedAccount[]>([]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="card p-6 bg-white border border-gray-100">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Register New FBO</h2>
          <p className="text-xs text-gray-500 mt-1">
            Create credentials and detailed location profile for a Food & Beverage Operator collection point.
          </p>
        </div>
        <FBORegistrationForm onSuccess={(acc) => setGeneratedAccounts((prev) => [acc, ...prev])} />
      </div>

      {generatedAccounts.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 bg-green-700 text-white rounded-full text-xs">
              {generatedAccounts.length}
            </span>
            Credentials Generated This Session
          </h2>
          {generatedAccounts.map((acc, i) => (
            <CredentialCard key={i} account={acc} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dedicated Picker Onboarding Tab Component ────────────────────────────────
export function PickerOnboardingTab() {
  const [generatedAccounts, setGeneratedAccounts] = useState<GeneratedAccount[]>([]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="card p-6 bg-white border border-gray-100">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Register New Picker</h2>
          <p className="text-xs text-gray-500 mt-1">
            Create login credentials and details for a collection driver or field agent.
          </p>
        </div>
        <PickerRegistrationForm onSuccess={(acc) => setGeneratedAccounts((prev) => [acc, ...prev])} />
      </div>

      {generatedAccounts.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 bg-green-700 text-white rounded-full text-xs">
              {generatedAccounts.length}
            </span>
            Credentials Generated This Session
          </h2>
          {generatedAccounts.map((acc, i) => (
            <CredentialCard key={i} account={acc} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fallback Full Onboarding Page ────────────────────────────────────────────
export default function OnboardingPage() {
  const [activeSectionId, setActiveSectionId] = useState<"fbo" | "picker">("fbo");

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Onboarding & Partner Registration
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Register new collection partners (FBOs) and field drivers (Pickers) with auto-generated login credentials.
          </p>
        </div>

        <div className="flex rounded-xl bg-gray-100/80 p-1 border border-gray-200/60 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveSectionId("fbo")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSectionId === "fbo"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Building2 className="w-4 h-4" /> FBO Onboarding
          </button>
          <button
            type="button"
            onClick={() => setActiveSectionId("picker")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSectionId === "picker"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Truck className="w-4 h-4" /> Picker Onboarding
          </button>
        </div>
      </div>

      {activeSectionId === "fbo" ? <FBOOnboardingTab /> : <PickerOnboardingTab />}
    </div>
  );
}
