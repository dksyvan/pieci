import { describe, expect, it } from 'vitest';
import {
  detecterTypePiece,
  familleMrz,
  lireRecto,
  MAX_CARACTERES_RECTO,
  MAX_LIGNES_RECTO,
  type LectureRecto,
} from './recto';
import type { TypePiece } from './types';
import source from './recto.ts?raw';

/**
 * La lecture du recto voit passer tout ce qui est imprimé sur la pièce : date
 * et lieu de naissance, numéro, profession, domicile, filiation. Elle ne doit
 * en laisser sortir que le type, le nom et les prénoms. Ces tests vérifient
 * d'abord cela, ensuite la qualité de lecture.
 *
 * Tous les textes sont INVENTÉS : identités fictives, numéros à zéro ou
 * bidon, dates au 1er janvier. Les mises en page des pièces ivoiriennes sont
 * des hypothèses (les libellés exacts ne sont publiés nulle part) : plusieurs
 * variantes par type sont couvertes volontairement. Les cas marqués
 * « Tesseract » reprennent des motifs relevés sur la sortie réelle du moteur,
 * lancé sur des images fictives.
 */

const CLES_AUTORISEES = new Set(['typePiece', 'nom', 'prenom', 'decoupage']);
const sansAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

interface Cas {
  id: string;
  famille: string;
  texte: string;
  attendu: LectureRecto | null;
  /** Chaînes présentes dans le texte qui ne doivent JAMAIS ressortir (numéros, dates, lieux). */
  interdits: string[];
}

const CAS: Cas[] = [
  // ------------------------------------------------------------------ CNI biométrique (hypothèses de mise en page)
  {
    id: 'cni-empile-propre',
    famille: 'CNI 2019+',
    texte: `RÉPUBLIQUE DE CÔTE D'IVOIRE
CARTE NATIONALE D'IDENTITÉ
Nom
KOUASSI
Prénom(s)
ADJOUA MARIE
Date de naissance
01/01/1990
Lieu de naissance
TIASSALÉ
Sexe   Taille
F      1,65
N° de la carte
CI000000000
Date d'expiration
01/01/2030`,
    attendu: { typePiece: 'CNI', nom: 'KOUASSI', prenom: 'ADJOUA MARIE', decoupage: 'libelles' },
    interdits: ['01/01/1990', '1990', 'TIASSAL', 'CI000000000', '2030', '1,65'],
  },
  {
    id: 'cni-meme-ligne-bruit-ocr',
    famille: 'CNI 2019+',
    texte: `REPUBLIQUE DE C0TE D'lVOIRE
CARTE NAT1ONALE D'IDENTITE
N0M : K0UASSl
PRENOM5 : ADJ0UA MARlE
Né(e) le : 01/01/1990 à TIASSALE
Sexe: F Taille: 1,65 m`,
    attendu: { typePiece: 'CNI', nom: 'KOUASSI', prenom: 'ADJOUA MARIE', decoupage: 'libelles' },
    interdits: ['1990', 'TIASSALE', '1,65'],
  },
  {
    id: 'cni-bilingue-nom-surname',
    famille: 'CNI 2019+',
    texte: `REPUBLIQUE DE COTE D'IVOIRE / REPUBLIC OF COTE D'IVOIRE
CARTE NATIONALE D'IDENTITE / NATIONAL IDENTITY CARD
Nom / Surname
N’GUESSAN
Prénoms / Given names
KOFFI SERGE-YVAN
Date de naissance / Date of birth
01 01 1985`,
    attendu: { typePiece: 'CNI', nom: "N'GUESSAN", prenom: 'KOFFI SERGE-YVAN', decoupage: 'libelles' },
    interdits: ['1985'],
  },
  {
    id: 'cni-apostrophe-perdue-espace',
    famille: 'CNI 2019+',
    texte: `CARTE NATIONALE D IDENTITE
Nom: N GUESSAN
Prénoms: AYA ÉLODIE`,
    attendu: { typePiece: 'CNI', nom: "N'GUESSAN", prenom: 'AYA ÉLODIE', decoupage: 'libelles' },
    interdits: [],
  },
  {
    id: 'cni-guilloches-et-valeur-fusionnee',
    famille: 'CNI 2019+',
    texte: `~ _-— = ,. ;
CARTE NATIONALE D'IDENTITÉ
Nom : KOUAMÉ
~~ , .
Prénoms : AFFOUÉ ESTELLE Née le 01.01.1992 à DIMBOKRO
N° CI 0000 0000 00`,
    attendu: { typePiece: 'CNI', nom: 'KOUAMÉ', prenom: 'AFFOUÉ ESTELLE', decoupage: 'libelles' },
    interdits: ['1992', 'DIMBOKRO', '0000'],
  },
  {
    id: 'cni-colonnes-libelles-puis-valeurs',
    famille: 'CNI 2019+',
    texte: `CARTE NATIONALE D'IDENTITE
Nom
Prénom(s)
YAO
AMENAN CHRISTELLE
Date de naissance
01/01/1999`,
    attendu: { typePiece: 'CNI', nom: 'YAO', prenom: 'AMENAN CHRISTELLE', decoupage: 'colonnes' },
    interdits: ['1999'],
  },
  {
    id: 'cni-prenom-illisible-date-dessous',
    famille: 'CNI 2019+',
    texte: `CARTE NATIONALE D'IDENTITE
Nom : KOUASSI
Prénom(s)
01/01/1990
BOUAFLÉ`,
    attendu: { typePiece: 'CNI', nom: 'KOUASSI', decoupage: 'libelles' },
    interdits: ['1990', 'BOUAFL'],
  },
  {
    id: 'cni-prenom-illisible-lieu-dessous-connu',
    famille: 'CNI 2019+',
    texte: `CARTE NATIONALE D'IDENTITE
Nom : KOUASSI
Prénom(s)
ABIDJAN`,
    attendu: { typePiece: 'CNI', nom: 'KOUASSI', decoupage: 'libelles' },
    interdits: ['ABIDJAN'],
  },
  {
    id: 'cni-libelles-deformes-rn-ivi',
    famille: 'CNI 2019+',
    texte: `CARTE NATIONALE D'IDENTITE
NOIVI : DIABATÉ
Prenorns : MAMADOU`,
    attendu: { typePiece: 'CNI', nom: 'DIABATÉ', prenom: 'MAMADOU', decoupage: 'libelles' },
    interdits: [],
  },
  {
    id: 'cni-mrz-parasite-dans-le-texte',
    famille: 'CNI 2019+ (verso lu par erreur)',
    texte: `IDCIV0000000000<<<<<<<<<<<<<<<
9001010F3001017CIV<<<<<<<<<<<0
KOUASSI<<ADJOUA<MARIE<<<<<<<<<`,
    attendu: { typePiece: 'CNI' },
    interdits: ['0000000000', '900101', '300101'],
  },
  // ------------------------------------------------------------------ Ancienne CNI (modèles antérieurs, hypothèses)
  {
    id: 'ancienne-cni-profession-etudiant',
    famille: 'CNI ancienne',
    texte: `REPUBLIQUE DE COTE D'IVOIRE
CARTE NATIONALE D'IDENTITE
Nom : TIÉ BI
Prénoms : GOORÉ ANGE
Né le : 01/01/1985 à DALOA
Profession : ETUDIANT
Domicile : YOPOUGON`,
    attendu: { typePiece: 'CNI', nom: 'TIÉ BI', prenom: 'GOORÉ ANGE', decoupage: 'libelles' },
    interdits: ['1985', 'DALOA', 'YOPOUGON', 'ETUDIANT'],
  },
  {
    id: 'ancienne-cni-filiation',
    famille: 'CNI ancienne (verso)',
    texte: `Nom et prénoms du père : KOUASSI YAO JULES
Nom et prénoms de la mère : AKISSI AMOIN
Domicile : BOUAKE`,
    attendu: null,
    interdits: ['BOUAKE', 'JULES', 'AMOIN'],
  },
  {
    id: 'ancienne-cni-nom-usage',
    famille: 'CNI ancienne',
    texte: `CARTE NATIONALE D'IDENTITE
Nom : KONÉ
Nom d'usage : EPOUSE TRAORÉ
Prénoms : AWA`,
    attendu: { typePiece: 'CNI', nom: 'KONÉ', prenom: 'AWA', decoupage: 'libelles' },
    interdits: ['TRAOR'],
  },
  // ------------------------------------------------------------------ Permis de conduire
  {
    id: 'permis-libelles',
    famille: 'Permis (carte)',
    texte: `RÉPUBLIQUE DE CÔTE D'IVOIRE
MINISTÈRE DES TRANSPORTS
PERMIS DE CONDUIRE
Nom : KONAN
Prénoms : KOFFI JEAN-MARC
Date et lieu de naissance : 01.01.1980 YAMOUSSOUKRO
Délivré le : 01.01.2015
N° : 000000000000
Catégories : B`,
    attendu: { typePiece: 'Permis de conduire', nom: 'KONAN', prenom: 'KOFFI JEAN-MARC', decoupage: 'libelles' },
    interdits: ['1980', 'YAMOUSSOUKRO', '2015', '000000000000'],
  },
  {
    id: 'permis-numerote-iso',
    famille: 'Permis (champs numérotés)',
    texte: `REPUBLIQUE DE COTE D'IVOIRE
PERMIS DE CONDUIRE
1. KONAN
2. KOFFI JEAN-MARC
3. 01.01.1980 BOUAKE
4a. 01.01.2015  4b. 01.01.2025
4c. DIRECTION GENERALE DES TRANSPORTS
5. 0000000000
9. B`,
    attendu: { typePiece: 'Permis de conduire', nom: 'KONAN', prenom: 'KOFFI JEAN-MARC', decoupage: 'numerotation' },
    interdits: ['1980', 'BOUAKE', '2015', '2025', '0000000000'],
  },
  {
    id: 'permis-numerote-bruite',
    famille: 'Permis (champs numérotés)',
    texte: `PERM1S DE C0NDUIRE
l. OUATTARA
2 . SALIMATA
3. 01/01/1994 KORHOGO`,
    attendu: { typePiece: 'Permis de conduire', nom: 'OUATTARA', prenom: 'SALIMATA', decoupage: 'numerotation' },
    interdits: ['1994', 'KORHOGO'],
  },
  {
    id: 'permis-nom-et-prenoms',
    famille: 'Permis (ancien modèle)',
    texte: `PERMIS DE CONDUIRE
Nom et Prénoms : KONAN KOFFI JEAN-MARC
Né le 01/01/1980 à GAGNOA`,
    attendu: { typePiece: 'Permis de conduire', nom: 'KONAN', prenom: 'KOFFI JEAN-MARC', decoupage: 'devine' },
    interdits: ['1980', 'GAGNOA'],
  },
  {
    id: 'permis-combine-bi',
    famille: 'Permis (ancien modèle)',
    texte: `PERMIS DE CONDUIRE
NOM ET PRENOMS: IRIÉ BI ZAH ROMÉO
Catégorie B`,
    attendu: { typePiece: 'Permis de conduire', nom: 'IRIÉ BI', prenom: 'ZAH ROMÉO', decoupage: 'devine' },
    interdits: [],
  },
  {
    id: 'permis-combine-deux-patronymes-piege',
    famille: 'Permis (ancien modèle)',
    texte: `PERMIS DE CONDUIRE
Nom & Prénoms : KOUADIO KOFFI YAO`,
    // Découpage deviné : nom = premier mot. Sur la vraie pièce ce pourrait être « KOUADIO KOFFI » + « YAO ».
    attendu: { typePiece: 'Permis de conduire', nom: 'KOUADIO', prenom: 'KOFFI YAO', decoupage: 'devine' },
    interdits: [],
  },
  // ------------------------------------------------------------------ Carte étudiante
  {
    id: 'etudiant-universite-libelles',
    famille: 'Carte étudiante',
    texte: `UNIVERSITÉ DES LAGUNES
CARTE D'ÉTUDIANT
Année universitaire 2025-2026
Nom : DIALLO
Prénoms : FATOUMATA BINTA
Matricule : CI0000000000
UFR : SCIENCES ÉCONOMIQUES ET GESTION
Niveau : LICENCE 2`,
    attendu: { typePiece: 'Carte étudiante', nom: 'DIALLO', prenom: 'FATOUMATA BINTA', decoupage: 'libelles' },
    interdits: ['2025', 'CI0000000000', 'SCIENCES', 'LICENCE'],
  },
  {
    id: 'etudiant-casse-mixte',
    famille: 'Carte étudiante',
    texte: `Carte d'étudiant
Nom: Diallo
Prénom(s): Fatoumata Binta
Né(e) le: 01/01/2004`,
    attendu: { typePiece: 'Carte étudiante', nom: 'DIALLO', prenom: 'FATOUMATA BINTA', decoupage: 'libelles' },
    interdits: ['2004'],
  },
  {
    id: 'etudiant-nom-et-prenoms-lou',
    famille: 'Carte étudiante',
    texte: `UNIVERSITE DU CENTRE-OUEST
CARTE ETUDIANT
Nom & Prénoms
ZAMBLÉ LOU IRÈNE
Matricule 0000000
Filière : AGROFORESTERIE`,
    attendu: { typePiece: 'Carte étudiante', nom: 'ZAMBLÉ LOU', prenom: 'IRÈNE', decoupage: 'devine' },
    interdits: ['0000000', 'AGROFORESTERIE'],
  },
  {
    id: 'etudiant-sans-titre-mais-universite-matricule',
    famille: 'Carte étudiante',
    texte: `UNIVERSITE DE LA SAVANE
MATRICULE : 00000000
NOM : COULIBALY
PRENOMS : ISSOUF`,
    attendu: { typePiece: 'Carte étudiante', nom: 'COULIBALY', prenom: 'ISSOUF', decoupage: 'libelles' },
    interdits: ['00000000'],
  },
  {
    id: 'etudiant-ecole-privee-nom-seul',
    famille: 'Carte étudiante (école)',
    texte: `CARTE D'ETUDIANT 2025-2026
KOFFI Aya Grâce
Classe : BTS 2 FCGE`,
    attendu: { typePiece: 'Carte étudiante' },
    interdits: ['2025', 'BTS'],
  },
  // ------------------------------------------------------------------ Cartes consulaires (souvent ÉTRANGÈRES en CI)
  {
    id: 'consulaire-burkina-libelles',
    famille: 'Carte consulaire (étrangère)',
    texte: `BURKINA FASO
CONSULAT GÉNÉRAL À ABIDJAN
CARTE D'IDENTITÉ CONSULAIRE
Nom : OUÉDRAOGO
Prénom(s) : SALIF
Né le : 01/01/1975 à KOUDOUGOU
Profession : COMMERÇANT
Adresse : ABOBO`,
    attendu: { typePiece: 'Carte consulaire', nom: 'OUÉDRAOGO', prenom: 'SALIF', decoupage: 'libelles' },
    interdits: ['1975', 'KOUDOUGOU', 'ABOBO', 'COMMER'],
  },
  {
    id: 'consulaire-meme-ligne',
    famille: 'Carte consulaire (étrangère)',
    texte: `AMBASSADE DE LA RÉPUBLIQUE DU MALI
CARTE CONSULAIRE
NOM: TRAORÉ PRENOMS: MOUSSA N° 00000`,
    attendu: { typePiece: 'Carte consulaire', nom: 'TRAORÉ', prenom: 'MOUSSA', decoupage: 'libelles' },
    interdits: ['00000'],
  },
  {
    id: 'consulaire-ivoirienne-bruit',
    famille: 'Carte consulaire (ivoirienne, étranger)',
    texte: `REPUBLIQUE DE COTE D'IVOIRE
CONSULAT GENERAL
CARTE C0NSULAIRE
Nom KOFFI
Prénoms AMA LAURE
Date de naissance 01/01/1988`,
    attendu: { typePiece: 'Carte consulaire', nom: 'KOFFI', prenom: 'AMA LAURE', decoupage: 'libelles' },
    interdits: ['1988'],
  },
  // ------------------------------------------------------------------ Passeport (repli si la MRZ n'a pas été lue)
  {
    id: 'passeport-page-donnees',
    famille: 'Passeport',
    texte: `RÉPUBLIQUE DE CÔTE D'IVOIRE
PASSEPORT / PASSPORT
Type P  Code CIV  N° du passeport / Passport No. 00AA00000
Nom / Surname
KOUADIO
Prénoms / Given names
AYA PRISCILLE
Nationalité / Nationality IVOIRIENNE
Date de naissance / Date of birth 01 JAN / JAN 1995
Autorité / Authority SECTION CONSULAIRE`,
    attendu: { typePiece: 'Passeport', nom: 'KOUADIO', prenom: 'AYA PRISCILLE', decoupage: 'libelles' },
    interdits: ['00AA00000', '1995', 'IVOIRIENNE'],
  },
  {
    id: 'passeport-seulement-mrz',
    famille: 'Passeport',
    texte: `P<CIVKOUADIO<<AYA<PRISCILLE<<<<<<<<<<<<<<<<<<
00AA000000CIV9501012F3001014<<<<<<<<<<<<<<00`,
    attendu: { typePiece: 'Passeport' },
    interdits: ['00AA', '950101'],
  },
  {
    id: 'mrz-carte-etrangere',
    famille: 'Carte d’identité étrangère',
    texte: `IDBFA0000000000<<<<<<<<<<<<<<<
7501011M3001015BFA<<<<<<<<<<<0
OUEDRAOGO<<SALIF<<<<<<<<<<<<<<`,
    attendu: null,
    interdits: ['0000000000', '750101'],
  },
  // ------------------------------------------------------------------ Motifs relevés sur la sortie réelle de Tesseract (images fictives)
  {
    id: 'tesseract-lecture-eparse-valeurs-avant-libelles',
    famille: 'Tesseract psm 11',
    texte: `IMEN FICTIF
CARTE D'
KONAN
AFFOUÉ ESTELLE
Prénomis)
, TIASSALÉ
Né le
01/01/1975
COMMERÇANT`,
    // Ce qui suit « Prénom(s) » est le LIEU de naissance : on doit s'abstenir.
    attendu: null,
    interdits: ['TIASSAL', '1975', 'COMMER'],
  },
  {
    id: 'tesseract-penchee-valeur-au-dessus-du-libelle',
    famille: 'Tesseract psm 11 (image penchée 6°)',
    texte: `ITÉ CONSULAIRE
Nom:    KONAN
AFFOUÉ ESTELLF
Prénoms) :
» TIASSALÉ
Néle:
04/04/1975`,
    // La valeur des prénoms est AU-DESSUS du libellé ; dessous, c'est le lieu de naissance.
    attendu: { typePiece: 'Carte consulaire', nom: 'KONAN', decoupage: 'libelles' },
    interdits: ['TIASSAL', '1975'],
  },
  {
    id: 'tesseract-penchee-tout-decale',
    famille: 'Tesseract psm 11 (image penchée 6°)',
    texte: `ITÉ CONSULAIRE
N'GUESSAN
Nom:
KOFFI SERGE-YVAN
prénoms) :
» TIASSALÉ
Néle:
04/01/1975`,
    attendu: { typePiece: 'Carte consulaire' },
    interdits: ['TIASSAL', '1975'],
  },
  {
    id: 'tesseract-libelle-nom-perdu',
    famille: 'Tesseract psm 11',
    texte: `RÉPUBLIQUE D'UTOPIE — SPÉCIMEN FICTIF
CARTE NATIONALE D'IDENTITÉ
N'GUESSAN
Prénom(s)
KOFFI SERGE-YVAN
Date de naissance
Lieu de naissance
01/01/1990`,
    attendu: { typePiece: 'CNI', nom: "N'GUESSAN", prenom: 'KOFFI SERGE-YVAN', decoupage: 'position' },
    interdits: ['1990'],
  },
  {
    id: 'tesseract-nele-colle',
    famille: 'Tesseract psm 11',
    texte: `CARTE D'IDENTITÉ CONSULAIRE
Nom. KONAN
Prénoms
AFFOUÉ ESTELLE
Néle
01/01/1975
» TIASSALÉ`,
    attendu: { typePiece: 'Carte consulaire', nom: 'KONAN', prenom: 'AFFOUÉ ESTELLE', decoupage: 'libelles' },
    interdits: ['1975', 'TIASSAL'],
  },
  {
    id: 'tesseract-libelle-combine-tronque',
    famille: 'Tesseract psm 3',
    texte: `UNIVERSITÉ D'UTOPIE — spÉCIMEN FICTIF
Année univer  sitait
Nom et Prén
N'GUESSAN KOFFI SERGE-YVAN
Matricule      uT0000000000`,
    attendu: { typePiece: 'Carte étudiante', nom: "N'GUESSAN", prenom: 'KOFFI SERGE-YVAN', decoupage: 'devine' },
    interdits: ['0000000000'],
  },
  {
    id: 'tesseract-prenoms-coupes-sur-deux-lignes',
    famille: 'Tesseract psm 11 (image penchée)',
    texte: `Nom
KONAN
prénomis)
KOFFI
SERGE-YVAN
Lieu de
naissan`,
    // Deux lignes de noms sous « Prénoms » : on ne sait pas si la 2e appartient aux prénoms → abstention sur le prénom.
    attendu: { nom: 'KONAN', decoupage: 'libelles' },
    interdits: [],
  },
  // ------------------------------------------------------------------ Cas négatifs / pièges
  {
    id: 'vide',
    famille: 'piège',
    texte: '',
    attendu: null,
    interdits: [],
  },
  {
    id: 'que-des-chiffres',
    famille: 'piège',
    texte: `0000 0000 0000
01/01/1990
CI 000 000 000`,
    attendu: null,
    interdits: ['0000', '1990'],
  },
  {
    id: 'nom-remplace-par-numero',
    famille: 'piège',
    texte: `CARTE NATIONALE D'IDENTITE
Nom : 0123456789
Prénoms : C0012345`,
    attendu: { typePiece: 'CNI' },
    interdits: ['0123456789', 'C0012345', '12345'],
  },
  {
    id: 'sans-libelles',
    famille: 'piège',
    texte: `REPUBLIQUE DE COTE D'IVOIRE
KOUASSI
ADJOUA MARIE
01/01/1990
BOUAKE`,
    attendu: null,
    interdits: ['1990', 'BOUAKE'],
  },
  {
    id: 'prenoms-avec-sexe-colle',
    famille: 'piège',
    texte: `Nom : SORO
Prénoms : GBONGUÉ ALI M 1,80`,
    attendu: { nom: 'SORO', prenom: 'GBONGUÉ ALI', decoupage: 'libelles' },
    interdits: ['1,80'],
  },
  {
    id: 'prenom-avec-a-lieu',
    famille: 'piège',
    texte: `Nom : BAMBA
Prénoms : MARIAM À SÉGUÉLA`,
    attendu: { nom: 'BAMBA', prenom: 'MARIAM', decoupage: 'libelles' },
    interdits: ['SÉGUÉLA', 'SEGUELA'],
  },
  {
    id: 'points-de-conduite',
    famille: 'piège',
    texte: `Nom ............ ASSI
Prénoms ......... EDI, JUNIOR`,
    attendu: { nom: 'ASSI', prenom: 'EDI JUNIOR', decoupage: 'libelles' },
    interdits: [],
  },
  {
    id: 'libelle-colle-valeur',
    famille: 'piège',
    texte: `NomKOUAKOU
Prénoms:AHOU`,
    attendu: { nom: 'KOUAKOU', prenom: 'AHOU', decoupage: 'libelles' },
    interdits: [],
  },
  {
    id: 'tout-minuscules',
    famille: 'piège',
    texte: `carte nationale d'identite
nom : kouassi
prenoms : adjoua`,
    attendu: { typePiece: 'CNI', nom: 'KOUASSI', prenom: 'ADJOUA', decoupage: 'libelles' },
    interdits: [],
  },
  {
    id: 'type-seul-cmu',
    famille: 'hors périmètre',
    texte: `CARTE CMU
COUVERTURE MALADIE UNIVERSELLE
Nom : KONE
Prénoms : ADAMA`,
    attendu: { nom: 'KONE', prenom: 'ADAMA', decoupage: 'libelles' },
    interdits: [],
  },
];

// ---------------------------------------------------------------------------

describe('lireRecto — batterie de cas', () => {
  it.each(CAS.map((c) => [`${c.famille} — ${c.id}`, c] as const))('%s', (_, c) => {
    const lecture = lireRecto(c.texte);
    expect(lecture).toEqual(c.attendu);
    // Confidentialité : clés, chiffres, chaînes interdites.
    const s = JSON.stringify(lecture) ?? '';
    for (const cle of Object.keys(lecture ?? {})) expect(CLES_AUTORISEES.has(cle)).toBe(true);
    expect(s).not.toMatch(/\d/);
    for (const interdit of c.interdits) expect(sansAccents(s)).not.toContain(sansAccents(interdit));
    // Pureté : deux appels, même résultat.
    expect(lireRecto(c.texte)).toEqual(lecture);
  });

  it('couvre les 47 cas du prototype', () => {
    expect(CAS).toHaveLength(47);
    expect(new Set(CAS.map((c) => c.id)).size).toBe(47);
  });
});

describe('lireRecto — régressions : lieu de naissance lu comme prénoms', () => {
  /*
   * Textes produits par le banc de bruit ci-dessous, avec d'autres graines, sur
   * lesquels le prototype rendait le lieu de naissance (ou une ville) comme nom
   * ou prénoms. Tous à 10 % de bruit, avec des villes absentes de la liste des
   * lieux connus : seule la structure du texte les trahit. Les signatures :
   * - un libellé de lieu resté sans valeur près de la valeur lue : le lieu est
   *   remonté dans l'ordre de lecture ;
   * - « KONAN Prénoms » (ligne fusionnée) alors qu'un nom a déjà été lu
   *   ailleurs, ou pris pour un en-tête de colonne ;
   * - un libellé seul lu APRÈS la date ou le lieu de naissance ;
   * - en colonnes, une « ligne du nom » qui porte déjà « Date de naissance ».
   */
  it.each([
    [
      'lieu sous « PRÉNOM(S) », libellé du lieu orphelin juste après',
      "KÉPUBLIQUE DE CÔTE D'IVOIRE\nCARTE NATIONALF D'ID3NTITÉ\nNOM\n\"\nZAMBLÉ LOV\nAMENAH DATE DE HAI55ANCE\nPRÉNOM(S)\nTIA5SALÉ\n03/03/1967 LIEU DE NA1SSANCE\nSexe Taille F 1,65\nN° de la carte\n. :\nCI109596023\n|| ,",
      'TIASSAL',
    ],
    [
      'colonnes : « LIEV DE N4ISSANC3 » lu comme valeur',
      "RÉPUBLIQUE DE CÔTE D'IVOIRE\nCARTE NATIONALE D'1DENTITÉ\nNOM\n\"\nKONAN PRÉNOM(S)\nS3R6E-YVAH SALIMATA MAMÀDOU DATE DF NAISSANCE\nLIEV DE N4ISSANC3 ABIDJAN\n18/04/1996\nSexe Taille F 1,65\nN° de la carte CI810416967\n~ — _ =",
      'ABIDJAN',
    ],
    [
      'colonnes après « DI4LLO Prénom(s) », lieu au-dessus de son libellé',
      "RÉPUBLIQVE DE CÔTE D'IVOIRE\nCARTE NATIQNALE D'IDENTITÉ\n- ~\nNom\nDI4LLO Prénom(s)\n5ALIMATA\n\"\nTIASSALÉ\nLIEU DE N4ISSANCE\n. :\nSexe Taille F 1,65\nN° de la carte\nCI076335843",
      'TIASSAL',
    ],
    [
      'colonnes, lieu suivi de « L1EU DE NAISSANCE » sans valeur',
      "CÀRTENATIOMALF D'IDENTITÉ\nRÉPUBLIQUE DE CÔTE D'IVOIRE\n- ~\nNom\nPRÉNOM(S)\n. :\nAMFNAN AYA DATE D3 NAl55ANCE\nAGNIBILÉKROU Sexe Taille\nL1EU DE NAISSANCE\nF1,65\nN° de la carte\n- ~\nee\nCI344683284",
      'AGNIBIL',
    ],
    [
      'bilingue : « GNAH0RÉ Prénoms / Given names » après un nom déjà lu',
      "CAKTE N4TION4LE D'IDENT1TÉ / NATIONAL |DENTITY CARD Nom / Surnamé\nMÀRIEINNOC3NT KOFFI\nGNAH0RÉ Prénoms / Given names\nTOUBA\n19/10/2002",
      'TOUBA',
    ],
    [
      'bilingue en colonnes après « KOHAH Prénoms / G1ven names »',
      "CARTE N4TIOH4L3 D'IDENTITÉ / NÀTIONAL |DENTITY CARD\n~ — _ =\nN0m/ Surname\nKOHAH Prénoms / G1ven names\n. :\nANGE GRÂCE MAKIAM Date de naissance /Date of birth\nISSlA\n03/01/1978 Lieu de naissance / Place of birth",
      'ISSIA',
    ],
    [
      'bilingue : « Nom / Surnamé » lu après la date de naissance, lieu dessous',
      "CARTE N4TIONALE D'IDEHTITÉ / MATIOHAL IDENTITY CARD\nKDNÉ\nKOrnÉO Date de naissance / Date 0f birth\n12/10/1975\nNom / Surnamé\n8OUAFLÉ",
      'BOUAFL',
    ],
    [
      'colonnes : « ISSOUF Date de naissance » pris pour la ligne du nom',
      "RÉPVBLIQUE DF CÔTE D'IVOIRE\n\"\nCAKTE NATIONALE D'IDENTITÉ\nNom\nPREHOM(S)\nISSOUF Date de naissance\n~ — _ =\nDIMBOKRO\n05/04/1973 Liéu de naissance\n~ — _ =\nSexc Taille\nF 1,65\n. :\nCI297337105",
      'DIMBOKRO',
    ],
    [
      '« PRÉNOM(S) » lu après le lieu de naissance',
      "RÉPUBLIQUE DE CÔTE D'IVOIRE\nWi\nCARTE NATIONALE D'IDENTITÉ NOrn\nee\nESSOH\nWi\nINNOCENT ADJOUA N'6ORAN DATE DE NAISSANCE\n21/02/1996 LI3U DE N4IS5ANCE\nPRÉNOM(S)\nTIAS5ALÉ 5exe Taille\nF1,65\nN° de la carte\nCI342752145\nee",
      'TIASSAL',
    ],
    // Relevés en revue : une date SANS son libellé, lue avant « Prénoms », n'était pas vue comme
    // une lecture dans le désordre. Le premier texte vient du banc ci-dessous (graine 10, 10 %).
    [
      'bilingue : date sans libellé au-dessus de « Prénoms / Given names », lieu abîmé',
      "CART3 NATIONALE D'IDENTITÉ / NATIONALIDENTITYCÀRD\nKONÉ\nWi\n14/09/2004\nPrénoms / Given names\nSIHFRA",
      'SIHFRA',
    ],
    [
      'bilingue : même texte, lieu intact',
      "CART3 NATIONALE D'IDENTITÉ / NATIONALIDENTITYCÀRD\nKONÉ\nWi\n14/09/2004\nPrénoms / Given names\nTIASSALÉ",
      'TIASSAL',
    ],
    ['« Nom : KONÉ », puis une date sans libellé, puis « Prénoms »', "CARTE NATIONALE D'IDENTITÉ\nNom : KONÉ\n14/09/2004\nPrénoms\nDIMBOKRO", 'DIMBOKRO'],
    ['date lue avec des O et des I', "CARTE NATIONALE D'IDENTITÉ\nNom : KONÉ\n14/O9/2OO4\nPrénoms\nDIMBOKRO", 'DIMBOKRO'],
    ['date à points', "CARTE NATIONALE D'IDENTITÉ\nNom : KONÉ\n14.09.2004\nPrénoms\nSINFRA", 'SINFRA'],
  ])('%s', (_, texte, lieu) => {
    const lecture = lireRecto(texte);
    const s = sansAccents(JSON.stringify(lecture) ?? '');
    expect(s).not.toContain(sansAccents(lieu));
    expect(s).not.toMatch(/\d/);
    expect(lecture?.typePiece).toBe('CNI');
  });

  it('date sans libellé avant « Prénoms » : le nom lu sur sa ligne reste, les prénoms dessous non', () => {
    expect(lireRecto("CARTE NATIONALE D'IDENTITÉ\nNom : KONÉ\n14/09/2004\nPrénoms\nDIMBOKRO")).toEqual({
      typePiece: 'CNI', nom: 'KONÉ', decoupage: 'libelles',
    });
    expect(lireRecto("CART3 NATIONALE D'IDENTITÉ / NATIONALIDENTITYCÀRD\nKONÉ\nWi\n14/09/2004\nPrénoms / Given names\nSINFRA")).toEqual({
      typePiece: 'CNI',
    });
  });

  it('une date au-dessus ne gêne ni les valeurs sur la ligne du libellé, ni une date après les prénoms', () => {
    expect(lireRecto("CARTE NATIONALE D'IDENTITÉ\nDélivrée le 01/01/2020\nNom : KONÉ\nPrénoms : AWA")).toEqual({
      typePiece: 'CNI', nom: 'KONÉ', prenom: 'AWA', decoupage: 'libelles',
    });
    expect(lireRecto('Nom\nKONÉ\nPrénoms\nAWA\n14/09/2004\nSINFRA')).toEqual({ nom: 'KONÉ', prenom: 'AWA', decoupage: 'libelles' });
  });

  it('un lieu de naissance À SA PLACE, après son libellé, ne bloque pas la lecture', () => {
    expect(lireRecto("CARTE NATIONALE D'IDENTITE\nNom\nKOUASSI\nPrénom(s)\nADJOUA\nLieu de naissance\nTIASSALÉ")).toEqual({
      typePiece: 'CNI', nom: 'KOUASSI', prenom: 'ADJOUA', decoupage: 'libelles',
    });
    expect(lireRecto('Nom\nKOUASSI\nPrénom(s)\nADJOUA\nDate et lieu de naissance\n01/01/1990 TIASSALÉ')).toEqual({
      nom: 'KOUASSI', prenom: 'ADJOUA', decoupage: 'libelles',
    });
  });

  it('une ville connue dans une valeur la fait refuser, sauf un prénom homonyme', () => {
    expect(lireRecto('Nom : KONAN\nPrénoms : AYA ABIDJAN')).toEqual({ nom: 'KONAN', decoupage: 'libelles' });
    expect(lireRecto('Nom : KONAN\nPrénoms : MARIE FRANCE')).toEqual({ nom: 'KONAN', prenom: 'MARIE FRANCE', decoupage: 'libelles' });
  });
});

describe('familleMrz — la famille seulement, aucun champ', () => {
  it('passeport, carte d’identité ivoirienne, carte étrangère', () => {
    expect(familleMrz('P<CIVKOUADIO<<AYA<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')).toBe('passeport');
    expect(familleMrz('IDCIV0000000000<<<<<<<<<<<<<<<')).toBe('carte-civ');
    expect(familleMrz('IDC1V0000000000<<<<<<<<<<<<<<<')).toBe('carte-civ');
    expect(familleMrz('I<BFA0000000000<<<<<<<<<<<<<<<')).toBe('carte-autre');
  });

  it('même règle que mrz.ts : « CNI » seulement pour le code I', () => {
    expect(familleMrz('ACCIV0000000000<<<<<<<<<<<<<<<')).toBe('carte-autre');
    expect(familleMrz('C<CIV0000000000<<<<<<<<<<<<<<<')).toBe('carte-autre');
    expect(lireRecto('ACCIV0000000000<<<<<<<<<<<<<<<')).toBeNull();
  });

  it('une ligne de NOM de carte ne passe pas pour une carte', () => {
    expect(familleMrz('COULIBALY<<AWA<<<<<<<<<<<<<<<<')).toBeUndefined();
    expect(familleMrz('PAKOU<<AYA<<<<<<<<<<<<<<<<<<<<')).toBeUndefined();
  });
});

describe('detecterTypePiece', () => {
  it('« Profession : ÉTUDIANT » sur une CNI ne fait pas une carte étudiante', () => {
    expect(detecterTypePiece("CARTE NATIONALE D'IDENTITE\nProfession : ETUDIANT")).toBe('CNI');
  });

  it('tolère environ une erreur de l’OCR pour 7 caractères, pas davantage', () => {
    expect(detecterTypePiece('PERM1S DE C0NDUIRE')).toBe('Permis de conduire');
    expect(detecterTypePiece('CARTE C0NSULAIRE')).toBe('Carte consulaire');
    expect(detecterTypePiece('PASSEP0RT')).toBe('Passeport');
    expect(detecterTypePiece('PERMUS DX CONDUIRE')).toBe('Permis de conduire');
    expect(detecterTypePiece('PARMIS DX CANDUIRX')).toBeUndefined();
  });

  it('ne rend que les types de la liste de Pièci', () => {
    const TYPES: TypePiece[] = ['CNI', 'Passeport', 'Permis de conduire', 'Carte étudiante', 'Carte consulaire'];
    for (const c of CAS) {
      const type = lireRecto(c.texte)?.typePiece;
      if (type !== undefined) expect(TYPES).toContain(type);
    }
  });
});

describe('lireRecto — entrées inexploitables et bornes', () => {
  it('valeurs qui ne sont pas du texte : null, sans exception', () => {
    for (const entree of [null, undefined, 42, {}, ['Nom : KOUASSI']]) {
      expect(() => lireRecto(entree as unknown as string)).not.toThrow();
      expect(lireRecto(entree as unknown as string)).toBeNull();
    }
    expect(lireRecto('   \n\t  ')).toBeNull();
  });

  it('au-delà des bornes : abstention, même si le texte contient une identité lisible', () => {
    const lisible = "CARTE NATIONALE D'IDENTITE\nNom : KOUASSI\nPrénoms : ADJOUA";
    expect(lireRecto(lisible)).not.toBeNull();
    expect(lireRecto(lisible + ' '.repeat(MAX_CARACTERES_RECTO))).toBeNull();
    expect(lireRecto(lisible + '\n'.repeat(MAX_LIGNES_RECTO))).toBeNull();
    expect(detecterTypePiece(lisible + '\n'.repeat(MAX_LIGNES_RECTO))).toBeUndefined();
  });

  it('un mot démesuré arrête la lecture au lieu de sortir comme nom', () => {
    expect(lireRecto(`Nom : ${'KOUASSI'.repeat(10)}\nPrénoms : ADJOUA`)).toEqual({ prenom: 'ADJOUA', decoupage: 'libelles' });
  });
});

describe('lireRecto — coût borné', () => {
  /** Répète un motif jusqu'aux bornes, en caractères comme en lignes. */
  function jusquALaBorne(motif: string, separateur: string): string {
    const sautsParMotif = motif.split('\n').length - 1 + (separateur.split('\n').length - 1);
    const parCaracteres = Math.floor(MAX_CARACTERES_RECTO / (motif.length + separateur.length));
    const parLignes = sautsParMotif ? Math.floor((MAX_LIGNES_RECTO - 1) / sautsParMotif) : parCaracteres;
    const texte = Array(Math.min(parCaracteres, parLignes)).fill(motif).join(separateur);
    return texte;
  }

  const HOSTILES: [string, string][] = [
    ['libellés « Nom » à la chaîne', jusquALaBorne('Nom', ' ')],
    ['« Nom et prénoms » sans valeur, puis une ligne de noms', `${jusquALaBorne('Nom et prénoms', ' ').slice(0, 4000)}\n${jusquALaBorne('KOUASSI', ' ').slice(0, 3900)}`],
    ['libellés isolés suivis de bruit', jusquALaBorne('Prénoms . , ;', ' ')],
    ['ponctuation en bord de mot (piège à expression régulière)', `Nom ${'!'.repeat(MAX_CARACTERES_RECTO - 10)}a`],
    ['un seul mot géant', `Nom ${'A'.repeat(MAX_CARACTERES_RECTO - 4)}`],
    ['colonne de noms purs (remontée ligne par ligne)', `${jusquALaBorne('KOUASSI ADJOUA', '\n').split('\n').slice(0, MAX_LIGNES_RECTO - 2).join('\n')}\nPrénoms`],
    ['libellés empilés et valeurs alternés', jusquALaBorne('Nom\nPrénoms\nKOUASSI\nADJOUA', '\n')],
    ['mots proches des en-têtes (recherche approchée)', jusquALaBorne('PASSEPORX CARTX NATIONALX D IDENTITX PERMIX DX CONDUIRX', ' ')],
    ['lignes de bruit', jusquALaBorne('~ — _ =', '\n')],
    ['permis numéroté', jusquALaBorne('PERMIS DE CONDUIRE\n1. KONAN\n2. KOFFI', '\n')],
  ];

  it.each(HOSTILES)('%s : lu en quelques millisecondes', (_, texte) => {
    // L'entrée est bien à la limite (en caractères ou en lignes), pas rejetée d'office.
    const lignes = texte.split('\n').length;
    expect(texte.length > MAX_CARACTERES_RECTO / 2 || lignes > MAX_LIGNES_RECTO / 2).toBe(true);
    expect(texte.length).toBeLessThanOrEqual(MAX_CARACTERES_RECTO);
    expect(lignes).toBeLessThanOrEqual(MAX_LIGNES_RECTO);
    lireRecto(texte);
    const debut = performance.now();
    for (let i = 0; i < 5; i++) expect(() => lireRecto(texte)).not.toThrow();
    // Borne large, pour une machine d'intégration lente.
    expect((performance.now() - debut) / 5).toBeLessThan(100);
  });

  it('10 Mo de texte : rejet immédiat', () => {
    const enorme = "CARTE NATIONALE D'IDENTITE\nNom : KOUASSI\n".repeat(250_000);
    const debut = performance.now();
    expect(lireRecto(enorme)).toBeNull();
    expect(performance.now() - debut).toBeLessThan(50);
  });
});

describe('lireRecto — bruit OCR simulé (déterministe)', () => {
  /*
   * Textes SYNTHÉTIQUES : identités tirées de prénoms et patronymes courants,
   * dates et numéros bidon, bruités par un modèle de confusions de l'OCR
   * (lettres, lignes perdues, fusionnées, inversées, parasites). Ce n'est pas
   * une mesure sur de vraies photos, mais celle de la logique d'extraction
   * face au bruit TEXTUEL, mise en page supposée connue. La graine est fixe :
   * les taux sont reproductibles à l'unité.
   */
  let graine = 20260916;
  const hasard = () => (graine = (graine * 1664525 + 1013904223) >>> 0) / 4294967296;
  const choix = <T,>(a: readonly T[]): T => a[Math.floor(hasard() * a.length)];

  const PATRONYMES = [
    'KOUASSI', 'KONAN', 'KOFFI', 'YAO', 'KOUAMÉ', "N'GUESSAN", "N'DRI", 'KOUADIO', 'TRAORÉ', 'KONÉ', 'OUATTARA',
    'COULIBALY', 'DIABATÉ', 'BAMBA', 'SORO', 'TOURÉ', 'DIALLO', 'OUÉDRAOGO', 'ASSI', 'AKA', 'BROU', 'TANOH',
    'TIÉ BI', 'IRIÉ BI', 'ZAMBLÉ LOU', 'GOORÉ BI', 'DJÉDJÉ', 'SÉRI', 'GNAHORÉ', 'ZADI', 'AHOUA', 'KAKOU', 'ESSOH',
  ];
  const PRENOMS = [
    'ADJOUA', 'AYA', 'AFFOUÉ', 'AMENAN', 'AKISSI', 'AHOU', 'MARIE', 'ESTELLE', 'CHRISTELLE', 'FATOUMATA', 'AWA',
    'MARIAM', 'SALIMATA', 'KOFFI', 'KOUAKOU', 'YAO', 'SERGE-YVAN', 'JEAN-MARC', 'MAMADOU', 'SALIF', 'ISSOUF', 'ALI',
    'ROMÉO', 'ANGE', 'ÉLODIE', 'PRISCILLE', "N'GORAN", 'JUNIOR', 'GRÂCE', 'LAURE', 'ADAMA', 'MOUSSA', 'INNOCENT',
  ];
  const LIEUX = ['TIASSALÉ', 'DIMBOKRO', 'BOUAFLÉ', 'SINFRA', 'ISSIA', 'DANANÉ', 'TOUBA', 'BOUNDIALI', 'ABIDJAN', 'BOUAKÉ', 'AGNIBILÉKROU'];

  function identite() {
    const nom = choix(PATRONYMES);
    const n = 1 + Math.floor(hasard() * 3);
    const prenoms: string[] = [];
    while (prenoms.length < n) {
      const x = choix(PRENOMS);
      if (!prenoms.includes(x)) prenoms.push(x);
    }
    const jour = String(1 + Math.floor(hasard() * 28)).padStart(2, '0');
    const mois = String(1 + Math.floor(hasard() * 12)).padStart(2, '0');
    const annee = String(1960 + Math.floor(hasard() * 45));
    return {
      nom,
      prenom: prenoms.join(' '),
      date: `${jour}/${mois}/${annee}`,
      lieu: choix(LIEUX),
      numero: `CI${String(Math.floor(hasard() * 1e9)).padStart(9, '0')}`,
    };
  }
  type Identite = ReturnType<typeof identite>;

  const sep = () => choix([' : ', ': ', ' ', ' .......... ', ':']);
  const casse = (s: string) => choix([s, s.toUpperCase(), s.toUpperCase()]);

  const GABARITS: { nom: string; type: TypePiece; lignes: (id: Identite) => string[] }[] = [
    {
      nom: 'CNI — libellés empilés', type: 'CNI',
      lignes: (id) => ["RÉPUBLIQUE DE CÔTE D'IVOIRE", "CARTE NATIONALE D'IDENTITÉ", casse('Nom'), id.nom, casse('Prénom(s)'), id.prenom,
        casse('Date de naissance'), id.date, casse('Lieu de naissance'), id.lieu, 'Sexe Taille', 'F 1,65', 'N° de la carte', id.numero],
    },
    {
      nom: 'CNI — libellé : valeur', type: 'CNI',
      lignes: (id) => ["REPUBLIQUE DE COTE D'IVOIRE", "CARTE NATIONALE D'IDENTITE", casse('Nom') + sep() + id.nom,
        casse('Prénoms') + sep() + id.prenom, casse('Né(e) le') + sep() + id.date + ' à ' + id.lieu, 'Sexe : M Taille : 1,80',
        'N°' + sep() + id.numero],
    },
    {
      nom: 'CNI / passeport — bilingue empilé', type: 'CNI',
      lignes: (id) => ["CARTE NATIONALE D'IDENTITÉ / NATIONAL IDENTITY CARD", 'Nom / Surname', id.nom, 'Prénoms / Given names', id.prenom,
        'Date de naissance / Date of birth', id.date, 'Lieu de naissance / Place of birth', id.lieu],
    },
    {
      nom: 'Permis — libellé : valeur', type: 'Permis de conduire',
      lignes: (id) => ["RÉPUBLIQUE DE CÔTE D'IVOIRE", 'PERMIS DE CONDUIRE', casse('Nom') + sep() + id.nom, casse('Prénoms') + sep() + id.prenom,
        'Date et lieu de naissance' + sep() + id.date + ' ' + id.lieu, 'N° permis' + sep() + id.numero, 'Catégories : B C'],
    },
    {
      nom: 'Permis — champs numérotés', type: 'Permis de conduire',
      lignes: (id) => ['REPUBLIQUE DE COTE D IVOIRE', 'PERMIS DE CONDUIRE', '1. ' + id.nom, '2. ' + id.prenom, '3. ' + id.date + ' ' + id.lieu,
        '4a. 01.01.2015 4b. 01.01.2025', '5. ' + id.numero, '9. B'],
    },
    {
      nom: 'Nom et prénoms (combiné)', type: 'Permis de conduire',
      lignes: (id) => ['PERMIS DE CONDUIRE', casse('Nom et Prénoms') + sep() + id.nom + ' ' + id.prenom, 'Né le ' + id.date + ' à ' + id.lieu, 'N° ' + id.numero],
    },
    {
      nom: 'Carte étudiante — libellé : valeur', type: 'Carte étudiante',
      lignes: (id) => ['UNIVERSITÉ DES LAGUNES', "CARTE D'ÉTUDIANT", 'Année universitaire 2025-2026', casse('Nom') + sep() + id.nom,
        casse('Prénoms') + sep() + id.prenom, 'Matricule' + sep() + id.numero, 'UFR : SCIENCES ÉCONOMIQUES', 'Né(e) le ' + id.date],
    },
    {
      nom: 'Carte consulaire — libellé : valeur', type: 'Carte consulaire',
      lignes: (id) => ['BURKINA FASO', 'CONSULAT GÉNÉRAL À ABIDJAN', "CARTE D'IDENTITÉ CONSULAIRE", casse('Nom') + sep() + id.nom,
        casse('Prénom(s)') + sep() + id.prenom, 'Né le' + sep() + id.date + ' à ' + id.lieu, 'Profession : COMMERÇANT'],
    },
    {
      nom: 'Colonnes (libellés puis valeurs)', type: 'CNI',
      lignes: (id) => ["CARTE NATIONALE D'IDENTITE", 'Nom', 'Prénom(s)', id.nom, id.prenom, 'Date de naissance', id.date],
    },
  ];

  const CONFUSIONS: Record<string, string[]> = {
    O: ['0', 'Q', 'D'], I: ['1', 'l', '|'], S: ['5'], E: ['F', '3'], É: ['E', 'É', 'Ê', 'E'], M: ['IVI', 'rn', 'N'],
    B: ['8'], G: ['6'], A: ['4', 'À'], U: ['V'], "'": ['’', '', ' ', '`'], '-': ['', ' ', '—'], N: ['H', 'M'], R: ['K'],
    o: ['0'], i: ['l', '1'], m: ['rn'], e: ['é', 'c'], é: ['e'], ':': [';', '', '.'],
  };
  function bruiterLigne(l: string, p: number): string {
    let out = '';
    for (const c of l) {
      if (hasard() < p && CONFUSIONS[c]) out += choix(CONFUSIONS[c]);
      else if (c === ' ' && hasard() < p / 2) out += '';
      else out += c;
    }
    return out;
  }
  const PARASITES = ['~ — _ =', ', . ;', '|| ,', 'ee', '- ~', '"', 'Wi', '. :'];
  function bruiter(lignes: string[], p: number): string {
    const res: string[] = [];
    for (let i = 0; i < lignes.length; i++) {
      if (p > 0 && hasard() < p / 2) continue; // ligne illisible, perdue
      let l = bruiterLigne(lignes[i], p);
      if (p > 0 && hasard() < p * 2 && i + 1 < lignes.length) l += ' ' + bruiterLigne(lignes[++i], p); // lignes fusionnées
      res.push(l);
      if (p > 0 && hasard() < p * 3) res.push(choix(PARASITES));
    }
    // ordre de lecture brouillé : deux lignes voisines inversées
    for (let i = 0; i + 1 < res.length; i++) {
      if (p > 0 && hasard() < p) [res[i], res[i + 1]] = [res[i + 1], res[i]];
    }
    return res.join('\n');
  }

  const norm = (s?: string) =>
    (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’-]/g, ' ').replace(/\s+/g, ' ').trim();
  function lev(a: string, b: string): number {
    let prec = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cour = [i];
      for (let j = 1; j <= b.length; j++) cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prec = cour;
    }
    return prec[b.length];
  }
  /** Similarité d'au moins `seuil` (1 = identiques), au sens de la distance d'édition. */
  const proche = (a: string, b: string, seuil: number) => 1 - lev(a, b) / Math.max(a.length, b.length) >= seuil;
  type Verdict = 'exact' | 'proche' | 'faux' | 'absent';
  function juger(obtenu: string | undefined, attendu: string): Verdict {
    if (!obtenu) return 'absent';
    const a = norm(obtenu);
    const b = norm(attendu);
    if (a === b) return 'exact';
    return proche(a, b, 0.8) ? 'proche' : 'faux';
  }

  /**
   * Le lieu de naissance est-il sorti comme MOT du nom ou des prénoms ?
   *
   * Le générateur abîme les lieux comme le reste (SINFRA lu SIHFRA) : chercher
   * le lieu à l'identique ne voit qu'une partie des fuites. Compte donc tout mot
   * d'au moins 4 lettres semblable au lieu à 70 % ou plus, sauf s'il est aussi
   * semblable (75 %) à un mot de l'identité : c'est alors un nom abîmé, pas le
   * lieu. Un lieu noyé dans un mot plus long (« ISSIA » dans « AKISSIAWA »,
   * prénoms collés) n'est pas compté.
   */
  function lieuSorti(lecture: LectureRecto | null, id: Identite): boolean {
    const lieu = norm(id.lieu);
    const motsIdentite = norm(`${id.nom} ${id.prenom}`).split(' ');
    return norm(`${lecture?.nom ?? ''} ${lecture?.prenom ?? ''}`)
      .split(/[^a-z]+/)
      .some((w) => w.length >= 4 && proche(w, lieu, 0.7) && !motsIdentite.some((x) => proche(x, w, 0.75)));
  }

  const PAR_CELLULE = 400;
  const NIVEAUX = [0, 0.02, 0.05, 0.1] as const;
  type Mesure = { type: number; utilisable: number; nomFaux: number; prenomFaux: number; fuites: number };
  const mesures = new Map<string, Mesure>();
  let textes = 0;
  for (const g of GABARITS) {
    for (const p of NIVEAUX) {
      const m: Mesure = { type: 0, utilisable: 0, nomFaux: 0, prenomFaux: 0, fuites: 0 };
      for (let k = 0; k < PAR_CELLULE; k++) {
        const id = identite();
        const lecture = lireRecto(bruiter(g.lignes(id), p));
        textes++;
        if (lecture?.typePiece === g.type) m.type++;
        const vn = juger(lecture?.nom, id.nom);
        const vp = juger(lecture?.prenom, id.prenom);
        if (vn === 'faux') m.nomFaux++;
        if (vp === 'faux') m.prenomFaux++;
        if ((vn === 'exact' || vn === 'proche') && (vp === 'exact' || vp === 'proche')) m.utilisable++;
        // Fuite : un chiffre (date, numéro, taille), le lieu de naissance même abîmé, ou une clé inattendue.
        if (/\d/.test(JSON.stringify(lecture ?? {})) || lieuSorti(lecture, id)) m.fuites++;
        for (const cle of Object.keys(lecture ?? {})) if (!CLES_AUTORISEES.has(cle)) m.fuites++;
      }
      mesures.set(`${g.nom}|${p}`, m);
    }
  }
  const pct = (x: number) => Math.round((100 * x) / PAR_CELLULE);

  it(`${GABARITS.length * NIVEAUX.length * PAR_CELLULE} textes générés (${GABARITS.length} mises en page × ${NIVEAUX.length} niveaux de bruit)`, () => {
    expect(textes).toBe(GABARITS.length * NIVEAUX.length * PAR_CELLULE);
  });

  // Même générateur et même détecteur (lieu abîmé compris) sur les graines 1 à 30 (432 000
  // textes) : 0 fuite également. Le prototype en laissait 16 sur les 31 graines.
  it('aucune fuite de chiffre, de date, de numéro ni de lieu de naissance', () => {
    for (const [cellule, m] of mesures) expect({ cellule, fuites: m.fuites }).toEqual({ cellule, fuites: 0 });
  });

  it('le détecteur de fuite voit un lieu abîmé, pas un homonyme ni un lieu noyé dans un mot', () => {
    const id: Identite = { nom: 'KONÉ', prenom: 'AWA', date: '01/01/2000', lieu: 'SINFRA', numero: 'CI000000000' };
    // Relevé en revue (graine 10, 10 %) : invisible pour une recherche à l'identique.
    expect(lieuSorti({ prenom: 'SIHFRA' }, id)).toBe(true);
    expect(lieuSorti({ nom: 'KONÉ', prenom: 'SINFRA' }, id)).toBe(true);
    expect(lieuSorti({ nom: 'KONÉ', prenom: 'AWA' }, id)).toBe(false);
    expect(lieuSorti({ nom: 'ISSIA' }, { ...id, nom: 'ISSIA', lieu: 'ISSIA' })).toBe(false);
    expect(lieuSorti({ prenom: 'AKISSIAWA' }, { ...id, lieu: 'ISSIA' })).toBe(false);
  });

  it('texte propre : type et paire nom + prénoms toujours justes', () => {
    for (const g of GABARITS) {
      const m = mesures.get(`${g.nom}|0`)!;
      expect({ gabarit: g.nom, type: pct(m.type), utilisable: pct(m.utilisable) }).toEqual({ gabarit: g.nom, type: 100, utilisable: 100 });
    }
  });

  /**
   * Planchers à 5 % de bruit, fixés quelques points sous la mesure (en
   * commentaire) : une régression de la logique d'extraction fait échouer le
   * test, une variation d'une ou deux lectures non. « Faux » = nom ou prénoms
   * lus mais différents à plus de 20 % : c'est le pire cas, une valeur fausse
   * qu'il faut remarquer à la relecture.
   */
  it.each([
    // mise en page                      plancher, plafond      mesuré ici │ moyenne des graines 1 à 30
    ['CNI — libellés empilés', 45, 6], //                  50 %, 2 %  │ 50 %, 2 %
    ['CNI — libellé : valeur', 82, 6], //                  87 %, 3 %  │ 85 %, 2 %
    ['CNI / passeport — bilingue empilé', 46, 10], //      51 %, 7 %  │ 51 %, 7 %
    ['Permis — libellé : valeur', 80, 6], //               84 %, 3 %  │ 85 %, 2 %
    ['Permis — champs numérotés', 65, 5], //               69 %, 2 %  │ 70 %, 2 %
    ['Nom et prénoms (combiné)', 77, 12], //               82 %, 9 %  │ 79 %, 11 % (découpage deviné)
    ['Carte étudiante — libellé : valeur', 79, 7], //      84 %, 4 %  │ 84 %, 3 %
    ['Carte consulaire — libellé : valeur', 80, 6], //     85 %, 3 %  │ 85 %, 2 %
    ['Colonnes (libellés puis valeurs)', 37, 17], //       42 %, 13 % │ 38 %, 14 %
  ] as const)('%s, 5 %% de bruit : au moins %i %% de paires utilisables, au plus %i %% de valeurs fausses', (gabarit, plancher, plafond) => {
    const m = mesures.get(`${gabarit}|0.05`)!;
    expect(pct(m.utilisable)).toBeGreaterThanOrEqual(plancher);
    expect(Math.max(pct(m.nomFaux), pct(m.prenomFaux))).toBeLessThanOrEqual(plafond);
  });
});

describe('recto.ts — ne journalise rien, ne lève rien', () => {
  it('aucun appel à la console ni throw dans le code source', () => {
    expect(source).not.toMatch(/\bconsole\s*\./);
    expect(source).not.toMatch(/\bthrow\b/);
  });
});
