// Custom Service Worker logic merged into PWA build by next-pwa
self.addEventListener("sync", (event) => {
  console.log("[ServiceWorker] Background Sync event fired with tag:", event.tag);
  if (event.tag === "sync-pickups") {
    event.waitUntil(syncPendingPickups());
  }
});

async function syncPendingPickups() {
  console.log("[ServiceWorker] Triggering offline pickup records sync...");
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: "TRIGGER_OFFLINE_SYNC" });
  }
  return Promise.resolve();
}

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
      const cache = await caches.open("mellod-pwa-v1");
      await cache.put("/widgets/data.json", response);
    }
  } catch (err) {
    console.error("[ServiceWorker] Failed periodic sync fetch:", err);
  }
}

// ---------------------------------------------------------------
// PUSH NOTIFICATION EVENT
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
// NOTIFICATION CLICK EVENT
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
// WINDOWS WIDGET BOARD EVENTS (PWA Widgets API)
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
