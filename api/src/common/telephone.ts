import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

/**
 * Numéros de téléphone ivoiriens, côté API.
 *
 * Jumeau de `shared/telephone.ts`, que le web et le mobile utilisent. La
 * duplication est assumée : l'API se compile seule, sans alias vers `shared/`,
 * et reconfigurer le build de Nest pour une constante coûterait plus cher que
 * ces quelques lignes. Toute modification ici doit être reportée là-bas.
 *
 * Le numéro n'est pas un simple champ de contact : c'est la clé du compte.
 * Deux écritures du même numéro font deux personnes différentes pour la base —
 * celui qui déclare avec des espaces et cherche sans ne retrouve rien. La
 * normalisation à l'entrée est donc une garantie, pas une commodité.
 */

export const LONGUEUR_TELEPHONE = 10;

/** Message unique, en français : c'est lui que verra l'utilisateur. */
export const MESSAGE_TELEPHONE = 'Ton numéro doit être 10 chiffres hein, dix chiffres en fait.';

/** Forme canonique : dix chiffres, sans espace ni indicatif pays. */
export function normaliserTelephone(numero: string): string {
  const chiffres = numero.replace(/\D/g, '');
  if (chiffres.length === LONGUEUR_TELEPHONE + 3 && chiffres.startsWith('225')) {
    return chiffres.slice(3);
  }
  return chiffres;
}

/**
 * Normalise puis valide un champ téléphone.
 *
 * L'ordre compte : `@Transform` s'exécute avant la validation, si bien qu'une
 * saisie « +225 07 00 00 00 00 » est acceptée *et* stockée sous sa forme
 * canonique. Ce que la base reçoit est toujours dix chiffres.
 */
export function EstTelephone(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? normaliserTelephone(value) : value,
    ),
    IsString({ message: MESSAGE_TELEPHONE }),
    Matches(new RegExp(`^\\d{${LONGUEUR_TELEPHONE}}$`), { message: MESSAGE_TELEPHONE }),
  );
}
