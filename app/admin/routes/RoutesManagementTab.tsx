"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Info, Map, Shuffle, FolderKanban, Users } from "lucide-react";
import { useRoutesData } from "./use-routes-data";
import DispatchBoard from "./DispatchBoard";
import RouteZonesTab from "./RouteZonesTab";
import PickersTab from "./PickersTab";

type Tab = "dispatch" | "zones" | "pickers";

export function RoutesManagementTab() {
  const [activeTab, setActiveTab] = useState<Tab>("dispatch");
  const data = useRoutesData();
  const { fetching, successMessage, errorMessage } = data;

  const tabs: { id: Tab; label: string; icon: typeof Shuffle }[] = [
    { id: "dispatch", label: "Today's Dispatch", icon: Shuffle },
    { id: "zones", label: "Zones & Schedules", icon: FolderKanban },
    { id: "pickers", label: "Pickers & Workload", icon: Users },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Map className="w-7 h-7 text-green-700" />
            Routes Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Group restaurants into zones, keep each one on its own pickup cadence, and dispatch pickers by what's actually
            due.
          </p>
        </div>

        <div className="flex rounded-xl bg-gray-100 p-1 self-start sm:self-center flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === id ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {fetching ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin text-green-700 mb-4" />
          <p className="font-medium">Loading routes management dashboard...</p>
        </div>
      ) : (
        <>
          {activeTab === "dispatch" && <DispatchBoard data={data} />}
          {activeTab === "zones" && <RouteZonesTab data={data} />}
          {activeTab === "pickers" && <PickersTab data={data} />}
        </>
      )}
    </div>
  );
}

export default function RoutesManagementPage() {
  return <RoutesManagementTab />;
}
