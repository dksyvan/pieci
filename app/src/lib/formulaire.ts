/**
 * Validation de formulaire à l'envoi.
 *
 * Le parti pris : le bouton d'envoi reste toujours cliquable. Un bouton grisé
 * n'explique jamais pourquoi il l'est — l'utilisateur qui a rempli six champs
 * sur sept tape sur un bouton mort et abandonne. Ici, l'appui déclenche la
 * validation, chaque champ manquant reçoit son message, et l'écran amène le
 * premier au premier plan.
 */

/** Messages d'erreur par identifiant de champ (les ids du DOM font les clés). */
export type ErreursChamps = Record<string, string>;

/**
 * Amène le premier champ en erreur à l'écran et lui donne le focus — sur un
 * formulaire mobile qui dépasse l'écran, un message hors champ de vision
 * équivaut à pas de message du tout.
 */
export function montrerPremierChamp(erreurs: ErreursChamps): void {
  const premier = Object.keys(erreurs)
    .map((id) => document.getElementById(id))
    .find((el): el is HTMLElement => el !== null);
  if (!premier) return;

  premier.scrollIntoView({ behavior: 'smooth', block: 'center' });
  premier.focus({ preventScroll: true });
}
