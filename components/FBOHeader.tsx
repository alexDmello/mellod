"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

interface FBOHeaderProps {
  children?: React.ReactNode;
  subtitle?: string;
  showSignOut?: boolean;
}

export default function FBOHeader({
  children,
  subtitle = "FBO Partner Portal",
  showSignOut = false,
}: FBOHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 px-5 pb-12 text-white shadow-xl shadow-emerald-950/20 rounded-b-3xl relative overflow-hidden"
      style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
    >
      {/* Background glow decoration */}
      <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Branding Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-emerald-700/40 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
            <img src="/icons/logo.png" alt="Mellod Logo" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <div className="text-white font-black text-sm tracking-tight leading-none">Mellod Biofuels</div>
            <div className="text-emerald-300 text-[11px] font-medium mt-0.5">{subtitle}</div>
          </div>
        </div>

        {showSignOut && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-emerald-200 hover:text-white transition-all text-xs font-semibold border border-white/15 shadow-sm"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Hero Content inside the same unified container */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
