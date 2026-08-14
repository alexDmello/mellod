"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Building2, Map, IndianRupee, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FBOMapView } from "@/app/admin/map/page";
import { MarketPriceTab } from "@/app/admin/settings/page";
import { FBOOnboardingTab } from "@/app/admin/onboarding/page";

function FBOHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams.get("tab");
  const validTabs = ["onboarding", "map", "price"];
  const activeTab = validTabs.includes(rawTab || "") ? rawTab! : "onboarding";

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

      {/* Top Options Navigation Tabs (Smooth Spring Pill Slider) */}
      <div className="flex flex-wrap border border-slate-200/80 bg-slate-100/90 rounded-2xl shadow-xs p-1.5 gap-1.5 relative">
        <button
          type="button"
          onClick={() => setTab("onboarding")}
          className={`relative z-10 flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
            activeTab === "onboarding" ? "text-white font-black" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {activeTab === "onboarding" && (
            <motion.div
              layoutId="fboTabActivePill"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 bg-emerald-700 rounded-xl shadow-md shadow-emerald-700/20"
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Onboarding & Directory
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("map")}
          className={`relative z-10 flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
            activeTab === "map" ? "text-white font-black" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {activeTab === "map" && (
            <motion.div
              layoutId="fboTabActivePill"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 bg-emerald-700 rounded-xl shadow-md shadow-emerald-700/20"
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Map className="w-4 h-4" />
            Interactive Map
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("price")}
          className={`relative z-10 flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
            activeTab === "price" ? "text-white font-black" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {activeTab === "price" && (
            <motion.div
              layoutId="fboTabActivePill"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 bg-emerald-700 rounded-xl shadow-md shadow-emerald-700/20"
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <IndianRupee className="w-4 h-4" />
            Market Price
          </span>
        </button>
      </div>

      {/* Active Tab View with Framer Motion AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="pt-2"
        >
          {activeTab === "onboarding" && <FBOOnboardingTab />}
          {activeTab === "map" && <FBOMapView />}
          {activeTab === "price" && <MarketPriceTab />}
        </motion.div>
      </AnimatePresence>
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
