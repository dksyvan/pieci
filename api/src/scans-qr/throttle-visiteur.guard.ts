import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * En-tête portant l'empreinte du visiteur — jamais son adresse.
 *
 * Le Worker de bord condense l'IP en SHA-256 tronqué avant de l'envoyer (voir
 * `empreinteVisiteur` dans app/worker/index.js). L'API ne voit donc jamais
 * d'adresse, et n'en garde aucune trace.
 */
export const ENTETE_VISITEUR = 'x-pieci-visiteur';

/**
 * Limiteur de débit compté par visiteur, et non par relais.
 *
 * Le Worker de bord appelle l'API de serveur à serveur : sans cette
 * distinction, toutes les requêtes arriveraient sous la même adresse — celle
 * de Cloudflare — et le plafond deviendrait un plafond global. Trente
 * personnes scannant le kakémono au même événement s'excluraient les unes les
 * autres, ce qui est exactement le moment où l'on veut compter juste.
 *
 * L'empreinte ne sert qu'à compter, en mémoire, pendant la minute écoulée :
 * elle n'est ni journalisée ni écrite en base. Elle est falsifiable par qui
 * appellerait l'API directement, mais ce n'est pas la ligne de défense
 * principale : celle-ci est la liste fermée des sources, qui fait qu'un flot
 * inventé s'entasse sous « inconnu » sans polluer le compte d'un support réel.
 */
@Injectable()
export class ThrottleVisiteurGuard extends ThrottlerGuard {
  protected getTracker(requete: Record<string, unknown>): Promise<string> {
    const req = requete as unknown as Request;
    const transmise = req.headers?.[ENTETE_VISITEUR];
    const empreinte = Array.isArray(transmise) ? transmise[0] : transmise;
    return Promise.resolve(empreinte || req.ip || 'inconnu');
  }
}
