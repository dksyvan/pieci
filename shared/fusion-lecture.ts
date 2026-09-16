import { normaliser } from './matching';
import type { LectureMrz } from './mrz';
import type { Decoupage, LectureRecto } from './recto';
import { TYPES_PIECE, type TypePiece } from './types';

/**
 * Fusion des deux lectures d'une même pièce : la MRZ et le recto.
 *
 * Chacune a raison sur un point différent :
 *
 * - la MRZ tranche le DÉCOUPAGE. Le patronyme est avant `<<`, les prénoms
 *   après : c'est structurel, alors que sur le recto le découpage dépend de
 *   libellés que l'OCR lit mal, et se devine parfois (« Nom et prénoms ») ;
 * - le recto donne l'ORTHOGRAPHE. La MRZ n'a ni accents ni apostrophes
 *   (N'GUESSAN y devient NGUESSAN, TIÉ BI y devient TIE BI), or l'affichage
 *   public les garde : un champ rempli depuis la MRZ et jamais relu violerait
 *   cette règle en silence, sur chaque carte.
 *
 * On prend donc l'orthographe du recto quand les deux lectures disent les
 * mêmes lettres, une fois accents, apostrophes, tirets et espaces neutralisés
 * par `normaliser()` — la même fonction que le rapprochement et le défi de
 * propriété. Dès qu'une lettre diffère, on garde la MRZ, dont les chiffres de
 * contrôle garantissent au moins que le reste de la bande a été bien lu, et la
 * personne relit le champ.
 *
 * Fonction pure, sans DOM ni Node : elle tourne dans le Web Worker de lecture,
 * qui ne renvoie à la page QUE son résultat. D'où la liste fermée des clés de
 * sortie, recopiées une à une : rien de ce que porteraient les objets d'entrée
 * au-delà ne peut passer.
 */

/** Ce que la lecture de la pièce renvoie à la page. Rien d'autre. */
export interface LectureFusionnee {
  typePiece?: TypePiece;
  nom?: string;
  prenom?: string;
  /**
   * Présent seulement quand une MRZ a été lue. Vrai si le nom et les prénoms
   * remplissent tout le champ de la MRZ : ils ont pu être coupés par
   * l'émetteur (la norme dit qu'un nom qui remplit exactement le champ « doit
   * être traité comme tronqué »). Un prénom coupé enregistré tel quel ferait
   * échouer le vrai propriétaire au défi : l'interface invite à l'écrire en
   * entier.
   */
  peutEtreCoupe?: boolean;
  /**
   * Présent seulement sans MRZ : d'où vient la séparation nom / prénoms lue
   * sur le recto. Avec une MRZ, le découpage est structurel et n'a pas à être
   * confirmé.
   */
  decoupage?: Decoupage;
}

/**
 * Longueur au-delà de laquelle une valeur n'est pas un nom lu sur une pièce
 * (la MRZ en permet 39 caractères, le recto quelques mots) : elle est ignorée.
 * Borne le coût de la fusion quoi qu'on lui passe.
 */
export const LONGUEUR_MAX_CHAMP = 128;

/** Positions du champ nom dans la MRZ : 30 sur une carte TD1, 39 sur un passeport TD3. */
const CHAMP_NOM_TD1 = 30;
const CHAMP_NOM_TD3 = 39;

const DECOUPAGES: readonly Decoupage[] = ['libelles', 'colonnes', 'numerotation', 'position', 'devine'];

/** « N'GUESSAN » et « NGUESSAN » → « nguessan » ; « TIÉ BI » et « TIE<BI » lu « TIE BI » → « tiebi ». */
const compacter = (valeur: string) => normaliser(valeur).replace(/ /g, '');

const texte = (valeur: unknown): string | undefined =>
  typeof valeur === 'string' && valeur.length <= LONGUEUR_MAX_CHAMP && valeur.trim() ? valeur.trim() : undefined;

/** Lecture MRZ utilisable, ou `null` : un nom est indispensable, le reste est vérifié champ par champ. */
function mrzUtilisable(mrz: unknown): LectureMrz | null {
  if (!mrz || typeof mrz !== 'object') return null;
  const m = mrz as Record<string, unknown>;
  const nom = texte(m.nom);
  if (!nom) return null;
  const typePiece = m.typePiece === 'CNI' || m.typePiece === 'Passeport' ? m.typePiece : undefined;
  return { ...(typePiece ? { typePiece } : {}), nom, prenom: texte(m.prenom) ?? '' };
}

/** Lecture du recto réduite à ses clés connues et valides, ou `null` si elle est vide. */
function rectoUtilisable(recto: unknown): LectureRecto | null {
  if (!recto || typeof recto !== 'object') return null;
  const r = recto as Record<string, unknown>;
  const sortie: LectureRecto = {};
  if (TYPES_PIECE.includes(r.typePiece as TypePiece)) sortie.typePiece = r.typePiece as TypePiece;
  const nom = texte(r.nom);
  const prenom = texte(r.prenom);
  if (nom) sortie.nom = nom;
  if (prenom) sortie.prenom = prenom;
  if ((nom || prenom) && DECOUPAGES.includes(r.decoupage as Decoupage)) sortie.decoupage = r.decoupage as Decoupage;
  return sortie.typePiece || sortie.nom || sortie.prenom ? sortie : null;
}

/**
 * Le nom et les prénoms occupent-ils tout le champ de la MRZ ? Calculé sur les
 * valeurs de la MRZ, AVANT de leur rendre accents et apostrophes : c'est la
 * place qu'elles prenaient dans la bande qui compte. Une espace vaut un
 * chevron, et le double chevron qui sépare le nom des prénoms compte pour 2 ;
 * sans prénoms, il n'y a pas de séparateur à compter.
 *
 * Un TD1 dont le type est resté vide reste une carte : champ de 30.
 */
function peutEtreCoupe(mrz: LectureMrz): boolean {
  const champ = mrz.typePiece === 'Passeport' ? CHAMP_NOM_TD3 : CHAMP_NOM_TD1;
  const occupe = mrz.nom.length + (mrz.prenom ? 2 + mrz.prenom.length : 0);
  return occupe >= champ;
}

/**
 * Coupe l'identité lue sur le recto (« TIÉ BI KOUAMÉ ») là où la MRZ place la
 * fin du patronyme, exprimée en lettres compactées. Rend `null` si la coupure
 * ne tombe pas entre deux mots : on ne coupe jamais au milieu d'un mot, ni sur
 * une apostrophe (« N'GUESSAN » est un seul nom).
 */
function couperALaMrz(identite: string, lettresDuNom: number): [string, string] | null {
  const caracteres = Array.from(identite);
  let lettres = 0;
  let i = 0;
  while (i < caracteres.length && lettres < lettresDuNom) lettres += compacter(caracteres[i++]).length;
  // Accents combinants qui suivent la dernière lettre du nom : ils lui appartiennent.
  while (i < caracteres.length && !compacter(caracteres[i]) && !/[\s'’-]/.test(caracteres[i])) i++;
  if (lettres !== lettresDuNom || i >= caracteres.length || !/[\s-]/.test(caracteres[i])) return null;
  const nom = caracteres.slice(0, i).join('').trim();
  const prenom = caracteres.slice(i).join('').replace(/^[\s-]+/, '').trim();
  return nom && prenom ? [nom, prenom] : null;
}

/**
 * Nom et prénoms à retenir : découpage de la MRZ, orthographe du recto quand
 * les lettres concordent.
 *
 * On compare d'abord l'identité entière, pour tenir le cas où le recto a les
 * bonnes lettres mais un mauvais découpage (« Nom et prénoms : KOUADIO KOFFI
 * YAO », deviné en KOUADIO + KOFFI YAO, quand la MRZ dit KOUADIO KOFFI << YAO).
 * Sinon, champ par champ.
 */
function identiteRetenue(mrz: LectureMrz, recto: LectureRecto | null): { nom: string; prenom: string } {
  if (recto?.nom && recto.prenom && mrz.prenom) {
    const lue = `${recto.nom} ${recto.prenom}`;
    if (compacter(lue) === compacter(`${mrz.nom} ${mrz.prenom}`)) {
      const coupure = couperALaMrz(lue, compacter(mrz.nom).length);
      if (coupure && compacter(coupure[0]) === compacter(mrz.nom) && compacter(coupure[1]) === compacter(mrz.prenom)) {
        return { nom: coupure[0], prenom: coupure[1] };
      }
    }
  }
  const concorde = (lu: string | undefined, mrzValeur: string) =>
    lu !== undefined && mrzValeur !== '' && compacter(lu) === compacter(mrzValeur);
  return {
    nom: concorde(recto?.nom, mrz.nom) ? recto!.nom! : mrz.nom,
    prenom: concorde(recto?.prenom, mrz.prenom) ? recto!.prenom! : mrz.prenom,
  };
}

/**
 * Type de pièce. Celui de la MRZ l'emporte. Une MRZ valide SANS type est une
 * carte qui n'est pas une carte d'identité ivoirienne (autre État, autre
 * titre) : on ne garde alors du recto qu'un type qui ne la contredit pas, donc
 * ni « CNI » ni « Passeport ».
 */
function typeRetenu(mrz: LectureMrz, recto: LectureRecto | null): TypePiece | undefined {
  if (mrz.typePiece) return mrz.typePiece;
  const duRecto = recto?.typePiece;
  return duRecto === 'CNI' || duRecto === 'Passeport' ? undefined : duRecto;
}

/**
 * Fusionne la lecture de la MRZ et celle du recto.
 *
 * - Sans MRZ : la lecture du recto telle quelle, `decoupage` compris.
 * - Avec MRZ : type de la MRZ, découpage de la MRZ, orthographe du recto quand
 *   les lettres concordent, et `peutEtreCoupe` calculé sur la MRZ.
 * - Rien d'exploitable : `null`.
 *
 * Ne lève jamais d'exception ; les valeurs de plus de `LONGUEUR_MAX_CHAMP`
 * caractères sont ignorées.
 */
export function fusionner(
  mrz: LectureMrz | null | undefined,
  recto: LectureRecto | null | undefined,
): LectureFusionnee | null {
  try {
    const r = rectoUtilisable(recto);
    const m = mrzUtilisable(mrz);
    if (!m) return r;

    const { nom, prenom } = identiteRetenue(m, r);
    const typePiece = typeRetenu(m, r);
    const sortie: LectureFusionnee = {};
    if (typePiece) sortie.typePiece = typePiece;
    sortie.nom = nom;
    if (prenom) sortie.prenom = prenom;
    sortie.peutEtreCoupe = peutEtreCoupe(m);
    return sortie;
  } catch {
    // Volontairement muet : rien de ce qui a été lu ne doit remonter.
    return null;
  }
}
