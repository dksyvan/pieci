import type { TypePiece } from './types';

/**
 * Lecture de la bande MRZ d'une pièce (norme ICAO 9303) à partir du texte
 * rendu par l'OCR.
 *
 * Pourquoi la MRZ : sur un recto, l'OCR sait lire des lettres, pas dire où
 * s'arrête le patronyme — « TIÉ BI KOUAMÉ », « ZAMBLE LOU SERGE ». La MRZ le
 * dit par construction : le patronyme est avant le double chevron `<<`, les
 * prénoms après. Et elle porte des chiffres de contrôle, qui disent si la
 * lecture est juste AVANT de remplir le formulaire.
 *
 * Pourquoi un parseur maison plutôt qu'un paquet npm : la bande porte aussi le
 * numéro de la pièce, la date de naissance, le sexe, la nationalité,
 * l'expiration et, dans les données facultatives, probablement l'identifiant
 * national. Les paquets existants renvoient tout cela proprement découpé, et
 * recopient la valeur lue dans leurs messages d'erreur. Or Pièci ne collecte
 * pas ces données, sous aucune forme (brief § 2.3). Ici :
 *
 * - elles sont lues dans des variables locales, le temps de vérifier les
 *   chiffres de contrôle, puis abandonnées dans la fonction même ;
 * - la sortie a au plus trois clés, `typePiece`, `nom` et `prenom`, et le nom
 *   ne peut contenir que des lettres et des espaces ;
 * - aucune exception ne sort : tout échec rend `null`, sans message ;
 * - rien n'est journalisé. Ce code tourne dans le navigateur de la personne
 *   qui déclare : une trace laissée là y resterait, lisible par quiconque
 *   ouvre les outils de développement.
 *
 * Ce que les contrôles ne couvrent PAS : le nom. Aucun chiffre de contrôle ne
 * porte sur lui, c'est la norme. Un « N » lu « H » passe sans alerte : le champ
 * reste à relire par la personne, marqué comme lu sur la photo. Et une autre
 * ligne peut prendre la place de la ligne du nom : seule sa forme la trahit
 * (voir `formeDeNom`).
 *
 * Fonction pure, sans DOM ni Node : elle tourne dans le Web Worker de lecture,
 * et pourra tourner telle quelle sur le serveur.
 */

/** Ce que la lecture de la MRZ livre au reste de l'application. Rien d'autre. */
export interface LectureMrz {
  /**
   * Absent quand la MRZ est valide mais ne dit pas de quelle pièce de notre
   * liste il s'agit (carte d'un autre État, titre de séjour…) : la personne
   * choisit alors d'un toucher, plutôt qu'on étiquette « CNI » une carte
   * étrangère.
   */
  typePiece?: Extract<TypePiece, 'CNI' | 'Passeport'>;
  /** Patronyme, en capitales sans accents ni apostrophe (la MRZ n'en a pas). */
  nom: string;
  /** Prénoms séparés par une espace ; chaîne vide si la MRZ n'en porte pas. */
  prenom: string;
}

// ---------------------------------------------------------------------------
// Bornes d'entrée
// ---------------------------------------------------------------------------

/**
 * Au-delà, ce n'est pas la lecture d'une pièce : une bande MRZ recadrée rend
 * une centaine de caractères, et sur 360 lectures Tesseract de rectos fictifs
 * la plus longue faisait 363 caractères et 55 lignes. On s'abstient sans rien
 * parcourir, pour que le coût reste borné quoi qu'on envoie au Web Worker.
 * Mêmes bornes que la lecture du recto (recto.ts), qui lit le même texte.
 */
export const MAX_CARACTERES_MRZ = 8_000;
/** Nombre de lignes au-delà duquel on s'abstient (même raison). */
export const MAX_LIGNES_MRZ = 300;
/**
 * Une ligne MRZ fait 30 ou 44 caractères ; même avec une espace entre chaque
 * caractère et quelques parasites, elle reste sous cette longueur. Une ligne
 * plus longue est du texte ordinaire : elle est écartée avant tout nettoyage.
 */
const LONGUEUR_MAX_LIGNE_BRUTE = 160;

/** Longueurs d'une ligne nettoyée qui peut appartenir à une MRZ TD1 ou TD3. */
const LONGUEUR_MIN_CANDIDATE = 28;
const LONGUEUR_MAX_CANDIDATE = 46;

// ---------------------------------------------------------------------------
// Chiffres de contrôle (ICAO 9303, partie 3, § 4.9)
// ---------------------------------------------------------------------------

const POIDS = [7, 3, 1] as const;

/** Valeur d'un caractère : chiffres 0-9, lettres A=10 … Z=35, chevron 0. */
function valeur(c: string): number {
  const code = c.charCodeAt(0);
  if (c === '<') return 0;
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 90) return code - 55;
  // Impossible après nettoyage ; une valeur hors échelle fait échouer le contrôle.
  return 100;
}

/** Chiffre de contrôle d'un champ : somme pondérée 7-3-1, modulo 10. */
function cle(champ: string): number {
  let somme = 0;
  for (let i = 0; i < champ.length; i++) somme += valeur(champ[i]) * POIDS[i % 3];
  return somme % 10;
}

// ---------------------------------------------------------------------------
// Corrections de confusion, guidées par le type de champ
// ---------------------------------------------------------------------------

/**
 * Dans un champ qui ne peut contenir que des chiffres (dates, chiffres de
 * contrôle), une lettre lue est forcément une confusion de l'OCR sur la police
 * OCR-B : O/Q/D pour 0, I/L pour 1, Z pour 2, S pour 5, G pour 6, B pour 8.
 */
const VERS_CHIFFRE: Readonly<Record<string, string>> = {
  O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', B: '8',
};
/** Inverse, pour les champs qui ne peuvent contenir que des lettres (nom, codes). */
const VERS_LETTRE: Readonly<Record<string, string>> = {
  0: 'O', 1: 'I', 2: 'Z', 5: 'S', 6: 'G', 8: 'B',
};

const enChiffres = (s: string) => s.replace(/[OQDILZSGB]/g, (c) => VERS_CHIFFRE[c]);
const enLettres = (s: string) => s.replace(/[012568]/g, (c) => VERS_LETTRE[c]);

/** Chiffre de contrôle lu, corrigé ; `null` si ce n'est pas un chiffre. */
function controle(c: string | undefined): number | null {
  const corrige = enChiffres(c ?? '');
  return /^[0-9]$/.test(corrige) ? Number(corrige) : null;
}

/**
 * Date AAMMJJ et son chiffre de contrôle. Rend les 7 caractères corrigés, pour
 * le calcul du composite, ou `null`. Le chevron reste admis : une partie
 * inconnue de la date de naissance en est remplie.
 */
function dateControlee(date: string, car: string | undefined): string | null {
  const corrigee = enChiffres(date);
  const c = controle(car);
  if (!/^[0-9<]{6}$/.test(corrigee) || c === null || cle(corrigee) !== c) return null;
  return corrigee + c;
}

/**
 * Champ alphanumérique (numéro de pièce, numéro personnel) et son chiffre de
 * contrôle. Un numéro peut légitimement mêler lettres et chiffres
 * (« L898902C3 ») : on ne peut donc pas tout convertir d'office. On essaie la
 * lecture brute, puis la lecture entièrement chiffrée, et on garde celle que
 * le chiffre de contrôle valide. Rend le champ corrigé suivi de son chiffre,
 * ou `null`.
 */
function champControle(champ: string, car: string | undefined): string | null {
  const c = controle(car);
  if (c === null) return null;
  if (cle(champ) === c) return champ + c;
  const chiffre = enChiffres(champ);
  if (chiffre !== champ && cle(chiffre) === c) return chiffre + c;
  return null;
}

/**
 * Numéro personnel du passeport (positions 29-42 de la ligne 2). Vide, il est
 * rempli de chevrons et son chiffre de contrôle peut être `<` ou `0` : les deux
 * valent zéro dans le composite.
 */
function numeroPersonnelControle(champ: string, car: string | undefined): string | null {
  if (/^<+$/.test(champ)) return car === '<' || controle(car) === 0 ? `${champ}0` : null;
  return champControle(champ, car);
}

// ---------------------------------------------------------------------------
// Nom et prénoms
// ---------------------------------------------------------------------------

/**
 * Retire le remplissage de fin de champ.
 *
 * Le chevron de remplissage est souvent lu « K ». Seul le remplissage FINAL
 * peut être corrigé sans risque : on retire la suite finale de `<` et de `K`
 * quand elle contient au moins trois « K » — aucun nom ne finit par trois K,
 * alors qu'un « K » isolé peut être une vraie lettre (une composante tronquée
 * comme « DE<K » dans les exemples de la norme). Limite assumée : un nom qui
 * finit réellement par K, suivi d'un remplissage entièrement lu « K », perd sa
 * dernière lettre ; le champ reste à relire.
 *
 * Écrit en boucle plutôt qu'en expression régulière ancrée en fin de chaîne,
 * dont le coût devient quadratique sur une longue suite de caractères.
 */
function retirerRemplissage(champ: string): string {
  let fin = champ.length;
  let k = 0;
  while (fin > 0 && (champ[fin - 1] === '<' || champ[fin - 1] === 'K')) {
    if (champ[fin - 1] === 'K') k++;
    fin--;
  }
  if (k >= 3) return champ.slice(0, fin);
  fin = champ.length;
  while (fin > 0 && champ[fin - 1] === '<') fin--;
  return champ.slice(0, fin);
}

/** « ANNA<MARIA » → « ANNA MARIA ». Un chevron sépare deux composantes. */
function composantes(segment: string): string {
  return segment.split('<').filter(Boolean).join(' ');
}

/**
 * Nombre de chiffres lus dans le champ du nom au-delà duquel ce n'est pas un
 * nom mal lu, mais une autre ligne.
 */
const MAX_CHIFFRES_DANS_LE_NOM = 2;

/**
 * Le champ lu a-t-il la forme d'un champ de nom ?
 *
 * Aucun chiffre de contrôle ne couvre le nom : quand les lignes contrôlées
 * sont justes mais que la vraie ligne du nom a été perdue par l'OCR (trop
 * courte, illisible), la ligne suivante prend sa place sans que rien ne
 * l'arrête. Si c'est « Date de naissance 01/02/2005 » ou une ligne 2, la
 * conversion des chiffres en lettres ferait sortir la date ou le numéro sous
 * forme de lettres (« OIOZZOOS »). Seule la STRUCTURE du champ peut trahir la
 * substitution :
 *
 * - le double chevron : la norme le met après le patronyme, et le remplissage
 *   final en contient aussi. Un champ sans aucun `<<` serait occupé jusqu'au
 *   bout par le seul patronyme, sans prénoms ni remplissage : cas extrême,
 *   qu'on accepte de perdre ;
 * - au plus deux chiffres, jamais côte à côte : sur un nom, un chiffre est une
 *   confusion isolée de l'OCR (O lu 0). Une date ou un numéro en a davantage,
 *   et contigus, puisque le nettoyage retire espaces et barres obliques. Deux
 *   chiffres isolés ne suffisent à reconstituer aucune donnée. Limite
 *   assumée : un nom où l'OCR a confondu trois lettres, ou deux lettres
 *   voisines (« ERIK55ON »), est refusé, et la personne le saisit ;
 * - pas la forme d'une ligne 2 de carte, même lue entièrement en lettres
 *   (« BSOBIZZF… ») : voir `ressembleLigne2`.
 *
 * `champ` est la portion LUE, avant tout complément par des chevrons : un
 * complément fabriquerait le `<<` exigé.
 */
function formeDeNom(champ: string): boolean {
  if (!champ.includes('<<') || /[0-9]{2}/.test(champ)) return false;
  let chiffres = 0;
  for (let i = 0; i < champ.length; i++) {
    const code = champ.charCodeAt(i);
    if (code >= 48 && code <= 57 && ++chiffres > MAX_CHIFFRES_DANS_LE_NOM) return false;
  }
  return !ressembleLigne2(champ);
}

/**
 * Ligne 2 d'une carte TD1 (naissance, contrôle, sexe, expiration, contrôle),
 * que ses chiffres aient été lus comme chiffres ou comme lettres confondables :
 * sept caractères « chiffres », un sexe, puis une date dont au moins un
 * chiffre de contrôle tombe juste. Un nom réel n'a pas cette forme : il
 * faudrait quinze lettres prises parmi O, Q, D, I, L, Z, S, G, B, un M, F ou X
 * à la huitième place, et un chiffre de contrôle juste par hasard.
 */
function ressembleLigne2(champ: string): boolean {
  if (!/^[0-9OQDILZSGB<]{7}[MFX<][0-9OQDILZSGB<]{7}/.test(champ)) return false;
  return dateControlee(champ.slice(0, 6), champ[6]) !== null || dateControlee(champ.slice(8, 14), champ[14]) !== null;
}

/**
 * Patronyme avant le premier `<<`, prénoms après. `champ` est la portion lue,
 * non complétée : voir `formeDeNom`.
 *
 * On ne rétablit aucune apostrophe : la norme supprime l'apostrophe et colle
 * les composantes (N'GUESSAN devient NGUESSAN), mais un émetteur peut aussi
 * écrire N<GUESSAN, qui donne « N GUESSAN ». Deviner « N'GUESSAN » serait
 * inventer une orthographe ; c'est la fusion avec le recto qui la rétablit
 * quand le recto la montre (voir fusion-lecture.ts).
 */
function nomEtPrenoms(champ: string): { nom: string; prenom: string } | null {
  if (!formeDeNom(champ)) return null;
  const t = retirerRemplissage(enLettres(champ));
  // Un chiffre qui ne s'explique pas par une confusion : ce n'est pas un nom.
  if (!/^[A-Z<]+$/.test(t)) return null;
  const separation = t.indexOf('<<');
  const nom = composantes(separation < 0 ? t : t.slice(0, separation));
  const prenom = separation < 0 ? '' : composantes(t.slice(separation + 2));
  return nom ? { nom, prenom } : null;
}

// ---------------------------------------------------------------------------
// Formats TD1 (cartes, 3 × 30) et TD3 (passeports, 2 × 44)
// ---------------------------------------------------------------------------

/**
 * Carte au format TD1. Positions de la norme (partie 5) :
 * ligne 1 = code (2), État (3), numéro (9), contrôle, données facultatives (15) ;
 * ligne 2 = naissance (6), contrôle, sexe, expiration (6), contrôle,
 * nationalité (3), données facultatives (11), composite ;
 * ligne 3 = nom (30).
 *
 * Tous les contrôles sont exigés, composite compris : avec la seule règle
 * « deux dates et le numéro OU le composite », une ligne quelconque passait
 * environ 1 fois sur 500 ; en les exigeant tous, environ 1 fois sur 10 000.
 * Le composite couvre aussi les données facultatives, où se trouve
 * probablement l'identifiant national : il faut le lire pour contrôler, puis
 * il est abandonné ici.
 *
 * `l1` et `l2` sont complétées ou tronquées à 30 caractères ; `l3` est la
 * ligne telle que lue, pour que `formeDeNom` juge ce que l'OCR a rendu.
 */
function lireTd1(l1: string, l2: string, l3: string): LectureMrz | null {
  const entete = enLettres(l1.slice(0, 5));
  if (!/^[IAC][A-Z<]{4}$/.test(entete)) return null;

  let ligne1Composite: string;
  if (l1[14] === '<') {
    // Numéro de plus de 9 caractères : la position 15 porte un chevron, la
    // suite du numéro ouvre les données facultatives, suivie de son chiffre
    // de contrôle puis d'un chevron. Le contrôle porte sur le numéro entier.
    const suite = l1.slice(15);
    const longueur = suite.indexOf('<');
    if (longueur < 2) return null;
    const numero = champControle(l1.slice(5, 14) + suite.slice(0, longueur - 1), suite[longueur - 1]);
    if (!numero) return null;
    ligne1Composite = `${numero.slice(0, 9)}<${numero.slice(9)}${suite.slice(longueur)}`;
  } else {
    const numero = champControle(l1.slice(5, 14), l1[14]);
    if (!numero) return null;
    ligne1Composite = numero + l1.slice(15, 30);
  }

  const naissance = dateControlee(l2.slice(0, 6), l2[6]);
  const expiration = dateControlee(l2.slice(8, 14), l2[14]);
  const composite = controle(l2[29]);
  if (!naissance || !expiration || composite === null) return null;
  if (cle(ligne1Composite + naissance + expiration + l2.slice(18, 29)) !== composite) return null;

  const identite = nomEtPrenoms(l3.slice(0, 30));
  if (!identite) return null;
  // « CNI » seulement pour une carte d'identité (code I) émise par la Côte
  // d'Ivoire. Une carte étrangère ou un autre titre garde un type vide.
  const cni = entete[0] === 'I' && entete.slice(2, 5) === 'CIV';
  return cni ? { typePiece: 'CNI', ...identite } : identite;
}

/**
 * Passeport au format TD3. Positions de la norme (partie 4) :
 * ligne 1 = code (P + type ou `<`), État (3), nom (39) ;
 * ligne 2 = numéro (9), contrôle, nationalité (3), naissance (6), contrôle,
 * sexe, expiration (6), contrôle, numéro personnel (14), contrôle, composite.
 *
 * Le code « P< » reste valable jusqu'en 2038 et les passeports émis à partir
 * de 2028 portent une lettre de type (PP, PD…) : toute lettre est admise.
 *
 * `l1` est la ligne telle que lue (au moins 42 caractères), non complétée :
 * la même substitution qu'en TD1 y est possible, une ligne de texte qui
 * commence par « PASSEPORT » prenant la place de la vraie ligne 1.
 */
function lireTd3(l1: string, l2: string): LectureMrz | null {
  const entete = enLettres(l1.slice(0, 5));
  if (!/^P[A-Z<]{4}$/.test(entete)) return null;

  const numero = champControle(l2.slice(0, 9), l2[9]);
  const naissance = dateControlee(l2.slice(13, 19), l2[19]);
  const expiration = dateControlee(l2.slice(21, 27), l2[27]);
  const personnel = numeroPersonnelControle(l2.slice(28, 42), l2[42]);
  const composite = controle(l2[43]);
  if (!numero || !naissance || !expiration || !personnel || composite === null) return null;
  if (cle(numero + naissance + expiration + personnel) !== composite) return null;

  const identite = nomEtPrenoms(l1.slice(5, 44));
  return identite ? { typePiece: 'Passeport', ...identite } : null;
}

// ---------------------------------------------------------------------------
// Nettoyage des lignes
// ---------------------------------------------------------------------------

/**
 * Ramène une ligne d'OCR à l'alphabet de la MRZ : majuscules, sans espaces
 * (l'OCR en glisse entre les caractères à pas fixe), « et ‹ lus pour un
 * chevron, et tout autre signe parasite retiré.
 */
function nettoyer(ligne: string): string {
  return ligne
    .toUpperCase()
    .replace(/[«‹(\[{]/g, '<')
    .replace(/[^A-Z0-9<]/g, '');
}

/**
 * Lignes nettoyées qui peuvent appartenir à une MRZ, dans l'ordre de lecture.
 * Les autres (texte du recto, lignes vides, bruit) sont écartées, ce qui
 * tolère les lignes voisines que l'OCR rend autour de la bande. `null` si
 * l'entrée dépasse les bornes.
 */
function lignesCandidates(lignes: unknown): string[] | null {
  if (!Array.isArray(lignes) || lignes.length > MAX_LIGNES_MRZ) return null;
  let caracteres = 0;
  let nombre = 0;
  const candidates: string[] = [];
  for (const element of lignes) {
    if (typeof element !== 'string') continue;
    caracteres += element.length;
    if (caracteres > MAX_CARACTERES_MRZ) return null;
    for (const brute of element.split(/\r\n|\r|\n/)) {
      if (++nombre > MAX_LIGNES_MRZ) return null;
      if (brute.length > LONGUEUR_MAX_LIGNE_BRUTE) continue;
      const ligne = nettoyer(brute);
      if (ligne.length >= LONGUEUR_MIN_CANDIDATE && ligne.length <= LONGUEUR_MAX_CANDIDATE) {
        candidates.push(ligne);
      }
    }
  }
  return candidates;
}

const completer = (ligne: string, longueur: number) => ligne.padEnd(longueur, '<').slice(0, longueur);

/**
 * Lit une MRZ TD1 ou TD3 dans les lignes rendues par l'OCR.
 *
 * Rend `{ typePiece?, nom, prenom }` si, et seulement si, tous les chiffres de
 * contrôle sont bons ; `null` sinon, ou si l'entrée n'est pas exploitable. Ne
 * lève jamais d'exception. Coût linéaire en la taille de l'entrée, borné par
 * `MAX_CARACTERES_MRZ` et `MAX_LIGNES_MRZ`.
 *
 * Tolérances : espaces et minuscules, « pour un chevron, texte du recto
 * autour de la bande, ligne 1 d'une carte écourtée par l'OCR (complétée par
 * des chevrons : le composite détecte tout caractère utile perdu), ligne du
 * nom écourtée, confusions lettre/chiffre selon le type de champ (au plus
 * deux chiffres isolés dans le nom : voir `formeDeNom`).
 */
export function lireMrz(lignes: readonly string[]): LectureMrz | null {
  try {
    const L = lignesCandidates(lignes);
    if (!L) return null;
    for (let i = 0; i + 2 < L.length; i++) {
      if (L[i].length <= 32 && L[i + 1].length >= 30 && L[i + 1].length <= 32) {
        const lecture = lireTd1(completer(L[i], 30), L[i + 1].slice(0, 30), L[i + 2]);
        if (lecture) return lecture;
      }
    }
    for (let i = 0; i + 1 < L.length; i++) {
      if (L[i].length >= 42 && L[i + 1].length === 44) {
        const lecture = lireTd3(L[i], L[i + 1]);
        if (lecture) return lecture;
      }
    }
  } catch {
    // Volontairement muet : rien de ce qui a été lu ne doit remonter.
  }
  return null;
}
