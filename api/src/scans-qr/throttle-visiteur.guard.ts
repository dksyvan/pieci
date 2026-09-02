import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/** En-tête par lequel le Worker de bord transmet l'adresse du visiteur. */
export const ENTETE_IP_VISITEUR = 'x-pieci-ip';

/**
 * Limiteur de débit compté par visiteur, et non par relais.
 *
 * Le Worker de bord appelle l'API de serveur à serveur : sans cette
 * distinction, toutes les requêtes arriveraient sous la même adresse — celle
 * de Cloudflare — et le plafond deviendrait un plafond global. Trente
 * personnes scannant le kakémono au même événement s'excluraient les unes les
 * autres, ce qui est exactement le moment où l'on veut compter juste.
 *
 * L'en-tête est fourni par notre propre bord, donc falsifiable par qui
 * appelle l'API directement. Ce n'est pas la ligne de défense principale :
 * celle-ci est la liste fermée des sources, qui fait qu'un flot inventé
 * s'entasse sous « inconnu » sans polluer le compte d'aucun support réel.
 */
@Injectable()
export class ThrottleVisiteurGuard extends ThrottlerGuard {
  protected getTracker(requete: Record<string, unknown>): Promise<string> {
    const req = requete as unknown as Request;
    const transmise = req.headers?.[ENTETE_IP_VISITEUR];
    const ip = Array.isArray(transmise) ? transmise[0] : transmise;
    return Promise.resolve(ip || req.ip || 'inconnue');
  }
}
