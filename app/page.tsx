"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";

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
            let dest = "/admin";
            if (profile.role !== "admin" && profile.role !== "picker" && profile.role !== "fbo") {
              const { data: roleData } = await supabase
                .from("custom_roles")
                .select("default_routes")
                .eq("role_key", profile.role)
                .maybeSingle();

              if (roleData?.default_routes && roleData.default_routes.length > 0) {
                dest = roleData.default_routes[0];
              }
            } else if (profile.role === "picker") {
              const { data: picker } = await supabase
                .from("pickers")
                .select("is_active")
                .eq("profile_id", user.id)
                .maybeSingle();
              if (picker && picker.is_active === false) {
                await supabase.auth.signOut();
                setCheckingSession(false);
                return;
              }
              dest = "/picker";
            } else if (profile.role === "fbo") {
              const { data: fbo } = await supabase
                .from("fbos")
                .select("is_active")
                .eq("profile_id", user.id)
                .maybeSingle();
              if (fbo && fbo.is_active === false) {
                await supabase.auth.signOut();
                setCheckingSession(false);
                return;
              }
              dest = "/fbo";
            }
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
    const email = `${username.trim().toLowerCase()}@mellod.internal`;

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      if (authError?.message?.toLowerCase().includes("banned") || authError?.message?.toLowerCase().includes("suspended")) {
        setError("This account has been offboarded or suspended. Contact Mellod admin.");
      } else {
        setError("Invalid username or password. Please try again.");
      }
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.error("Profile query error:", profileError);
      setError(`Account configuration error: ${profileError.message}`);
      setLoading(false);
      return;
    }

    const profile = profileData as { role: string } | null;

    if (!profile) {
      setError("Account configuration error: Profile not found.");
      setLoading(false);
      return;
    }

    let destination = "/admin";
    if (profile.role !== "admin" && profile.role !== "picker" && profile.role !== "fbo") {
      const { data: roleData } = await supabase
        .from("custom_roles")
        .select("default_routes")
        .eq("role_key", profile.role)
        .maybeSingle();

      if (roleData?.default_routes && roleData.default_routes.length > 0) {
        destination = roleData.default_routes[0];
      }
    } else if (profile.role === "picker") {
      const { data: picker } = await supabase
        .from("pickers")
        .select("is_active")
        .eq("profile_id", data.user.id)
        .maybeSingle();

      if (picker && picker.is_active === false) {
        await supabase.auth.signOut();
        setError("This picker account has been offboarded or suspended.");
        setLoading(false);
        return;
      }
      destination = "/picker";
    } else if (profile.role === "fbo") {
      const { data: fbo } = await supabase
        .from("fbos")
        .select("is_active")
        .eq("profile_id", data.user.id)
        .maybeSingle();

      if (fbo && fbo.is_active === false) {
        await supabase.auth.signOut();
        setError("This FBO account has been offboarded or suspended.");
        setLoading(false);
        return;
      }
      destination = "/fbo";
    }

    router.push(destination);
    router.refresh();
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 font-sans relative overflow-hidden">
        {/* Animated Background Fluid Orbs */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-300/30 rounded-full blur-3xl animate-float-green-1 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-[30rem] h-[30rem] bg-teal-400/20 rounded-full blur-3xl animate-float-green-2 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-3 animate-fade-in">
          {/* Logo with NO shape or container behind it */}
          <img src="/icons/logo.png" alt="Mellod Logo" className="w-16 h-16 object-contain" />
          <div className="flex items-center gap-2 text-emerald-950 text-xs font-bold mt-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-emerald-100 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            Opening Mellod...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/80 px-4 py-8 font-sans relative overflow-hidden selection:bg-emerald-600 selection:text-white">
      {/* Dynamic Animated Fluid Green Background */}
      <div className="absolute -top-20 -left-20 w-[32rem] h-[32rem] bg-gradient-to-br from-emerald-400/35 via-teal-300/30 to-green-500/20 rounded-full blur-3xl animate-float-green-1 pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-[38rem] h-[38rem] bg-gradient-to-tr from-teal-500/30 via-emerald-300/25 to-emerald-600/20 rounded-full blur-3xl animate-float-green-2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-emerald-200/25 rounded-full blur-3xl animate-float-green-3 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-sm animate-slide-up space-y-6">
        {/* Branding Area: Clean Logo directly on page background, NO container behind logo */}
        <div className="flex flex-col items-center text-center">
          <img src="/icons/logo.png" alt="Mellod Logo" className="w-20 h-20 object-contain mb-3 drop-shadow-sm" />
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mellod</h1>
          <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">UCO Collection & Operations</p>
        </div>

        {/* Crisp Premium White Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-7 border border-gray-100 shadow-2xl shadow-emerald-950/10 space-y-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Sign In</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Enter your assigned username to access portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  className="w-full pl-11 pr-4 py-3 text-xs font-bold bg-gray-50/70 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 focus:bg-white text-gray-900 transition-all placeholder:text-gray-400"
                  placeholder="e.g. fbo_hotel_01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3 text-xs font-bold bg-gray-50/70 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-600 focus:bg-white text-gray-900 transition-all placeholder:text-gray-400"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-700 transition-colors p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sub-footer Note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secured by Mellod Logistics Platform</span>
        </div>
      </div>
    </div>
  );
}
