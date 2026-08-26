import type { Guide } from './types';
import { cniPerdue, cniPerdueSansNumero, jaiTrouveUneCni } from './guides-perte';
import {
  cniVolee,
  passeportPerdu,
  permisPerdu,
  carteGrisePerdue,
  carteEtudiantPerdue,
} from './guides-perte-2';
import {
  ouDeposerPieceTrouvee,
  recompensePieceTrouvee,
  trouvePieceDansTaxi,
  trouvePieceEtranger,
} from './guides-trouvaille';
import {
  pieceperdueAbidjan,
  pieceperdueYopougon,
  pieceperdueCocody,
  pieceperdueAbobo,
  pieceperdueAdjame,
  pieceperdueBouake,
} from './guides-local';
import {
  protegerSesPapiers,
  numeriserSesPapiers,
  usurpationIdentite,
  combienDeTempsChercher,
  pourquoiPieci,
} from './guides-prevention';

/**
 * Une rubrique regroupe les guides qui répondent à la même situation. Le
 * regroupement sert d'abord le lecteur — vingt-trois liens à la file ne se
 * parcourent pas — et accessoirement le maillage, chaque guide restant
 * atteignable en deux clics depuis l'accueil.
 */
export interface Rubrique {
  titre: string;
  intro: string;
  guides: Guide[];
}

export const RUBRIQUES: Rubrique[] = [
  {
    titre: 'J’ai perdu ma pièce',
    intro: 'Les premières heures, et ce qu’il faut faire selon le document concerné.',
    guides: [
      cniPerdue,
      cniPerdueSansNumero,
      cniVolee,
      passeportPerdu,
      permisPerdu,
      carteGrisePerdue,
      carteEtudiantPerdue,
      combienDeTempsChercher,
    ],
  },
  {
    titre: 'J’ai trouvé une pièce',
    intro: 'Ce qu’on fait d’un document qui n’est pas le sien, sans prendre de risque.',
    guides: [
      jaiTrouveUneCni,
      ouDeposerPieceTrouvee,
      trouvePieceDansTaxi,
      recompensePieceTrouvee,
      trouvePieceEtranger,
    ],
  },
  {
    titre: 'Selon l’endroit',
    intro: 'Où les pièces se perdent réellement, commune par commune.',
    guides: [
      pieceperdueAbidjan,
      pieceperdueAdjame,
      pieceperdueYopougon,
      pieceperdueCocody,
      pieceperdueAbobo,
      pieceperdueBouake,
    ],
  },
  {
    titre: 'Se protéger',
    intro: 'Ce qui évite la perte, et ce qui limite les dégâts quand elle arrive.',
    guides: [protegerSesPapiers, numeriserSesPapiers, usurpationIdentite, pourquoiPieci],
  },
];

/** Tous les guides, à plat. L'ordre suit celui des rubriques. */
export const GUIDES: Guide[] = RUBRIQUES.flatMap((r) => r.guides);

/** Recherche par slug, pour la route /guides/:slug. */
export function guideParSlug(slug: string | undefined): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export type { Guide };
