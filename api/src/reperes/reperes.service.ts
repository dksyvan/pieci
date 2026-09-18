import { Injectable, Logger } from '@nestjs/common';
import { lireAutour, type ReperesAutour } from './photon';

/**
 * Les lieux nommés autour d'un point, avec cache et repli.
 *
 * Trois choses que le fournisseur ne fait pas et qui se décident ici :
 *
 * - **on ne bloque jamais.** Si le service tarde ou tombe, la route rend une
 *   liste vide et le formulaire continue avec son champ libre. Quelqu'un debout
 *   dans la rue avec une pièce à la main ne doit jamais voir un bouton tourner
 *   sans fin ;
 * - **on demande peu.** Photon est un service gratuit tenu par d'autres : le
 *   cache par cellule évite de lui redemander vingt fois le même carrefour ;
 * - **on ne garde pas de position.** La clé du cache est arrondie à trois
 *   décimales, soit une centaine de mètres, et rien n'est écrit sur disque ni
 *   dans un journal. Une position exacte ne dort nulle part.
 */

/**
 * Taille d'une cellule de cache : trois décimales, environ 110 m.
 *
 * Assez fin pour que les repères restent justes, assez grossier pour que deux
 * personnes du même carrefour partagent la même réponse — et pour qu'aucune
 * position précise ne subsiste en mémoire.
 */
const DECIMALES = 3;

/** Les lieux d'une rue ne bougent pas dans la journée. */
const DUREE_MS = 24 * 60 * 60 * 1000;

/**
 * Nombre de cellules gardées. Au-delà, la plus ancienne part.
 *
 * La mémoire reste bornée quoi qu'il arrive : un flot de coordonnées inventées
 * ne peut pas faire enfler le processus. L'API tourne sur 512 Mo.
 */
const CELLULES_MAX = 2000;

interface Entree {
  valeur: ReperesAutour;
  expire: number;
}

@Injectable()
export class ReperesService {
  private readonly journal = new Logger(ReperesService.name);
  private readonly cache = new Map<string, Entree>();

  async autour(lat: number, lng: number): Promise<ReperesAutour> {
    const cle = `${lat.toFixed(DECIMALES)},${lng.toFixed(DECIMALES)}`;
    const maintenant = Date.now();

    const connu = this.cache.get(cle);
    if (connu && connu.expire > maintenant) return connu.valeur;

    let valeur: ReperesAutour;
    try {
      valeur = await lireAutour(lat, lng);
    } catch (err) {
      // Le message, jamais les coordonnées : un journal ne doit rien contenir
      // qui situe quelqu'un.
      this.journal.warn(`Lieux nommés indisponibles : ${(err as Error).message}`);
      return { reperes: [], quartier: null };
    }

    if (this.cache.size >= CELLULES_MAX) {
      const plusAncienne = this.cache.keys().next().value;
      if (plusAncienne !== undefined) this.cache.delete(plusAncienne);
    }
    this.cache.set(cle, { valeur, expire: maintenant + DUREE_MS });

    return valeur;
  }
}
