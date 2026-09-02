import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { timingSafeEqual } from 'crypto';

/** En-tête portant le jeton. */
export const ENTETE_JETON = 'x-pieci-jeton';

/**
 * Protège les statistiques de scans par un jeton partagé.
 *
 * Pièci n'a pas de comptes administrateurs — l'identité y est un numéro de
 * téléphone, sans mot de passe ni session. Introduire une authentification
 * complète pour un seul écran de chiffres serait disproportionné ; un secret
 * porté par un en-tête, tenu dans les variables d'environnement, suffit et se
 * révoque en changeant sa valeur.
 *
 * **Ferme par défaut** : sans `SCANS_QR_JETON` configuré, l'accès est refusé.
 * L'inverse — ouvrir quand la configuration manque — est la façon habituelle
 * dont un endpoint privé se retrouve public après un déploiement oublié.
 */
@Injectable()
export class JetonStatsGuard implements CanActivate {
  private readonly logger = new Logger(JetonStatsGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(contexte: ExecutionContext): boolean {
    const attendu = this.config.get<string>('SCANS_QR_JETON');
    if (!attendu) {
      this.logger.warn('SCANS_QR_JETON absent : les statistiques restent fermées.');
      return false;
    }

    const requete = contexte.switchToHttp().getRequest<Request>();
    const fourni = requete.header(ENTETE_JETON);
    if (typeof fourni !== 'string') return false;

    // Comparaison à durée constante : sur un secret partagé, une comparaison
    // ordinaire s'arrête au premier caractère faux et laisse deviner le reste.
    const a = Buffer.from(fourni);
    const b = Buffer.from(attendu);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
