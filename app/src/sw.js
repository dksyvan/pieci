import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

precacheAndRoute(self.__WB_MANIFEST);

// Données de l'API : on tente le réseau d'abord, on retombe sur le cache hors-ligne.
registerRoute(
  ({ url }) => url.pathname.startsWith('/pieces-trouvees') || url.pathname.startsWith('/points-depot'),
  new NetworkFirst({
    cacheName: 'pieci-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Tuiles de carte OpenStreetMap : mise en cache longue durée.
registerRoute(
  ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Pièci', body: 'Nouvelle correspondance !' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'pieci-correspondance',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => 'focus' in c);
      if (existing) {
        existing.navigate('/suivi');
        return existing.focus();
      }
      return self.clients.openWindow('/suivi');
    }),
  );
});
