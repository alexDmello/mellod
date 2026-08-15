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
      className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-5 pb-12 text-white shadow-xl shadow-emerald-900/20 rounded-b-3xl relative overflow-hidden"
      style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
    >
      {/* Ambient Glow Effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-300/15 rounded-full blur-2xl pointer-events-none" />

      {/* Top Branding Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/15 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="Mellod Logo" className="w-5.5 h-5.5 object-contain" />
          </div>
          <div>
            <div className="text-white font-black text-sm tracking-tight leading-none drop-shadow-sm">Mellod Biofuels</div>
            <div className="text-emerald-100 text-[11px] font-semibold mt-0.5">{subtitle}</div>
          </div>
        </div>

        {showSignOut && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-all text-xs font-bold border border-white/20 shadow-sm cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Hero Content inside the same unified container */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
