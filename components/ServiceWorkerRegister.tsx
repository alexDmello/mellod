"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Service Worker Registration with DPDP Act 2023 Consent Audit
 * Ensures offline caching, periodic background sync, and push notifications
 * are ONLY active if the user has explicitly consented to offline PWA storage and alerts.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[PWA] Service Worker registered with scope:", registration.scope);

        // DPDP Act Audit: Check if authenticated user has granted PWA Storage & Notification Consents
        let hasPwaConsent = false;
        let hasNotificationConsent = false;

        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from("user_consents")
              .select("pwa_storage_consent, marketing_consent")
              .eq("user_id", user.id)
              .maybeSingle();

            hasPwaConsent = !!data?.pwa_storage_consent;
            hasNotificationConsent = !!data?.marketing_consent;
          }
        } catch (consentErr) {
          console.warn("[DPDP PWA Audit] Could not verify consent status, defaulting to restricted:", consentErr);
        }

        // 1. Background Sync Registration (Only if PWA storage consent is granted)
        if (hasPwaConsent && "sync" in registration) {
          try {
            await (registration as any).sync.register("sync-pickups");
            console.log("[DPDP Approved] Background Sync registered: sync-pickups");
          } catch (syncErr) {
            console.log("[PWA] Background Sync notice:", syncErr);
          }
        }

        // 2. Periodic Background Sync Registration (Only if PWA storage consent is granted)
        if (hasPwaConsent && "periodicSync" in registration) {
          try {
            const status = await (navigator as any).permissions.query({
              name: "periodic-background-sync",
            });
            if (status.state === "granted") {
              await (registration as any).periodicSync.register("refresh-routes", {
                minInterval: 24 * 60 * 60 * 1000, // 24 hours
              });
              console.log("[DPDP Approved] Periodic Sync registered: refresh-routes");
            }
          } catch (periodicErr) {
            console.log("[PWA] Periodic Sync notice:", periodicErr);
          }
        }

        // 3. Push Notification Permission (Only if Notification consent is granted)
        if (hasNotificationConsent && "Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            console.log("[DPDP Approved] Notification permission status:", permission);
          });
        }
      } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error);
      }
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  return null;
}

