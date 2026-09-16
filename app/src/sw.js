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

const CACHE_API = 'pieci-api-v2';
const CACHES_PERIMES = ['pieci-api'];

// Données de l'API : on tente le réseau d'abord, on retombe sur le cache hors-ligne.
registerRoute(
  ({ url }) => estDonneeApi(url),
  new NetworkFirst({
    // Nom versionné : la forme des pièces a changé (NOM + initiales). L'ancien
    // cache est supprimé à l'activation, sinon une réponse d'avant pouvait
    // être servie hors ligne pendant 24 h, avec des noms vides.
    cacheName: CACHE_API,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

/**
 * Fichiers du moteur de lecture de la pièce (worker, cœur WebAssembly,
 * modèles), servis par notre origine sous /ocr/<dossier versionné>/ — voir
 * scripts/copier-ocr.mjs et src/lib/lecture/moteur.ts.
 *
 * Exclus du précache (vite.config.ts) : ~6 Mo que seuls les déclarants
 * utilisent. Mis en cache à la première lecture, puis servis sans réseau :
 * une deuxième déclaration, ou une nouvelle tentative après une photo ratée,
 * ne retélécharge pas 2 Mo sur un forfait mobile. CacheFirst convient parce
 * que le contenu d'une URL ne change jamais : le nom du dossier porte la
 * version, et le cache aussi. À la version suivante, l'ancien cache est
 * supprimé à l'activation (voir plus bas).
 *
 * Ces fichiers ne contiennent rien de personnel : les photos ne passent jamais
 * par ici (la lecture se fait en mémoire, et seules les requêtes GET sont
 * interceptées).
 */
const DOSSIER_OCR = __OCR_DOSSIER__;
const PREFIXE_CACHE_OCR = 'pieci-ocr-';
const CACHE_OCR = `${PREFIXE_CACHE_OCR}${DOSSIER_OCR}`;

/**
 * Ne met en cache qu'une vraie réponse de fichier. Un fichier absent du
 * déploiement n'est pas une 404 chez Cloudflare : le repli « single-page
 * application » (wrangler.toml) répond index.html avec un statut 200. Mis en
 * cache en CacheFirst, ce HTML prendrait la place du modèle jusqu'à la version
 * suivante ; on le refuse, et la lecture échoue proprement (saisie à la main).
 */
const reponseDeFichier = {
  cacheWillUpdate: async ({ response }) => {
    if (!response || response.status !== 200 || response.type === 'opaqueredirect' || response.redirected) return null;
    const type = response.headers.get('content-type') ?? '';
    return type.includes('text/html') ? null : response;
  },
};

registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin && url.pathname.startsWith(`/ocr/${DOSSIER_OCR}/`) && request.method === 'GET',
  new CacheFirst({
    cacheName: CACHE_OCR,
    plugins: [
      reponseDeFichier,
      // Un appareil n'en garde que 4 par version (worker, la variante du cœur
      // qu'il exécute, deux modèles) : la borne ne sert que de garde-fou
      // contre une accumulation imprévue.
      new ExpirationPlugin({ maxEntries: 12 }),
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
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all([
          ...CACHES_PERIMES.map((nom) => caches.delete(nom)),
          // Moteur de lecture d'une version précédente : plusieurs Mo inutiles.
          ...noms.filter((nom) => nom.startsWith(PREFIXE_CACHE_OCR) && nom !== CACHE_OCR).map((nom) => caches.delete(nom)),
        ]),
      )
      .then(() => self.clients.claim()),
  );
});

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
