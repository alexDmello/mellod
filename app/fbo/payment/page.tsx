"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/fbo/profile");
  }, [router]);

  return null;
}
