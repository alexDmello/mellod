"use client";

import { useState } from "react";
import {
  Loader2, CheckCircle2, AlertTriangle, Shuffle,
  FolderKanban, Users, Globe, Compass, RefreshCw,
} from "lucide-react";
import { useRoutesData } from "./use-routes-data";
import DispatchBoard from "./DispatchBoard";
import RoutesTab from "./RoutesTab";
import ZonesOverviewTab from "./ZonesOverviewTab";
import PickersTab from "./PickersTab";

type Tab = "dispatch" | "routes" | "zones" | "pickers";

const TABS: { id: Tab; label: string; icon: typeof Shuffle }[] = [
  { id: "dispatch", label: "Today's Dispatch", icon: Shuffle },
  { id: "routes",   label: "Routes",           icon: FolderKanban },
  { id: "zones",    label: "Zones",            icon: Globe },
  { id: "pickers",  label: "Pickers",           icon: Users },
];

export function RoutesManagementTab() {
  const [activeTab, setActiveTab] = useState<Tab>("dispatch");
  const data = useRoutesData();
  const { fetching, successMessage, errorMessage } = data;

  return (
    <div className="space-y-6 animate-fade-in pb-16">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Routes &amp; Dispatch
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            5-zone Bangalore structure · Auto geo-assign FBOs · Build pickup route clusters · Dispatch pickers daily.
          </p>
        </div>

        {/* Tab Switcher (pill style matching financials filterbar) */}
        <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl self-start md:self-center">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-200/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Toasts ───────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-3 shadow-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      {fetching ? (
        <div className="flex flex-col items-center justify-center py-28 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
          <p className="font-bold text-gray-700 text-sm">Loading routes dashboard...</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Syncing zones, routes, pickers &amp; schedules</p>
        </div>
      ) : (
        <div>
          {activeTab === "dispatch" && <DispatchBoard data={data} />}
          {activeTab === "routes"   && <RoutesTab data={data} />}
          {activeTab === "zones"    && <ZonesOverviewTab data={data} />}
          {activeTab === "pickers"  && <PickersTab data={data} />}
        </div>
      )}
    </div>
  );
}

export default function RoutesManagementPage() {
  return <RoutesManagementTab />;
}
