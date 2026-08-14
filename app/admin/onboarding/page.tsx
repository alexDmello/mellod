"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/client";
import { createBrowserClient } from "@supabase/ssr";
import { generateCredentials } from "@/lib/utils";
import {
  UserPlus, Copy, Check, Eye, EyeOff, Loader2,
  Building2, Truck, Search, Key, Lock, MapPin, Edit3, X, Save,
  Sparkles, ShieldCheck, Share2, Phone, AlertCircle, CheckCircle2,
  Landmark, ArrowRight, UserCheck, UserX, FileText, BadgeCheck
} from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";
import { motion, AnimatePresence } from "framer-motion";

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
  contact_person?: string;
  address?: string;
  fssai_license?: string;
  upi_id?: string;
  vehicle_info?: string;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

// ── Credential Result Security Card ──────────────────────────────────────────
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

  const shareText = `Welcome to Mellod! Your ${account.type} portal login details:\nUsername: ${account.username}\nPassword: ${account.password}\nLogin at: ${typeof window !== "undefined" ? window.location.origin : ""}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-emerald-500/30 space-y-4 relative overflow-hidden"
    >
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between relative z-10 border-b border-emerald-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
            {account.type === "FBO" ? <Building2 className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              {account.type} Account Created
            </span>
            <h3 className="font-extrabold text-white text-base leading-tight">{account.name}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Share via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </a>
          <button
            onClick={() => copy(`Username: ${account.username}\nPassword: ${account.password}`, "all")}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAll ? "Copied All" : "Copy Credentials"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10 font-mono text-xs">
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-sans font-extrabold text-slate-400">Portal Username</p>
            <p className="text-emerald-300 font-bold text-sm mt-0.5">{account.username}</p>
          </div>
          <button
            onClick={() => copy(account.username, "user")}
            className="text-slate-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            {copiedUser ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-sans font-extrabold text-slate-400">Generated Password</p>
            <p className="text-emerald-300 font-bold text-sm mt-0.5">
              {showPass ? account.password : "••••••••••••"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPass(!showPass)}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copy(account.password, "pass")}
              className="text-slate-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section 1: Business Profile */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          1. Business & Contact Information
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Business Name *
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="e.g. Green Bites Restaurant"
              {...register("business_name")}
            />
            {errors.business_name && <p className="text-[11px] font-bold text-rose-600 mt-1">{errors.business_name.message}</p>}
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Contact Person *
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="Owner or Manager Full Name"
              {...register("contact_person")}
            />
            {errors.contact_person && <p className="text-[11px] font-bold text-rose-600 mt-1">{errors.contact_person.message}</p>}
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="+91 98765 43210"
              {...register("phone")}
            />
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              FSSAI License No. <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none font-mono uppercase"
              placeholder="e.g. 12224999000123"
              {...register("fssai_license")}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              FBO Payout UPI ID <span className="text-emerald-600 font-bold lowercase">(for digital payment settlements)</span>
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none font-mono"
              placeholder="e.g. merchant@upi or 9876543210@paytm"
              {...register("upi_id")}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Address Details */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          2. Address & Geolocation Pinpoint
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Street Address / Building No. *
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="e.g. #42, 1st Main Road, Indiranagar"
              {...register("street")}
            />
            {errors.street && <p className="text-[11px] font-bold text-rose-600 mt-1">{errors.street.message}</p>}
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Area / Locality *
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="e.g. Indiranagar 1st Stage"
              {...register("area")}
            />
            {errors.area && <p className="text-[11px] font-bold text-rose-600 mt-1">{errors.area.message}</p>}
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              City *
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="e.g. Bengaluru"
              {...register("city")}
            />
            {errors.city && <p className="text-[11px] font-bold text-rose-600 mt-1">{errors.city.message}</p>}
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              State *
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="e.g. Karnataka"
              {...register("state")}
            />
            {errors.state && <p className="text-[11px] font-bold text-rose-600 mt-1">{errors.state.message}</p>}
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Pincode *
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none font-mono"
              placeholder="560038"
              maxLength={6}
              {...register("pincode")}
            />
            {errors.pincode && <p className="text-[11px] font-bold text-rose-600 mt-1">{errors.pincode.message}</p>}
          </div>
        </div>

        <div className="pt-2">
          <LocationPicker coords={selectedCoords} onChange={setSelectedCoords} label="Pinpoint FBO Location on Map" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <motion.button
        type="submit"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        disabled={loading}
        className="w-full py-4 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            Creating FBO Account...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" /> Complete FBO Registration
          </>
        )}
      </motion.button>
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
          <Truck className="w-4 h-4 text-emerald-600" />
          Field Agent Details
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Full Name *
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="Driver's Full Name"
              {...register("full_name")}
            />
            {errors.full_name && <p className="text-[11px] font-bold text-rose-600 mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="+91 98765 43210"
              {...register("phone")}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
              Vehicle & Transport Info
            </label>
            <input
              className="w-full px-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
              placeholder="e.g. White Mahindra Tempo, KA-01-AB-1234"
              {...register("vehicle_info")}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <motion.button
        type="submit"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        disabled={loading}
        className="w-full py-4 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            Registering Agent...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" /> Register Picker Agent
          </>
        )}
      </motion.button>
    </form>
  );
}

// ── Tab 1: FBO Registration Tab ──────────────────────────────────────────────
export function FBOOnboardingTab() {
  const [generatedAccounts, setGeneratedAccounts] = useState<GeneratedAccount[]>([]);

  return (
    <div className="space-y-6">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-7 border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Register Food & Beverage Operator (FBO)</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Generate credentials and profile data for collection points and restaurant partners
          </p>
        </div>

        <FBORegistrationForm onSuccess={(acc) => setGeneratedAccounts((prev) => [acc, ...prev])} />
      </div>

      {generatedAccounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              {generatedAccounts.length}
            </span>
            Newly Generated FBO Credentials
          </div>
          {generatedAccounts.map((acc, i) => (
            <CredentialCard key={i} account={acc} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Picker Registration Tab ───────────────────────────────────────────
export function PickerOnboardingTab() {
  const [generatedAccounts, setGeneratedAccounts] = useState<GeneratedAccount[]>([]);

  return (
    <div className="space-y-6">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-7 border border-slate-200/90 shadow-xl shadow-slate-200/50 space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Register Collection Driver (Picker)</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Create field agent login accounts with vehicle assignment info
          </p>
        </div>

        <PickerRegistrationForm onSuccess={(acc) => setGeneratedAccounts((prev) => [acc, ...prev])} />
      </div>

      {generatedAccounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              {generatedAccounts.length}
            </span>
            Newly Generated Picker Credentials
          </div>
          {generatedAccounts.map((acc, i) => (
            <CredentialCard key={i} account={acc} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page Export ─────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [activeSectionId, setActiveSectionId] = useState<"fbo" | "picker">("fbo");

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans safe-top safe-bottom">
      {/* Top Banner Header */}
      <div className="bg-white/95 backdrop-blur-2xl p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Partner & Field Onboarding
              </h1>
              <p className="text-xs text-slate-500 font-semibold">
                Register collection points (FBOs) and field drivers (Pickers) with auto-generated passwords
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveSectionId("fbo")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              activeSectionId === "fbo"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" /> FBO Registration
          </button>
          <button
            type="button"
            onClick={() => setActiveSectionId("picker")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              activeSectionId === "picker"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-4 h-4" /> Picker Registration
          </button>
        </div>
      </div>

      {/* Dynamic Content Views */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSectionId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
        >
          {activeSectionId === "fbo" && <FBOOnboardingTab />}
          {activeSectionId === "picker" && <PickerOnboardingTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
