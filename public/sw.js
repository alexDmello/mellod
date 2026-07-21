/* ============================================================
   MELLOD PWA SERVICE WORKER
   Supports: Offline Caching, Background Sync, Periodic Sync, Push Notifications
   ============================================================ */

const CACHE_NAME = "mellod-pwa-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/widgets/template.json",
  "/widgets/data.json"
];

// ---------------------------------------------------------------
// 1. INSTALL EVENT - Pre-cache core shell & offline page
// ---------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Pre-caching offline pages and assets");
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------
// 2. ACTIVATE EVENT - Clean up stale caches
// ---------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[ServiceWorker] Removing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ---------------------------------------------------------------
// 3. FETCH EVENT - Offline Support & Caching Strategies
// ---------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ignore chrome extensions or third party non-http(s) schemas
  if (!url.protocol.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to keep cache updated (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {/* Silent catch offline */});
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Cache successful responses for static assets
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.pathname.startsWith("/icons/") ||
              url.pathname.startsWith("/widgets/") ||
              url.pathname.endsWith(".json") ||
              url.pathname.endsWith(".png"))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If HTML request fails (user is offline), return offline fallback page
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});

// ---------------------------------------------------------------
// 4. BACKGROUND SYNC EVENT - Re-sync offline logs when re-connected
// ---------------------------------------------------------------
self.addEventListener("sync", (event) => {
  console.log("[ServiceWorker] Background Sync event fired with tag:", event.tag);
  if (event.tag === "sync-pickups") {
    event.waitUntil(syncPendingPickups());
  }
});

async function syncPendingPickups() {
  console.log("[ServiceWorker] Syncing pending offline pickup records...");
  // Simulated background sync worker logic
  return Promise.resolve();
}

// ---------------------------------------------------------------
// 5. PERIODIC BACKGROUND SYNC EVENT - Periodic route data sync
// ---------------------------------------------------------------
self.addEventListener("periodicsync", (event) => {
  console.log("[ServiceWorker] Periodic Sync event fired with tag:", event.tag);
  if (event.tag === "refresh-routes") {
    event.waitUntil(refreshDailyRoutes());
  }
});

async function refreshDailyRoutes() {
  console.log("[ServiceWorker] Refreshing daily route cache in background...");
  try {
    const response = await fetch("/widgets/data.json");
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/widgets/data.json", response);
    }
  } catch (err) {
    console.error("[ServiceWorker] Failed periodic sync fetch:", err);
  }
}

// ---------------------------------------------------------------
// 6. PUSH NOTIFICATION EVENT - Display incoming notifications
// ---------------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = { title: "Mellod Alert", body: "New pickup route assigned to your portal!" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    vibrate: [100, 50, 100],
    data: { dateOfArrival: Date.now(), primaryKey: 1, url: data.url || "/picker" },
    actions: [
      { action: "explore", title: "View Route" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ---------------------------------------------------------------
// 7. NOTIFICATION CLICK EVENT - Open/Focus App window
// ---------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const targetUrl = event.notification.data?.url || "/picker";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ---------------------------------------------------------------
// 8. WINDOWS WIDGET BOARD EVENTS (PWA Widgets API)
// ---------------------------------------------------------------
self.addEventListener("widgetinstall", (event) => {
  console.log("[ServiceWorker] Widget installed:", event.widget?.tag);
  event.waitUntil(renderWidget(event.widget));
});

self.addEventListener("widgetuninstall", (event) => {
  console.log("[ServiceWorker] Widget uninstalled:", event.widget?.tag);
});

self.addEventListener("widgetresume", (event) => {
  console.log("[ServiceWorker] Widget resumed:", event.widget?.tag);
  event.waitUntil(renderWidget(event.widget));
});

self.addEventListener("widgetclick", (event) => {
  console.log("[ServiceWorker] Widget clicked:", event.action, event.widget?.tag);
  if (event.action === "open-app" || event.action === "OpenRoute") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/picker") && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/picker");
        }
      })
    );
  }
});

async function renderWidget(widget) {
  if (!widget) return;
  try {
    const templateRes = await fetch("/widgets/template.json");
    const dataRes = await fetch("/widgets/data.json");
    const template = await templateRes.text();
    const data = await dataRes.text();
    if ("widgets" in self && self.widgets && self.widgets.updateByTag) {
      await self.widgets.updateByTag(widget.tag, { template, data });
    }
  } catch (err) {
    console.error("[ServiceWorker] Render widget error:", err);
  }
}
