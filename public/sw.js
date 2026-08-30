// englishmudah.id — Service Worker untuk PWA + Offline + Push
// Versi sederhana tanpa Workbox agar kompatibel dengan Next.js 16
const CACHE_NAME = "englishmudah-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/", "/icon-192.png", "/icon-512.png"];

// Install: precache offline page & icons
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: bersihkan cache lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Untuk navigasi (document): NetworkFirst, fallback ke cache, fallback ke /offline
// - Untuk asset statis (/_next/static, /icon-*, .png/.css/.js): CacheFirst
// - Untuk API / Supabase / Midtrans: NetworkOnly (jangan cache data sensitif)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET
  if (req.method !== "GET") return;

  // Jangan cache API, auth, supabase, midtrans, vercel
  const noCacheHosts = ["supabase.co", "midtrans.com", "midtrans.net"];
  const noCachePaths = ["/api/", "/auth/", "/_next/image"];
  if (
    noCacheHosts.some((h) => url.hostname.includes(h)) ||
    noCachePaths.some((p) => url.pathname.startsWith(p))
  ) {
    return;
  }

  // Navigasi / document
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // simpan copy ke cache
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || new Response("Offline", { status: 503, statusText: "Offline" });
        })
    );
    return;
  }

  // Asset statis
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|css|js|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // revalidate di background
          event.waitUntil(
            fetch(req).then((res) => caches.open(CACHE_NAME).then((c) => c.put(req, res)))
          );
          return cached;
        }
        return fetch(req)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            return res;
          })
          .catch(() => cached);
      })
    );
  }
});

// Push notification handler
self.addEventListener("push", (event) => {
  let data = { title: "englishmudah.id", body: "Ada update untukmu!", url: "/" };
  try {
    if (event.data) {
      const json = event.data.json();
      data = { ...data, ...json };
    } else if (event.data?.text()) {
      data.body = event.data.text();
    }
  } catch {
    // fallback text
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Allow page to trigger skipWaiting via postMessage
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
