/**
 * Réglages d'affichage de la page d'accueil.
 *
 * Un compteur bas dit au visiteur que le service est mort, alors qu'il vient
 * seulement de naître. On ne le montre qu'une fois qu'il plaide en notre
 * faveur — le nombre de communes couvertes, lui, est valorisant dès le premier
 * jour et s'affiche toujours.
 */

/** En dessous de ce nombre de pièces déclarées, le compteur reste masqué. */
export const SEUIL_COMPTEUR_PIECES = 25;

/** Le compteur mérite-t-il d'être montré ? */
export function compteurValorisant(nombre: number): boolean {
  return nombre >= SEUIL_COMPTEUR_PIECES;
}
