import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

precacheAndRoute(self.__WB_MANIFEST);

/**
 * Base de l'API, figée au build.
 *
 * Résolue contre l'origine du service worker, ce qui couvre les deux formes
 * que la base peut prendre : relative (`/api`, la valeur par défaut, l'API
 * étant relayée par notre propre domaine) ou absolue, si `VITE_API_BASE`
 * désigne une autre API. La route ci-dessous ne doit intercepter que les
 * appels vers cette base : un filtre sur le seul chemin attraperait le même
 * chemin sur n'importe quelle origine, et une panne du gestionnaire ferait
 * alors échouer des requêtes qui ne nous concernent pas.
 */
const BASE_API = (() => {
  try {
    const base = new URL(import.meta.env.VITE_API_BASE ?? '/api', self.location.origin);
    return { origine: base.origin, prefixe: base.pathname.replace(/\/+$/, '') };
  } catch {
    return null;
  }
})();

/** L'URL vise-t-elle une des routes de données que l'on met en cache ? */
function estDonneeApi(url) {
  if (!BASE_API || url.origin !== BASE_API.origine) return false;
  if (!url.pathname.startsWith(BASE_API.prefixe)) return false;
  const chemin = url.pathname.slice(BASE_API.prefixe.length);
  return chemin.startsWith('/pieces-trouvees') || chemin.startsWith('/points-depot');
}

// Données de l'API : on tente le réseau d'abord, on retombe sur le cache hors-ligne.
registerRoute(
  ({ url }) => estDonneeApi(url),
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
