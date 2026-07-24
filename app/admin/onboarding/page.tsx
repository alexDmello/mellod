"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/client";
import { createBrowserClient } from "@supabase/ssr";
import { generateCredentials } from "@/lib/utils";
import Link from "next/link";
import {
  UserPlus, Copy, Check, Eye, EyeOff, Loader2,
  Building2, Truck, Search, Key, Lock, MapPin
} from "lucide-react";

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
export function LocationPicker({
  coords,
  onChange,
}: {
  coords: { lat: number; lng: number };
  onChange: (c: { lat: number; lng: number }) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      const L = (window as any).L;
      if (!L || mapInstanceRef.current || !mapContainerRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapContainerRef.current).setView([coords.lat, coords.lng], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const position = marker.getLatLng();
        onChange({ lat: position.lat, lng: position.lng });
      });

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onChange({ lat, lng });
      });
    };

    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = initMap;
      document.body.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          onChange(newCoords);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], 15);
            markerRef.current.setLatLng([newCoords.lat, newCoords.lng]);
          }
        },
        (error) => {
          alert("Could not get your current location: " + error.message);
        }
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="form-label font-semibold text-gray-700">Pinpoint exact location *</label>
        <button
          type="button"
          onClick={handleLocateMe}
          className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors font-semibold"
        >
          <MapPin className="w-3.5 h-3.5" /> Use Current Location
        </button>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full h-[220px] rounded-xl border border-gray-200 bg-gray-50 overflow-hidden relative z-10"
      />
      
      <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-gray-100 p-2.5 rounded-lg border border-gray-200 text-gray-600">
        <div>Lat: {coords.lat.toFixed(6)}</div>
        <div>Lng: {coords.lng.toFixed(6)}</div>
      </div>
    </div>
  );
}

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

// ── Shared Directory Component ────────────────────────────────────────────────
export function DirectoryList({ roleFilter }: { roleFilter?: "fbo" | "picker" }) {
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

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
        fbos ( business_name )
      `)
      .in("role", roleFilter ? [roleFilter] : ["fbo", "picker"])
      .order("created_at", { ascending: false });

    if (!error && profiles) {
      const formatted = profiles.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        username: p.username,
        phone: p.phone,
        generated_password: p.generated_password,
        business_name: p.fbos?.[0]?.business_name,
      }));
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

  const filteredDirectory = directory.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      (user.business_name?.toLowerCase() || "").includes(searchLower)
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
            View active credentials for {roleFilter === "fbo" ? "registered FBO collection points" : roleFilter === "picker" ? "registered pickers" : "all active users"}.
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
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Generated Password</th>
                <th className="px-4 py-3">Contact</th>
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
                  <td className="px-4 py-3 font-mono text-xs">{user.username}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {showPasswordMap[user.id] ? user.generated_password : "••••••••"}
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
                  <td className="px-4 py-3 text-xs text-gray-500">{user.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Onboarding & Management</h1>
        <p className="text-sm text-gray-500 mt-1">Register new partners and manage active user credentials.</p>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-xl shadow-sm p-1.5 gap-2">
        <button
          type="button"
          onClick={() => setActiveSectionId("fbo")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeSectionId === "fbo" ? "bg-green-700 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Building2 className="w-4 h-4" /> FBO Onboarding
        </button>
        <button
          type="button"
          onClick={() => setActiveSectionId("picker")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeSectionId === "picker" ? "bg-green-700 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Truck className="w-4 h-4" /> Picker Onboarding
        </button>
      </div>

      {activeSectionId === "fbo" ? <FBOOnboardingTab /> : <PickerOnboardingTab />}
    </div>
  );
}
