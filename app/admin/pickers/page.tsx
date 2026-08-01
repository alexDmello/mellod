"use client";

import { Suspense } from "react";
import { Truck } from "lucide-react";
import AdminPickupReview from "@/components/AdminPickupReview";

function PickerHubContent() {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-green-700" />
            Pickup Log Reviews & Verification
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review collection entries submitted by pickers, verify volumes and photo proofs, and release verified logs to FBO accounts.
          </p>
        </div>
      </div>

      {/* Main Review Interface */}
      <div className="pt-2">
        <AdminPickupReview />
      </div>
    </div>
  );
}

export default function PickerHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Pickup Reviews...</div>}>
      <PickerHubContent />
    </Suspense>
  );
}
