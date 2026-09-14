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

/** En dessous de cette longueur, une seule faute tolérée rend le prénom devinable. */
const LETTRES_MIN_POUR_TOLERANCE = 5;

/**
 * Les prénoms saisis sont-ils ceux inscrits sur la pièce ?
 *
 * Le propriétaire répond sans réfléchir ; un inconnu, qui ne voit que les
 * initiales sur l'annonce, doit deviner. La comparaison est donc indulgente
 * sur la forme et stricte sur le fond :
 *
 * - accents, casse, tirets et apostrophes ne comptent pas — c'est `normaliser`,
 *   celle du rapprochement : « Serge-Yvan » et « serge yvan » passent ;
 * - l'ordre non plus : « Yvan Serge » passe ;
 * - les espaces non plus : « Nda » passe pour « N'Da » ;
 * - une faute de frappe est tolérée, à trois conditions qui ferment chacune un
 *   raccourci que l'annonce publique offrirait sinon :
 *   1. aucun jeton saisi d'une seule lettre — les initiales sont affichées,
 *      et « Ange Y » ne doit pas valoir « Ange Ya » ;
 *   2. un prénom attendu d'au moins cinq lettres — sur « Aya », une faute
 *      tolérée fait passer « Ay », à une lettre de l'initiale ;
 *   3. la faute porte sur l'ensemble, pas une par prénom.
 *
 * Ce n'est pas une serrure. C'est un filtre contre le curieux et
 * l'opportuniste ; la sécurité réelle vient de la confirmation du trouveur
 * et de la remise en main propre, au guichet d'un point de dépôt.
 */
export function prenomsConcordent(saisis: string, attendus: string): boolean {
  const a = normaliser(saisis);
  const b = normaliser(attendus);
  if (!a || !b) return false;

  if (a === b) return true;
  if (a.replace(/ /g, '') === b.replace(/ /g, '')) return true;

  const jetonsA = a.split(' ');
  const jetonsB = b.split(' ');
  const trieA = [...jetonsA].sort().join(' ');
  const trieB = [...jetonsB].sort().join(' ');
  if (trieA === trieB) return true;

  if (jetonsA.some((jeton) => jeton.length < 2)) return false;
  if (b.replace(/ /g, '').length < LETTRES_MIN_POUR_TOLERANCE) return false;

  return distance(a, b) <= 1 || distance(trieA, trieB) <= 1;
}
