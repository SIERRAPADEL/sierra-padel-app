// ── Sierra Padel Service Worker ──────────────────────────────────────────────
// Maneja: push notifications, notificationclick, cache básico offline

const CACHE_NAME = 'sierra-padel-v2';
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

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Solo mismo origen (no API de Railway: nunca cachear respuestas autenticadas)
  if (url.origin !== self.location.origin) return;

  // Navegación (documento HTML): NETWORK-FIRST. Si hay red, siempre la versión nueva
  // (evita servir un index.html viejo que apunte a bundles JS que ya no existen).
  // Solo cae al shell cacheado cuando de verdad no hay conexión.
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put('/index.html', clone));
          return resp;
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  // Resto (assets con hash, imágenes, fuentes): CACHE-FIRST con refresco en segundo
  // plano. Los bundles llevan hash en el nombre, así que el cache nunca queda obsoleto.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
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
