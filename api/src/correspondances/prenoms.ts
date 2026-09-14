import { normaliser } from '../matching/matching';

/**
 * Tout ce module tourne sur la boucle d'événements de l'unique instance de
 * l'API, sur des saisies choisies par n'importe qui. Deux versions ont appris
 * ce que ça coûte : une association factorielle figeait l'API des heures, puis
 * une distance recalculée en entier à chaque appariement la tenait encore une
 * seconde par requête. D'où trois bornes, chacune nécessaire :
 *
 * - au plus PRENOMS_MAX prénoms attendus ;
 * - au plus LETTRES_MAX lettres par prénom comparé ;
 * - aucune distance d'édition complète : on ne demande jamais « combien de
 *   fautes ? », seulement « zéro, une, ou davantage ? », ce qui se tranche
 *   en un seul passage sur les deux mots.
 */

/** Au-delà, seule l'égalité exacte compte. Six prénoms couvrent les pièces réelles. */
const PRENOMS_MAX = 6;

/** Aucun prénom réel n'approche cette longueur ; au-delà, les lettres sont ignorées. */
const LETTRES_MAX = 30;

/**
 * Normalisation du défi : celle du rapprochement, puis tout ce qui n'est pas
 * une lettre devient un blanc. « Aya. », tapé par un trouveur pressé, doit
 * valoir « Aya ».
 */
function nettoyer(valeur: string | null | undefined): string {
  return normaliser(valeur).replace(/[^a-z ]/g, ' ').replace(/ +/g, ' ').trim();
}

function prenomsDe(texte: string): string[] {
  return texte.split(' ').filter(Boolean).map((prenom) => prenom.slice(0, LETTRES_MAX));
}

/**
 * Écart entre deux prénoms : 0 s'ils sont identiques, 1 s'ils diffèrent d'une
 * seule faute de frappe, 2 au-delà.
 *
 * Une faute, c'est une lettre remplacée, ajoutée ou oubliée, ou deux lettres
 * voisines inversées — « Adjuoa » pour « Adjoua », la faute la plus courante
 * sur un téléphone. Tranché en un passage, sans matrice.
 */
function ecart(a: string, b: string): 0 | 1 | 2 {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;

  if (a.length === b.length) {
    let i = 0;
    while (a[i] === b[i]) i++;
    if (a.slice(i + 1) === b.slice(i + 1)) return 1;
    const inversion =
      i + 1 < a.length && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
    return inversion ? 1 : 2;
  }

  const [court, long] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < court.length && court[i] === long[i]) i++;
  return court.slice(i) === long.slice(i + 1) ? 1 : 2;
}

/**
 * Peut-on associer chaque prénom attendu à un prénom saisi distinct, pour au
 * plus `budget` fautes en tout ?
 *
 * Les écarts sont calculés une fois pour toutes (au plus 6 × 7 paires, chacune
 * linéaire), puis l'exploration ne fait plus que des additions, et s'arrête
 * dès que le budget est dépassé. Même avec des prénoms répétés, qui n'élaguent
 * rien, elle reste sous quelques milliers d'additions.
 */
function associationDansLeBudget(attendus: string[], saisis: string[], budget: number): boolean {
  const ecarts = attendus.map((attendu) => saisis.map((saisi) => ecart(attendu, saisi)));
  const pris = new Array<boolean>(saisis.length).fill(false);

  const explorer = (i: number, cout: number): boolean => {
    if (cout > budget) return false;
    if (i === attendus.length) return true;
    for (let j = 0; j < saisis.length; j++) {
      if (pris[j]) continue;
      pris[j] = true;
      const trouve = explorer(i + 1, cout + ecarts[i][j]);
      pris[j] = false;
      if (trouve) return true;
    }
    return false;
  };
  return explorer(0, 0);
}

/** En dessous de cette longueur, une seule faute tolérée rend le prénom devinable. */
const LETTRES_MIN_POUR_TOLERANCE = 5;

/**
 * Prénoms saisis en plus de ceux inscrits par le trouveur. Un seul : assez
 * pour le trouveur qui n'a tapé que « Serge » d'une carte « Serge Yvan »,
 * trop peu pour qu'une liste de prénoms courants serve de réponse.
 */
const PRENOMS_EN_PLUS_MAX = 1;

/**
 * Poids d'une réponse fausse pour le compteur d'essais.
 *
 * Un prénom saisi en plus de ceux attendus est une hypothèse de plus : pour
 * une pièce « Aya », « Aya Adjoua » teste deux prénoms à la fois, et compte
 * pour deux. Plafonné à deux — une réponse plus longue ne peut de toute façon
 * pas concorder, et ne doit pas fermer la pièce d'un seul envoi.
 */
export function poidsReponse(saisis: string, attendus: string): number {
  const enPlus = prenomsDe(nettoyer(saisis)).length - prenomsDe(nettoyer(attendus)).length;
  return Math.min(1 + PRENOMS_EN_PLUS_MAX, 1 + Math.max(0, enPlus));
}

/**
 * Les prénoms saisis sont-ils ceux inscrits sur la pièce ?
 *
 * Le propriétaire répond sans réfléchir ; un inconnu, qui ne voit que les
 * initiales sur l'annonce, doit deviner. La comparaison est donc indulgente
 * sur la forme et stricte sur le fond :
 *
 * - accents, casse, tirets, apostrophes et ponctuation ne comptent pas :
 *   « Serge-Yvan » et « serge yvan » passent ;
 * - l'ordre non plus : « Yvan Serge » passe ;
 * - les espaces non plus : « Nda » passe pour « N'Da » ;
 * - un prénom de plus est accepté : le trouveur n'a peut-être tapé qu'une
 *   partie de ce qui est inscrit, et le propriétaire, lui, écrit tout. Un
 *   prénom de moins, jamais ;
 * - une faute de frappe est tolérée, à trois conditions qui ferment chacune un
 *   raccourci que l'annonce publique offrirait sinon :
 *   1. aucun prénom saisi d'une seule lettre — les initiales sont affichées,
 *      et « Ange Y » ne doit pas valoir « Ange Ya » ;
 *   2. des prénoms attendus d'au moins cinq lettres en tout — sur « Aya »,
 *      une faute tolérée fait passer « Ay », à une lettre de l'initiale ;
 *   3. une faute pour l'ensemble, pas une par prénom.
 *
 * Ce n'est pas une serrure. C'est un filtre contre le curieux et
 * l'opportuniste ; la sécurité réelle vient de la confirmation du trouveur
 * et de la remise en main propre, au guichet d'un point de dépôt.
 */
export function prenomsConcordent(saisis: string, attendus: string): boolean {
  const a = nettoyer(saisis);
  const b = nettoyer(attendus);
  if (!a || !b) return false;

  if (a === b) return true;
  if (a.replace(/ /g, '') === b.replace(/ /g, '')) return true;

  const jetonsA = prenomsDe(a);
  const jetonsB = prenomsDe(b);
  if (jetonsB.length > PRENOMS_MAX) return false;
  if (jetonsA.length < jetonsB.length) return false;
  if (jetonsA.length > jetonsB.length + PRENOMS_EN_PLUS_MAX) return false;

  const tolerance =
    jetonsA.every((jeton) => jeton.length >= 2) &&
    jetonsB.join('').length >= LETTRES_MIN_POUR_TOLERANCE;

  return associationDansLeBudget(jetonsB, jetonsA, tolerance ? 1 : 0);
}
