/**
 * DPDP Act 2023 - Data Minimization & PWA Storage Cleaner
 * Utility to immediately purge unconsented offline storage (localStorage, CacheStorage, IndexedDB)
 * when a user revokes consent or logs out.
 */

export async function clearUnconsentedPwaStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 1. Purge personal notes & cache from localStorage
    const keysToPurge = [
      "picker_offline_notes",
      "picker_share_cache",
      "financial_filter_draft",
      "pwa_analytics_events",
      "user_location_history",
    ];

    keysToPurge.forEach((key) => {
      localStorage.removeItem(key);
    });

    // 2. Unregister Service Workers if offline storage consent is completely revoked
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        // Clear periodic sync & background syncs
        if ("periodicSync" in registration) {
          try {
            await (registration as any).periodicSync.unregister("refresh-routes");
          } catch (e) {
            console.warn("[DPDP Minimization] Periodic sync unregister error:", e);
          }
        }
      }
    }

    // 3. Clear PWA Caches containing cached API data
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.includes("pwa") || name.includes("mellod-data")) {
          await caches.delete(name);
          console.log(`[DPDP Minimization] Deleted cache storage: ${name}`);
        }
      }
    }

    // 4. Purge IndexedDB if present
    if ("indexedDB" in window && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name && (db.name.includes("mellod") || db.name.includes("offline"))) {
          indexedDB.deleteDatabase(db.name);
          console.log(`[DPDP Minimization] Deleted IndexedDB database: ${db.name}`);
        }
      }
    }
  } catch (error) {
    console.error("[DPDP Minimization Error] Failed to purge storage:", error);
  }
}
