"use client";

import { useEffect } from "react";

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

        // 1. Background Sync Registration
        if ("sync" in registration) {
          try {
            await (registration as any).sync.register("sync-pickups");
            console.log("[PWA] Background Sync registered: sync-pickups");
          } catch (syncErr) {
            console.log("[PWA] Background Sync notice:", syncErr);
          }
        }

        // 2. Periodic Background Sync Registration
        if ("periodicSync" in registration) {
          try {
            const status = await (navigator as any).permissions.query({
              name: "periodic-background-sync",
            });
            if (status.state === "granted") {
              await (registration as any).periodicSync.register("refresh-routes", {
                minInterval: 24 * 60 * 60 * 1000, // 24 hours
              });
              console.log("[PWA] Periodic Sync registered: refresh-routes");
            }
          } catch (periodicErr) {
            console.log("[PWA] Periodic Sync notice:", periodicErr);
          }
        }

        // 3. Request Push Notification Permission
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            console.log("[PWA] Notification permission status:", permission);
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
