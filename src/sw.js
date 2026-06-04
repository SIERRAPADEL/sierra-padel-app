/**
 * Sierra Pádel — Service Worker
 * Estrategia: injectManifest (Workbox inyecta self.__WB_MANIFEST)
 *
 * Responsabilidades:
 *  1. Precache de assets estáticos (Workbox)
 *  2. Runtime cache del backend (NetworkFirst)
 *  3. Recibir y mostrar push notifications
 *  4. Manejar clicks en notificaciones → abrir/navegar la app
 *  5. Limpiar cachés viejos en activación
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ─── 1. Precache ──────────────────────────────────────────────────────────────
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ─── 2. Runtime caching ───────────────────────────────────────────────────────

// API del backend — NetworkFirst: intenta red, cae a caché si está offline
registerRoute(
  ({ url }) => url.origin === 'https://sierra-padel-backend-production-a55f.up.railway.app',
  new NetworkFirst({
    cacheName: 'api-cache-v1',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }), // 5 min
    ],
  })
);

// Google Fonts — CacheFirst (cambian muy poco)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// ─── 3. Push Notifications ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Si el payload no es JSON, usarlo como texto del body
    payload = { title: 'Sierra Pádel', body: event.data.text() };
  }

  const {
    title = 'Sierra Pádel',
    body = '',
    icon = '/icons/icon-192.png',
    badge = '/icons/icon-192.png',
    url = '/',
    tag = 'sierra-padel-default',
    renotify = false,
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify,
    data: { url },
    vibrate: [200, 100, 200],
    // En iOS estas propiedades son ignoradas, pero en Android sí aplican
    actions: payload.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ─── 4. Click en notificación ─────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Si la app ya está abierta en alguna pestaña/ventana → enfocarla y navegar
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            // Mandar mensaje al app React para que navegue a la ruta correcta
            client.postMessage({ type: 'SW_NAVIGATE', url: targetUrl });
            return;
          }
        }
        // Si no hay ventana abierta → abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── 5. Activación: tomar control inmediato ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
