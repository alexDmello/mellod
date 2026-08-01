"use client";

import { Suspense } from "react";
import { Truck } from "lucide-react";
import AdminPickupReview from "@/components/AdminPickupReview";

function PickerHubContent() {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Pickup Log Reviews & Verification
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Review collection entries submitted by field pickers, verify volumes and photo proofs, and release verified logs to FBO accounts.
          </p>
        </div>
      </div>

      {/* Main Review Interface */}
      <div>
        <AdminPickupReview />
      </div>
    </div>
  );
}

export default function PickerHubPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500 text-sm font-medium">Loading Pickup Reviews...</div>}>
      <PickerHubContent />
    </Suspense>
  );
}
