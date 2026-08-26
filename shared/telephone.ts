/**
 * Numéros de téléphone ivoiriens.
 *
 * Chez Pièci, le numéro n'est pas un champ de contact parmi d'autres : c'est
 * le compte. Deux écritures du même numéro font deux personnes différentes aux
 * yeux de la base — celui qui déclare avec des espaces et cherche sans ne
 * retrouve rien. D'où une forme canonique unique, appliquée partout.
 *
 * Depuis 2021, les numéros ivoiriens comptent dix chiffres.
 */

/** Longueur d'un numéro ivoirien, indicatif pays exclu. */
export const LONGUEUR_TELEPHONE = 10;

/** Message unique, pour que l'API et les interfaces disent la même chose. */
export const MESSAGE_TELEPHONE = 'Ton numéro doit être 10 chiffres hein, dix chiffres en fait.';

/**
 * Forme canonique : dix chiffres, sans espace ni indicatif.
 *
 * « 07 00 00 00 00 », « +225 0700000000 » et « 0700000000 » donnent tous
 * `0700000000`. Une entrée qui ne s'y ramène pas est renvoyée débarrassée de
 * ses séparateurs, à charge de {@link telephoneValide} de la refuser.
 */
export function normaliserTelephone(numero: string): string {
  const chiffres = numero.replace(/\D/g, '');
  // L'indicatif pays ne se retire que s'il laisse un numéro de bonne longueur :
  // un numéro local commençant par 225 resterait sinon amputé.
  if (chiffres.length === LONGUEUR_TELEPHONE + 3 && chiffres.startsWith('225')) {
    return chiffres.slice(3);
  }
  return chiffres;
}

/** Le numéro se ramène-t-il à dix chiffres ? */
export function telephoneValide(numero: string): boolean {
  return normaliserTelephone(numero).length === LONGUEUR_TELEPHONE;
}
