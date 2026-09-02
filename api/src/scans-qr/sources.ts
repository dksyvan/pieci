/**
 * Supports sur lesquels un QR code est imprimé.
 *
 * La liste est fermée, et c'est le point : `source` arrive d'une query string
 * publique, donc de n'importe qui. Sans liste blanche, il suffirait d'appeler
 * `/qr?s=<n'importe quoi>` en boucle pour noyer les vrais comptes sous des
 * lignes inventées — et les chiffres qui décident du prochain tirage seraient
 * faux.
 *
 * Un support inconnu n'est pas rejeté : il est rangé sous « inconnu ». Un QR
 * déjà imprimé sur un vêtement ne se corrige pas, donc rien de ce qui vient
 * d'un support réel ne doit être perdu.
 */
export const SOURCES = ['polo', 'casquette', 'flyer', 'sticker', 'event'] as const;

export type Source = (typeof SOURCES)[number] | 'inconnu';

/** Ramène une valeur quelconque à une source connue. */
export function sourceConnue(valeur: unknown): Source {
  if (typeof valeur !== 'string') return 'inconnu';
  const propre = valeur.trim().toLowerCase();
  return (SOURCES as readonly string[]).includes(propre) ? (propre as Source) : 'inconnu';
}
