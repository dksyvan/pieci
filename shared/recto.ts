import type { TypePiece } from './types';

/**
 * Lecture libre du recto d'une pièce : type, nom et prénoms, à partir du texte
 * rendu par l'OCR, quand il n'y a pas de MRZ exploitable.
 *
 * Pourquoi ce n'est pas un repli rare : la MRZ n'existe que sur le passeport
 * et (à confirmer) au verso de la CNI. Le permis, la carte étudiante et la
 * carte consulaire n'en ont pas, et le premier réflexe est de photographier
 * le côté du visage. Entre 60 et 90 % des déclarations passent par ici
 * (estimation de l'enquête préalable).
 *
 * Ce qui est difficile n'est pas de lire des lettres, c'est de savoir
 * lesquelles forment le nom. Les libellés exacts des pièces ivoiriennes ne
 * sont publiés nulle part : on accepte donc plusieurs mises en page
 * (« Nom : valeur », libellés empilés, colonnes, permis numéroté « 1. » /
 * « 2. », « Nom et prénoms » en un seul champ) et on dit, dans `decoupage`,
 * d'où vient la séparation nom / prénoms pour que l'interface fasse vérifier
 * les découpages devinés.
 *
 * Garanties de confidentialité, vérifiées par les tests :
 *
 * - fonction pure, sans état de module, sans effet de bord, sans aucune
 *   journalisation : elle tourne dans le navigateur de la personne ;
 * - ne renvoie jamais le texte brut, ni un chiffre, ni une date, ni un lieu.
 *   Les champs date et lieu de naissance, numéro, NNI, matricule, profession,
 *   domicile, père et mère ne sont jamais lus : ce sont des BUTÉES, qui
 *   arrêtent la lecture d'un nom. Un mot dont les chiffres ne s'expliquent pas
 *   par une confusion de l'OCR coupe la valeur, et la sortie est refiltrée :
 *   rien qui contienne un chiffre ne sort ;
 * - coût linéaire en la taille du texte, et texte borné (voir
 *   `MAX_CARACTERES_RECTO`) : le Web Worker reste réactif quoi qu'on lui
 *   donne.
 *
 * Mesuré (textes et images tous inventés). Sur 90 images redressées lues par
 * Tesseract, le prototype donnait 78 % de paires nom + prénoms utilisables et
 * 0 % de valeur fausse. Sur le banc de bruit textuel de recto.test.ts
 * (31 graines, 446 400 textes), il laissait pourtant sortir le lieu de
 * naissance comme nom ou prénoms dans 16 textes, dont 15 à 10 % de bruit.
 * Est compté comme lieu tout mot de la sortie semblable au lieu à 70 % au
 * moins : le bruit abîme aussi les lieux (SINFRA lu SIHFRA), et une recherche
 * à l'identique n'en voyait que 13. Avec les garde-fous d'ordre de lecture
 * ajoutés ici (voir `lieuOrphelin`, `apresUnNom`, `premiereLigneNaissance`,
 * `porteUneDate`) : 0 lieu et 0 chiffre sur ces 446 400 textes, pour au plus
 * un demi-point de paires utilisables en moins à 5 % de bruit (libellés
 * empilés), et moins de valeurs fausses. Ce zéro vaut pour ce générateur, pas
 * pour de vraies photos, où il faut attendre nettement moins : la relecture
 * humaine reste obligatoire.
 */

/**
 * D'où vient la séparation entre nom et prénoms. L'interface fait confirmer
 * `position` et `devine` (« Vérifie où s'arrête le nom »).
 */
export type Decoupage =
  /** Deux libellés distincts, « Nom » et « Prénom(s) » (ou Surname / Given names). */
  | 'libelles'
  /** Libellés empilés en colonne, valeurs dans le même ordre en dessous. */
  | 'colonnes'
  /** Champs numérotés du permis, façon ISO 18013 : « 1. » nom, « 2. » prénoms. */
  | 'numerotation'
  /** Libellé « Nom » perdu par l'OCR : nom déduit de sa place au-dessus de « Prénoms ». */
  | 'position'
  /** Libellé unique « Nom et prénoms » : séparation devinée. */
  | 'devine';

/** Ce que la lecture du recto livre au reste de l'application. Rien d'autre. */
export interface LectureRecto {
  typePiece?: TypePiece;
  /** En capitales, accents et apostrophe conservés (« N'GUESSAN », « TIÉ BI »). */
  nom?: string;
  prenom?: string;
  /** Présent dès qu'un nom ou des prénoms sont lus. */
  decoupage?: Decoupage;
}

// ---------------------------------------------------------------------------
// Bornes d'entrée
// ---------------------------------------------------------------------------

/**
 * Sur 360 lectures Tesseract de rectos fictifs, la plus longue faisait 363
 * caractères et 55 lignes. Au-delà de ces bornes, ce n'est pas la lecture
 * d'une pièce : on s'abstient sans rien parcourir.
 */
export const MAX_CARACTERES_RECTO = 8_000;
export const MAX_LIGNES_RECTO = 300;
/**
 * Un mot de nom plus long n'existe pas (« KOFFI-BROU-KOUASSI » en fait 18) :
 * c'est du bruit collé, qui arrête la lecture au lieu de sortir comme nom.
 */
const LONGUEUR_MAX_MOT = 40;

function dansLesBornes(texte: unknown): texte is string {
  if (typeof texte !== 'string' || texte.length > MAX_CARACTERES_RECTO) return false;
  let lignes = 1;
  for (let i = texte.indexOf('\n'); i !== -1; i = texte.indexOf('\n', i + 1)) {
    if (++lignes > MAX_LIGNES_RECTO) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Outils de normalisation
// ---------------------------------------------------------------------------

const DIACRITIQUES = /[\u0300-\u036f]/g;
const APOSTROPHES = /[’‘`´ʼ′]/g;

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(DIACRITIQUES, '').normalize('NFC');
}

/** Clé de comparaison d'un LIBELLÉ : majuscules, sans accents, confusions de l'OCR corrigées. */
function cleLibelle(mot: string): string {
  let k = sansAccents(mot.replace(APOSTROPHES, "'")).toUpperCase();
  k = k.replace(/[()[\]{}.,;:!?*"]/g, '');
  k = k.replace(/0/g, 'O').replace(/[1|]/g, 'I').replace(/5/g, 'S').replace(/8/g, 'B').replace(/3/g, 'E');
  return k;
}

/** « M » lu « IVI », « RN » ou « NN » : variante essayée EN PLUS de la clé brute (SURNAME contient RN). */
function varianteM(k: string): string {
  return k.replace(/IVI/g, 'M').replace(/RN/g, 'M').replace(/NN(?=S?$)/g, 'M');
}

/**
 * Distance d'édition de Levenshtein, bornée par `max` : rend la distance
 * exacte si elle vaut au plus `max`, et `max + 1` sinon.
 *
 * Toutes les comparaisons de ce module demandent seulement « au plus `max`
 * erreurs ? ». Cela permet trois raccourcis, tous exacts :
 * - un écart de longueur supérieur à `max` répond non sans calcul, ce qui
 *   garde le coût constant sur un mot démesuré ;
 * - seules les cases à moins de `max` de la diagonale peuvent rester sous
 *   `max` : on ne remplit que cette bande ;
 * - le minimum d'une ligne ne redescend jamais : dès qu'il dépasse `max`, on
 *   s'arrête.
 * La recherche du type de pièce compare une centaine de fenêtres de mots à
 * chaque lecture ; la matrice complète en faisait l'essentiel du coût.
 */
function distance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const hors = max + 1;
  if (Math.abs(m - n) > max) return hors;
  if (!m || !n) return Math.max(m, n);
  let precedente = new Uint16Array(n + 1);
  let courante = new Uint16Array(n + 1);
  for (let j = 0; j <= n; j++) precedente[j] = j <= max ? j : hors;
  for (let i = 1; i <= m; i++) {
    const debut = Math.max(1, i - max);
    const fin = Math.min(n, i + max);
    courante[debut - 1] = debut === 1 && i <= max ? i : hors;
    let minimum = courante[debut - 1];
    const ca = a.charCodeAt(i - 1);
    for (let j = debut; j <= fin; j++) {
      let v = precedente[j - 1] + (ca === b.charCodeAt(j - 1) ? 0 : 1);
      if (precedente[j] + 1 < v) v = precedente[j] + 1;
      if (courante[j - 1] + 1 < v) v = courante[j - 1] + 1;
      if (v > hors) v = hors;
      courante[j] = v;
      if (v < minimum) minimum = v;
    }
    // Hors de la bande, la ligne suivante doit lire « trop loin », pas une valeur périmée.
    if (fin < n) courante[fin + 1] = hors;
    if (minimum > max) return hors;
    const echange = precedente;
    precedente = courante;
    courante = echange;
  }
  return precedente[n] > max ? hors : precedente[n];
}

// ---------------------------------------------------------------------------
// Lexique des libellés
// ---------------------------------------------------------------------------

function estNom(k: string): boolean {
  return /^N[OQD]MS?$/.test(k) || /^N[OQD]MS?$/.test(varianteM(k)) || k === 'HOM';
}
function estPrenom(k: string): boolean {
  return estPrenomBrut(k) || estPrenomBrut(varianteM(k));
}
function estPrenomBrut(k: string): boolean {
  if (k.length < 5 || k.length > 9) return false;
  if (!/^P?R/.test(k) && !/^P.?E/.test(k)) return false;
  return distance(k, 'PRENOMS', 2) <= 2 || distance(k, 'PRENOM', 1) <= 1;
}
function estSurname(k: string): boolean {
  return k.length >= 6 && distance(k, 'SURNAME', 1) <= 1;
}
function estEt(k: string): boolean {
  return k === 'ET' || k === '&' || k === 'E7' || k === 'AND';
}

/** Mots qui, après « Nom », désignent un AUTRE nom que celui du titulaire. */
const APRES_NOM_EXCLUS = new Set([
  'DU', 'DE', 'DES', "D'USAGE", 'DUSAGE', 'USAGE', 'MARITAL', 'EPOUSE', "D'EPOUSE", 'JEUNE', 'PATRONYMIQUE',
]);

/** Butées : un mot-libellé qui termine la valeur d'un nom. Jamais lu, jamais renvoyé. */
const BUTEES = new Set([
  'NE', 'NEE', 'NES', 'LE', 'DATE', 'DATES', 'LIEU', 'SEXE', 'SEX', 'TAILLE', 'HEIGHT', 'PROFESSION',
  'NATIONALITE', 'NATIONALITY', 'DOMICILE', 'ADRESSE', 'ADDRESS', 'CATEGORIE', 'CATEGORIES', 'CAT',
  'DELIVRE', 'DELIVREE', 'DELIVRANCE', 'VALIDITE', 'VALABLE', 'EXPIRATION', 'EXPIRE', 'EXPIRY', 'MATRICULE',
  'FILIERE', 'UFR', 'NIVEAU', 'ANNEE', 'NUMERO', 'NO', 'N°', 'NNI', 'SIGNATURE', 'GROUPE', 'SANGUIN', 'PERE',
  'MERE', 'EMISSION', 'AUTORITE', 'AUTHORITY', 'BIRTH', 'PLACE', 'EPOUSE', 'EP', 'VVE', 'A', 'À', 'CARTE',
  'REPUBLIQUE', 'IDENTITE', 'NATIONALE', 'PERMIS', 'CONDUIRE', 'ETUDIANT', 'UNIVERSITE', 'CONSULAIRE',
  'PASSEPORT', 'PASSPORT', 'SPECIMEN', 'TYPE', 'CODE', 'PAYS', 'COUNTRY', 'ETABLI', 'ETABLIE', 'FAIT',
  'TEL', 'TELEPHONE', 'CONTACT', 'ECOLE', 'FACULTE', 'OPTION', 'CYCLE', 'NIV', 'ACADEMIQUE', 'VALID',
  // « Né le » collé ou déformé par l'OCR
  'NELE', 'NEELE', 'NEEL', 'NELES', 'NEL',
  // en-têtes d'émetteurs : jamais un nom de titulaire
  'MINISTERE', 'AMBASSADE', 'CONSULAT', 'GENERAL', 'GENERALE', 'DIRECTION', 'TRANSPORTS', 'OFFICE', 'INSTITUT',
  'UNIVERSITAIRE', 'CLASSE', 'SERVICE', 'PREFECTURE', 'MAIRIE',
]);

/**
 * Valeurs qui ne peuvent pas être un nom : gentilés, pays, lieux de naissance
 * fréquents. C'est le filet contre le cas où l'OCR rend le lieu de naissance
 * juste sous le libellé des prénoms.
 */
const NON_NOMS = new Set([
  "COTE D'IVOIRE", 'COTE D IVOIRE', 'IVOIRIENNE', 'IVOIRIEN', 'BURKINABE', 'MALIENNE', 'MALIEN', 'SPECIMEN',
  'ABIDJAN', 'BOUAKE', 'YAMOUSSOUKRO', 'DALOA', 'KORHOGO', 'SAN PEDRO', 'SAN-PEDRO', 'MAN', 'GAGNOA', 'DIVO',
  'ABENGOUROU', 'ANYAMA', 'BINGERVILLE', 'SOUBRE', 'SEGUELA', 'ODIENNE', 'BONDOUKOU', 'AGBOVILLE', 'GRAND-BASSAM',
  'GRAND BASSAM', 'DABOU', 'YOPOUGON', 'ABOBO', 'COCODY', 'ADJAME', 'PLATEAU', 'KOUMASSI', 'MARCORY', 'TREICHVILLE',
  'PORT-BOUET', 'ATTECOUBE', 'SONGON', 'OUAGADOUGOU', 'BOBO-DIOULASSO', 'KOUDOUGOU', 'BAMAKO', 'CONAKRY',
  'NIAMEY', 'DAKAR', 'ACCRA', 'LOME', 'COTONOU', 'PARIS', 'M', 'F',
  'BURKINA FASO', 'BURKINA', 'MALI', 'GUINEE', 'NIGER', 'SENEGAL', 'GHANA', 'TOGO', 'BENIN', 'NIGERIA', 'LIBERIA',
  'MAURITANIE', 'FRANCE', 'UTOPIE',
]);

/** Lieux de la liste ci-dessus qui sont aussi des prénoms : « MARIE FRANCE ». */
const NON_NOMS_PRENOMS = new Set(['FRANCE']);

/** Particules de patronyme gouro (TIÉ BI, ZAMBLE LOU) : le 2e mot appartient au nom. */
const PARTICULES_NOM = new Set(['BI', 'LOU']);

/**
 * Libellé du lieu de naissance, y compris déformé par l'OCR (« L1EU », « LIEV »)
 * ou en anglais (« Place of birth »). C'est une butée, et surtout un témoin :
 * voir `lieuOrphelin` dans l'extraction.
 */
function estLibelleLieu(k: string): boolean {
  return k === 'PLACE' || /^L[IL]E[UV]$/.test(k);
}

/**
 * Libellé de la date ou du lieu de naissance, même déformé. Sur toutes les
 * mises en page connues, le nom et les prénoms viennent AVANT : voir
 * `premiereLigneNaissance` dans l'extraction.
 */
function estLibelleNaissance(k: string): boolean {
  return k === 'DATE' || k === 'BIRTH' || estLibelleLieu(k) || (k.length >= 7 && distance(k, 'NAISSANCE', 2) <= 2);
}

/**
 * Un mot qui arrête la lecture d'un nom : butée de la liste, ou libellé de
 * naissance même déformé (« LIEV », « NAl55ANCE »), qu'aucun nom ne côtoie.
 */
function estButee(cle: string, brut: string): boolean {
  return BUTEES.has(cle) || BUTEES.has(sansAccents(brut).toUpperCase()) || estLibelleNaissance(cle);
}

// ---------------------------------------------------------------------------
// Découpage en lignes et en mots
// ---------------------------------------------------------------------------

/** Une ligne de texte découpée en mots, avec la clé de libellé de chaque mot calculée une fois. */
interface Ligne {
  mots: string[];
  cles: string[];
}

function preparerLigne(l: string): string {
  return l
    .replace(APOSTROPHES, "'")
    .replace(/(?<=[A-Za-zÀ-ÿ])\|(?=[A-Za-zÀ-ÿ]|$)|(?<=^|\s)\|(?=[A-Za-zÀ-ÿ])/g, 'I')
    .replace(/\.{2,}|…/g, ' ')
    .replace(/[:;|_=~«»"“”/\\\[\]{}<>©®•·]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decouper(ligne: string): Ligne {
  const mots: string[] = [];
  for (const brut of ligne.split(' ')) {
    if (!brut) continue;
    // « NomKOUASSI », « Prénoms:ADJOUA » : libellé collé à sa valeur.
    const colle = /^(Noms?|Pr[ée]noms?(?:\(s\))?|Surname)([A-ZÀ-Ý'][A-ZÀ-Ý'-]+)$/.exec(brut);
    if (colle) mots.push(colle[1], colle[2]);
    else mots.push(brut);
  }
  return { mots, cles: mots.map(cleLibelle) };
}

/** Jour ou mois (1 ou 2 chiffres), année (2 ou 4), et la date collée « 01.01.1990 ». */
const JOUR_OU_MOIS = /^[0-9]{1,2}$/;
const ANNEE = /^(?:[0-9]{2}|[0-9]{4})$/;
const DATE_COLLEE = /^[0-9]{1,2}[.-][0-9]{1,2}[.-](?:[0-9]{2}|[0-9]{4})$/;

/**
 * La ligne porte-t-elle une date (« 14/09/2004 », « 01.01.1990 », « 01 01 1985 »),
 * avec ou sans libellé ? Les barres obliques sont déjà des espaces à ce stade
 * (voir `preparerLigne`) : une date est soit un mot, soit trois mots qui se
 * suivent. Un O ou un I lu dans un mot qui contient déjà un chiffre est
 * rétabli (« 2OO4 »). Une date lue au-dessus d'un libellé resté seul trahit
 * une lecture dans le désordre : voir `premiereLigneNaissance` dans
 * l'extraction. Mots testés un par un, expressions ancrées : coût linéaire.
 */
function porteUneDate(l: Ligne): boolean {
  const chiffres = l.mots.map((m) => (/[0-9]/.test(m) ? m.replace(/[OoQD]/g, '0').replace(/[Il|]/g, '1') : m));
  for (let j = 0; j < chiffres.length; j++) {
    if (DATE_COLLEE.test(chiffres[j])) return true;
    if (
      j + 2 < chiffres.length &&
      JOUR_OU_MOIS.test(chiffres[j]) && JOUR_OU_MOIS.test(chiffres[j + 1]) && ANNEE.test(chiffres[j + 2])
    ) {
      return true;
    }
  }
  return false;
}

type Libelle = { genre: 'nom' | 'prenom' | 'combine'; fin: number };

/**
 * Un libellé commence-t-il au mot j ? `fin` est l'indice du premier mot de la
 * valeur, ou -1 pour le libellé d'un AUTRE nom (père, mère, nom d'usage).
 */
function libelleEn(l: Ligne, j: number): Libelle | null {
  const k = (i: number) => (i < l.cles.length ? l.cles[i] : '');
  const k0 = k(j);
  // « Nom et prénoms », « Noms & Prénoms », « Nom Prénoms », « Nom - Prénoms »
  if (estNom(k0)) {
    let i = j + 1;
    if (k(i) === '-') i++;
    const et = estEt(k(i));
    if (et) i++;
    if (k(i) === '-') i++;
    const ki = k(i);
    // « Nom et Préno » / « Nom et Prén » : libellé tronqué par l'OCR, ou « Nom et » en fin de ligne
    const prenomTronque =
      et && ki.length >= 3 && ki.length <= 6 && ki.startsWith('PR') && distance(ki, 'PRENOMS'.slice(0, ki.length), 1) <= 1;
    if (et && i >= l.cles.length) return { genre: 'combine', fin: i };
    if (estPrenom(ki) || prenomTronque) {
      const fin = i + 1;
      // « Nom et prénoms du père » → pas le titulaire
      if (APRES_NOM_EXCLUS.has(k(fin))) return { genre: 'combine', fin: -1 };
      return { genre: 'combine', fin };
    }
    if (estSurname(k(j + 1))) return { genre: 'nom', fin: j + 2 }; // « Nom / Surname »
    if (APRES_NOM_EXCLUS.has(k(j + 1))) return { genre: 'nom', fin: -1 };
    return { genre: 'nom', fin: j + 1 };
  }
  if (estSurname(k0)) {
    if (estNom(k(j + 1))) return { genre: 'nom', fin: j + 2 };
    return { genre: 'nom', fin: j + 1 };
  }
  if (estPrenom(k0)) {
    if (distance(k(j + 1), 'GIVEN', 1) <= 1) return { genre: 'prenom', fin: j + 3 }; // « Prénoms / Given names »
    return { genre: 'prenom', fin: j + 1 };
  }
  if (distance(k0, 'GIVEN', 1) <= 1 && distance(k(j + 1).replace(/S$/, ''), 'NAME', 1) <= 1) {
    if (estPrenom(k(j + 2))) return { genre: 'prenom', fin: j + 3 };
    return { genre: 'prenom', fin: j + 2 };
  }
  if ((k0 === 'FIRST' || k0 === 'FORE') && distance(k(j + 1).replace(/S$/, ''), 'NAME', 1) <= 1) {
    return { genre: 'prenom', fin: j + 2 };
  }
  if (k0 === 'FORENAMES') return { genre: 'prenom', fin: j + 1 };
  return null;
}

const LETTRE_OU_CHIFFRE = /[A-Za-zÀ-ÿ0-9']/;

/**
 * Nettoie UN mot de valeur. Rend :
 *  - une chaîne (mot de nom plausible) ;
 *  - '' (bruit à ignorer) ;
 *  - null (BUTÉE : chiffre réel, date, numéro… la lecture s'arrête ici).
 *
 * Les signes en bord de mot sont retirés par des boucles plutôt que par une
 * expression régulière ancrée en fin de chaîne, dont le coût devient
 * quadratique sur une longue suite de signes.
 */
function motDeNom(brut: string): string | null | '' {
  let debut = 0;
  let fin = brut.length;
  while (debut < fin && !LETTRE_OU_CHIFFRE.test(brut[debut])) debut++;
  while (fin > debut && !LETTRE_OU_CHIFFRE.test(brut[fin - 1])) fin--;
  let t = brut.slice(debut, fin);
  if (!t) return '';
  if (t.length > LONGUEUR_MAX_MOT) return null;
  const lettres = (t.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  const chiffres = (t.match(/[0-9]/g) || []).length;
  if (chiffres > 0) {
    // Confusion de l'OCR tolérée seulement si le mot reste massivement alphabétique.
    if (chiffres <= 2 && lettres >= 3 && lettres / (lettres + chiffres) >= 0.6 && !/\d{2}/.test(t)) {
      t = t.replace(/0/g, 'O').replace(/1/g, 'I').replace(/5/g, 'S').replace(/8/g, 'B').replace(/6/g, 'G').replace(/4/g, 'A');
    } else {
      return null;
    }
  }
  // « KOUASSl » : l minuscule isolé dans un mot en capitales → I
  if (/[A-Z]{2}/.test(t)) t = t.replace(/l/g, 'I');
  t = t.replace(/[^A-Za-zÀ-ÿ'-]/g, '');
  if (!/[A-Za-zÀ-ÿ]/.test(t)) return '';
  return t;
}

/** Lit la valeur d'un nom à partir du mot `debut`. Ne dépasse jamais une butée ni un autre libellé. */
function lireValeur(l: Ligne, debut: number): string[] {
  const mots: string[] = [];
  for (let i = debut; i < l.mots.length; i++) {
    if (libelleEn(l, i)) break;
    const brut = l.mots[i];
    if (estButee(l.cles[i], brut)) break;
    // « N° », « Né(e) » : fin de la valeur
    if (/^N[°o]$/i.test(brut) || /^n[ée]\(?e?\)?$/i.test(brut)) break;
    const m = motDeNom(brut);
    if (m === null) break;
    if (m === '') continue;
    mots.push(m);
  }
  // Rétablit « N GUESSAN » en « N'GUESSAN » ; retire les lettres isolées (sexe M/F, bruit).
  const res: string[] = [];
  for (let i = 0; i < mots.length; i++) {
    const m = mots[i];
    if (/^N'?$/i.test(m) && i + 1 < mots.length && mots[i + 1].length >= 2) {
      res.push(`N'${mots[i + 1].replace(/^'/, '')}`);
      i++;
      continue;
    }
    if (m.replace(/['-]/g, '').length < 2) continue;
    res.push(m);
  }
  return res;
}

function valeurAcceptable(mots: string[], max: number): boolean {
  if (!mots.length || mots.length > max) return false;
  const v = sansAccents(mots.join(' ')).toUpperCase();
  if (NON_NOMS.has(v)) return false;
  // Un seul lieu connu dans la valeur suffit à la refuser : c'est un lieu de
  // naissance fusionné avec un reste de libellé (« LIEV DE NAISSANC ABIDJAN »),
  // pas un nom.
  if (mots.some((m) => {
    const k = sansAccents(m).toUpperCase();
    return NON_NOMS.has(k) && !NON_NOMS_PRENOMS.has(k);
  })) return false;
  // Au moins un mot de 3 lettres, et une voyelle dans chaque mot long
  if (!mots.some((m) => m.replace(/['-]/g, '').length >= 3)) return false;
  if (mots.some((m) => m.length >= 4 && !/[AEIOUYÀ-ÿ]/i.test(sansAccents(m)))) return false;
  return true;
}

/** Ligne de bruit (guilloches, traits) : ni lettres ni chiffres. Une ligne de chiffres n'est PAS du bruit : c'est une butée. */
function ligneDeBruit(l: Ligne): boolean {
  const s = l.mots.join('');
  const lettres = s.match(/[A-Za-zÀ-ÿ]/g)?.length ?? 0;
  const chiffres = s.match(/[0-9]/g)?.length ?? 0;
  return lettres < 2 && chiffres < 2;
}

function formater(mots: string[]): string {
  return mots.join(' ').toLocaleUpperCase('fr-FR').replace(/\s+/g, ' ').trim();
}

const contientUnLibelle = (l: Ligne) => l.mots.some((_, j) => libelleEn(l, j) !== null);

// ---------------------------------------------------------------------------
// Extraction du nom et des prénoms
// ---------------------------------------------------------------------------

const MAX_MOTS_NOM = 4;
const MAX_MOTS_PRENOM = 5;
const MAX_MOTS_COMBINE = 7;

function decouperCombine(mots: string[]): { nom: string[]; prenom?: string[] } {
  if (mots.length < 2) return { nom: mots };
  let k = 1;
  if (mots.length >= 3 && PARTICULES_NOM.has(sansAccents(mots[1]).toUpperCase())) k = 2;
  return { nom: mots.slice(0, k), prenom: mots.slice(k) };
}

/** Ligne de MRZ : jamais lue ici (voir mrz.ts), et ses chevrons perturberaient les libellés. */
function estLigneMrz(l: string): boolean {
  const s = l.replace(/\s/g, '');
  return s.length >= 20 && /<{2,}/.test(s) && (s.match(/[A-Z0-9<]/g)?.length ?? 0) / s.length > 0.85;
}

type Valeur = { mots: string[]; ligne: number };

function extraireNomPrenom(texte: string, typePiece?: TypePiece): Omit<LectureRecto, 'typePiece'> | null {
  if (!texte.trim()) return null;
  const lignes = texte
    .split(/\r?\n/)
    .filter((l) => !estLigneMrz(l))
    .map(preparerLigne)
    .filter(Boolean)
    .map(decouper);
  const bruit = lignes.map(ligneDeBruit);

  let nom: string[] | undefined;
  let prenom: string[] | undefined;
  let combine: string[] | undefined;
  let libelleNomVu = false;
  const libellesSeuls: { genre: 'nom' | 'prenom'; ligne: number; apresUnNom: boolean }[] = [];

  // Les deux recherches ci-dessous ne dépendent que du numéro de ligne : elles
  // sont mémorisées, ce qui garde l'ensemble linéaire même quand beaucoup de
  // libellés regardent la même ligne.
  const memoSous: (Valeur | null | undefined)[] = [];
  const memoPur: (string[] | null | undefined)[] = [];

  /** Première ligne « valeur » sous la ligne i (saute au plus 2 lignes de bruit). */
  const valeurSous = (i: number): Valeur | null => {
    const deja = memoSous[i];
    if (deja !== undefined) return deja;
    let resultat: Valeur | null = null;
    let sautes = 0;
    for (let n = i + 1; n < lignes.length && sautes <= 2; n++) {
      if (bruit[n]) {
        sautes++;
        continue;
      }
      const l = lignes[n];
      if (!contientUnLibelle(l) && !estButee(l.cles[0], l.mots[0])) {
        const mots = lireValeur(l, 0);
        // la ligne doit être « pure » : si elle contenait autre chose qu'un nom, on s'abstient
        if (mots.length) resultat = { mots, ligne: n };
      }
      break;
    }
    memoSous[i] = resultat;
    return resultat;
  };

  /** Ligne suivante qui n'est pas du bruit (au plus 2 lignes de bruit sautées), ou -1. */
  const lignePleineApres = (i: number): number => {
    for (let n = i + 1, sautes = 0; n < lignes.length && sautes <= 2; n++) {
      if (!bruit[n]) return n;
      sautes++;
    }
    return -1;
  };

  /** Un vrai mot de nom (ou de lieu) : au moins 3 lettres, ni butée ni chiffre inexplicable. */
  const motDeNomPlein = (l: Ligne, r: number) => {
    if (estButee(l.cles[r], l.mots[r])) return false;
    const m = motDeNom(l.mots[r]);
    return typeof m === 'string' && m.replace(/['-]/g, '').length >= 3;
  };

  const memoOrphelin: (boolean | undefined)[] = [];
  /**
   * La ligne n porte-t-elle un libellé de lieu de naissance resté SANS valeur,
   * ni à sa suite, ni sur la ligne d'après ?
   *
   * C'est la signature d'une lecture dans le désordre (image penchée, lignes
   * fusionnées ou inversées) : le lieu a quitté sa place et s'est retrouvé plus
   * haut, souvent juste sous le libellé des prénoms. Des villes absentes de la
   * liste NON_NOMS sortaient ainsi comme prénoms : seule la structure du texte
   * pouvait les trahir (voir les régressions dans recto.test.ts).
   */
  const lieuOrphelin = (n: number): boolean => {
    const deja = memoOrphelin[n];
    if (deja !== undefined) return deja;
    const l = lignes[n];
    const j = l.cles.findIndex(estLibelleLieu);
    let orphelin = false;
    if (j >= 0) {
      // Une valeur de lieu plausible : un vrai mot, ni butée ni reste du libellé (« de », « of »
      // ont moins de 3 lettres, « naissance » et « birth » sont des butées).
      let valeur = false;
      for (let r = j + 1; !valeur && r < l.mots.length; r++) valeur = motDeNomPlein(l, r);
      if (!valeur) {
        // Sur la ligne d'après, n'importe où : « Date et lieu de naissance » est suivi
        // de « 01/01/1990 TIASSALÉ », la date avant le lieu.
        const suivante = lignePleineApres(n);
        const s = suivante >= 0 ? lignes[suivante] : null;
        valeur = s !== null && !contientUnLibelle(s) && s.mots.some((_, r) => motDeNomPlein(s, r));
      }
      orphelin = !valeur;
    }
    memoOrphelin[n] = orphelin;
    return orphelin;
  };
  /**
   * Valeur lue SOUS un libellé, mais voisine d'un lieu de naissance orphelin
   * (sur sa propre ligne ou sur la suivante) : c'est probablement ce lieu.
   */
  const suspecte = (v: Valeur): boolean => {
    if (lieuOrphelin(v.ligne)) return true;
    const suivante = lignePleineApres(v.ligne);
    return suivante >= 0 && lieuOrphelin(suivante);
  };

  const bruitSeul = (mot: string) => {
    const m = motDeNom(mot);
    return m === '' || (typeof m === 'string' && m.replace(/['-]/g, '').length < 2);
  };

  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    let libelleDejaVuSurLaLigne = false;
    for (let j = 0; j < l.mots.length; j++) {
      const lib = libelleEn(l, j);
      if (!lib) continue;
      if (lib.fin < 0) {
        // libellé d'un AUTRE nom (père, mère, nom d'usage…) : on abandonne la ligne
        break;
      }
      if (lib.genre !== 'prenom') libelleNomVu = true;
      let mots = lireValeur(l, lib.fin);
      if (!mots.length && lib.genre !== 'combine') {
        // Libellé seul en fin de ligne, au bruit près : sa valeur est peut-être dessous.
        let seul = !(lib.fin < l.mots.length && libelleEn(l, lib.fin) !== null);
        for (let r = lib.fin; seul && r < l.mots.length; r++) seul = bruitSeul(l.mots[r]);
        // Précédé d'un nom qui n'est la valeur d'aucun libellé (« KONAN Prénoms ») :
        // l'OCR a fusionné la ligne du nom avec celle du libellé. Voir plus bas.
        let apresUnNom = false;
        for (let r = 0; !apresUnNom && !libelleDejaVuSurLaLigne && r < j; r++) apresUnNom = motDeNomPlein(l, r);
        if (seul) libellesSeuls.push({ genre: lib.genre, ligne: i, apresUnNom });
      }
      libelleDejaVuSurLaLigne = true;
      if (!mots.length && lib.genre === 'combine') {
        const sous = valeurSous(i);
        if (sous && !suspecte(sous)) mots = sous.mots;
      }
      if (lib.genre === 'nom' && !nom && valeurAcceptable(mots, MAX_MOTS_NOM)) nom = mots;
      else if (lib.genre === 'prenom' && !prenom && valeurAcceptable(mots, MAX_MOTS_PRENOM)) prenom = mots;
      else if (lib.genre === 'combine' && !combine && valeurAcceptable(mots, MAX_MOTS_COMBINE)) combine = mots;
      j = Math.max(j, lib.fin - 1);
    }
  }

  /** La ligne n est-elle un nom « pur » : ni libellé, ni butée, ni chiffre ? */
  const nomPur = (n: number): string[] | null => {
    const deja = memoPur[n];
    if (deja !== undefined) return deja;
    let resultat: string[] | null = null;
    const l = lignes[n];
    if (l && !bruit[n] && !contientUnLibelle(l) && l.mots.every((x, j) => !estButee(l.cles[j], x) && motDeNom(x) !== null)) {
      const mots = lireValeur(l, 0);
      if (valeurAcceptable(mots, MAX_MOTS_PRENOM)) resultat = mots;
    }
    memoPur[n] = resultat;
    return resultat;
  };
  /** Lignes de nom pur contiguës juste AU-DESSUS de la ligne i. */
  const nomsPursAuDessus = (i: number): number[] => {
    const res: number[] = [];
    for (let n = i - 1; n >= 0; n--) {
      if (bruit[n]) continue;
      if (!nomPur(n)) break;
      res.push(n);
    }
    return res;
  };
  // Valeur suivie d'une AUTRE ligne de nom pur : colonnes avec libellé perdu, ou nom coupé en deux.
  const ambigu = (v: Valeur) => valeurSous(v.ligne) !== null;
  // Ordre de lecture : le nom et les prénoms précèdent la date et le lieu de
  // naissance. Un libellé seul lu APRÈS l'un d'eux signale une lecture dans le
  // désordre (lignes inversées, image penchée) : la ligne sous ce libellé n'est
  // plus sûre, c'était, mesuré, le lieu de naissance. Les libellés suivis de leur
  // valeur sur la même ligne ne sont pas concernés.
  // La date compte même sans son libellé : l'OCR perd souvent le libellé, en
  // petit corps, et garde la date. « Nom : KONÉ / 14/09/2004 / Prénoms /
  // DIMBOKRO » rendait DIMBOKRO comme prénoms (relevé en revue).
  const premiereLigneNaissance = lignes.findIndex((l) => l.cles.some(estLibelleNaissance) || porteUneDate(l));
  const avantLaNaissance = (x: { ligne: number }) => premiereLigneNaissance < 0 || x.ligne < premiereLigneNaissance;
  const seulNom = libellesSeuls.find((x) => x.genre === 'nom' && avantLaNaissance(x));
  const seulPrenom = libellesSeuls.find((x) => x.genre === 'prenom' && avantLaNaissance(x));
  let decoupage: Decoupage = 'libelles';
  if (seulNom && seulPrenom && !nom && !prenom && seulPrenom.ligne - seulNom.ligne === 1) {
    // « Nom \n Prénoms \n KOUASSI \n ADJOUA MARIE » : colonne de libellés puis colonne de valeurs
    const v1 = valeurSous(seulPrenom.ligne);
    const v2 = v1 ? valeurSous(v1.ligne) : null;
    if (
      // En colonnes, la ligne du nom doit être un nom pur : « ISSOUF Date de naissance »
      // annonce une date, pas la colonne des prénoms. La ligne des prénoms, elle, peut
      // avoir été fusionnée avec le libellé suivant.
      !seulPrenom.apresUnNom && v1 && v2 && nomPur(v1.ligne) &&
      !ambigu(v2) && !suspecte(v1) && !suspecte(v2) &&
      nomsPursAuDessus(seulNom.ligne).length === 0 &&
      valeurAcceptable(v1.mots, MAX_MOTS_NOM) && valeurAcceptable(v2.mots, MAX_MOTS_PRENOM)
    ) {
      return sortie(v1.mots, v2.mots, 'colonnes');
    }
  } else {
    const consommees = new Set<number>();
    const sansLibelleNom = !seulNom && !libelleNomVu;
    for (const seul of [seulNom, seulPrenom]) {
      if (!seul || (seul.genre === 'nom' ? nom : prenom)) continue;
      // Lignes de noms AU-DESSUS du libellé, valeur d'aucun autre libellé : l'OCR a rendu la valeur
      // AVANT son libellé (image penchée, lecture « éparse »). Ce qui suit le libellé peut alors être
      // le lieu de naissance → abstention. Seule exception : libellé « Nom » totalement absent et UNE
      // seule ligne au-dessus de « Prénoms » (cas empilé où « Nom » a été perdu).
      const dessus: number[] = [];
      for (const n of nomsPursAuDessus(seul.ligne)) {
        if (consommees.has(n)) break;
        dessus.push(n);
      }
      if (dessus.length >= 2) continue;
      if (dessus.length === 1 && !(seul.genre === 'prenom' && sansLibelleNom)) continue;
      const v = valeurSous(seul.ligne);
      if (!v || ambigu(v) || suspecte(v)) continue;
      // « KONAN Prénoms » alors qu'un nom a déjà été lu ailleurs : deux patronymes se
      // contredisent, l'ordre de lecture est brouillé, et ce qui suit le libellé des
      // prénoms n'est plus sûr (c'était, mesuré, un lieu de naissance).
      if (seul.genre === 'prenom' && seul.apresUnNom && nom) continue;
      if (seul.genre === 'nom' && seulPrenom && v.ligne >= seulPrenom.ligne) continue;
      if (seul.genre === 'nom' && valeurAcceptable(v.mots, MAX_MOTS_NOM)) {
        nom = v.mots;
        consommees.add(v.ligne);
      }
      if (seul.genre === 'prenom' && valeurAcceptable(v.mots, MAX_MOTS_PRENOM)) {
        prenom = v.mots;
        consommees.add(v.ligne);
      }
      // Libellé « Nom » perdu par l'OCR (3 lettres, petit corps) : si UNE seule ligne de nom pur,
      // entièrement en capitales, précède « Prénoms », c'est le nom dans une mise en page empilée.
      if (seul.genre === 'prenom' && prenom && !nom && sansLibelleNom && dessus.length === 1) {
        const mots = nomPur(dessus[0]);
        const brut = lignes[dessus[0]].mots.join(' ');
        if (mots && brut === brut.toLocaleUpperCase('fr-FR') && valeurAcceptable(mots, MAX_MOTS_NOM)) {
          nom = mots;
          decoupage = 'position';
        }
      }
    }
  }

  if (nom || prenom) return sortie(nom, prenom, decoupage);

  if (combine) {
    const d = decouperCombine(combine);
    return sortie(d.nom, d.prenom, 'devine');
  }

  // Permis au format ISO 18013 : « 1. NOM » « 2. PRÉNOMS » (sans libellé).
  if (typePiece === 'Permis de conduire') {
    let n1: string[] | undefined;
    let n2: string[] | undefined;
    for (const l of lignes) {
      const tete = l.mots.join(' ');
      const m1 = /^([1lI|])\s?[.,]\s?(.*)$/.exec(tete);
      const m2 = /^(2)\s?[.,]\s?(.*)$/.exec(tete);
      if (m1 && !n1) {
        const mots = lireValeur(decouper(m1[2]), 0);
        if (valeurAcceptable(mots, MAX_MOTS_NOM)) n1 = mots;
      } else if (m2 && !n2) {
        const mots = lireValeur(decouper(m2[2]), 0);
        if (valeurAcceptable(mots, MAX_MOTS_PRENOM)) n2 = mots;
      }
    }
    if (n1 || n2) return sortie(n1, n2, 'numerotation');
  }
  return null;
}

function sortie(nom: string[] | undefined, prenom: string[] | undefined, decoupage: Decoupage) {
  const r: Omit<LectureRecto, 'typePiece'> = { decoupage };
  const n = nom && formater(nom);
  const p = prenom && formater(prenom);
  // Dernier filet : rien qui contienne un chiffre ne sort.
  if (n && !/\d/.test(n)) r.nom = n;
  if (p && !/\d/.test(p)) r.prenom = p;
  return r.nom || r.prenom ? r : null;
}

// ---------------------------------------------------------------------------
// Détection du type de pièce
// ---------------------------------------------------------------------------

function motsCles(texte: string): string[] {
  return sansAccents(texte.replace(APOSTROPHES, "'"))
    .toUpperCase()
    .replace(/0/g, 'O')
    .replace(/[1|!]/g, 'I')
    .replace(/5/g, 'S')
    .replace(/[^A-Z&]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/**
 * Recherche approchée d'une expression (en mots) dans une suite de mots :
 * environ une erreur tolérée pour 7 caractères, pour que « PERM1S DE C0NDUIRE »
 * passe. `cumul` donne la longueur cumulée des mots : une fenêtre dont la
 * longueur ne peut pas convenir est écartée sans être construite.
 */
function contientApprox(mots: readonly string[], cumul: readonly number[], expression: string): boolean {
  let nombre = 1;
  for (let c = expression.indexOf(' '); c !== -1; c = expression.indexOf(' ', c + 1)) nombre++;
  const tolerance = Math.floor(expression.length / 7);
  for (let taille = Math.max(1, nombre - 1); taille <= nombre + 1; taille++) {
    for (let i = 0; i + taille <= mots.length; i++) {
      const longueur = cumul[i + taille] - cumul[i] + taille - 1;
      if (Math.abs(longueur - expression.length) > tolerance) continue;
      let fenetre = mots[i];
      for (let w = 1; w < taille; w++) fenetre += ` ${mots[i + w]}`;
      if (distance(fenetre, expression, tolerance) <= tolerance) return true;
    }
  }
  return false;
}

export type FamilleMrz = 'passeport' | 'carte-civ' | 'carte-autre';

/**
 * Repère une ligne de MRZ et ne renvoie que sa FAMILLE : aucun champ n'est lu.
 * Sert seulement à typer un recto sans libellé lisible ; la lecture de la MRZ
 * elle-même est dans mrz.ts, avec la même règle : « CNI » seulement pour une
 * carte d'identité (code I) émise par la Côte d'Ivoire.
 *
 * Exposée pour les tests ; le Web Worker n'appelle que `lireRecto`.
 */
export function familleMrz(texte: string): FamilleMrz | undefined {
  if (!dansLesBornes(texte)) return undefined;
  for (const l of texte.split(/\r?\n/)) {
    const s = l.replace(/\s/g, '').toUpperCase().replace(/[«‹]/g, '<');
    if (s.length < 25 || !/<</.test(s)) continue;
    if ((s.match(/[A-Z0-9<]/g)?.length ?? 0) / s.length < 0.9) continue;
    const etat = s.slice(2, 5).replace(/1/g, 'I').replace(/0/g, 'O');
    // TD3 (passeport) : 44 caractères, ligne 1 = P + type + État + nom.
    if (s[0] === 'P' && s.length >= 40) return 'passeport';
    // TD1 (carte) : 30 caractères, ligne 1 = I/A/C + type + État + numéro (donc des chiffres).
    // Une ligne de NOM (« COULIBALY<<AWA ») n'a pas de chiffres : elle est ignorée.
    if ((s[0] === 'I' || s[0] === 'A' || s[0] === 'C') && s.length <= 38 && /\d/.test(s.slice(5))) {
      return s[0] === 'I' && etat[0] === 'C' && distance(etat, 'CIV', 1) <= 1 ? 'carte-civ' : 'carte-autre';
    }
  }
  return undefined;
}

/**
 * Type de pièce d'après les en-têtes du recto, du plus spécifique au plus
 * général : « Profession : ÉTUDIANT » ne doit pas faire une carte étudiante,
 * ni « Autorité : section consulaire » une carte consulaire d'un passeport.
 *
 * Exposée pour les tests ; le Web Worker n'appelle que `lireRecto`.
 */
export function detecterTypePiece(texte: string): TypePiece | undefined {
  if (!dansLesBornes(texte) || !texte.trim()) return undefined;
  const mots = motsCles(texte);
  const cumul = [0];
  for (const mot of mots) cumul.push(cumul[cumul.length - 1] + mot.length);
  const a = (expression: string) => contientApprox(mots, cumul, expression);

  if (a('CARTE CONSULAIRE') || a('CARTE D IDENTITE CONSULAIRE') || a('CONSULAR CARD') || a('CONSULAR IDENTITY CARD')) {
    return 'Carte consulaire';
  }
  if (a('PASSEPORT') || a('PASSPORT')) return 'Passeport';
  if (a('CONSULAIRE')) return 'Carte consulaire';
  if (a('PERMIS DE CONDUIRE') || a('DRIVING LICENCE') || a('DRIVING LICENSE') || a('DRIVER LICENSE')) {
    return 'Permis de conduire';
  }
  if (
    a('CARTE D ETUDIANT') || a('CARTE ETUDIANT') || a('CARTE D ETUDIANTE') || a('CARTE ETUDIANTE') ||
    a('STUDENT CARD') || a('CARTE UNIVERSITAIRE')
  ) {
    return 'Carte étudiante';
  }
  if (a('CARTE NATIONALE D IDENTITE') || a('NATIONAL IDENTITY CARD')) return 'CNI';
  if (a('UNIVERSITE') && (a('MATRICULE') || a('UFR') || a('ANNEE UNIVERSITAIRE') || a('ANNEE ACADEMIQUE'))) {
    return 'Carte étudiante';
  }
  const famille = familleMrz(texte);
  if (famille === 'passeport') return 'Passeport';
  if (famille === 'carte-civ') return 'CNI';
  return undefined;
}

/**
 * Lit le type, le nom et les prénoms sur le texte d'un recto.
 *
 * Rend `{ typePiece?, nom?, prenom?, decoupage? }`, ou `null` si rien
 * d'exploitable, si le texte dépasse les bornes, ou si ce n'est pas une
 * chaîne. Ne lève jamais d'exception.
 */
export function lireRecto(texte: string): LectureRecto | null {
  if (!dansLesBornes(texte)) return null;
  try {
    const typePiece = detecterTypePiece(texte);
    const lu = extraireNomPrenom(texte, typePiece);
    if (!lu && !typePiece) return null;
    return { ...(typePiece ? { typePiece } : {}), ...(lu ?? {}) };
  } catch {
    // Volontairement muet : rien de ce qui a été lu ne doit remonter.
    return null;
  }
}
