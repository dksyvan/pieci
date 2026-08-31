import {
  depuisPieceBrute,
  type PieceTrouveePublique,
  type PieceTrouveePubliqueBrute,
} from '@partage/api-types';

/**
 * Fiche injectée au bord.
 *
 * Même principe que les comptes du registre (voir stats.ts) : le Worker écrit
 * les balises d'aperçu dans le HTML et dépose la pièce dans
 * `window.__PIECI_PIECE__` avant le bundle. Le visiteur qui arrive d'un
 * message WhatsApp voit donc la fiche sans attendre un aller-retour vers
 * l'API — ce qui compte, parce que ce visiteur-là n'a aucune raison
 * particulière de patienter.
 *
 * L'identifiant est vérifié : après une navigation vers une autre pièce, la
 * variable du chargement initial traîne encore dans `window`, et l'utiliser
 * afficherait la fiche précédente sous la nouvelle URL.
 */
export function pieceServeur(id: string): PieceTrouveePublique | null {
  if (typeof window === 'undefined') return null;

  const brut = (window as { __PIECI_PIECE__?: unknown }).__PIECI_PIECE__;
  if (typeof brut !== 'object' || brut === null) return null;

  const brute = brut as PieceTrouveePubliqueBrute;
  if (typeof brute.id !== 'string' || brute.id !== id) return null;

  return depuisPieceBrute(brute);
}
