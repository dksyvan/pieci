import type { PersonnePiece } from './types';

/**
 * Algorithme de matching perte <-> trouvaille.
 *
 * Portage TypeScript de l'implémentation de référence du prototype
 * (Pieci_prototype.html) — voir Phase2_Specs_et_Algorithmes.md section 3.
 */

// ---------------------------------------------------------------------------
// Normalisation & similarité de chaînes
// ---------------------------------------------------------------------------

// Plage Unicode "Combining Diacritical Marks" (accents, tildes, cédilles...)
const DIACRITIQUES = /[̀-ͯ]/g;
const SEPARATEURS = /['’-]/g;
const ESPACES = /\s+/g;

/**
 * Met en minuscules, retire les accents/diacritiques et normalise les
 * séparateurs (apostrophes, tirets) en espaces.
 *
 * `normaliser("N'Guessan")` -> "n guessan"
 * `normaliser("Aké")`       -> "ake"
 */
export function normaliser(valeur: string | null | undefined): string {
  return (valeur ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .replace(SEPARATEURS, ' ')
    .replace(ESPACES, ' ')
    .trim();
}

/**
 * Ratio de similarité de Levenshtein entre 0 et 1 : `1 - distance / max(len)`.
 * Tolère les fautes de frappe et petites variantes orthographiques.
 */
export function levenshtein(a: string, b: string): number {
  const na = normaliser(a);
  const nb = normaliser(b);

  if (!na.length || !nb.length) {
    return na.length === nb.length ? 1 : 0;
  }

  const m = na.length;
  const n = nb.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cout = na[i - 1] === nb[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cout,
      );
    }
  }

  return 1 - dp[m][n] / Math.max(m, n);
}

/**
 * Similarité par ensemble de jetons (intersection / union des mots).
 * Tolère l'ordre des mots (noms/prénoms inversés) et les mots manquants.
 */
export function tokenSet(a: string, b: string): number {
  const setA = new Set(normaliser(a).split(' ').filter(Boolean));
  const setB = new Set(normaliser(b).split(' ').filter(Boolean));

  if (!setA.size || !setB.size) return 0;

  let intersection = 0;
  setA.forEach((mot) => {
    if (setB.has(mot)) intersection++;
  });

  const union = new Set([...setA, ...setB]);
  return intersection / union.size;
}

/**
 * Similarité de nom/prénom = le meilleur des deux signaux ci-dessus.
 */
export function simNom(a: string, b: string): number {
  return Math.max(levenshtein(a, b), tokenSet(a, b));
}

// ---------------------------------------------------------------------------
// Distance géographique
// ---------------------------------------------------------------------------

const RAYON_TERRE_KM = 6371;
const DEG_EN_RAD = Math.PI / 180;

/** Distance en kilomètres entre deux points (formule de Haversine). */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG_EN_RAD;
  const dLng = (lng2 - lng1) * DEG_EN_RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_EN_RAD) * Math.cos(lat2 * DEG_EN_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h));
}

// ---------------------------------------------------------------------------
// Score global
// ---------------------------------------------------------------------------

/** Pondérations du score de confiance (doivent sommer à 1). */
export const POIDS = {
  nom: 0.45,
  prenom: 0.20,
  type: 0.20,
  geo: 0.10,
  temps: 0.05,
} as const;

/** Échelle de décroissance de la proximité géographique, en km. */
export const ECHELLE_GEO_KM = 25;
/** Échelle de décroissance de la proximité temporelle, en jours. */
export const ECHELLE_TEMPS_JOURS = 30;

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

export interface ScoreMatch {
  /** Score de confiance global, entre 0 et 1. */
  score: number;
  /** Distance en kilomètres, ou `null` si l'un des deux n'est pas situé. */
  dist: number | null;
}

/**
 * Calcule le score de confiance d'un rapprochement perte <-> trouvaille.
 *
 * score = 0.45·simNom + 0.20·simPrenom + 0.20·simType
 *       + 0.10·proxGeo + 0.05·proxTemps
 */
export function scoreMatch(perte: PersonnePiece, trouvaille: PersonnePiece): ScoreMatch {
  const sNom = simNom(perte.nom, trouvaille.nom);
  const sPrenom = simNom(perte.prenom, trouvaille.prenom);
  const sType = perte.typePiece === trouvaille.typePiece ? 1 : 0;

  // Sans position des deux côtés, la proximité géographique ne vaut pas zéro
  // par défaut de preuve : elle ne pèse simplement pas. Les rapprochements
  // situés gardent donc leur avantage au classement, sans que les autres
  // soient écartés.
  const dist =
    perte.lat !== null && perte.lng !== null && trouvaille.lat !== null && trouvaille.lng !== null
      ? haversine(perte.lat, perte.lng, trouvaille.lat, trouvaille.lng)
      : null;
  const proxGeo = dist === null ? 0 : Math.exp(-dist / ECHELLE_GEO_KM);

  const joursEcart = Math.abs(
    (new Date(perte.date).getTime() - new Date(trouvaille.date).getTime()) / MS_PAR_JOUR,
  );
  const proxTemps = Math.exp(-joursEcart / ECHELLE_TEMPS_JOURS);

  const score =
    POIDS.nom * sNom +
    POIDS.prenom * sPrenom +
    POIDS.type * sType +
    POIDS.geo * proxGeo +
    POIDS.temps * proxTemps;

  return { score, dist };
}

// ---------------------------------------------------------------------------
// Recherche de correspondances
// ---------------------------------------------------------------------------

/** Score minimal à partir duquel un rapprochement est affiché. */
export const SEUIL_AFFICHAGE = 0.55;
/** Score à partir duquel la confiance est jugée "Probable". */
export const SEUIL_PROBABLE = 0.65;
/** Score à partir duquel la confiance est jugée "Forte". */
export const SEUIL_FORTE = 0.8;

export type Match<T extends PersonnePiece> = T & ScoreMatch;

/**
 * Recherche, parmi une base de trouvailles, celles qui correspondent à une
 * alerte de perte, triées par score de confiance décroissant.
 *
 * Référence prototype : seuil d'affichage `score >= 0.55`.
 *
 * Note de passage à l'échelle (cf. specs section 3.6) : en production, ne
 * comparer que les entrées partageant `typePiece` et `commune` (blocking)
 * avant d'appeler cette fonction sur le sous-ensemble obtenu.
 */
export function trouverMatches<T extends PersonnePiece>(
  perte: PersonnePiece,
  base: readonly T[],
): Array<Match<T>> {
  return base
    .map((trouvaille) => ({ ...trouvaille, ...scoreMatch(perte, trouvaille) }))
    .filter((candidat) => candidat.score >= SEUIL_AFFICHAGE)
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Bandes de confiance (UI)
// ---------------------------------------------------------------------------

export type LabelConfiance = 'Forte' | 'Probable' | 'À vérifier';

export interface BandeConfiance {
  label: LabelConfiance;
  couleur: string;
}

/**
 * Bande de confiance affichée pour un score donné.
 * >= 0.80 Forte · 0.65-0.80 Probable · 0.55-0.65 À vérifier.
 */
export function bandeConfiance(score: number): BandeConfiance {
  if (score >= SEUIL_FORTE) return { label: 'Forte', couleur: 'var(--color-officiel)' };
  if (score >= SEUIL_PROBABLE) return { label: 'Probable', couleur: 'var(--color-ambre)' };
  return { label: 'À vérifier', couleur: 'var(--color-sourdine)' };
}
