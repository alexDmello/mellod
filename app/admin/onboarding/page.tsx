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
  Building2, Truck, ChevronDown, ChevronUp, Search, Key
} from "lucide-react";

// ── Schemas ──────────────────────────────────────────────────────────────────
const fboSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  contact_person: z.string().min(2, "Contact person name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const pickerSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z.string().optional(),
  vehicle_info: z.string().optional(),
});

type FBOForm = z.infer<typeof fboSchema>;
type PickerForm = z.infer<typeof pickerSchema>;

interface GeneratedAccount {
  type: "FBO" | "Picker";
  name: string;
  username: string;
  password: string;
  email: string;
}

interface DirectoryUser {
  id: string;
  full_name: string;
  role: "fbo" | "picker" | "admin";
  username: string;
  phone: string | null;
  generated_password: string | null;
  business_name?: string; // from joined FBO table
}

// Helper to create a client that does NOT persist session, so admin is not logged out
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

// ── Credential Card ───────────────────────────────────────────────────────────
function CredentialCard({ account }: { account: GeneratedAccount }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const copy = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      type="button"
      onClick={() => copy(value, field)}
      className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
      aria-label={`Copy ${field}`}
    >
      {copiedField === field ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="border-2 border-green-200 bg-green-50 rounded-xl p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
          {account.type === "FBO" ? (
            <Building2 className="w-4 h-4 text-white" />
          ) : (
            <Truck className="w-4 h-4 text-white" />
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-800">{account.name}</div>
          <div className="text-xs text-gray-500">{account.type} account created</div>
        </div>
        <span className="ml-auto badge badge-green">{account.type}</span>
      </div>

      <div className="space-y-2.5 bg-white rounded-lg p-4 border border-green-100">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
          Login Credentials — Share with {account.type === "FBO" ? "business owner" : "driver"}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 w-20">Username</span>
          <div className="flex-1 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-mono text-sm text-gray-800 font-medium">{account.username}</span>
            <CopyBtn value={account.username} field="username" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 w-20">Password</span>
          <div className="flex-1 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-mono text-sm text-gray-800 font-medium">
              {showPass ? account.password : "••••••••••"}
            </span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <CopyBtn value={account.password} field="password" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FBO Registration Form ─────────────────────────────────────────────────────
function FBORegistrationForm({ onSuccess }: { onSuccess: (acc: GeneratedAccount) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FBOForm>({
    resolver: zodResolver(fboSchema),
  });

  async function onSubmit(data: FBOForm) {
    setLoading(true);
    setError(null);
    const dbClient = createClient();

    // Count existing FBOs to generate unique credential
    const { count } = await dbClient.from("fbos").select("id", { count: "exact", head: true });
    const creds = generateCredentials("fbo", data.contact_person, count ?? 0);

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
          address: data.address,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Failed to create FBO account");
      }

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
          <label className="form-label">Address</label>
          <input className="form-input" placeholder="Full address" {...register("address")} />
        </div>
      </div>

      {error && <p className="form-error bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <><UserPlus className="w-4 h-4" /> Register FBO</>}
      </button>
    </form>
  );
}

// ── Picker Registration Form ──────────────────────────────────────────────────
function PickerRegistrationForm({ onSuccess }: { onSuccess: (acc: GeneratedAccount) => void }) {
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

      if (!response.ok) {
        throw new Error(resData.error || "Failed to create Picker account");
      }

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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [generatedAccounts, setGeneratedAccounts] = useState<GeneratedAccount[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<"fbo" | "picker">("fbo");
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
    // Fetch all profiles along with FBO business names
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
      .in("role", ["fbo", "picker"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching directory:", error);
    } else {
      const formatted = (profiles ?? []).map((p: any) => ({
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

  const addAccount = (acc: GeneratedAccount) => {
    setGeneratedAccounts((prev) => [acc, ...prev]);
    fetchDirectory(); // Refresh directory list
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const filteredDirectory = directory.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      (user.business_name?.toLowerCase() || "").includes(searchLower)
    );
  });

  const sections = [
    {
      id: "fbo" as const,
      title: "Register New FBO",
      subtitle: "Food & Beverage Operator / Collection Point",
      icon: Building2,
      form: <FBORegistrationForm onSuccess={addAccount} />,
    },
    {
      id: "picker" as const,
      title: "Register New Picker",
      subtitle: "Collection driver or field agent",
      icon: Truck,
      form: <PickerRegistrationForm onSuccess={addAccount} />,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Onboarding & Management</h1>
        <p className="text-sm text-gray-500 mt-1">Register new partners and manage active user credentials.</p>
      </div>

      {/* Registration forms */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isOpen = activeSectionId === section.id;
          return (
            <div key={section.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveSectionId(isOpen ? (section.id === "fbo" ? "picker" : "fbo") : section.id)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-green-700" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{section.title}</div>
                  <div className="text-xs text-gray-500">{section.subtitle}</div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  {section.form}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Generated credentials from current session */}
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

      {/* Active Directory Credentials Section */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-green-700" />
              Credentials Directory
            </h2>
            <p className="text-xs text-gray-500">View and retrieve credentials for all active Pickers & FBOs.</p>
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or username..."
              className="form-input pl-9 text-sm"
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
            No active profiles found.
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
    </div>
  );
}
