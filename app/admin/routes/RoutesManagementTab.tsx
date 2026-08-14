"use client";

import { useState } from "react";
import {
  Loader2, CheckCircle2, AlertTriangle, Shuffle,
  FolderKanban, Users, Globe, Compass, CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoutesData } from "./use-routes-data";
import DispatchBoard from "./DispatchBoard";
import SchedulesTab from "./SchedulesTab";
import RoutesTab from "./RoutesTab";
import ZonesOverviewTab from "./ZonesOverviewTab";
import PickersTab from "./PickersTab";
import ExceptionsTab from "./ExceptionsTab";

type Tab = "dispatch" | "schedules" | "routes" | "zones" | "pickers" | "exceptions";

const TABS: { id: Tab; label: string; icon: typeof Shuffle }[] = [
  { id: "dispatch",   label: "Today's Dispatch", icon: Shuffle },
  { id: "exceptions", label: "Closed Pickups 🚨", icon: AlertTriangle },
  { id: "schedules",  label: "Schedules",        icon: CalendarDays },
  { id: "routes",     label: "Routes",           icon: FolderKanban },
  { id: "zones",      label: "Zones",            icon: Globe },
  { id: "pickers",    label: "Pickers",           icon: Users },
];

export function RoutesManagementTab() {
  const [activeTab, setActiveTab] = useState<Tab>("dispatch");
  const data = useRoutesData();
  const { fetching, successMessage, errorMessage } = data;

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans safe-top safe-bottom">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/95 backdrop-blur-2xl p-6 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Routes &amp; Dispatch
              </h1>
              <p className="text-xs text-slate-500 font-semibold">
                5-zone Bangalore structure · Auto geo-assign FBOs · Build pickup route clusters · Dispatch pickers daily.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher (Smooth Spring Pill Slider) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 self-start md:self-center overflow-x-auto max-w-full">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`relative z-10 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-colors whitespace-nowrap cursor-pointer ${
                  isActive ? "text-emerald-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="routesTabActivePill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/60"
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Toasts ───────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-3 shadow-xs font-bold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-3 shadow-xs font-bold">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      {fetching ? (
        <div className="flex flex-col items-center justify-center py-28 bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
          <p className="font-extrabold text-slate-800 text-sm">Loading routes dashboard...</p>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Syncing zones, routes, pickers &amp; schedules</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === "dispatch"   && <DispatchBoard data={data} />}
            {activeTab === "exceptions" && <ExceptionsTab />}
            {activeTab === "schedules"  && <SchedulesTab data={data} />}
            {activeTab === "routes"     && <RoutesTab data={data} />}
            {activeTab === "zones"      && <ZonesOverviewTab data={data} />}
            {activeTab === "pickers"    && <PickersTab data={data} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default function RoutesManagementPage() {
  return <RoutesManagementTab />;
}
