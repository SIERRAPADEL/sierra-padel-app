// ── Sierra Padel Service Worker ──────────────────────────────────────────────
// Maneja: push notifications, notificationclick, cache básico offline

const CACHE_NAME = 'sierra-padel-v1';
const OFFLINE_URLS = ['/', '/index.html'];

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: limpia caches viejos ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first, fallback a cache ────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Solo cachear mismo origen (no API de Railway)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
  );
});

// ── Push: mostrar notificación ────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'Sierra Padel', body: 'Tienes una nueva notificación' };
  try {
    data = event.data ? event.data.json() : data;
  } catch (_) {}

  const options = {
    body: data.body || data.message || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Sierra Padel', options)
  );
});

// ── Notification click: abrir / enfocar app ───────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || '/';
  // Siempre construir URL absoluta — client.navigate y openWindow la requieren
  const targetUrl = rawUrl.startsWith('http')
    ? rawUrl
    : new URL(rawUrl, self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Buscar una ventana ya abierta de la app
      const existing = windowClients.find(c =>
        c.url.startsWith(self.registration.scope) || c.url.includes(self.location.origin)
      );
      if (existing) {
        return existing.focus().then(fc => fc.navigate(targetUrl));
      }
      // Si la app está cerrada, abrir nueva ventana
      return self.clients.openWindow(targetUrl);
    })
  );
});
