"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Info, MapPin, Shuffle, FolderKanban, Users, Sparkles, Compass } from "lucide-react";
import { useRoutesData } from "./use-routes-data";
import DispatchBoard from "./DispatchBoard";
import RouteZonesTab from "./RouteZonesTab";
import PickersTab from "./PickersTab";

type Tab = "dispatch" | "zones" | "pickers";

export function RoutesManagementTab() {
  const [activeTab, setActiveTab] = useState<Tab>("dispatch");
  const data = useRoutesData();
  const { fetching, successMessage, errorMessage } = data;

  const tabs: { id: Tab; label: string; icon: typeof Shuffle; description: string }[] = [
    { id: "dispatch", label: "Today's Dispatch", icon: Shuffle, description: "Manage daily pickup dispatches" },
    { id: "zones", label: "Zones & Schedules", icon: FolderKanban, description: "Organize restaurants into zones" },
    { id: "pickers", label: "Pickers & Workload", icon: Users, description: "Monitor capacity and driver assignments" },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Modern Premium Hero Banner Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 md:p-8 text-white shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-800/80">
        {/* Subtle Canvas Grid Overlay */}
        <div className="absolute inset-0 bg-canvas-grid-dark opacity-30 pointer-events-none" />

        {/* Ambient Glowing Orb BG */}
        <div className="absolute -top-24 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Dispatch Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Compass className="w-8 h-8 text-emerald-400" />
              Routes &amp; Dispatch Management
            </h1>
            <p className="text-slate-300 text-xs md:text-sm font-mono leading-relaxed">
              Group restaurants into intelligent pickup zones, manage custom collection cadences, and automatically dispatch pickers based on real-time urgency.
            </p>
          </div>

          {/* Pill-Shaped Glassmorphism Tab Bar Switcher */}
          <div className="flex p-1.5 rounded-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 self-start lg:self-center flex-wrap shadow-inner gap-1">
            {tabs.map(({ id, label, icon: Icon }, idx) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`relative flex items-center gap-2.5 px-5 py-2.5 text-xs font-bold font-mono rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/30 scale-[1.02]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <span className="text-[10px] opacity-60">0{idx + 1}</span>
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modern Alert Toasts */}
      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 rounded-2xl text-sm flex items-center gap-3 shadow-sm animate-shake">
          <Info className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm flex items-center gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Main Tab Content */}
      {fetching ? (
        <div className="flex flex-col items-center justify-center py-28 text-slate-500 bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-200/60 backdrop-blur-md">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
          <p className="font-bold text-slate-700 text-sm">Loading routes management dashboard...</p>
          <p className="text-xs text-slate-400 mt-1">Syncing zones, pickers, and due schedules</p>
        </div>
      ) : (
        <div className="transition-all duration-300">
          {activeTab === "dispatch" && <DispatchBoard data={data} />}
          {activeTab === "zones" && <RouteZonesTab data={data} />}
          {activeTab === "pickers" && <PickersTab data={data} />}
        </div>
      )}
    </div>
  );
}

export default function RoutesManagementPage() {
  return <RoutesManagementTab />;
}
