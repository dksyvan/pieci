import { normaliser } from '../matching/matching';

/**
 * Distance d'édition entre deux chaînes déjà normalisées, où l'inversion de
 * deux lettres voisines compte pour une seule faute (Damerau, alignement
 * optimal). Sur un téléphone, « Adjuoa » pour « Adjoua » est la faute la plus
 * courante qui soit ; Levenshtein la compterait double et renverrait le
 * propriétaire à « Ça ne correspond pas. ».
 */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Normalisation du défi : celle du rapprochement, puis tout ce qui n'est pas
 * une lettre devient un blanc. « Aya. », tapé par un trouveur pressé, doit
 * valoir « Aya ».
 */
function nettoyer(valeur: string | null | undefined): string {
  return normaliser(valeur).replace(/[^a-z ]/g, ' ').replace(/ +/g, ' ').trim();
}

/**
 * Nombre de prénoms au-delà duquel on ne cherche plus d'association.
 *
 * L'association essaie les appariements possibles : sans borne, son coût
 * croît comme une factorielle. Un prénom de treize lettres isolées — le champ
 * en accepte cent caractères — occupait la boucle d'événements pendant des
 * heures et figeait toute l'API sur une seule requête. Six prénoms couvrent
 * les pièces réelles ; au-delà, seule l'égalité exacte compte.
 */
const PRENOMS_MAX = 6;

/**
 * L'association des prénoms attendus aux prénoms saisis coûte-t-elle au plus
 * `budget` fautes ?
 *
 * L'exploration s'arrête dès que le coût partiel dépasse le budget (0 ou 1) :
 * avec au plus six prénoms attendus et sept saisis, elle reste sous le
 * millier d'appariements, et presque toujours bien en dessous.
 */
function associationDansLeBudget(attendus: string[], saisis: string[], budget: number): boolean {
  const pris = new Array<boolean>(saisis.length).fill(false);
  const explorer = (i: number, cout: number): boolean => {
    if (cout > budget) return false;
    if (i === attendus.length) return true;
    for (let j = 0; j < saisis.length; j++) {
      if (pris[j]) continue;
      // Une distance ne peut qu'augmenter le coût : inutile de la calculer
      // entière quand le budget restant est déjà nul et que les chaînes diffèrent.
      const d = budget - cout === 0 ? (attendus[i] === saisis[j] ? 0 : 1) : distance(attendus[i], saisis[j]);
      pris[j] = true;
      const trouve = explorer(i + 1, cout + d);
      pris[j] = false;
      if (trouve) return true;
    }
    return false;
  };
  return explorer(0, 0);
}

/**
 * Poids d'une réponse fausse pour le compteur d'essais.
 *
 * Un prénom saisi en plus de ceux attendus est une hypothèse de plus : pour
 * une pièce « Aya », « Aya Adjoua » teste deux prénoms à la fois, et compte
 * pour deux. Plafonné à deux — une réponse plus longue ne peut de toute façon
 * pas concorder, et ne doit pas fermer la pièce d'un seul envoi.
 */
export function poidsReponse(saisis: string, attendus: string): number {
  const compter = (s: string) => nettoyer(s).split(' ').filter(Boolean).length;
  return Math.min(1 + PRENOMS_EN_PLUS_MAX, 1 + Math.max(0, compter(saisis) - compter(attendus)));
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

  const jetonsA = a.split(' ');
  const jetonsB = b.split(' ');
  if (jetonsB.length > PRENOMS_MAX) return false;
  if (jetonsA.length < jetonsB.length) return false;
  if (jetonsA.length > jetonsB.length + PRENOMS_EN_PLUS_MAX) return false;

  const tolerance =
    jetonsA.every((jeton) => jeton.length >= 2) &&
    b.replace(/ /g, '').length >= LETTRES_MIN_POUR_TOLERANCE;

  return associationDansLeBudget(jetonsB, jetonsA, tolerance ? 1 : 0);
}
