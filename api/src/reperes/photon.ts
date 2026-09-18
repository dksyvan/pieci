import { haversine } from '../matching/matching';

/**
 * Un lieu nommé proche d'une position, tel qu'il part au navigateur.
 *
 * Jumeau de `RepereApi` dans `shared/api-types.ts` : l'API se compile seule,
 * sans alias vers `shared/`, et la forme est donc écrite des deux côtés.
 */
export interface Repere {
  /** Ce qui s'affiche, et ce qui part dans le champ : « Carrefour Timotel ». */
  nom: string;
  /** Mètres, arrondis. Sert à ordonner, et à dire « à 80 m ». */
  distance: number;
}

/** Ce que rend la route `/reperes`. Jumeau de `ReperesAutour`. */
export interface ReperesAutour {
  reperes: Repere[];
  /** Le quartier, quand la carte le connaît : « Niangon Sud ». */
  quartier: string | null;
}

/**
 * Lecture des lieux nommés autour d'un point, à partir de Photon (données
 * OpenStreetMap).
 *
 * Pourquoi pas le `/reverse` de Nominatim, qui semblerait plus direct : il
 * répond à « quelle est l'*adresse* de ce point ? » et rend « Rue L120 ».
 * Personne à Abidjan ne se repère comme ça. On dit « carrefour Timotel »,
 * « terminus 27 », « en face de la pharmacie ». La question posée ici est donc
 * l'autre : « quels sont les lieux *nommés* autour de ce point ? ».
 *
 * Ce fichier ne contient que la lecture et le classement. Le cache, la limite
 * de débit et le repli vivent dans le service : on doit pouvoir changer de
 * fournisseur sans toucher au reste.
 */

/** Ce que Photon renvoie, réduit à ce dont on se sert. */
interface TraitPhoton {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    osm_key?: string;
    osm_value?: string;
    district?: string;
  };
}

/**
 * Rayon au-delà duquel un lieu ne sert plus de repère.
 *
 * Deux cent cinquante mètres, c'est le « juste à côté » : au-delà, dire « à
 * côté de la pharmacie » envoie chercher au mauvais endroit — et une pièce
 * cherchée au mauvais endroit est une pièce perdue deux fois.
 */
export const RAYON_REPERE_M = 250;

/** Rayon retenu pour le quartier : il se nomme de plus loin qu'un carrefour. */
const RAYON_QUARTIER_M = 1500;

/** Nombre de propositions affichées. Au-delà, on choisit à la place des gens. */
export const REPERES_MAX = 5;

/**
 * Ce qui fait un repère, par ordre de force.
 *
 * L'ordre n'est pas une préférence de cartographe : c'est celui dans lequel
 * les gens citent un endroit à Abidjan. On donne d'abord un arrêt ou un
 * terminus, puis un commerce ou un service qu'on voit de la rue, puis une
 * boutique, et seulement ensuite le nom du quartier.
 */
const SERVICES_REPERES = new Set([
  'pharmacy',
  'fuel',
  'marketplace',
  'school',
  'place_of_worship',
  'bank',
  'hospital',
  'clinic',
  'college',
  'university',
  'police',
  'post_office',
  'bus_station',
  'townhall',
]);

const QUARTIERS_OSM = new Set(['neighbourhood', 'quarter', 'suburb', 'village', 'town', 'city']);

function rang(cle: string | undefined, valeur: string | undefined): number {
  if (cle === 'highway' && valeur === 'bus_stop') return 0;
  if (cle === 'public_transport' || cle === 'railway') return 0;
  if (cle === 'amenity' && valeur && SERVICES_REPERES.has(valeur)) return 1;
  if (cle === 'shop') return 2;
  if (cle === 'highway' && valeur === 'motorway_junction') return 2;
  if (cle === 'junction') return 2;
  if (cle === 'amenity' || cle === 'office' || cle === 'tourism' || cle === 'leisure') return 3;
  if (cle === 'place' && valeur && QUARTIERS_OSM.has(valeur)) return 4;
  if (cle === 'highway') return 5;
  return 4;
}

/**
 * Un nom qui n'est qu'un matricule — « L120 », « Rue C17 », « Voie 4 ».
 *
 * C'est exactement ce que rend un service d'adresses, et exactement ce qu'on
 * ne veut pas proposer : ces noms figurent sur les plans, jamais dans les
 * bouches. On retire le mot générique de tête, et ce qui reste est un code
 * s'il est court et contient un chiffre.
 */
export function estUnCode(nom: string): boolean {
  const reste = nom
    .replace(/^(rue|voie|avenue|av\.?|boulevard|bd\.?|route|rte\.?|impasse)\s+/i, '')
    .trim();
  return reste.length <= 5 && /\d/.test(reste);
}

/** Comparaison des noms pour les doublons : accents, casse et espaces effacés. */
function cle(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trie, filtre et coupe ce que Photon a renvoyé.
 *
 * Exporté sans son appel réseau : c'est la partie qui se teste, et celle qui
 * décidera de ce que quelqu'un lit sur son téléphone.
 */
export function classerReperes(traits: TraitPhoton[], lat: number, lng: number): ReperesAutour {
  const candidats: Array<Repere & { rang: number }> = [];
  let quartier: { nom: string; distance: number } | null = null;

  for (const trait of traits) {
    const coords = trait.geometry?.coordinates;
    const props = trait.properties;
    const nom = props?.name?.trim();
    if (!nom || !coords || coords.length !== 2) continue;

    const [lngTrait, latTrait] = coords;
    const distance = Math.round(haversine(lat, lng, latTrait, lngTrait) * 1000);

    // Le quartier se relève même de loin : c'est la deuxième ligne du libellé.
    if (
      props?.osm_key === 'place' &&
      props.osm_value &&
      QUARTIERS_OSM.has(props.osm_value) &&
      distance <= RAYON_QUARTIER_M &&
      (!quartier || distance < quartier.distance)
    ) {
      quartier = { nom, distance };
    }

    if (distance > RAYON_REPERE_M) continue;
    if (estUnCode(nom)) continue;

    candidats.push({ nom, distance, rang: rang(props?.osm_key, props?.osm_value) });
  }

  // Le quartier de secours, quand aucun point `place` n'a été renvoyé.
  if (!quartier) {
    const district = traits.find((t) => t.properties?.district)?.properties?.district?.trim();
    if (district) quartier = { nom: district, distance: 0 };
  }

  const vus = new Set<string>();
  const retenus: Repere[] = [];

  for (const c of candidats.sort((a, b) => a.rang - b.rang || a.distance - b.distance)) {
    const k = cle(c.nom);
    if (vus.has(k)) continue;
    if (quartier && k === cle(quartier.nom)) continue; // déjà dit sur l'autre ligne
    vus.add(k);
    retenus.push({ nom: c.nom, distance: c.distance });
    if (retenus.length === REPERES_MAX) break;
  }

  return { reperes: retenus, quartier: quartier?.nom ?? null };
}

/** Adresse du service. Une variable d'environnement, pour en changer sans livrer. */
const BASE = process.env.PHOTON_URL ?? 'https://photon.komoot.io';

/**
 * Délai au-delà duquel on abandonne.
 *
 * Quelqu'un debout dans la rue, une pièce à la main, n'attend pas dix
 * secondes. Mieux vaut un champ vide et modifiable qu'un bouton qui tourne.
 */
const DELAI_MS = 4000;

/** Interroge Photon. Lève si le service ne répond pas : le service décide de la suite. */
export async function lireAutour(lat: number, lng: number): Promise<ReperesAutour> {
  const url = `${BASE}/reverse?lat=${lat}&lon=${lng}&radius=1&limit=30&lang=fr`;

  const reponse = await fetch(url, {
    signal: AbortSignal.timeout(DELAI_MS),
    headers: {
      // Photon demande un appelant identifiable. C'est aussi pourquoi cet
      // appel part d'ici et non du navigateur : le service voit notre serveur,
      // jamais l'adresse ni la position de la personne qui déclare.
      'User-Agent': 'Pieci/1.0 (+https://pieci.ci)',
      Accept: 'application/json',
    },
  });

  if (!reponse.ok) throw new Error(`Photon a répondu ${reponse.status}`);

  const corps = (await reponse.json()) as { features?: TraitPhoton[] };
  return classerReperes(corps.features ?? [], lat, lng);
}
