"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PickerHubPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/pickup-requests?tab=reviews");
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 text-sm font-bold">
      Redirecting to Pickup Requests &amp; Reviews Hub...
    </div>
  );
}
