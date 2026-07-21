"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Building2, Map, DollarSign, UserPlus } from "lucide-react";
import AdminMapPage from "@/app/admin/map/page";
import SettingsPage from "@/app/admin/settings/page";
import { FBOOnboardingTab } from "@/app/admin/onboarding/page";

function FBOHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "onboarding";

  function setTab(tab: string) {
    router.push(`/admin/fbo?tab=${tab}`);
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-green-700" />
            FBO Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage restaurant partners, view interactive geospatial map locations, and set market prices.
          </p>
        </div>
      </div>

      {/* Top Options Navigation Tabs */}
      <div className="flex flex-wrap border border-gray-200 bg-white rounded-2xl shadow-sm p-1.5 gap-2">
        <button
          type="button"
          onClick={() => setTab("onboarding")}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "onboarding"
              ? "bg-green-700 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Onboarding & Directory
        </button>

        <button
          type="button"
          onClick={() => setTab("map")}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "map"
              ? "bg-green-700 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Map className="w-4 h-4" />
          Interactive Map
        </button>

        <button
          type="button"
          onClick={() => setTab("price")}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "price"
              ? "bg-green-700 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Market Price
        </button>
      </div>

      {/* Active Tab View */}
      <div className="pt-2">
        {activeTab === "onboarding" && <FBOOnboardingTab />}
        {activeTab === "map" && <AdminMapPage />}
        {activeTab === "price" && <SettingsPage />}
      </div>
    </div>
  );
}

export default function FBOHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading FBO Management...</div>}>
      <FBOHubContent />
    </Suspense>
  );
}
