/**
 * Un canal d'acheminement d'une notification vers un numéro de téléphone.
 *
 * Chaque canal est indépendant : sa panne ne doit jamais empêcher les autres
 * de partir, ni faire échouer l'action métier qui a déclenché la notification.
 * Une correspondance reste consultable dans l'onglet Suivi même si aucun
 * message n'a pu sortir.
 */
export interface CanalNotification {
  /** Identifiant court, pour les journaux. */
  readonly nom: string;

  /**
   * Un canal payant n'est sollicité qu'en dernier recours, lorsqu'aucun canal
   * gratuit n'a pu joindre la personne. Sans cette distinction, chaque
   * correspondance coûterait un SMS même aux utilisateurs déjà notifiés.
   */
  readonly payant: boolean;

  /** Le canal est-il configuré et utilisable ? */
  estActif(): boolean;

  /**
   * Envoie le message.
   * @returns `true` si au moins un destinataire a été atteint.
   */
  envoyer(telephone: string, titre: string, corps: string): Promise<boolean>;
}