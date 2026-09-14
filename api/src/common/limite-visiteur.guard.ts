import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ENTETE_VISITEUR } from '../scans-qr/throttle-visiteur.guard';

interface Limite {
  /** Nom du compteur : deux routes ne partagent jamais le même. */
  nom: string;
  plafond: number;
  dureeMs: number;
}

const CLE_LIMITE = 'pieci:limite-visiteur';

/** Forme exacte de l'empreinte posée par le Worker : 12 octets en hexadécimal. */
const FORME_EMPREINTE = /^[0-9a-f]{24}$/;

/**
 * Nombre de visiteurs suivis à la fois. Au-delà, les plus anciens sont
 * oubliés : la mémoire reste bornée même sous un flot d'empreintes inventées.
 */
const VISITEURS_MAX = 10_000;

/** Plafond de requêtes par visiteur sur une fenêtre glissante. */
export const LimiteVisiteur = (nom: string, plafond: number, dureeMs: number) =>
  SetMetadata(CLE_LIMITE, { nom, plafond, dureeMs } satisfies Limite);

/**
 * Limiteur par visiteur, en mémoire, à fenêtre glissante.
 *
 * Pourquoi pas `@nestjs/throttler`, déjà présent pour les scans : dans sa
 * version 6.5.0, le stockage range les minuteurs d'expiration par nom de
 * limiteur et non par clé, et le déblocage d'un seul visiteur annule ceux de
 * tous les autres — dont les compteurs cessent alors de redescendre. Un
 * curieux bloqué sur une route figeait les créations d'alerte de tout le
 * monde.
 *
 * Le visiteur est l'empreinte posée par le Worker de bord (jamais une adresse
 * gardée) ; à défaut, l'adresse vue par le serveur, qui n'est ni écrite ni
 * journalisée. Un en-tête qui n'a pas la forme exacte de l'empreinte est
 * ignoré : sans cela, chacun pouvait créer autant de compteurs qu'il
 * inventait de valeurs, et de seize kilo-octets chacune. Appelée en direct,
 * l'API reçoit l'en-tête que l'appelant veut bien envoyer : ce limiteur
 * freine, il ne protège pas seul.
 */
@Injectable()
export class LimiteVisiteurGuard implements CanActivate {
  private static readonly passages = new Map<string, { dureeMs: number; instants: number[] }>();

  constructor(private readonly reflector: Reflector) {}

  /** Pour les tests. */
  static vider(): void {
    LimiteVisiteurGuard.passages.clear();
  }

  canActivate(contexte: ExecutionContext): boolean {
    const limite = this.reflector.get<Limite | undefined>(CLE_LIMITE, contexte.getHandler());
    if (!limite) return true;

    const requete = contexte.switchToHttp().getRequest<Request>();
    const transmise = requete.headers?.[ENTETE_VISITEUR];
    const empreinte = Array.isArray(transmise) ? transmise[0] : transmise;
    const visiteur =
      empreinte && FORME_EMPREINTE.test(empreinte) ? empreinte : requete.ip || 'inconnu';

    const maintenant = Date.now();
    const cle = `${limite.nom}|${visiteur}`;
    const instants = (LimiteVisiteurGuard.passages.get(cle)?.instants ?? []).filter(
      (t) => maintenant - t < limite.dureeMs,
    );

    if (instants.length >= limite.plafond) {
      LimiteVisiteurGuard.passages.set(cle, { dureeMs: limite.dureeMs, instants });
      throw new HttpException(
        'Trop de demandes d’un coup. Réessaie dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    instants.push(maintenant);
    // Supprimer puis réinsérer place la clé en fin de Map : l'ordre
    // d'insertion devient l'ordre du dernier passage, et l'éviction ci-dessous
    // retire bien les visiteurs les moins récents.
    LimiteVisiteurGuard.passages.delete(cle);
    LimiteVisiteurGuard.passages.set(cle, { dureeMs: limite.dureeMs, instants });
    LimiteVisiteurGuard.borner();
    return true;
  }

  /** Oublie les visiteurs les moins récents au-delà de VISITEURS_MAX — en temps constant. */
  private static borner(): void {
    const passages = LimiteVisiteurGuard.passages;
    while (passages.size > VISITEURS_MAX) {
      const plusAncien = passages.keys().next().value;
      if (plusAncien === undefined) return;
      passages.delete(plusAncien);
    }
  }

  /** Pour les tests. */
  static taille(): number {
    return LimiteVisiteurGuard.passages.size;
  }
}
