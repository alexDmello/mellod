"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Leaf, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (profile) {
            const dest =
              profile.role === "admin" ? "/admin" :
              profile.role === "picker" ? "/picker" : "/fbo";
            router.replace(dest);
            return;
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setCheckingSession(false);
      }
    }
    checkExistingSession();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Derive the internal email from username
    const email = `${username.trim().toLowerCase()}@mellod.internal`;

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError("Invalid username or password. Please try again.");
      setLoading(false);
      return;
    }

    // Fetch role and redirect
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error("Profile query error:", profileError);
      setError(`Account configuration error: ${profileError.message} (Code: ${profileError.code})`);
      setLoading(false);
      return;
    }

    const profile = profileData as { role: string } | null;

    if (!profile) {
      setError("Account configuration error: Profile not found. Please ensure the profile row was inserted in the database.");
      setLoading(false);
      return;
    }

    const destination =
      profile.role === "admin" ? "/admin" :
      profile.role === "picker" ? "/picker" : "/fbo";


    router.push(destination);
    router.refresh();
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 px-4">
        <div className="flex flex-col items-center space-y-3 animate-fade-in">
          <div className="w-16 h-16 flex items-center justify-center drop-shadow-md">
            <img src="/icons/logo.png" alt="Mellod Logo" className="w-16 h-16 object-contain" />
          </div>
          <div className="flex items-center gap-2 text-green-800 text-sm font-semibold mt-2">
            <Loader2 className="w-4 h-4 animate-spin text-green-700" />
            Opening Mellod...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 flex items-center justify-center drop-shadow-md mb-4">
            <img src="/icons/logo.png" alt="Mellod Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mellod</h1>
          <p className="text-sm text-gray-500 mt-1">UCO Collection Platform</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="form-label">Username</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                className="form-input"
                placeholder="e.g. picker_john_01"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="form-input !pr-11"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="btn btn-primary btn-full btn-lg mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Credentials are provided by your Mellod administrator.
        </p>
      </div>
    </div>
  );
}
