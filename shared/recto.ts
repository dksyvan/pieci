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
 *
 * Retour de terrain (16/09/2026, vraie CNI, iPhone et Android) : les prénoms
 * se remplissaient, jamais le nom (court) ni le type. Corrigé sans le texte
 * réellement lu, en rendant la lecture tolérante aux défauts plausibles (voir
 * la batterie « retour de terrain » de recto.test.ts) : intitulé reconnu très
 * abîmé, coupé ou collé (`typeParIntituleTolerant`), lignes d'en-tête abîmées
 * et parasites de la photo qui ne passent plus pour des noms, nom de deux
 * lettres, libellés « Nam », « MOM », « NOM.KOFI », « Nom de famille », et un
 * repli qui prend le nom au-dessus des prénoms (`nomParPosition`, découpage
 * `position`). Sur le banc de bruit (31 graines, 446 400 textes) : paires
 * utilisables de 76,8 à 81,5 %, noms justes de 82,5 à 87,4 %, noms faux de 3,0
 * à 2,6 %, et toujours 0 fuite et 0 type faux.
 *
 * Revue du même jour : ce repli et la recherche tolérante du type prenaient
 * trop. Le repli rendait la valeur d'un autre nom (« Nom d'usage », « Épouse »,
 * « Père »), des bouts du bandeau (« CART », « TETE »), la devise, un libellé
 * « Nom » abîmé collé au nom (« NUM KOFI »), un numéro ou une date aux chiffres
 * lus en lettres, et le lieu de naissance remonté au-dessus des prénoms ; le
 * type « CNI » sortait pour une carte professionnelle ou scolaire, « Carte
 * consulaire » pour une carte d'identité scolaire. Filtres ajoutés (voir
 * `nomEnCapitales`, `annonceUnAutreChamp`, `lieuPeutEtreRemonte`,
 * `nationalEnIntitule`, `identiteEnIntitule`, `noyaux`) ; sur le banc de bruit,
 * graine fixe, les paires utilisables des neuf mises en page d'origine bougent
 * d'au plus deux textes sur 400, et un gabarit « lieu remonté » passe de 171 à
 * 318 fuites sur 400 à 0.
 *
 * Second passage (17/09/2026), sur une batterie combinatoire de défauts autour
 * d'un nom court (mise en page × libellé abîmé × parasite collé × ligne de
 * restes insérée, 179 784 textes) : les prénoms sortaient dans 83,8 % des
 * textes, et parmi eux le nom manquait ou était faux dans 20,5 % (64,4 % pour la
 * version du terrain), surtout à cause de restes courts en capitales lus
 * entre deux lignes (« IE », « BE » : `ligneCourte`), d'un parasite à capitale
 * (« Wi KOFI » : `parasiteColle`), de deux capitales sans syllabe collées au
 * nom (« EE KOFI ») et du libellé d'une autre colonne sur la ligne de « Nom »
 * (« Nom  N° de la carte » : `autreColonneSure`, `traceColonne`). Après : prénoms
 * dans 100 % des textes, nom manquant 2,2 %, faux 0,2 %, 0 fuite.
 * Sur le banc de bruit de recto.test.ts (31 graines, 545 600 textes, gabarit
 * « deux colonnes » ajouté) : paires utilisables des mises en page CNI qui ont
 * un nom de 59,0 à 72,8 % (54,1 % pour la version du terrain), noms justes de
 * 64,8 à 79,6 %, noms faux de 2,6 à 3,0 % (3,3 %), et toujours 0 fuite et
 * 0 type faux.
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

/**
 * « NOM », « N0M », « NOMS », « NOIVI », et aussi « NAM » (o lu a), « MOM »,
 * « NON », « HOM » (N et M confondus) et « INOM » (barre du cadre collée
 * devant, rendue I par `preparerLigne`). Sans reconnaître ces formes, le
 * libellé déformé passait dans la valeur (« MOM KOFFI ») dès qu'on lisait le
 * nom par sa position.
 */
const LIBELLE_NOM = /^[IL]?(?:N[OQDA]|[MH][OQD])[MN]S?$/;
function estNom(k: string): boolean {
  return LIBELLE_NOM.test(k) || LIBELLE_NOM.test(varianteM(k));
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
  if (k.length < 6) return false;
  // « SURNARNE » : m lu rn, deux erreurs au compte de la distance. « SUMAME » : rn lu m.
  return (
    distance(k, 'SURNAME', 1) <= 1 || (k.startsWith('SUR') && distance(k, 'SURNAME', 2) <= 2) ||
    distance(varianteM(k), 'SUMAME', 1) <= 1
  );
}
/** « GIVENNAMES » : « Given names » dont l'OCR a perdu l'espace. */
function estGivenNamesColle(k: string): boolean {
  return k.length >= 9 && k.length <= 11 && distance(k, 'GIVENNAMES', 1) <= 1;
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
  // autres mentions d'une carte, jamais le nom de son titulaire
  'TITULAIRE', 'HOLDER', 'PHOTO', 'GENDER', 'FEMININ', 'MASCULIN',
]);

/**
 * Mots qui annoncent le nom d'une AUTRE personne, ou un autre nom du titulaire
 * (« Épouse », « Père », « Nom d'usage ») : la ligne qui suit en est la valeur.
 */
const AUTRES_NOMS = new Set(['EPOUSE', "D'EPOUSE", 'EP', 'VVE', 'VEUVE', 'PERE', 'MERE', "D'USAGE", 'DUSAGE', 'USAGE', 'MARITAL', 'JEUNE']);

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

/**
 * Libellés d'une autre colonne, sur la ligne de « Nom » ou de « Prénom(s) »,
 * dont la valeur n'a aucun mot de nom : sexe, taille, numéro de la carte.
 * Voir `autreColonneSure` dans l'extraction.
 */
const LIBELLES_COLONNE_SURE = new Set(['SEXE', 'SEX', 'TAILLE', 'HEIGHT', 'N°', 'NO', 'NUMERO', 'NUMBER', 'CARTE', 'CARD']);
/** Mots de liaison de ces libellés (« N° de la carte », « Card number »). */
const LIAISONS_COLONNE = new Set(['DE', 'DU', 'LA', "D'", "L'", 'OF']);

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
  return (
    k === 'DATE' || k === 'BIRTH' || estLibelleLieu(k) || (k.length >= 7 && distance(k, 'NAISSANCE', 2) <= 2) ||
    // « DATEDE », « DATEDENAISSANCE » : espaces perdus
    /^DATED/.test(k)
  );
}

/** Libellé d'une date qui n'est pas la naissance : expiration, délivrance, validité. */
function estLibelleAutreDate(k: string): boolean {
  const c = k.replace(/^[DL]'/, '');
  if (c.length < 6) return false;
  return (
    distance(c, 'EXPIRATION', 2) <= 2 || distance(c, 'DELIVRANCE', 2) <= 2 || distance(c, 'DELIVREE', 1) <= 1 ||
    distance(c, 'VALIDITE', 1) <= 1 || distance(c, 'EMISSION', 1) <= 1 || c === 'EXPIRY' || c === 'EXPIRE' || c === 'DELIVRE'
  );
}

/**
 * Un mot qui arrête la lecture d'un nom : butée de la liste, ou libellé de
 * naissance même déformé (« LIEV », « NAl55ANCE »), qu'aucun nom ne côtoie.
 */
function estButee(cle: string, brut: string): boolean {
  return BUTEES.has(cle) || BUTEES.has(sansAccents(brut).toUpperCase()) || estLibelleNaissance(cle);
}

const BUTEES_LONGUES = [...BUTEES].filter((b) => b.length >= 4);
/** Butée de quatre lettres au moins, à une erreur près (« DATF », « SEXC ») : un libellé abîmé, pas une valeur. */
function procheDUneButee(cle: string): boolean {
  return cle.length >= 4 && BUTEES_LONGUES.some((b) => distance(cle, b, 1) <= 1);
}

/**
 * Mots des en-têtes de pièce. Les BUTÉES en contiennent la forme exacte ; ici
 * on les reconnaît aussi ABÎMÉS par l'OCR (« REPUBLIOUE », « NATIONALF »,
 * « IDENTITY »), pour qu'une ligne d'en-tête mal lue ne passe jamais pour une
 * ligne de nom. Relevé : « IDENTITY CARD » ou « CARTF NATIONALF DIDENTITF »
 * juste au-dessus de « Nom » était pris pour un nom inexpliqué, et le vrai nom,
 * sous le libellé, était écarté par prudence.
 */
const MOTS_EN_TETE = [
  'REPUBLIQUE', 'REPUBLIC', 'IVOIRE', 'DIVOIRE', 'CARTE', 'NATIONALE', 'NATIONAL', 'IDENTITE', 'DIDENTITE',
  'IDENTITY', 'PASSEPORT', 'PASSPORT', 'PERMIS', 'CONDUIRE', 'CONSULAIRE', 'ETUDIANT', 'UNIVERSITE', 'MINISTERE',
  'CEDEAO', 'ECOWAS', 'SPECIMEN', 'LICENCE', 'LICENSE', 'DRIVING',
  // Devise nationale, imprimée sous « République de Côte d'Ivoire » : juste au-dessus du
  // premier champ quand l'OCR a perdu le bandeau et la ligne du nom (relevé en revue).
  'UNION', 'DISCIPLINE', 'TRAVAIL', 'UNITY', 'AFRIQUE', 'AFRICA',
];
/** Mots d'en-tête trop courts pour une recherche approchée : forme exacte seulement. */
const MOTS_EN_TETE_COURTS = new Set(['CARD', 'COTE', 'CIV', 'RCI', 'WORK']);

/**
 * Mots des intitulés dont un BOUT, laissé par un bord de carte coupé ou par la
 * lecture éparse du bandeau (« CART », « NATIO », « RÉPU », « D'IDENTI »,
 * « TETE »), peut passer pour un nom court en capitales. La devise n'y est
 * pas : « TRA » est un patronyme.
 */
const MOTS_A_FRAGMENTS = [
  'REPUBLIQUE', 'IVOIRE', 'DIVOIRE', 'CARTE', 'NATIONALE', 'NATIONAL', 'IDENTITE', 'DIDENTITE', 'IDENTITY',
  'PASSEPORT', 'PERMIS', 'CONDUIRE', 'CONSULAIRE',
];

/**
 * Le mot est-il un début ou une fin d'un mot d'intitulé, à une erreur près ?
 * Quatre lettres au moins : un bout plus court ne se distingue pas d'un nom.
 * Une recherche au MILIEU du mot écarterait des patronymes (ASSI dans
 * PASSEPORT) : seuls les bords, là où la carte ou la ligne est coupée.
 */
function fragmentEnTete(cle: string): boolean {
  const lettres = cle.replace(/[^A-Z]/g, '');
  const n = lettres.length;
  if (n < 4) return false;
  return MOTS_A_FRAGMENTS.some((mot) => {
    if (n >= mot.length) return false;
    // Sur quatre lettres, une erreur n'est tolérée que pour « TITE » (lu « TETE ») : ailleurs elle
    // écarterait des patronymes (AKRÉ contre la fin de CARTE).
    const max = n >= 5 || mot.startsWith('IDENTIT') || mot.startsWith('DIDENTIT') ? 1 : 0;
    return distance(lettres, mot.slice(0, n), max) <= max || distance(lettres, mot.slice(-n), max) <= max;
  });
}

/** Mots d'en-tête longs, cherchés DANS un mot collé (« CARTENATIONALED'IDENTITE »). */
const MOTS_EN_TETE_COLLES = ['REPUBLIQUE', 'NATIONALE', 'IDENTITE', 'IVOIRE', 'PASSEPORT', 'CONDUIRE', 'CONSULAIRE'];

function estMotEnTete(cle: string): boolean {
  if (MOTS_EN_TETE_COURTS.has(cle)) return true;
  if (cle.length < 5) return false;
  if (cle.length > 14) {
    // Aucun patronyme n'est aussi long d'un seul tenant : mots d'en-tête collés par l'OCR.
    const lettres = cle.replace(/[^A-Z]/g, '');
    return lettres.length <= 60 && MOTS_EN_TETE_COLLES.some((mot) => apparaitApprox(lettres, mot, 1));
  }
  const tolerance = cle.length >= 8 ? 2 : 1;
  return MOTS_EN_TETE.some((mot) => distance(cle, mot, tolerance) <= tolerance);
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
    // « NomKOUASSI », « Prénoms:ADJOUA », « NOMZADI », « PRÉNOMSESTELLE » : libellé collé à sa valeur.
    // Le deux-points lu comme un point colle aussi : « NOM.DIALLO ».
    const colle =
      /^(Noms?|Pr[ée]noms?(?:\(s\))?|Surname|N[O0Q]M|PR[ÉE]NOMS?(?:\(S\))?|SURNAME)[.,]?([A-ZÀ-Ý'][A-ZÀ-Ý0-9l'-]+)$/.exec(brut);
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

/**
 * `colle` : libellé dont l'OCR a perdu les espaces (« 6ivennamés »). Sa valeur
 * n'est lue que sur sa ligne, jamais dessous : mesuré sur le banc de bruit, la
 * ligne sous un tel libellé était le lieu de naissance, remonté à la place des
 * prénoms perdus.
 */
type Libelle = { genre: 'nom' | 'prenom' | 'combine'; fin: number; colle?: boolean };

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
    // « Nom ETPRÉNOMS » : espace perdu entre « et » et « prénoms ».
    if (k(i).startsWith('ET') && estPrenom(k(i).slice(2))) {
      return APRES_NOM_EXCLUS.has(k(i + 1)) ? { genre: 'combine', fin: -1 } : { genre: 'combine', fin: i + 1 };
    }
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
    // « Nom de famille » : c'est bien le patronyme du titulaire, pas un autre nom.
    if (k(j + 1) === 'DE' && distance(k(j + 2), 'FAMILLE', 2) <= 2) {
      return { genre: 'nom', fin: estSurname(k(j + 3)) ? j + 4 : j + 3 };
    }
    // « Nom famille » : « de » perdu. Sans cela, FAMILLE sortait comme nom.
    if (k(j + 1).length >= 6 && distance(k(j + 1), 'FAMILLE', 1) <= 1) return { genre: 'nom', fin: j + 2 };
    if (APRES_NOM_EXCLUS.has(k(j + 1))) return { genre: 'nom', fin: -1 };
    return { genre: 'nom', fin: j + 1 };
  }
  if (estSurname(k0)) {
    if (estNom(k(j + 1))) return { genre: 'nom', fin: j + 2 };
    return { genre: 'nom', fin: j + 1 };
  }
  if (estPrenom(k0)) {
    if (distance(k(j + 1), 'GIVEN', 1) <= 1) return { genre: 'prenom', fin: j + 3 }; // « Prénoms / Given names »
    if (estGivenNamesColle(k(j + 1))) return { genre: 'prenom', fin: j + 2, colle: true };
    return { genre: 'prenom', fin: j + 1 };
  }
  if (estGivenNamesColle(k0)) return { genre: 'prenom', fin: j + 1, colle: true };
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

/**
 * Parasite de la photo ou des guilloches collé à une valeur : un mot de trois
 * lettres au plus, sans aucune capitale (« ee », « fi »). Les valeurs d'une
 * pièce sont imprimées en capitales ; les libellés courts en minuscules (« le »,
 * « né », « à ») sont des butées, examinées avant. Les mots de liaison ne sont
 * pas des parasites : ils restent, comme avant, le signe d'un libellé mal lu
 * (« Nom et Prén0ms.KONÉ » : retirer « et » faisait sortir « PRÉNOMSKONÉ »
 * comme nom, relevé sur le banc de bruit).
 */
const LIAISONS = new Set(['de', 'du', 'des', 'et', 'en', 'le', 'la', 'les', 'au', 'aux', 'of', 'and', 'the']);
/**
 * Une capitale en tête est admise (« Wi », « Sa ») : l'OCR en met une au
 * parasite qui commence la ligne. Relevé sur le banc « retour de terrain » :
 * « Wi KOFI » sortait « WI KOFI » sous le libellé, et rien par position. Les
 * particules de patronyme mal lues (« Bi », « Bl », « Lou ») ne sont pas des
 * parasites.
 */
function parasiteColle(mot: string): boolean {
  if (mot.length > 3 || !/^[A-ZÀ-Ý]?[a-zà-ÿ]{1,3}$/.test(mot) || LIAISONS.has(mot.toLowerCase())) return false;
  const k = mot.toUpperCase();
  return !PARTICULES_NOM.has(k) && !PARTICULES_NOM.has(k.replace(/L$/, 'I'));
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
  // « ee KOFI », « KOFI fi » : un parasite en minuscules à côté d'une valeur en capitales
  // n'en fait pas partie. Relevé sur des photos fictives : l'OCR colle au nom ce qu'il lit
  // sur le bord de la photo d'identité. Seulement si TOUT le reste est en capitales : dans
  // « ANGE AWA Dateet licu dc », retirer « dc » faisait passer sous la borne de mots, et
  // accepter, une valeur mêlée à un libellé (relevé sur le banc de bruit).
  const enCapitales =
    mots.some((m) => /[A-ZÀ-Ý]{2}/.test(m)) && mots.every((m) => parasiteColle(m) || m === m.toLocaleUpperCase('fr-FR'));
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
    if (enCapitales && parasiteColle(m)) continue;
    res.push(m);
  }
  // « EE KOFI », « AYA MARIE II » : deux capitales qui ne font aucune syllabe (deux voyelles,
  // deux consonnes), en bout de valeur, à côté d'un vrai mot. Un reste du bord de la photo ou des
  // guilloches, pas une partie du nom (« TIÉ BI », « KY » en ont une).
  const reste = (m: string | undefined) => m !== undefined && /^[A-ZÀ-Ý]{2}$/.test(m) && !syllabe(m);
  if (res.some((m) => m.replace(/['-]/g, '').length >= 3)) {
    if (reste(res[0])) res.shift();
    if (reste(res[res.length - 1])) res.pop();
  }
  return res;
}

/** Deux lettres qui forment une syllabe : une voyelle et une consonne, dans un ordre ou l'autre. */
function syllabe(deux: string): boolean {
  const k = sansAccents(deux).toUpperCase();
  return /[AEIOUY]/.test(k) && /[^AEIOUY]/.test(k);
}

/** Mots de deux lettres qui ne sont jamais un patronyme à eux seuls : articles, restes de libellés, codes. */
const MOTS_COURTS_EXCLUS = new Set([
  'DE', 'DU', 'DA', 'ET', 'EN', 'LE', 'LA', 'NE', 'NO', 'AU', 'OU', 'IL', 'ON', 'UN', 'CI', 'ID', 'OF', 'TO', 'IN', 'AT',
  'EP', 'NI', 'SE', 'SA', 'ES', 'EL', 'AN', 'OR', 'IS', 'IT', 'AS', 'US', 'UE', 'EE', 'AA', 'II', 'OO',
]);

/**
 * Patronyme de deux lettres (« KY », « BA ») : un seul mot, en capitales, une
 * voyelle et une consonne. Accepté seulement comme valeur entière d'un nom, là
 * où `valeurAcceptable` demande un mot d'au moins trois lettres : un bruit de
 * deux lettres est presque toujours en minuscules (« ee », « Wi »).
 */
function nomCourt(mots: string[]): boolean {
  if (mots.length !== 1) return false;
  const m = mots[0];
  if (!/^[A-ZÀ-Ý]{2}$/.test(m)) return false;
  const k = sansAccents(m);
  return /[AEIOUY]/.test(k) && /[^AEIOUY]/.test(k) && !MOTS_COURTS_EXCLUS.has(k) && !NON_NOMS.has(k);
}

/** Valeur d'un NOM : celle d'une valeur ordinaire, ou un patronyme court de deux lettres. */
function valeurNom(mots: string[], max = MAX_MOTS_NOM): boolean {
  return valeurAcceptable(mots, max) || nomCourt(mots);
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

/**
 * Libellé « Nom » trop abîmé pour `libelleEn`, resté DEVANT la valeur sur la
 * ligne d'un nom lu par sa position : « NUM KOFI », « NOW KOFI », « N OM
 * KOFI », « NOIM KOFI », « NAME KOFI », « LAST NAME KOFI », « SURNAMF KOFI ».
 * Rend le nombre de mots du libellé à retirer, 0 s'il n'y en a pas. Relevé en
 * revue : le repli rendait « NUM KOFI » pour KOFI.
 */
function libelleNomAbime(cles: readonly string[], i: number): number {
  const k0 = cles[i] ?? '';
  const k1 = cles[i + 1] ?? '';
  const procheDeNom = (k: string) =>
    k.length >= 3 && k.length <= 5 && (distance(k, 'NOM', 1) <= 1 || distance(k, 'NOMS', 1) <= 1 || estNom(k));
  if (k0 === 'LAST' && distance(k1.replace(/S$/, ''), 'NAME', 1) <= 1) return 2;
  if (k0.length <= 2 && k1.length <= 2 && procheDeNom(k0 + k1)) return 2;
  if (procheDeNom(k0) || k0 === 'NAME' || k0 === 'NAMES') return 1;
  if (k0.length >= 5 && k0.length <= 9 && (distance(k0, 'SURNAME', 2) <= 2 || estSurname(k0))) return 1;
  return 0;
}

/**
 * Mot qu'un nom lu par sa POSITION ne peut pas contenir, parce qu'il vient
 * vraisemblablement d'un numéro, d'une date ou d'une taille dont l'OCR a lu
 * les chiffres comme des lettres, ou du bruit : deux chiffres ou plus
 * (« CI0O1OO », « AB1C2D »), une virgule entre deux caractères (« I,SO » pour
 * 1,50), trois lettres sans voyelle (« KBR »), une seule lettre répétée
 * (« EEE »), ou seulement des lettres qui imitent des chiffres (O, I, Q, S, B :
 * « OI OI IOOO », « CI OOI SSO »). Sous un vrai libellé, ces valeurs restent
 * lues comme avant : ce filtre ne sert qu'au repli.
 */
function motDouteuxEnRepli(brut: string): boolean {
  if ((brut.match(/[0-9]/g)?.length ?? 0) >= 2) return true;
  if (/[^\s,],[^\s,]/.test(brut)) return true;
  const lettres = sansAccents(brut).toUpperCase().replace(/[^A-Z]/g, '');
  if (lettres.length >= 3 && !/[AEIOUY]/.test(lettres)) return true;
  if (lettres.length >= 2 && /^(.)\1+$/.test(lettres)) return true;
  return lettres.length >= 3 && /^[OIQSB]+$/.test(lettres) && (lettres.length <= 4 || /^[OIQ]+$/.test(lettres));
}

// ---------------------------------------------------------------------------
// Extraction du nom et des prénoms
// ---------------------------------------------------------------------------

/**
 * Mots d'un patronyme.
 *
 * Quatre sur la ligne du libellé : là, l'OCR mêle au nom des restes de
 * libellés collés (« Nom et Prén0ms.DIABATÉ KOUAKOU AHOU MOUSSA », relevé sur
 * le banc de bruit), et une valeur trop longue est le signe qu'on a ramassé
 * autre chose.
 *
 * Six sur une ligne à elle : c'est la mise en page des cartes, et les noms
 * composés ivoiriens s'allongent (« N'GUESSAN KOUADIO KOUAKOU BROU »). Aucun
 * nom n'est jamais tronqué : au-delà, la valeur est refusée, pas coupée.
 */
const MAX_MOTS_NOM = 4;
const MAX_MOTS_NOM_LIGNE = 6;
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
  /** `colonne` : suivi, sur sa ligne, du libellé d'une autre colonne (voir `autreColonneSure`). */
  const libellesSeuls: { genre: 'nom' | 'prenom'; ligne: number; mot: number; apresUnNom: boolean; colonne: boolean }[] = [];
  /**
   * Où est le libellé des prénoms retenus : point de départ du repli par
   * position (voir `nomParPosition`). `surSaLigne` : les prénoms sont lus sur
   * la ligne du libellé (mise en page « libellé : valeur »).
   */
  let ancrePrenom: { ligne: number; mot: number; surSaLigne: boolean } | undefined;

  // Les deux recherches ci-dessous ne dépendent que du numéro de ligne : elles
  // sont mémorisées, ce qui garde l'ensemble linéaire même quand beaucoup de
  // libellés regardent la même ligne.
  const memoSous: (Valeur | null | undefined)[] = [];
  const memoPur: (string[] | null | undefined)[] = [];
  const memoEnTete: (boolean | undefined)[] = [];

  /** La ligne n porte-t-elle un mot d'en-tête, même abîmé (« CARTF NATIONALF », « IDENTITY CARD ») ? */
  const enTete = (n: number): boolean => {
    const deja = memoEnTete[n];
    if (deja !== undefined) return deja;
    const resultat = lignes[n].cles.some(estMotEnTete);
    memoEnTete[n] = resultat;
    return resultat;
  };

  const memoCourte: (boolean | undefined)[] = [];
  /**
   * La ligne n n'est-elle faite que de restes courts : aucun mot de trois
   * lettres ou plus, ni chiffre, ni butée, ni libellé (« IE », « BE », « SS »,
   * « | II ») ? C'est ce que l'OCR lit sur le bord de la photo d'identité,
   * l'image fantôme ou les guilloches, ENTRE deux lignes de la pièce. Relevé
   * sur le banc « retour de terrain » : une telle ligne entre le nom et
   * « Prénom(s) » faisait écarter le nom (valeur « suivie d'une autre ligne »),
   * et arrêtait le repli par position ; juste sous « Nom », elle sortait comme
   * nom (« BE »). Un patronyme de deux lettres (« KY ») a la même forme : il
   * reste lu quand aucune ligne de nom ne le suit (voir `valeurSous`).
   */
  const ligneCourte = (n: number): boolean => {
    const deja = memoCourte[n];
    if (deja !== undefined) return deja;
    const l = lignes[n];
    const resultat =
      !bruit[n] && !contientUnLibelle(l) &&
      l.mots.every((x, j) => {
        if (estButee(l.cles[j], x)) return false;
        const m = motDeNom(x);
        return m !== null && m.replace(/['-]/g, '').length <= 2;
      });
    memoCourte[n] = resultat;
    return resultat;
  };

  /**
   * Première ligne « valeur » sous la ligne i (saute au plus 2 lignes de bruit
   * ou de restes courts). Une ligne de restes courts n'est rendue que si
   * aucune vraie valeur ne la suit : « Nom / BE / KOFI » rend KOFI, « Nom / KY
   * / Prénom(s) » rend KY.
   */
  const valeurSous = (i: number): Valeur | null => {
    const deja = memoSous[i];
    if (deja !== undefined) return deja;
    let resultat: Valeur | null = null;
    let courte: Valeur | null = null;
    let sautes = 0;
    for (let n = i + 1; n < lignes.length && sautes <= 2; n++) {
      if (bruit[n]) {
        sautes++;
        continue;
      }
      const l = lignes[n];
      if (!contientUnLibelle(l) && !estButee(l.cles[0], l.mots[0]) && !enTete(n)) {
        const mots = lireValeur(l, 0);
        if (mots.length && ligneCourte(n)) {
          courte ??= { mots, ligne: n };
          sautes++;
          continue;
        }
        // la ligne doit être « pure » : si elle contenait autre chose qu'un nom, on s'abstient
        if (mots.length) resultat = { mots, ligne: n };
      }
      break;
    }
    resultat ??= courte;
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

  /** Ligne précédente qui n'est pas du bruit (au plus 2 lignes de bruit sautées), ou -1. */
  const ligneAuDessus = (i: number): number => {
    for (let n = i - 1, sautes = 0; n >= 0 && sautes <= 2; n--) {
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

  /**
   * À partir du mot `debut`, la ligne ne porte-t-elle que le libellé d'une
   * AUTRE colonne dont la valeur ne contient aucun mot de nom : sexe (une
   * lettre), taille, numéro de la carte (des chiffres) ? Sur la ligne des
   * valeurs, dessous, `lireValeur` s'arrête alors avant cette autre valeur
   * (« KOFI F », « KOFI CI000… »). Relevé sur le banc « retour de terrain » :
   * « Nom  N° de la carte / KOFI CI000… / Prénom(s) / AYA » rendait les prénoms
   * sans le nom. Le lieu de naissance, la profession, le domicile ou la
   * nationalité, dont la valeur est faite de mots, n'en sont pas : la valeur
   * dessous les mêlerait au nom.
   */
  const autreColonneSure = (l: Ligne, debut: number): boolean => {
    let libelle = false;
    for (let r = debut; r < l.mots.length; r++) {
      if (bruitSeul(l.mots[r])) continue;
      const k = l.cles[r];
      if (LIBELLES_COLONNE_SURE.has(k)) libelle = true;
      else if (!LIAISONS_COLONNE.has(k)) return false;
    }
    return libelle;
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
        // Libellé seul en fin de ligne, au bruit près : sa valeur est peut-être dessous. Ou suivi
        // du libellé d'une autre colonne sans mot de nom pour valeur (« Nom  N° de la carte »).
        let seul = !(lib.fin < l.mots.length && libelleEn(l, lib.fin) !== null);
        let suite = lib.fin;
        while (seul && suite < l.mots.length && bruitSeul(l.mots[suite])) suite++;
        const colonne = seul && suite < l.mots.length;
        if (colonne) seul = autreColonneSure(l, suite);
        // Précédé d'un nom qui n'est la valeur d'aucun libellé (« KONAN Prénoms ») :
        // l'OCR a fusionné la ligne du nom avec celle du libellé. Voir plus bas.
        let apresUnNom = false;
        for (let r = 0; !apresUnNom && !libelleDejaVuSurLaLigne && r < j; r++) apresUnNom = motDeNomPlein(l, r);
        if (seul && !lib.colle) libellesSeuls.push({ genre: lib.genre, ligne: i, mot: j, apresUnNom, colonne });
      }
      libelleDejaVuSurLaLigne = true;
      if (!mots.length && lib.genre === 'combine') {
        const sous = valeurSous(i);
        if (sous && !suspecte(sous)) mots = sous.mots;
      }
      if (lib.genre === 'nom' && !nom && valeurNom(mots)) nom = mots;
      else if (lib.genre === 'prenom' && !prenom && valeurAcceptable(mots, MAX_MOTS_PRENOM)) {
        prenom = mots;
        ancrePrenom = { ligne: i, mot: j, surSaLigne: true };
      } else if (lib.genre === 'combine' && !combine && valeurAcceptable(mots, MAX_MOTS_COMBINE)) combine = mots;
      j = Math.max(j, lib.fin - 1);
    }
  }

  /**
   * Ligne de parasites de l'OCR plutôt que de texte : mots courts (4 lettres au
   * plus) sans deux capitales qui se suivent. C'est ce que rendent la photo, les
   * guilloches ou le bord de la carte (« Sai ee », « fi Wi »). Une valeur de la
   * pièce est imprimée en capitales.
   */
  const ligneParasite = (n: number): boolean => {
    const l = lignes[n];
    return l.mots.every((m) => m.length <= 4 && !/[A-ZÀ-Ý]{2}/.test(m));
  };

  /** La ligne n est-elle un nom « pur » : ni libellé, ni butée, ni chiffre, ni en-tête, ni parasite ? */
  const nomPur = (n: number): string[] | null => {
    const deja = memoPur[n];
    if (deja !== undefined) return deja;
    let resultat: string[] | null = null;
    const l = lignes[n];
    if (
      l && !bruit[n] && !enTete(n) && !ligneParasite(n) && !contientUnLibelle(l) &&
      l.mots.every((x, j) => !estButee(l.cles[j], x) && motDeNom(x) !== null)
    ) {
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
  // Une ligne de restes courts (« IE ») n'en est pas une.
  const ambigu = (v: Valeur) => {
    const sous = valeurSous(v.ligne);
    return sous !== null && !ligneCourte(sous.ligne);
  };
  // Ordre de lecture : le nom et les prénoms précèdent la date et le lieu de
  // naissance. Un libellé seul lu APRÈS l'un d'eux signale une lecture dans le
  // désordre (lignes inversées, image penchée) : la ligne sous ce libellé n'est
  // plus sûre, c'était, mesuré, le lieu de naissance. Les libellés suivis de leur
  // valeur sur la même ligne ne sont pas concernés.
  // La date compte même sans son libellé : l'OCR perd souvent le libellé, en
  // petit corps, et garde la date. « Nom : KONÉ / 14/09/2004 / Prénoms /
  // DIMBOKRO » rendait DIMBOKRO comme prénoms (relevé en revue).
  // Une date annoncée par un libellé qui n'est PAS celui de la naissance (« Date
  // d'expiration 01/01/2030 », « Délivrée le … »), imprimée en haut de certaines
  // cartes, ne dit rien de l'ordre de lecture du nom : elle n'arrête rien.
  const premiereLigneNaissance = lignes.findIndex((l) => {
    if (l.cles.some((k) => k !== 'DATE' && estLibelleNaissance(k))) return true;
    return (l.cles.includes('DATE') || porteUneDate(l)) && !l.cles.some(estLibelleAutreDate);
  });
  const avantLaNaissance = (x: { ligne: number }) => premiereLigneNaissance < 0 || x.ligne < premiereLigneNaissance;
  const seulNom = libellesSeuls.find((x) => x.genre === 'nom' && avantLaNaissance(x));
  const seulPrenom = libellesSeuls.find((x) => x.genre === 'prenom' && avantLaNaissance(x));
  let decoupage: Decoupage = 'libelles';

  /**
   * Nom en capitales lu dans les `fin` premiers mots de la ligne n, pour le
   * REPLI : ni libellé, ni butée, ni en-tête ou bout d'en-tête, ni chiffre ou
   * mot qui en imite (`motDouteuxEnRepli`), ni les prénoms déjà lus, et au
   * moins trois lettres : les patronymes de deux lettres ne sont acceptés que
   * sous un vrai libellé (« BE », « WA » au-dessus des prénoms étaient du
   * bruit). `null` sinon.
   */
  const nomEnCapitales = (n: number, fin: number): string[] | null => {
    const l = lignes[n];
    // « a KOFI », « om a KOFI » : lettre isolée ou parasite lus sur le bord de la photo, collés
    // devant la valeur. Jamais une butée (« Ep KOFI » est la valeur d'« Épouse »), sauf ce « a ».
    let debut = 0;
    while (
      debut < fin - 1 &&
      (l.mots[debut] === 'a' || (parasiteColle(l.mots[debut]) && !estButee(l.cles[debut], l.mots[debut])))
    ) {
      debut++;
    }
    // « NUM KOFI », « LAST NAME KOFI » : libellé abîmé devant la valeur, retiré.
    const libelle = libelleNomAbime(l.cles, debut);
    // Rien d'autre que ce libellé (« WOM », « NAME ») : sa valeur est perdue, ce n'est pas un nom.
    if (libelle && fin - debut <= libelle) return null;
    debut += libelle;
    const part: Ligne = { mots: l.mots.slice(debut, fin), cles: l.cles.slice(debut, fin) };
    for (let r = 0; r < part.mots.length; r++) {
      if (libelleEn(part, r) || estButee(part.cles[r], part.mots[r]) || estMotEnTete(part.cles[r])) return null;
      // « NOMET », « NOIVIET » : reste de « Nom et prénoms », pas un nom.
      if (estNom(part.cles[r].replace(/[EF]T$/, ''))) return null;
      if (motDeNom(part.mots[r]) === null) return null;
      // « ee KOFI » : parasite de la photo, retiré par `lireValeur` (les butées, elles, ont arrêté plus haut).
      if (parasiteColle(part.mots[r])) continue;
      // « SS KOFI » : deux capitales sans syllabe en bout de ligne, retirées aussi par `lireValeur`.
      const bout = r === 0 || r === part.mots.length - 1;
      if (bout && part.mots.length > 1 && /^[A-ZÀ-Ý]{2}$/.test(part.mots[r]) && !syllabe(part.mots[r])) continue;
      if (fragmentEnTete(part.cles[r]) || motDouteuxEnRepli(part.mots[r])) return null;
    }
    const mots = lireValeur(part, 0);
    if (!mots.length || mots.some((m) => m !== m.toLocaleUpperCase('fr-FR'))) return null;
    if (!valeurAcceptable(mots, MAX_MOTS_NOM_LIGNE) || (prenom && formater(mots) === formater(prenom))) return null;
    return mots;
  };

  /**
   * La ligne n annonce-t-elle la valeur d'un AUTRE champ que le nom du
   * titulaire ? Libellé des prénoms, libellé d'un autre nom (« Nom d'usage »,
   * « Nom du père », `fin` < 0), autre libellé ou butée (« Épouse », « Père »,
   * « Profession »). Les mots d'en-tête, eux aussi des butées (« CARTE »), et
   * le libellé « Nom » resté seul n'annoncent rien d'autre : la ligne sous
   * « Nom » est bien le nom.
   */
  const annonceUnAutreChamp = (n: number): boolean => {
    const l = lignes[n];
    for (let j = 0; j < l.mots.length; j++) {
      const lib = libelleEn(l, j);
      if (lib && (lib.fin < 0 || lib.genre !== 'nom')) return true;
      const k = l.cles[j];
      if (AUTRES_NOMS.has(k)) return true;
      if (!lib && /[A-Z].*[A-Z]/.test(k) && estButee(k, l.mots[j]) && !estMotEnTete(k)) return true;
    }
    return false;
  };

  /**
   * Le mot r de la ligne pourrait-il être le lieu de naissance ? Un mot en
   * capitales d'au moins trois lettres, sans chiffre, qui n'est ni un libellé
   * ni une butée, même abîmés (« DATF », « DATFDE », « SEXC »), ni un bout de
   * « NAISSANCE » coupé par l'OCR (« NA|5SANCE » lu « NA 5SANCE »).
   */
  const traceDeLieu = (l: Ligne, r: number): boolean => {
    const brut = l.mots[r];
    if (/[0-9]/.test(brut) || !/[A-ZÀ-Ý]{3}/.test(brut) || !motDeNomPlein(l, r) || libelleEn(l, r)) return false;
    const k = l.cles[r].replace(/[^A-Z]/g, '');
    if (k.length >= 4 && distance(k.slice(0, 4), 'DATE', 1) <= 1) return false;
    // Libellé ou mot d'en-tête abîmé : « SEXC », « CÔTF », « DEHTITÉ », et « DECÔTE » collé (relevé
    // sur le banc aux parasites courts : l'en-tête lu en dernier passait pour le lieu).
    if (procheDUneButee(k) || estMotEnTete(k) || fragmentEnTete(k) || distance(k, 'COTE', 1) <= 1) return false;
    if (k.length <= 8 && apparaitApprox(k, 'DECOTE', 1)) return false;
    // « NAIS », « 5SANCE » (bouts), « DEMAISSANCE », « MAISSAMCF » (collés, abîmés).
    if (k.length >= 4 && (apparaitApprox('NAISSANCE', k, 1) || apparaitApprox(k, 'NAISSANCE', k.length >= 8 ? 3 : 2))) return false;
    // « CARTFNATIONALE » : mots d'en-tête collés, trop courts pour `estMotEnTete`.
    return !(k.length >= 8 && MOTS_EN_TETE_COLLES.some((mot) => apparaitApprox(k, mot, 1)));
  };

  /**
   * Le lieu de naissance a-t-il pu remonter au-dessus des prénoms, son libellé
   * perdu ? Relevé en revue : « TIASSALÉ / Prénom(s) AYA / Date de naissance
   * 01/01/1990 » rendait TIASSALÉ comme nom. `lieuOrphelin` ne voit un lieu
   * déplacé que si son libellé a été lu.
   *
   * Signature retenue : aucune trace du lieu (ni son libellé, ni un mot en
   * capitales qui pourrait l'être, voir `traceDeLieu`) sous les prénoms, alors
   * que la suite de la carte a été lue, et
   * - soit une naissance lue APRÈS les prénoms, en mise en page « libellé :
   *   valeur » (prénoms ou date lus sur la ligne de leur libellé) ;
   * - soit, sans naissance lue, des prénoms sur la ligne de leur libellé suivis
   *   d'autres champs (« Sexe », « Taille »…) : ligne de la naissance perdue.
   * En mise en page empilée, un bas de carte perdu est trop fréquent pour en
   * tirer quoi que ce soit : le nom au-dessus de « Prénom(s) » reste lu
   * (batterie « retour de terrain »). Sans rien de lu sous les prénoms, un lieu
   * remonté et un nom au libellé perdu ne se distinguent pas : c'est la
   * relecture qui tranche (découpage `position`).
   */
  const lieuPeutEtreRemonte = (ancre: { ligne: number; surSaLigne: boolean }): boolean => {
    let debut: number;
    if (premiereLigneNaissance > ancre.ligne) {
      const naissance = lignes[premiereLigneNaissance];
      const dateSurSaLigne =
        porteUneDate(naissance) && naissance.mots.some((m, j) => /[A-Z].*[A-Z]/.test(naissance.cles[j]) && estButee(naissance.cles[j], m));
      if (!ancre.surSaLigne && !dateSurSaLigne) return false;
      debut = premiereLigneNaissance;
    } else if (premiereLigneNaissance < 0 && ancre.surSaLigne) {
      debut = ancre.ligne + 1;
      let suiteLue = false;
      for (let n = debut; !suiteLue && n < lignes.length; n++) {
        const l = lignes[n];
        // Un autre champ (« Sexe », « Taille »), ou un numéro (« N° … », « CI000… ») : le bas de la carte a été lu.
        suiteLue = l.cles.some(
          (k, j) => (/[A-Z].*[A-Z]/.test(k) && (estButee(k, l.mots[j]) || procheDUneButee(k))) || /^[NHM][°O]$/.test(k) || /[0-9]{5}/.test(l.mots[j]),
        );
      }
      if (!suiteLue) return false;
    } else {
      return false;
    }
    for (let n = debut; n < lignes.length; n++) {
      const l = lignes[n];
      for (let r = 0; r < l.mots.length; r++) {
        if (estLibelleLieu(l.cles[r]) || traceDeLieu(l, r)) return false;
      }
    }
    return true;
  };

  /**
   * Au-dessus du candidat : ni l'annonce d'un autre champ, ni une autre ligne de nom. Les
   * parasites sont sautés, mais pas sans être examinés : « Père » ou « Nom du père », mots
   * courts en minuscules, ont la forme d'un parasite.
   */
  const dessusSain = (candidat: number): boolean => {
    let dessus = ligneAuDessus(candidat);
    for (let sautes = 0; dessus >= 0; sautes++) {
      if (annonceUnAutreChamp(dessus)) return false;
      if (sautes >= 2 || !(ligneParasite(dessus) || ligneCourte(dessus))) break;
      dessus = ligneAuDessus(dessus);
    }
    return dessus < 0 || !nomPur(dessus);
  };

  /**
   * Valeur lue sous un libellé suivi d'une autre colonne (« Nom  Sexe ») : la
   * valeur de cette autre colonne doit se voir juste après les mots du nom, sur
   * la même ligne (« KOFI F », « AYA 1,65 », « KOFI CI000… »). Sans elle, rien
   * ne dit où s'arrête le nom : la ligne peut porter un autre champ en entier
   * (mesuré sur un gabarit piège, le lieu de naissance sortait comme nom).
   */
  const traceColonne = (n: number): boolean => {
    const l = lignes[n];
    let nomVu = false;
    for (let r = 0; r < l.mots.length; r++) {
      // Un libellé, même abîmé (« DATEDE », « D4T3 ») : la ligne porte un autre champ, pas la valeur
      // de la colonne. La ressemblance n'est cherchée que dans un mot à chiffres : MARIE est à une
      // lettre de MAIRIE.
      if (estButee(l.cles[r], l.mots[r]) || (/[0-9]/.test(l.mots[r]) && procheDUneButee(l.cles[r]))) return false;
      const m = motDeNom(l.mots[r]);
      // Des chiffres (taille, numéro) ou une lettre seule (sexe) après le nom : la trace. Pas un
      // mot où l'OCR a lu un chiffre pour une lettre (« DIMBOKR0 ») : `motDeNom` le rend lisible,
      // et c'était, mesuré, le lieu de naissance.
      if (m === null) return nomVu;
      if (m === '' || parasiteColle(l.mots[r])) continue;
      // Le sexe : M ou F. Un « N » seul est le début de « N'GORAN », lu « N GORAN ».
      if (/^[MF]$/.test(m)) return nomVu;
      if (m.replace(/['-]/g, '').length === 1) continue;
      nomVu = true;
    }
    return false;
  };
  const valeurDeColonne = (seul: { colonne: boolean }, v: Valeur) => !seul.colonne || traceColonne(v.ligne);

  const enColonnes = seulNom && seulPrenom && !nom && !prenom && seulPrenom.ligne - seulNom.ligne === 1;
  if (enColonnes) {
    // « Nom \n Prénoms \n KOUASSI \n ADJOUA MARIE » : colonne de libellés puis colonne de valeurs
    const v1 = valeurSous(seulPrenom.ligne);
    const v2 = v1 ? valeurSous(v1.ligne) : null;
    if (
      // En colonnes, la ligne du nom doit être un nom pur : « ISSOUF Date de naissance »
      // annonce une date, pas la colonne des prénoms. La ligne des prénoms, elle, peut
      // avoir été fusionnée avec le libellé suivant.
      !seulPrenom.apresUnNom && v1 && v2 && nomPur(v1.ligne) && valeurDeColonne(seulNom, v1) && valeurDeColonne(seulPrenom, v2) &&
      !ambigu(v2) && !suspecte(v1) && !suspecte(v2) &&
      nomsPursAuDessus(seulNom.ligne).length === 0 &&
      valeurAcceptable(v1.mots, MAX_MOTS_NOM_LIGNE) && valeurAcceptable(v2.mots, MAX_MOTS_PRENOM)
    ) {
      return sortie(v1.mots, v2.mots, 'colonnes');
    }
  }
  // « Nom \n KOFI Prénom(s) \n AYA » : ce n'est pas une colonne de libellés, mais la
  // ligne du nom fusionnée avec le libellé des prénoms. On lit alors comme en
  // libellés séparés (le nom, lui, revient par `nomParPosition`).
  if (!enColonnes || seulPrenom?.apresUnNom) {
    const consommees = new Set<number>();
    const sansLibelleNom = !seulNom && !libelleNomVu;
    /*
     * Dans l'ordre des lignes, et non « le nom puis les prénoms » : la carte
     * nationale d'identité ivoirienne imprime « Prénom(s) », sa valeur, puis
     * « Nom » en dessous. Lire dans l'ordre de la page marque la valeur des
     * prénoms comme consommée AVANT d'examiner « Nom » ; sinon cette valeur,
     * qui se trouve juste au-dessus du libellé « Nom », passait pour un nom
     * rendu avant son libellé et faisait tout abandonner (retour de terrain du
     * 17/09, deux téléphones, aucun nom jamais lu sur une CNI).
     */
    const ordonnes = [seulNom, seulPrenom]
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.ligne - b.ligne);
    for (const seul of ordonnes) {
      if (seul.genre === 'nom' ? nom : prenom) continue;
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
      if (!v || ambigu(v) || suspecte(v) || !valeurDeColonne(seul, v)) continue;
      // « KONAN Prénoms » alors qu'un nom a déjà été lu ailleurs : deux patronymes se
      // contredisent, l'ordre de lecture est brouillé, et ce qui suit le libellé des
      // prénoms n'est plus sûr (c'était, mesuré, un lieu de naissance).
      if (seul.genre === 'prenom' && seul.apresUnNom && nom) continue;
      /*
       * Valeur de nom trouvée au-delà du libellé des prénoms alors que « Nom »
       * venait AVANT « Prénom(s) » : les lignes ont été lues dans le désordre,
       * et ce qu'on lit là n'est plus sûr.
       *
       * Seulement dans ce sens-là. La carte nationale d'identité ivoirienne
       * imprime « Prénom(s) » PUIS « Nom » en dessous : la valeur du nom y est
       * forcément sous le libellé des prénoms, et cette règle jetait le nom de
       * toutes les CNI (retour de terrain du 17/09, sur deux téléphones).
       */
      if (seul.genre === 'nom' && seulPrenom && seul.ligne < seulPrenom.ligne && v.ligne >= seulPrenom.ligne) {
        continue;
      }
      // « NOM \n MAMADOU AWA Date de naissance \n KOFFI PRÉNOM(S) » : une valeur de nom lue
      // sur la ligne de la naissance ou après vient d'une lecture dans le désordre.
      if (seul.genre === 'nom' && !avantLaNaissance(v)) continue;
      if (seul.genre === 'nom' && valeurNom(v.mots, MAX_MOTS_NOM_LIGNE)) {
        nom = v.mots;
        consommees.add(v.ligne);
      }
      if (seul.genre === 'prenom' && valeurAcceptable(v.mots, MAX_MOTS_PRENOM)) {
        prenom = v.mots;
        ancrePrenom = { ligne: seul.ligne, mot: seul.mot, surSaLigne: false };
        consommees.add(v.ligne);
      }
      // Libellé « Nom » perdu par l'OCR (3 lettres, petit corps) : si UNE seule ligne de nom pur,
      // entièrement en capitales, précède « Prénoms », c'est le nom dans une mise en page empilée.
      // Mêmes filtres que le repli par position (bouts d'en-tête, chiffres déguisés, autre champ
      // annoncé au-dessus, lieu remonté).
      if (seul.genre === 'prenom' && prenom && !nom && sansLibelleNom && dessus.length === 1 && ancrePrenom) {
        const mots = nomPur(dessus[0]) && nomEnCapitales(dessus[0], lignes[dessus[0]].mots.length);
        const brut = lignes[dessus[0]].mots.join(' ');
        if (
          mots && brut === brut.toLocaleUpperCase('fr-FR') && dessusSain(dessus[0]) && !lieuPeutEtreRemonte(ancrePrenom)
        ) {
          nom = mots;
          decoupage = 'position';
        }
      }
    }
  }

  /**
   * REPLI : prénoms lus, nom introuvable par les libellés. Relevé sur le
   * terrain (CNI, iPhone et Android) : les prénoms se remplissaient, le nom
   * jamais. Le libellé « Nom », en petit corps, est perdu ou déformé par l'OCR,
   * ou sa valeur a été écartée par un garde-fou d'ordre de lecture. Sur toutes
   * les mises en page connues, le nom précède les prénoms : on prend la ligne
   * en capitales la plus proche AU-DESSUS du libellé des prénoms (ou, sur sa
   * ligne, ce qui le précède : « KOFI Prénom(s) »), en sautant au plus deux
   * lignes de bruit ou de parasites. On s'arrête sans rien prendre sur un
   * en-tête, un libellé (y compris « Nom » resté sans valeur), une date, un lieu
   * de naissance ou un chiffre ; si une autre ligne de nom se trouve juste
   * au-dessus du candidat, on ne sait pas laquelle est le nom : abstention ; et
   * si la ligne au-dessus annonce un autre champ (« Nom d'usage », « Épouse »,
   * « Père », voir `annonceUnAutreChamp`), le candidat en est la valeur :
   * abstention aussi. Découpage `position` : l'interface fait vérifier.
   */
  const nomParPosition = (ancre: { ligne: number; mot: number; surSaLigne: boolean }): string[] | null => {
    if (!avantLaNaissance(ancre)) return null;
    // Un libellé de lieu resté sans valeur, où qu'il soit : le lieu a quitté sa place
    // (voir `lieuOrphelin`), il peut être la ligne au-dessus des prénoms.
    for (let n = 0; n < lignes.length; n++) if (lieuOrphelin(n)) return null;
    if (lieuPeutEtreRemonte(ancre)) return null;
    let depart = ancre.ligne;
    if (ancre.mot > 0) {
      const l = lignes[ancre.ligne];
      let contenu = false;
      for (let r = 0; !contenu && r < ancre.mot; r++) contenu = !bruitSeul(l.mots[r]);
      if (contenu) {
        const mots = nomEnCapitales(ancre.ligne, ancre.mot);
        // « KOFI Prénoms » : la ligne au-dessus ne doit pas porter elle aussi un nom.
        return mots && dessusSain(ancre.ligne) ? mots : null;
      }
    }
    for (let sautes = 0; sautes <= 2; sautes++) {
      const n = ligneAuDessus(depart);
      if (n < 0) return null;
      // Parasites (« fi Wi ») et restes courts en capitales (« IE ») : sautés.
      if (ligneParasite(n) || ligneCourte(n)) {
        // « KOFI \n Père \n Prénom(s) » : ce qui est au-dessus de « Père » n'est pas le nom du titulaire.
        if (annonceUnAutreChamp(n)) return null;
        depart = n;
        continue;
      }
      const l = lignes[n];
      if (enTete(n) || contientUnLibelle(l) || porteUneDate(l) || l.cles.some(estLibelleNaissance)) return null;
      const mots = nomEnCapitales(n, l.mots.length);
      if (!mots || suspecte({ mots, ligne: n })) return null;
      return dessusSain(n) ? mots : null;
    }
    return null;
  };

  // « Nom  Taille » lu, mais sa valeur écartée faute de la taille à côté (`traceColonne`) : la
  // ligne au-dessus des prénoms n'est pas plus sûre. Mesuré sur le gabarit piège : c'était le lieu.
  if (prenom && !nom && ancrePrenom && !seulNom?.colonne) {
    const mots = nomParPosition(ancrePrenom);
    if (mots) {
      nom = mots;
      decoupage = 'position';
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
    // « NATlONALE D'lDENTlTÉ » : l minuscule lu pour un I au milieu des capitales.
    .replace(/(?<=[A-Z'])l|l(?=[A-Z])/g, 'I')
    .toUpperCase()
    .replace(/0/g, 'O')
    .replace(/[1|!]/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B')
    .replace(/[3€]/g, 'E')
    .replace(/[4@]/g, 'A')
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

/**
 * Le motif apparaît-il dans le texte avec au plus `max` erreurs (lettre
 * changée, perdue ou ajoutée) ? Recherche approchée de Sellers : colonne par
 * colonne du motif, le début dans le texte est libre. Coût : longueur du motif
 * fois longueur du texte, bornée par l'appelant.
 */
function apparaitApprox(texte: string, motif: string, max: number): boolean {
  const m = motif.length;
  if (texte.length + max < m) return false;
  let colonne = new Uint16Array(m + 1);
  let suivante = new Uint16Array(m + 1);
  for (let i = 0; i <= m; i++) colonne[i] = i;
  if (colonne[m] <= max) return true;
  for (let j = 0; j < texte.length; j++) {
    const c = texte.charCodeAt(j);
    suivante[0] = 0;
    for (let i = 1; i <= m; i++) {
      let v = colonne[i - 1] + (motif.charCodeAt(i - 1) === c ? 0 : 1);
      if (colonne[i] + 1 < v) v = colonne[i] + 1;
      if (suivante[i - 1] + 1 < v) v = suivante[i - 1] + 1;
      suivante[i] = v;
    }
    if (suivante[m] <= max) return true;
    const echange = colonne;
    colonne = suivante;
    suivante = echange;
  }
  return false;
}

/**
 * Intitulés de pièce, lettres seules (espaces et apostrophe retirés : l'OCR les
 * perd ou en ajoute), du plus spécifique au plus général, avec la part
 * d'erreurs tolérée. Celui de la CNI est le plus tolérant : c'est la pièce la
 * plus courante, et son intitulé long (23 lettres) ne ressemble à aucun autre.
 *
 * `noyaux` : mots qui font le type, exigés à deux erreurs près (un seul pour
 * « CONSUL »). Relevé en revue : sans eux, « CARTE D'IDENTITÉ SCOLAIRE »
 * passait pour une carte consulaire (SCOLAIRE à quatre erreurs de CONSULAIRE)
 * et « ATTESTATION D'IDENTITÉ » pour une CNI (TATIONDIDENTITE à quatre
 * erreurs de NATIONALEDIDENTITE).
 */
const INTITULES: readonly { type: TypePiece; lettres: string; part: number; noyaux?: readonly [string, number][] }[] = [
  { type: 'Carte consulaire', lettres: 'CARTEDIDENTITECONSULAIRE', part: 5, noyaux: [['CONSUL', 1]] },
  { type: 'Carte consulaire', lettres: 'CARTECONSULAIRE', part: 5, noyaux: [['CONSUL', 1]] },
  { type: 'Carte consulaire', lettres: 'CONSULARCARD', part: 5, noyaux: [['CONSUL', 1]] },
  { type: 'Passeport', lettres: 'PASSEPORT', part: 5 },
  { type: 'Passeport', lettres: 'PASSPORT', part: 5 },
  { type: 'Permis de conduire', lettres: 'PERMISDECONDUIRE', part: 5 },
  { type: 'Permis de conduire', lettres: 'DRIVINGLICENCE', part: 5 },
  { type: 'Permis de conduire', lettres: 'DRIVINGLICENSE', part: 5 },
  { type: 'Carte étudiante', lettres: 'CARTEDETUDIANT', part: 5 },
  { type: 'Carte étudiante', lettres: 'CARTEETUDIANT', part: 5 },
  { type: 'Carte étudiante', lettres: 'STUDENTCARD', part: 5 },
  { type: 'CNI', lettres: 'CARTENATIONALEDIDENTITE', part: 4, noyaux: [['IDENTIT', 2], ['NATIONAL', 2], ['CARTE', 1]] },
  // Sans « CARTE » : trois erreurs seulement. À quatre, « VÉRIFICATION D'IDENTITÉ » passait
  // (ICATIONDIDENTITE), le noyau « NATIONAL » étant lu sur la ligne voisine jointe.
  { type: 'CNI', lettres: 'NATIONALEDIDENTITE', part: 6, noyaux: [['IDENTIT', 2], ['NATIONAL', 2]] },
  { type: 'CNI', lettres: 'NATIONALIDENTITYCARD', part: 4, noyaux: [['IDENTIT', 2], ['NATIONAL', 2]] },
];

/**
 * Au-delà, une ligne (ou deux lignes jointes) n'est pas un intitulé : le plus long fait 24 lettres,
 * 43 avec sa traduction (« CARTE NATIONALE D'IDENTITÉ / NATIONAL IDENTITY CARD »). Borne le coût.
 */
const LETTRES_MAX_INTITULE = 80;
/** Les intitulés sont en haut de la pièce : lignes examinées par la recherche tolérante. */
const LIGNES_MAX_INTITULE = 40;

function estMotNational(mot: string): boolean {
  if (mot.length < 7 || mot.length > 11) return false;
  const national = Math.min(distance(mot, 'NATIONALE', 2), distance(mot, 'NATIONAL', 2));
  if (national > 2) return false;
  // « NATIONALITÉ » est un libellé de champ, présent sur toutes les pièces.
  return Math.min(distance(mot, 'NATIONALITE', 2), distance(mot, 'NATIONALITY', 2)) > national;
}
function estMotIdentite(mot: string): boolean {
  if (mot.length < 6 || mot.length > 11) return false;
  return distance(mot, 'IDENTITE', 2) <= 2 || distance(mot, 'DIDENTITE', 2) <= 2 || distance(mot, 'IDENTITY', 2) <= 2;
}
const estMotConsulaire = (mot: string) => mot.length >= 7 && distance(mot, 'CONSULAIRE', 2) <= 2;

/** « CARTE », abîmé, ou sa fin quand le bord de la carte est coupé (« RTE », « TE »). */
function estMotCarte(mot: string): boolean {
  if (mot.length >= 2 && mot.length <= 4 && 'CARTE'.endsWith(mot)) return true;
  return mot.length >= 4 && mot.length <= 6 && distance(mot, 'CARTE', 2) <= 2;
}

/**
 * Intitulés voisins de « … nationale » et de « … d'identité » qui ne sont PAS la
 * CNI : cartes d'identité scolaire, professionnelle, militaire, étudiante,
 * attestation d'identité, carte d'électeur. Cherchés dans les lignes du
 * dernier recours, à deux erreurs près.
 */
const AUTRES_CARTES = ['ETUDIANT', 'ETUDIANTE', 'SCOLAIRE', 'PROFESSIONNELLE', 'MILITAIRE', 'PARLEMENTAIRE', 'ATTESTATION', 'ELECTEUR', 'ELECTORALE'];
const estAutreCarte = (mot: string) => mot.length >= 6 && AUTRES_CARTES.some((a) => distance(mot, a, 2) <= 2);

/** Mots de liaison sautés autour de « nationale » et « identité » : « D'IDENTITÉ » est lu « D IDENTITE ». */
const estLiaison = (mot: string) => mot === 'D' || mot === 'DE' || mot === 'DI';

/**
 * « NATIONALE » à sa place d'intitulé : en début de ligne ou après « CARTE »,
 * et suivi de rien, ou de « d'identité ». Pas « POLICE NATIONALE », « CAISSE
 * NATIONALE D'ASSURANCE », « UNIVERSITÉ NATIONALE », « ORDRE NATIONAL ».
 */
function nationalEnIntitule(mots: readonly string[], p: number): boolean {
  if (p > 0 && !estMotCarte(mots[p - 1])) return false;
  let s = p + 1;
  while (s < mots.length && estLiaison(mots[s])) s++;
  return s >= mots.length || estMotIdentite(mots[s]);
}

/**
 * « IDENTITÉ » à sa place d'intitulé : en début de ligne, ou après « CARTE »
 * ou « NATIONALE », et suivi de rien ou de « CARD ». Pas « PIÈCE D'IDENTITÉ »,
 * « PHOTO D'IDENTITÉ », « IDENTITÉ NATIONALE », « IDENTITY NUMBER », « CARTE
 * D'IDENTITÉ PROFESSIONNELLE ».
 */
function identiteEnIntitule(mots: readonly string[], q: number): boolean {
  let a = q - 1;
  while (a >= 0 && estLiaison(mots[a])) a--;
  if (a >= 0 && !estMotCarte(mots[a]) && !estMotNational(mots[a])) return false;
  let s = q + 1;
  while (s < mots.length && estLiaison(mots[s])) s++;
  return s >= mots.length || (mots[s].length <= 5 && distance(mots[s], 'CARD', 1) <= 1);
}

/**
 * Seconde chance pour le type, quand la recherche mot à mot n'a rien reconnu :
 * intitulé très abîmé (« CARTE NATlONALE D'lDENTlTF »), mots collés
 * (« CARTENATIONALED'IDENTITE »), coupé sur deux lignes, ou coupé par une autre
 * ligne d'en-tête lue au milieu. Les lignes du HAUT sont examinées d'abord, et
 * sur une même ligne les intitulés spécifiques passent avant la CNI.
 *
 * Règle de l'utilisateur : la mention « Carte nationale d'identité » en haut
 * d'une carte en fait une CNI. D'où, en dernier recours, un mot proche de
 * « NATIONALE » et un mot proche de « IDENTITÉ » à trois lignes au plus l'un de
 * l'autre, chacun à sa place dans l'intitulé (`nationalEnIntitule`,
 * `identiteEnIntitule`), sans « CONSULAIRE » ni autre carte (`AUTRES_CARTES`)
 * dans ces lignes. Relevé en revue : « POLICE NATIONALE / CARTE D'IDENTITÉ
 * PROFESSIONNELLE », « INSTITUT NATIONAL POLYTECHNIQUE / CARTE D'IDENTITÉ
 * D'ÉTUDIANT » ou « MUTUELLE NATIONALE / … / Pièce d'identité » passaient
 * pour des CNI.
 */
function typeParIntituleTolerant(texte: string): TypePiece | undefined {
  // Les lignes de restes courts (« IE », « Wi ee », guilloches) sont retirées : lues entre « CARTE
  // NATIONALE » et « D'IDENTITÉ », elles séparaient les deux moitiés de l'intitulé. Un intitulé aux
  // lettres espacées (« C A R T E … ») reste : il en a bien plus que cinq.
  const lignes = texte
    .split(/\r?\n/, LIGNES_MAX_INTITULE)
    .map(motsCles)
    .filter((mots) => mots.some((mot) => mot.length >= 3) || mots.join('').length >= 6);
  const compactes = lignes.map((mots) => mots.join(''));
  const rechercher = (lettres: string): TypePiece | undefined => {
    if (!lettres || lettres.length > LETTRES_MAX_INTITULE) return undefined;
    // « Numéro national d'identification » : un libellé de champ, pas l'intitulé (NATIONALDIDENTIFI).
    const identification = apparaitApprox(lettres, 'IDENTIFICATION', 2);
    for (const intitule of INTITULES) {
      if (intitule.type === 'CNI' && identification) continue;
      const tolerance = Math.floor(intitule.lettres.length / intitule.part);
      if (!apparaitApprox(lettres, intitule.lettres, tolerance)) continue;
      // Les mots qui font le type doivent être là : sans eux, « CARTE NATIONALE D'ÉLECTEUR »
      // passait pour une CNI à cinq erreurs de l'intitulé.
      if (intitule.noyaux?.some(([noyau, max]) => !apparaitApprox(lettres, noyau, max))) continue;
      return intitule.type;
    }
    return undefined;
  };
  for (let i = 0; i < lignes.length; i++) {
    const type = rechercher(compactes[i]) ?? (i + 1 < lignes.length ? rechercher(compactes[i] + compactes[i + 1]) : undefined);
    if (type) return type;
  }
  const national = lignes.map((mots) => mots.some((mot, p) => estMotNational(mot) && nationalEnIntitule(mots, p)));
  const identite = lignes.map((mots) => mots.some((mot, q) => estMotIdentite(mot) && identiteEnIntitule(mots, q)));
  const autreCarte = lignes.map((mots) => mots.some((mot) => estMotConsulaire(mot) || estAutreCarte(mot)));
  for (let i = 0; i < lignes.length; i++) {
    if (!national[i] && !identite[i]) continue;
    const fin = Math.min(lignes.length - 1, i + 2);
    let n = false;
    let d = false;
    let c = false;
    for (let r = i; r <= fin; r++) {
      n ||= national[r];
      d ||= identite[r];
      c ||= autreCarte[r];
    }
    if (n && d && !c) return 'CNI';
  }
  return undefined;
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
  const tolerant = typeParIntituleTolerant(texte);
  if (tolerant) return tolerant;
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
