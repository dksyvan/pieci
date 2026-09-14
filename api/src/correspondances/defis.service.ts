import { Injectable } from '@nestjs/common';

interface Compteur {
  echecs: number;
  /** Début de la fenêtre de comptage, en millisecondes. */
  depuis: number;
  /** Blocage jusqu'à cet instant, ou 0. */
  bloqueJusqua: number;
}

interface Regle {
  plafond: number;
  dureeMs: number;
}

/**
 * Compte les réponses fausses au défi des prénoms, et bloque.
 *
 * Deux compteurs, parce qu'un seul ne suffit pas :
 *
 * - par pièce et par demandeur : trois essais, puis trente minutes de
 *   blocage. C'est la règle du brief, faite pour la personne qui se trompe.
 * - par pièce, tous demandeurs confondus : dix échecs en vingt-quatre heures,
 *   puis vingt-quatre heures de blocage. Le demandeur est identifié par son
 *   numéro, qui n'est vérifié par aucun code : créer dix numéros donnerait
 *   trente essais. Ce second compteur est la vraie borne, et il se compte en
 *   jours parce qu'en demi-heures il laisserait près de cinq cents essais par
 *   jour — de quoi épuiser les prénoms courants d'une initiale donnée.
 *
 * Sa contrepartie est connue : un attaquant qui épuise les dix essais bloque
 * aussi, pour une journée, un vrai propriétaire qui aurait mal écrit ses
 * prénoms en créant son alerte. Celui qui les a bien écrits ne passe jamais
 * par ici. Attendre un jour coûte moins que voir sa pièce réclamée par un
 * autre.
 *
 * Pas d'adresse IP : le projet n'en conserve aucune, et derrière le Worker de
 * bord toutes les requêtes arrivent de toute façon sous celle de Cloudflare.
 *
 * En mémoire, sur l'instance : un redémarrage remet les compteurs à zéro. Le
 * défi est un filtre, pas une serrure — la confirmation du trouveur reste
 * exigée — et un attaquant ne provoque pas les redémarrages. Si l'API passe
 * un jour sur plusieurs instances, ces compteurs devront partir en base.
 */
@Injectable()
export class DefisService {
  static readonly PAR_DEMANDEUR: Regle = { plafond: 3, dureeMs: 30 * 60 * 1000 };
  static readonly PAR_PIECE: Regle = { plafond: 10, dureeMs: 24 * 60 * 60 * 1000 };

  private readonly parDemandeur = new Map<string, Compteur>();
  private readonly parPiece = new Map<string, Compteur>();

  /**
   * Le défi est-il bloqué pour ce demandeur sur cette pièce, et pourquoi ?
   *
   * La cause sert au seul message : « trente minutes » quand c'est le
   * demandeur qui s'est trompé, « demain » quand c'est la pièce qui est
   * fermée. Annoncer trente minutes pour un blocage d'une journée renvoyait
   * le vrai propriétaire au même refus toutes les demi-heures, sans qu'il
   * comprenne. Le message ne dit jamais que d'autres numéros ont essayé.
   */
  estBloque(pieceId: string, demandeur: string): 'piece' | 'demandeur' | null {
    const maintenant = Date.now();
    this.purger(maintenant);
    if ((this.parPiece.get(pieceId)?.bloqueJusqua ?? 0) > maintenant) return 'piece';
    if ((this.parDemandeur.get(this.cle(pieceId, demandeur))?.bloqueJusqua ?? 0) > maintenant) {
      return 'demandeur';
    }
    return null;
  }

  /** Enregistre une réponse fausse, qui peut valoir plusieurs essais (voir poidsReponse). */
  echec(pieceId: string, demandeur: string, poids = 1): void {
    const maintenant = Date.now();
    this.compter(this.parDemandeur, this.cle(pieceId, demandeur), DefisService.PAR_DEMANDEUR, maintenant, poids);
    this.compter(this.parPiece, pieceId, DefisService.PAR_PIECE, maintenant, poids);
  }

  /**
   * Efface le compteur du demandeur qui a répondu juste. Celui de la pièce
   * reste : les échecs des autres demandeurs n'en deviennent pas moins
   * suspects.
   */
  succes(pieceId: string, demandeur: string): void {
    this.parDemandeur.delete(this.cle(pieceId, demandeur));
  }

  private cle(pieceId: string, demandeur: string): string {
    return `${pieceId}|${demandeur}`;
  }

  private compter(
    table: Map<string, Compteur>,
    cle: string,
    regle: Regle,
    maintenant: number,
    poids: number,
  ): void {
    const courant = table.get(cle);
    const fenetreEchue = !courant || maintenant - courant.depuis > regle.dureeMs;
    const compteur: Compteur = fenetreEchue
      ? { echecs: 0, depuis: maintenant, bloqueJusqua: 0 }
      : courant;

    compteur.echecs += poids;
    if (compteur.echecs >= regle.plafond) compteur.bloqueJusqua = maintenant + regle.dureeMs;
    table.set(cle, compteur);
  }

  /** Oublie ce qui est échu, pour que la mémoire ne grossisse pas indéfiniment. */
  private purger(maintenant: number): void {
    const tables: [Map<string, Compteur>, Regle][] = [
      [this.parDemandeur, DefisService.PAR_DEMANDEUR],
      [this.parPiece, DefisService.PAR_PIECE],
    ];
    for (const [table, regle] of tables) {
      if (table.size < 500) continue;
      for (const [cle, c] of table) {
        if (c.bloqueJusqua <= maintenant && maintenant - c.depuis > regle.dureeMs) {
          table.delete(cle);
        }
      }
    }
  }
}
