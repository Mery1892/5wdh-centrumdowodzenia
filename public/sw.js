const CACHE_NAME = "5wdh-shell-v2";

const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put("/", copy));

          return response;
        })
        .catch(() => caches.match("/"))
    );

    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();

            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy));

            return response;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "5 WDH — Centrum Dowodzenia",
      body: event.data ? event.data.text() : "Masz nowe powiadomienie.",
      url: "/",
    };
  }

  const title =
    payload.title || "5 WDH — Centrum Dowodzenia";

  const options = {
    body: payload.body || "Masz nowe powiadomienie.",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    data: {
      url: payload.url || "/",
    },
    vibrate: [120, 60, 120],
    tag: payload.tag || "5wdh-notification",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
