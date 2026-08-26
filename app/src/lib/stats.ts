/**
 * Comptes du registre injectés au bord.
 *
 * Le Worker Cloudflare (worker/index.js) écrit les nombres dans le HTML
 * pré-rendu ET dépose le même agrégat dans `window.__PIECI_STATS__`, avant le
 * chargement du bundle. En lisant cette variable au premier rendu, React
 * produit exactement le texte que le Worker a écrit : l'hydratation retombe
 * sur ses pieds sans jamais comparer deux valeurs différentes.
 *
 * Trois situations, trois comportements, aucun cas d'erreur :
 * - Worker passé par là  → HTML compté, variable présente, rendus identiques.
 * - Worker en repli      → HTML avec tirets, variable absente, tirets côté
 *   client aussi — identiques encore.
 * - Pré-rendu au build   → `window` n'existe pas, on rend les tirets.
 */

export interface StatsRegistre {
  total: number;
  parCommune: Record<string, number>;
  parType: Record<string, number>;
}

export function statsServeur(): StatsRegistre | null {
  if (typeof window === 'undefined') return null;
  const brut = (window as { __PIECI_STATS__?: unknown }).__PIECI_STATS__;
  if (
    typeof brut !== 'object' ||
    brut === null ||
    typeof (brut as StatsRegistre).total !== 'number'
  ) {
    return null;
  }
  return brut as StatsRegistre;
}

/**
 * Format des compteurs du registre : quatre chiffres, style relevé
 * administratif. Le tiret signale « pas encore connu », jamais zéro — un vrai
 * zéro s'affiche 0000.
 */
export function formaterCompte(valeur: number | undefined): string {
  return valeur === undefined ? '—' : String(valeur).padStart(4, '0');
}
