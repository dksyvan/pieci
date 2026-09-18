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
  pieceperdueKorhogo,
} from './guides-local';
import {
  protegerSesPapiers,
  numeriserSesPapiers,
  usurpationIdentite,
  combienDeTempsChercher,
  pourquoiPieci,
} from './guides-prevention';
import { BROUILLONS } from './guides-brouillons';

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
      pieceperdueKorhogo,
    ],
  },
  {
    titre: 'Se protéger',
    intro: 'Ce qui évite la perte, et ce qui limite les dégâts quand elle arrive.',
    guides: [protegerSesPapiers, numeriserSesPapiers, usurpationIdentite, pourquoiPieci],
  },
];

/**
 * Tous les guides, à plat, brouillons compris.
 *
 * C'est la liste de résolution : `/guides/<slug>` doit trouver un brouillon,
 * sinon il ne serait pas relisible en ligne — ce qui est toute sa raison
 * d'être. Ce n'est PAS la liste à publier : voir `GUIDES_PUBLIES`.
 */
export const GUIDES: Guide[] = [...RUBRIQUES.flatMap((r) => r.guides), ...BROUILLONS];

/**
 * Les guides publiables. Tout ce qui s'adresse au public ou à un moteur part
 * d'ici : l'index /guides, le sitemap, les « à lire aussi ».
 *
 * Le filtre porte sur le drapeau, pas sur l'appartenance à `BROUILLONS` : un
 * brouillon rangé par mégarde dans une rubrique resterait hors index.
 */
export const GUIDES_PUBLIES: Guide[] = GUIDES.filter((g) => !g.brouillon);

/** Les rubriques telles qu'on les affiche : sans brouillon, et sans rubrique vide. */
export const RUBRIQUES_PUBLIEES: Rubrique[] = RUBRIQUES.map((r) => ({
  ...r,
  guides: r.guides.filter((g) => !g.brouillon),
})).filter((r) => r.guides.length > 0);

/**
 * Adresses alternatives → slug réel.
 *
 * Un sujet, une page. Quand une seconde adresse a été annoncée ailleurs, elle
 * redirige au lieu de devenir une page jumelle : deux pages Pièci qui se
 * disputent « j'ai perdu ma carte d'identité » se dévaluent l'une l'autre, et
 * Google en retient une — pas forcément la meilleure.
 */
export const ALIAS: Record<string, string> = Object.fromEntries(
  GUIDES.flatMap((g) => (g.alias ?? []).map((a) => [a, g.slug] as const)),
);

/** Recherche par slug, pour la route /guides/:slug. Ne résout pas les alias. */
export function guideParSlug(slug: string | undefined): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/** Slug vers lequel rediriger une adresse alternative, s'il y en a un. */
export function cibleAlias(slug: string | undefined): string | undefined {
  return slug ? ALIAS[slug] : undefined;
}

export type { Guide };
