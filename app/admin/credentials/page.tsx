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
} from "lucide-react";

interface DirectoryUser {
  id: string;
  full_name: string;
  role: "fbo" | "picker" | "admin";
  username: string;
  phone: string | null;
  generated_password: string | null;
  business_name?: string;
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
    setLoading(true);
    setError(null);

    // Accept master security password "admin123" or "mellod2026"
    if (passwordInput.trim() === "admin123" || passwordInput.trim() === "mellod2026") {
      setUnlocked(true);
      sessionStorage.setItem("mellod_credentials_unlocked", "true");
      setPasswordInput("");
      await fetchDirectory();
    } else {
      setError("Incorrect master password. Please try again.");
    }
    setLoading(false);
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
        fbos ( business_name )
      `)
      .in("role", ["fbo", "picker"])
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

  const copyToClipboard = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDirectory = directory.filter((user) => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      (user.business_name?.toLowerCase() || "").includes(searchLower);
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

          <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400">
            Default Master Key: <span className="font-mono font-semibold text-green-700">admin123</span>
          </div>
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
            Credentials Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Centralized repository for active FBO & Picker system login credentials.
          </p>
        </div>

        <button
          onClick={handleLock}
          className="btn btn-secondary text-xs flex items-center gap-2 py-2 px-4 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors w-fit"
        >
          <Lock className="w-4 h-4" /> Lock Credentials
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
              placeholder="Search by name, business, or username..."
              className="form-input !pl-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Credentials Table */}
        {loadingDirectory ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-green-700 mr-2" />
            Loading accounts directory...
          </div>
        ) : filteredDirectory.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No matching credentials found.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                  <th className="px-4 py-3.5">User / Business</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Username</th>
                  <th className="px-4 py-3.5">Password</th>
                  <th className="px-4 py-3.5">Contact Phone</th>
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
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-800">{user.username}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg w-fit">
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
                    <td className="px-4 py-3.5 text-xs text-gray-500">{user.phone || "—"}</td>
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
