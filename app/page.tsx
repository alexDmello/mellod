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
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper-grid px-4 font-sans relative overflow-hidden text-emerald-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 flex flex-col items-center space-y-4 text-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo.png" alt="Mellod Logo" className="w-20 h-20 object-contain drop-shadow-md" />
          <div className="flex items-center gap-2 text-emerald-950 text-xs font-black bg-white px-5 py-2.5 rounded-full border-1.5 border-emerald-950 shadow-[3px_3px_0px_#064e3b]">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            Initializing Mellod PWA...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper-grid px-4 py-8 font-sans text-emerald-950 relative overflow-hidden selection:bg-emerald-700 selection:text-white safe-top safe-bottom">
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="Mellod Logo" className="w-20 h-20 object-contain mb-3 drop-shadow-md" />
          </motion.div>
          
          <h1 className="text-3xl font-black text-emerald-950 tracking-tight">Mellod</h1>
          <p className="text-xs font-black text-emerald-800/80 uppercase tracking-wider mt-0.5">
            UCO Collection &amp; Operations Portal
          </p>
        </div>

        {/* Tactile Paper Card - Green & White */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl p-7 border-2 border-emerald-950 shadow-[6px_6px_0px_#064e3b] space-y-6"
        >
          <div className="border-b-2 border-emerald-950/15 pb-4">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-950 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0px_#064e3b] inline-block mb-1.5">
              Secure Access
            </span>
            <h2 className="text-xl font-black text-emerald-950 tracking-tight">Sign In</h2>
            <p className="text-xs text-emerald-800/80 font-bold mt-0.5">Enter your assigned username &amp; password</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-[11px] font-black text-emerald-950 uppercase tracking-wider block">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-emerald-800/70 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  inputMode="text"
                  enterKeyHint="next"
                  className="w-full pl-11 pr-4 py-3 text-xs font-bold bg-emerald-50/50 border-1.5 border-emerald-950 rounded-2xl focus:bg-white text-emerald-950 transition-all placeholder:text-emerald-800/40 outline-none shadow-[1px_1px_0px_#064e3b]"
                  placeholder="e.g. fbo_hotel_01 or picker_rajesh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[11px] font-black text-emerald-950 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-emerald-800/70 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  className="w-full pl-11 pr-11 py-3 text-xs font-bold bg-emerald-50/50 border-1.5 border-emerald-950 rounded-2xl focus:bg-white text-emerald-950 transition-all placeholder:text-emerald-800/40 outline-none shadow-[1px_1px_0px_#064e3b]"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-800 hover:text-emerald-950 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-emerald-100/50"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* DPDP Consent */}
            <div className="pt-1 pb-1 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-emerald-900 font-bold select-none">
                <input
                  type="checkbox"
                  required
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-700 border-emerald-950 rounded focus:ring-emerald-500 cursor-pointer flex-shrink-0"
                />
                <span>
                  I give explicit consent for processing my credentials and pickup records in accordance with India&apos;s <strong className="text-emerald-950 font-black">DPDP Act, 2023</strong>.
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
                  className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-950 text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username || !password || !consentAgreed}
              className="btn-paper-primary w-full py-3.5 px-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-800 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Secured by Mellod Operations Platform</span>
        </div>
      </motion.div>
    </div>
  );
}
