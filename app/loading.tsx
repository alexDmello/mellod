import { Sparkles } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 text-white overflow-hidden">
      {/* Ambient Pulsing Background Glows */}
      <div className="absolute w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl animate-pulse pointer-events-none -top-20 -left-20" />
      <div className="absolute w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      {/* Main Glassmorphic Card Container */}
      <div className="relative z-10 w-full max-w-sm p-8 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 shadow-2xl shadow-emerald-950/40 text-center flex flex-col items-center space-y-6">
        
        {/* Animated Glowing Logo Wrapper */}
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsing Aura Ring */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 blur-md opacity-40 animate-pulse" />
          
          {/* Spinning Ring Accent */}
          <div className="w-20 h-20 rounded-3xl border-2 border-emerald-500/20 border-t-emerald-400 border-r-teal-400 animate-spin" />

          {/* Logo Box */}
          <div className="absolute w-14 h-14 rounded-2xl bg-slate-950/90 border border-slate-700/80 flex items-center justify-center p-2.5 shadow-inner">
            <img src="/icons/logo.png" alt="Mellod Biofuels Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            Mellod Biofuels
          </div>
          <h2 className="text-white text-xl font-black tracking-tight">
            Preparing Portal...
          </h2>
          <p className="text-slate-400 text-xs font-medium max-w-[240px] mx-auto">
            Syncing real-time UCO logistics data &amp; secure session token
          </p>
        </div>

        {/* Skeleton Shimmer Progress Bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full animate-pulse w-3/4 shadow-sm shadow-emerald-500/50" />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>Loading App</span>
            <span className="text-emerald-400 animate-pulse">Initializing</span>
          </div>
        </div>

      </div>
    </div>
  );
}
