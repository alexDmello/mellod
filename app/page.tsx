"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, Lock, User, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consentAgreed, setConsentAgreed] = useState(false);

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

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.error || "Invalid username or password. Please try again.");
        setLoading(false);
        return;
      }

      router.push(result.destination || "/admin");
      router.refresh();
    } catch (err: any) {
      console.error("Login attempt error:", err);
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 font-sans relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-200/50 rounded-full blur-3xl animate-float-green-1 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-[30rem] h-[30rem] bg-teal-200/40 rounded-full blur-3xl animate-float-green-2 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 flex flex-col items-center space-y-4 text-center"
        >
          <img src="/icons/logo.png" alt="Mellod Logo" className="w-16 h-16 object-contain drop-shadow-md" />
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold bg-white/90 backdrop-blur-xl px-5 py-2.5 rounded-full border border-emerald-200 shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            Initializing Mellod PWA...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-8 font-sans relative overflow-hidden selection:bg-emerald-600 selection:text-white safe-top safe-bottom">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-canvas-grid opacity-60 pointer-events-none" />

      {/* Subtle Fluid Ambient Orbs for White Theme */}
      <div className="absolute -top-24 -left-24 w-[36rem] h-[36rem] bg-gradient-to-br from-emerald-200/60 via-teal-100/40 to-transparent rounded-full blur-3xl animate-float-green-1 pointer-events-none" />
      <div className="absolute -bottom-28 -right-24 w-[38rem] h-[38rem] bg-gradient-to-tr from-teal-200/50 via-emerald-100/40 to-transparent rounded-full blur-3xl animate-float-green-2 pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm space-y-6"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <img src="/icons/logo.png" alt="Mellod Logo" className="w-20 h-20 object-contain mb-3 drop-shadow-md" />
          </motion.div>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mellod</h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
            UCO Collection & Operations Portal
          </p>
        </div>

        {/* Crisp White Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/95 backdrop-blur-2xl rounded-3xl p-7 border border-slate-200/90 shadow-xl shadow-slate-200/80 space-y-6"
        >
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Sign In</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Enter your assigned username & password</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  inputMode="text"
                  enterKeyHint="next"
                  className="w-full pl-11 pr-4 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
                  placeholder="e.g. fbo_hotel_01 or picker_rajesh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  className="w-full pl-11 pr-11 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 outline-none"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-slate-100"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* DPDP Consent */}
            <div className="pt-1 pb-1 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-600 font-medium select-none">
                <input
                  type="checkbox"
                  required
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer flex-shrink-0"
                />
                <span>
                  I give explicit consent for processing my credentials and pickup records in accordance with India&apos;s <strong className="text-slate-800 font-bold">DPDP Act, 2023</strong>.
                </span>
              </label>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || !username || !password || !consentAgreed}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
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
            </motion.button>
          </form>
        </motion.div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secured by Mellod Operations Platform</span>
        </div>
      </motion.div>
    </div>
  );
}
