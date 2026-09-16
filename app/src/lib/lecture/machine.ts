import { fusionner, LONGUEUR_MAX_CHAMP, type LectureFusionnee } from '@partage/fusion-lecture';
import type { LectureMrz } from '@partage/mrz';
import type { Decoupage } from '@partage/recto';
import { RAISONS_PHOTO_ABSENTE, TYPES_PIECE, type RaisonPhotoAbsente, type TypePiece } from '@partage/types';

/**
 * Machine d'états du parcours « la photo d'abord » (déclaration d'une pièce
 * trouvée, brief § 2.1 et § 2.4).
 *
 * Réducteur pur : ni React, ni minuteur, ni DOM, ni moteur de lecture. Tout ce
 * qui prend du temps ou touche l'appareil vit ailleurs et arrive ici sous
 * forme d'événement — y compris l'écoulement du temps. D'où trois choses :
 *
 * - le parcours entier se rejoue en test, en environnement node, événement par
 *   événement, sans horloge simulée ;
 * - `reduireParcours` se branche tel quel sur `useReducer` : il rend l'état
 *   reçu, inchangé (même référence), quand l'événement n'a rien à faire là, et
 *   React n'effectue alors aucun rendu ;
 * - le pré-rendu peut importer ce module sans risque : il ne touche ni Worker,
 *   ni WASM, ni caméra, ni canvas.
 *
 * Qui fait quoi, côté intégrateur :
 *
 * - `PHOTO_PRISE` ouvre une lecture et lui attribue un NUMÉRO
 *   (`etat.lecture.numero`). Un effet React indexé sur ce numéro lance la
 *   lecture de `etat.imageEnLecture` et arme les trois minuteurs de
 *   `DELAIS_LECTURE` ; son nettoyage annule tout. Chaque événement de lecture
 *   ou de délai recopie ce numéro : un résultat ou un minuteur d'une lecture
 *   précédente — reprise de photo, « Saisir à la main », retour arrière — ne
 *   correspond plus et est ignoré ici, quoi que l'intégrateur ait oublié
 *   d'annuler.
 * - Les délais (mesures et arbitrage de l'enquête OCR) : à 5 s, INDICE (« ça
 *   prend un peu plus de temps ») — même seuil que `IndiceReveil` de
 *   l'accueil ; à 8 s, OUVRIR_FORMULAIRE : la personne reprend la main pendant
 *   que la lecture continue, un Android d'entrée de gamme étant estimé 4 à
 *   6 fois plus lent que les 1,0 à 1,4 s mesurés sur PC ; à 25 s, ABANDON,
 *   sans un mot.
 *
 * Ce que l'état ne contient JAMAIS : le texte brut lu, les lignes de la bande
 * du bas, un numéro, une date, un identifiant. Une lecture n'y entre que par
 * `LECTURE_TERMINEE`, dont la charge est recopiée clé par clé (`assainir`) :
 * type, nom, prénoms, `peutEtreCoupe`, `decoupage`, rien d'autre, quoi que
 * l'appelant y ait mis. Rien n'est persisté non plus : l'état vit en mémoire
 * et disparaît avec la page.
 *
 * Les images. Toute photo passe d'abord par `imageEnLecture`, qu'aucun
 * sélecteur ne rend affichable : on ne sait pas encore si c'est le dos d'une
 * carte. La photo retenue avant elle, s'il y en a une, reste en place jusqu'au
 * verdict. Verdict :
 *
 * - dos d'une carte (bande de carte à trois lignes vue par la lecture) :
 *   l'image est lâchée sur-le-champ, jamais aperçue, jamais envoyée ; le nom
 *   lu sur la bande remplit les champs et l'on demande le devant. La photo
 *   d'avant est lâchée aussi : la dernière prise l'emporte ;
 * - autre verdict, lecture réussie ou ratée : elle devient la photo à envoyer ;
 * - lecture arrêtée sans verdict (« Saisir à la main », 25 s, moteur
 *   indisponible, publication pendant la lecture) : elle devient aussi la
 *   photo, pour que la personne ne la perde pas. Mais elle n'est pas
 *   vérifiée : l'intégrateur ne l'envoie qu'après un verdict « pas un dos »
 *   (voir `photoAEnvoyer`), et l'écarte avec `PHOTO_ECARTEE` quand ce verdict
 *   ne peut pas être obtenu ;
 * - retour vers l'appareil photo, ou image que le navigateur ne sait pas
 *   décoder (HEIC…, que le serveur refuserait de toute façon) : elle est
 *   lâchée, et l'on retrouve la situation d'avant.
 *
 * Aucun texte d'interface ici : les écrans, et le ton du site, sont dans le
 * composant. Les invites se décident avec les sélecteurs en fin de fichier.
 */

// ---------------------------------------------------------------------------
// Délais
// ---------------------------------------------------------------------------

/** Indice « ça prend un peu plus de temps que d'habitude ». */
export const DELAI_INDICE_MS = 5_000;
/** Le formulaire s'ouvre, la lecture continue derrière. */
export const DELAI_OUVRIR_FORMULAIRE_MS = 8_000;
/** Abandon silencieux de la lecture. */
export const DELAI_ABANDON_MS = 25_000;

/**
 * Les trois minuteurs à armer au lancement de chaque lecture, dans l'ordre.
 * L'intégrateur envoie `{ type, numero }` à l'échéance ; il n'a rien d'autre à
 * décider : un minuteur qui tombe dans un état où il n'a plus de sens est
 * ignoré par le réducteur.
 */
export const DELAIS_LECTURE: ReadonlyArray<{ readonly apresMs: number; readonly type: EvenementDelai['type'] }> = [
  { apresMs: DELAI_INDICE_MS, type: 'INDICE' },
  { apresMs: DELAI_OUVRIR_FORMULAIRE_MS, type: 'OUVRIR_FORMULAIRE' },
  { apresMs: DELAI_ABANDON_MS, type: 'ABANDON' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * - `photo` : écran d'ouverture — ou, selon `ecranPhoto`, reprise après un
 *   premier échec, ou demande du devant après un dos de carte.
 * - `raison` : « Je ne peux pas prendre de photo », choix d'une raison.
 * - `lecture` : lecture de la photo en cours, formulaire pas encore ouvert.
 * - `verification` : formulaire, nom ou prénoms pré-remplis à relire.
 * - `saisie` : formulaire à remplir à la main.
 *
 * `verification` et `saisie` sont le MÊME formulaire : seule l'introduction
 * change. Les marques « Lu sur la photo » se décident champ par champ, par
 * leur origine, quelle que soit l'étape.
 */
export type EtapeParcours = 'photo' | 'raison' | 'lecture' | 'verification' | 'saisie';

/**
 * Ce que dit l'écran photo :
 * - `ouverture` : « Prends la pièce en photo » ;
 * - `reprise` : après un premier échec, on invite à réessayer ;
 * - `devant` : la photo était le dos d'une carte, on demande l'autre côté, avec
 *   « Continuer sans photo ».
 */
export type EcranPhoto = 'ouverture' | 'reprise' | 'devant';

/**
 * Raisons proposées à l'écran : toute la liste fermée sauf `non_precisee`, que
 * personne ne choisit — elle est posée d'office à la publication, quand il n'y
 * a ni photo ni raison (voir `raisonPhotoAbsente`).
 */
export type RaisonProposee = Exclude<RaisonPhotoAbsente, 'non_precisee'>;

export const RAISONS_PROPOSEES: readonly RaisonProposee[] = RAISONS_PHOTO_ABSENTE.filter(
  (raison): raison is RaisonProposee => raison !== 'non_precisee',
);

/**
 * `lecture` : rempli par une lecture de la photo et pas retouché depuis ;
 * `main` : écrit ou modifié par la personne. `null` : jamais rempli ni touché
 * — c'est le seul état qu'un résultat tardif a le droit de remplir.
 */
export type OrigineChamp = 'lecture' | 'main';

export interface Champ<V> {
  readonly valeur: V;
  readonly origine: OrigineChamp | null;
}

export interface ChampsPiece {
  /** `''` tant que rien n'est choisi, comme le `<select>` actuel du formulaire. */
  readonly typePiece: Champ<TypePiece | ''>;
  readonly nom: Champ<string>;
  readonly prenom: Champ<string>;
}

export type NomChamp = keyof ChampsPiece;

export interface LectureEnCours {
  /** À recopier dans chaque événement de cette lecture et de ses délais. */
  readonly numero: number;
  /** INDICE reçu : afficher « ça prend un peu plus de temps ». */
  readonly lente: boolean;
}

export interface EtatParcours {
  readonly etape: EtapeParcours;
  /** Ce que dit l'écran photo ; sans effet dans les autres étapes. */
  readonly ecranPhoto: EcranPhoto;
  /**
   * Lecture en cours, ou `null`. Elle peut tourner PENDANT le formulaire
   * (après OUVRIR_FORMULAIRE, ou photo ajoutée depuis le formulaire) : son
   * résultat ne remplit alors que les champs vides jamais touchés.
   */
  readonly lecture: LectureEnCours | null;
  /** Dernier numéro attribué ; ne redescend jamais. */
  readonly dernierNumero: number;
  /**
   * Lectures terminées sans nom ni prénoms. Les pannes (délai, moteur, image
   * indécodable) et le dos d'une carte ne comptent pas : reprendre la photo n'y
   * changerait rien, ou ce n'est pas la lecture qui a raté.
   */
  readonly echecs: number;
  /**
   * Image en cours de lecture. Ni affichable, ni envoyable tant que la lecture
   * n'a pas rendu son verdict : ce peut être le dos d'une carte.
   */
  readonly imageEnLecture: Blob | null;
  /** Photo retenue (le recto) : seule image affichable. Voir `photoAEnvoyer`. */
  readonly photo: Blob | null;
  /**
   * La dernière photo était le dos d'une carte et rien ne l'a remplacée : on
   * demande le devant — écran photo `devant`, ou mention dans le formulaire si
   * le verdict est tombé après son ouverture.
   */
  readonly dosDeCarte: boolean;
  /**
   * Raison de l'absence de photo : choisie à l'écran `raison`, ou `photo_ratee`
   * posée quand la photo était le dos d'une carte. Remise à `null` dès qu'une
   * photo est retenue : raison et photo s'excluent.
   */
  readonly raison: RaisonProposee | null;
  readonly champs: ChampsPiece;
  /**
   * Nom et prénoms lus remplissent tout le champ de la bande du bas : ils ont pu
   * être coupés par l'émetteur (voir `LectureFusionnee.peutEtreCoupe`).
   */
  readonly peutEtreCoupe: boolean;
  /** D'où vient la séparation nom / prénoms lue sur le recto (sans bande du bas). */
  readonly decoupage: Decoupage | null;
  /**
   * Nom et prénoms tirés de la bande d'un dos de carte, gardés pour la photo du
   * devant qui suivra : la bande tranche le découpage, le devant rend accents
   * et apostrophe (`fusionner`). Mêmes valeurs que les champs lus, en mémoire
   * seulement.
   */
  readonly lectureDuDos: LectureMrz | null;
  /** Dernière lecture d'une photo qui n'était pas un dos, pour la même fusion en sens inverse. */
  readonly lectureDuRecto: LectureFusionnee | null;
}

/**
 * - `moteur_indisponible` : réseau coupé, fichiers du moteur ou des modèles non
 *   téléchargeables, Worker ou WebAssembly absents, Worker planté, mémoire.
 * - `image_illisible` : le navigateur ne sait pas décoder l'image (HEIC d'une
 *   galerie Android, fichier abîmé).
 */
export type CauseLectureImpossible = 'moteur_indisponible' | 'image_illisible';

export type EvenementDelai =
  | { type: 'INDICE'; numero: number }
  | { type: 'OUVRIR_FORMULAIRE'; numero: number }
  | { type: 'ABANDON'; numero: number };

export type EvenementParcours =
  /** Photo prise ou choisie — depuis l'écran photo, ou ajoutée depuis le formulaire. */
  | { type: 'PHOTO_PRISE'; image: Blob }
  /** « Je ne peux pas prendre de photo ». */
  | { type: 'SANS_PHOTO' }
  | { type: 'RAISON_CHOISIE'; raison: RaisonProposee }
  /** « Retour à la photo », « Reprendre la photo », ou bouton retour du téléphone. */
  | { type: 'RETOUR_PHOTO' }
  /** Après un dos de carte : publier sans photo plutôt que photographier le devant. */
  | { type: 'CONTINUER_SANS_PHOTO' }
  /** « Saisir à la main », possible depuis tout état. */
  | { type: 'SAISIR_MAIN' }
  /**
   * La photo retenue ne partira pas, alors qu'aucune lecture ne l'attend plus :
   * image indécodable découverte après « Saisir à la main », ou photo que ce
   * téléphone n'a pas pu vérifier (« Continuer sans photo »). Sans effet si
   * `image` n'est plus la photo retenue. `raison` : celle à poser, ou `null`
   * pour garder la raison en place.
   */
  | { type: 'PHOTO_ECARTEE'; image: Blob; raison: RaisonProposee | null }
  /**
   * Fin de la lecture. `lecture` : ce qu'a rendu `fusionner()` dans le Worker,
   * ou `null`. `estDosDeCarte` : une bande de carte à trois lignes a été vue.
   */
  | { type: 'LECTURE_TERMINEE'; numero: number; lecture: LectureFusionnee | null; estDosDeCarte: boolean }
  | { type: 'LECTURE_IMPOSSIBLE'; numero: number; cause: CauseLectureImpossible }
  | EvenementDelai
  | { type: 'CHAMP_MODIFIE'; champ: 'nom' | 'prenom'; valeur: string }
  | { type: 'TYPE_CHOISI'; typePiece: TypePiece | '' };

// ---------------------------------------------------------------------------
// État initial
// ---------------------------------------------------------------------------

/** Un état neuf par déclaration : `useReducer(reduireParcours, undefined, etatInitial)`. */
export function etatInitial(): EtatParcours {
  return {
    etape: 'photo',
    ecranPhoto: 'ouverture',
    lecture: null,
    dernierNumero: 0,
    echecs: 0,
    imageEnLecture: null,
    photo: null,
    dosDeCarte: false,
    raison: null,
    champs: {
      typePiece: { valeur: '', origine: null },
      nom: { valeur: '', origine: null },
      prenom: { valeur: '', origine: null },
    },
    peutEtreCoupe: false,
    decoupage: null,
    lectureDuDos: null,
    lectureDuRecto: null,
  };
}

// ---------------------------------------------------------------------------
// Outils internes
// ---------------------------------------------------------------------------

type EtapeFormulaire = Extract<EtapeParcours, 'verification' | 'saisie'>;

const estFormulaire = (etape: EtapeParcours): etape is EtapeFormulaire =>
  etape === 'verification' || etape === 'saisie';

/**
 * Découpages connus. Un objet plutôt qu'une liste : si `recto.ts` en ajoute un,
 * la compilation casse ici au lieu de laisser la nouvelle valeur être écartée
 * en silence.
 */
const DECOUPAGES: Record<Decoupage, true> = {
  libelles: true,
  colonnes: true,
  numerotation: true,
  position: true,
  devine: true,
};

const texte = (valeur: unknown): string | undefined =>
  typeof valeur === 'string' && valeur.length <= LONGUEUR_MAX_CHAMP && valeur.trim() ? valeur.trim() : undefined;

/**
 * Recopie clé par clé ce que la lecture a le droit de livrer. Défense en
 * profondeur : le Worker ne renvoie déjà que ces clés, mais une erreur
 * d'intégration (le texte brut glissé « pour déboguer ») s'arrête ici au lieu
 * d'entrer dans l'état React, que les outils de développement affichent.
 *
 * `peutEtreCoupe` est gardé même à `false` : sa PRÉSENCE dit que la bande du
 * bas a été lue (contrat de `fusionner`), ce dont dépend `mrzDuDos`.
 */
function assainir(lecture: unknown): LectureFusionnee | null {
  if (!lecture || typeof lecture !== 'object') return null;
  const l = lecture as Record<string, unknown>;
  const sortie: LectureFusionnee = {};
  if (TYPES_PIECE.includes(l.typePiece as TypePiece)) sortie.typePiece = l.typePiece as TypePiece;
  const nom = texte(l.nom);
  const prenom = texte(l.prenom);
  if (nom) sortie.nom = nom;
  if (prenom) sortie.prenom = prenom;
  if (typeof l.peutEtreCoupe === 'boolean') sortie.peutEtreCoupe = l.peutEtreCoupe;
  if (typeof l.decoupage === 'string' && Object.hasOwn(DECOUPAGES, l.decoupage)) {
    sortie.decoupage = l.decoupage as Decoupage;
  }
  return sortie.typePiece || sortie.nom || sortie.prenom ? sortie : null;
}

/**
 * Nom et prénoms d'un dos de carte, s'ils viennent de la bande du bas.
 *
 * Sur un dos, on ne se sert QUE de la bande : le reste de la face porte
 * d'autres noms (père, mère) que la lecture du recto n'est pas faite pour
 * écarter. `peutEtreCoupe` n'est présent que si la bande a été lue.
 */
function mrzDuDos(lecture: LectureFusionnee | null): LectureMrz | null {
  if (!lecture?.nom || lecture.peutEtreCoupe === undefined) return null;
  const typePiece = lecture.typePiece === 'CNI' || lecture.typePiece === 'Passeport' ? lecture.typePiece : undefined;
  return { ...(typePiece ? { typePiece } : {}), nom: lecture.nom, prenom: lecture.prenom ?? '' };
}

const identiteLue = (champs: ChampsPiece) => champs.nom.origine === 'lecture' || champs.prenom.origine === 'lecture';

/** Étape d'arrivée dans le formulaire quand rien n'impose la saisie : on relit s'il y a de quoi. */
const etapeFormulaire = (champs: ChampsPiece): EtapeFormulaire => (identiteLue(champs) ? 'verification' : 'saisie');

/**
 * Remplit les champs avec une lecture.
 *
 * - `remplacer` (résultat attendu, écran de lecture) : tout champ que la
 *   personne n'a pas écrit, y compris un champ lu sur une photo précédente ;
 * - `completer` (résultat tardif, formulaire ouvert) : seulement les champs
 *   jamais remplis ni touchés. Ce que la personne a tapé — ou effacé — n'est
 *   jamais réécrit, et ce qu'elle est en train de relire ne change pas sous
 *   ses yeux.
 *
 * `peutEtreCoupe` et `decoupage` suivent la lecture qui a écrit le nom ou les
 * prénoms ; une lecture qui n'en écrit aucun les laisse tels quels.
 */
function remplir(etat: EtatParcours, lecture: LectureFusionnee | null, mode: 'remplacer' | 'completer'): EtatParcours {
  if (!lecture) return etat;
  const libre = (champ: Champ<unknown>) => (mode === 'remplacer' ? champ.origine !== 'main' : champ.origine === null);
  let { typePiece, nom, prenom } = etat.champs;
  let identite = false;
  if (lecture.typePiece && libre(typePiece)) typePiece = { valeur: lecture.typePiece, origine: 'lecture' };
  if (lecture.nom && libre(nom)) {
    nom = { valeur: lecture.nom, origine: 'lecture' };
    identite = true;
  }
  if (lecture.prenom && libre(prenom)) {
    prenom = { valeur: lecture.prenom, origine: 'lecture' };
    identite = true;
  }
  if (typePiece === etat.champs.typePiece && !identite) return etat;
  const champs = { typePiece, nom, prenom };
  if (!identite) return { ...etat, champs };
  return { ...etat, champs, peutEtreCoupe: lecture.peutEtreCoupe === true, decoupage: lecture.decoupage ?? null };
}

/**
 * Arrête la lecture en cours, s'il y en a une.
 *
 * - `garderImage` (arrêt sans verdict : « Saisir à la main », 25 s, moteur
 *   indisponible) : l'image lue remplace la photo, comme au verdict d'un recto.
 * - sinon (retour vers l'appareil photo, image indécodable) : elle est lâchée,
 *   et la photo, la raison et le dos de carte d'avant restent en place.
 */
function arreterLecture(etat: EtatParcours, garderImage: boolean): EtatParcours {
  if (!etat.lecture && !etat.imageEnLecture) return etat;
  const image = garderImage ? etat.imageEnLecture : null;
  return {
    ...etat,
    lecture: null,
    imageEnLecture: null,
    ...(image ? { photo: image, raison: null, dosDeCarte: false } : {}),
  };
}

/** Verdict d'une lecture : voir le commentaire de tête pour les règles. */
function terminer(etat: EtatParcours, lecture: LectureFusionnee | null, estDosDeCarte: boolean): EtatParcours {
  const enFormulaire = estFormulaire(etat.etape);
  const mode = enFormulaire ? 'completer' : 'remplacer';

  if (estDosDeCarte) {
    const mrz = mrzDuDos(lecture);
    // Nom de la bande, orthographe d'un recto déjà lu quand les lettres concordent.
    const combinee = mrz
      ? fusionner(mrz, etat.lectureDuRecto)
      : lecture?.typePiece
        ? { typePiece: lecture.typePiece }
        : null;
    const rempli = remplir(etat, combinee, mode);
    return {
      ...rempli,
      etape: estFormulaire(etat.etape) ? (etat.etape === 'saisie' ? etapeFormulaire(rempli.champs) : etat.etape) : 'photo',
      ecranPhoto: 'devant',
      lecture: null,
      // Lâchée ici, et nulle part recopiée : ni aperçu, ni envoi.
      imageEnLecture: null,
      // La dernière photo prise l'emporte : l'ancienne n'est pas ressortie en
      // douce. On demande le devant, ou l'on continue sans photo.
      photo: null,
      dosDeCarte: true,
      raison: 'photo_ratee',
      lectureDuDos: mrz ?? etat.lectureDuDos,
    };
  }

  // Photo du devant après un dos : découpage de la bande, orthographe du devant.
  const combinee = etat.lectureDuDos ? fusionner(etat.lectureDuDos, lecture) : lecture;
  const rempli = remplir(etat, combinee, mode);
  const suite: EtatParcours = {
    ...rempli,
    lecture: null,
    imageEnLecture: null,
    photo: etat.imageEnLecture,
    raison: null,
    dosDeCarte: false,
    lectureDuRecto: lecture ?? etat.lectureDuRecto,
  };

  // Un résultat partiel (nom seul, prénoms seuls) est un succès.
  if (combinee?.nom || combinee?.prenom) {
    if (!enFormulaire) return { ...suite, etape: etapeFormulaire(suite.champs) };
    return etat.etape === 'saisie' ? { ...suite, etape: etapeFormulaire(suite.champs) } : suite;
  }

  const echecs = etat.echecs + 1;
  // Formulaire déjà ouvert : on compte, mais on n'arrache pas la personne à sa saisie.
  if (enFormulaire) return { ...suite, echecs };
  // Au deuxième échec, personne ne tente une troisième fois : saisie, photo gardée.
  if (echecs >= 2) return { ...suite, echecs, etape: 'saisie' };
  return { ...suite, echecs, etape: 'photo', ecranPhoto: 'reprise' };
}

// ---------------------------------------------------------------------------
// Réducteur
// ---------------------------------------------------------------------------

export function reduireParcours(etat: EtatParcours, evenement: EvenementParcours): EtatParcours {
  switch (evenement.type) {
    case 'PHOTO_PRISE': {
      if (etat.etape !== 'photo' && !estFormulaire(etat.etape)) return etat;
      const numero = etat.dernierNumero + 1;
      // Photo, raison et dos de carte précédents restent tels quels jusqu'au
      // verdict : si la lecture est annulée par un retour arrière, ou si
      // l'image est indécodable, la personne retrouve exactement la situation
      // d'avant. Une lecture précédente encore en cours est remplacée : son
      // numéro ne correspond plus.
      return {
        ...etat,
        // Depuis le formulaire, on y reste : la lecture tourne derrière.
        etape: etat.etape === 'photo' ? 'lecture' : etat.etape,
        lecture: { numero, lente: false },
        dernierNumero: numero,
        imageEnLecture: evenement.image,
      };
    }

    case 'SANS_PHOTO':
      // Sortie de l'écran photo seulement : le formulaire ne pose pas la question.
      if (etat.etape !== 'photo') return etat;
      return { ...etat, etape: 'raison' };

    case 'RAISON_CHOISIE':
      if (etat.etape !== 'raison' || !RAISONS_PROPOSEES.includes(evenement.raison)) return etat;
      // Une raison et une photo s'excluent : l'API efface la raison dès qu'une photo part.
      return { ...etat, etape: 'saisie', raison: evenement.raison, photo: null, dosDeCarte: false };

    case 'RETOUR_PHOTO':
      if (etat.etape === 'photo') return etat;
      // L'écran raison est un détour depuis l'écran photo : on le retrouve tel qu'il était.
      if (etat.etape === 'raison') return { ...etat, etape: 'photo' };
      return {
        ...arreterLecture(etat, false),
        etape: 'photo',
        ecranPhoto: etat.etape === 'lecture' ? etat.ecranPhoto : etat.dosDeCarte ? 'devant' : 'ouverture',
      };

    case 'CONTINUER_SANS_PHOTO':
      // Seulement quand on demande le devant (`demanderDevant`) : pas pendant
      // la lecture d'une nouvelle photo, qui dira elle-même ce qu'elle est.
      if (!etat.dosDeCarte || etat.lecture || (etat.etape !== 'photo' && !estFormulaire(etat.etape))) return etat;
      return {
        ...etat,
        etape: estFormulaire(etat.etape) ? etat.etape : etapeFormulaire(etat.champs),
        dosDeCarte: false,
        raison: 'photo_ratee',
        photo: null,
      };

    case 'SAISIR_MAIN':
      if (etat.etape === 'saisie' && !etat.lecture && !etat.dosDeCarte) return etat;
      // Lecture annulée sans verdict : l'image devient la photo, le compteur ne bouge pas.
      return { ...arreterLecture(etat, true), etape: 'saisie', dosDeCarte: false };

    case 'PHOTO_ECARTEE': {
      const { image, raison } = evenement;
      if (!image || etat.photo !== image || (raison !== null && !RAISONS_PROPOSEES.includes(raison))) return etat;
      // L'étape ne change pas : le formulaire dit lui-même pourquoi la photo n'est plus là.
      return { ...etat, photo: null, raison: raison ?? etat.raison };
    }

    case 'INDICE':
      if (etat.lecture?.numero !== evenement.numero || etat.lecture.lente) return etat;
      return { ...etat, lecture: { numero: etat.lecture.numero, lente: true } };

    case 'OUVRIR_FORMULAIRE':
      if (etat.lecture?.numero !== evenement.numero || etat.etape !== 'lecture') return etat;
      return { ...etat, etape: etapeFormulaire(etat.champs) };

    case 'ABANDON':
    case 'LECTURE_IMPOSSIBLE': {
      if (etat.lecture?.numero !== evenement.numero) return etat;
      const garderImage = evenement.type === 'ABANDON' || evenement.cause !== 'image_illisible';
      const arrete = arreterLecture(etat, garderImage);
      return etat.etape === 'lecture' ? { ...arrete, etape: etapeFormulaire(arrete.champs) } : arrete;
    }

    case 'LECTURE_TERMINEE':
      if (etat.lecture?.numero !== evenement.numero) return etat;
      return terminer(etat, assainir(evenement.lecture), evenement.estDosDeCarte === true);

    case 'CHAMP_MODIFIE': {
      if (!estFormulaire(etat.etape) || typeof evenement.valeur !== 'string') return etat;
      const champ: Champ<string> = { valeur: evenement.valeur, origine: 'main' };
      if (evenement.champ === 'nom') {
        return etat.champs.nom.valeur === evenement.valeur ? etat : { ...etat, champs: { ...etat.champs, nom: champ } };
      }
      if (evenement.champ === 'prenom') {
        return etat.champs.prenom.valeur === evenement.valeur
          ? etat
          : { ...etat, champs: { ...etat.champs, prenom: champ } };
      }
      return etat;
    }

    case 'TYPE_CHOISI': {
      const { typePiece } = evenement;
      if (!estFormulaire(etat.etape) || (typePiece !== '' && !TYPES_PIECE.includes(typePiece))) return etat;
      // Toucher le type déjà affiché n'est pas une modification : la marque reste.
      if (etat.champs.typePiece.valeur === typePiece) return etat;
      return { ...etat, champs: { ...etat.champs, typePiece: { valeur: typePiece, origine: 'main' } } };
    }

    default:
      return etat;
  }
}

// ---------------------------------------------------------------------------
// Sélecteurs
// ---------------------------------------------------------------------------

/**
 * Seule image que l'interface a le droit de montrer. Jamais l'image en cours
 * de lecture, jamais un dos de carte.
 */
export function photoAffichable(etat: EtatParcours): Blob | null {
  return etat.photo;
}

/**
 * Image candidate à l'envoi à la publication, ou `null` : la photo retenue, ou
 * l'image dont la lecture tourne encore derrière le formulaire. Jamais un dos
 * de carte reconnu : il a été lâché au verdict.
 *
 * Candidate seulement. Une image retenue SANS verdict (« Saisir à la main »,
 * ABANDON, moteur indisponible) peut encore être un dos : l'intégrateur ne
 * l'envoie qu'une fois qu'une lecture a dit « pas un dos », et l'écarte
 * (`PHOTO_ECARTEE`) sinon — voir `soumettre` dans pages/Declarer.tsx.
 */
export function photoAEnvoyer(etat: EtatParcours): Blob | null {
  if (etat.lecture && estFormulaire(etat.etape) && etat.imageEnLecture) return etat.imageEnLecture;
  return etat.photo;
}

/**
 * `photoAbsenteRaison` à transmettre : rien s'il y a une photo, sinon la raison
 * choisie ou posée, et `non_precisee` à défaut — jamais de blocage.
 */
export function raisonPhotoAbsente(etat: EtatParcours): RaisonPhotoAbsente | undefined {
  return photoAEnvoyer(etat) ? undefined : (etat.raison ?? 'non_precisee');
}

/** Question du type de pièce : seulement si aucune lecture ne l'a donné (ou si la personne l'a changé). */
export function doitDemanderType(etat: EtatParcours): boolean {
  return etat.champs.typePiece.origine !== 'lecture';
}

/** Champs à marquer « Lu sur la photo ». */
export function champsLus(etat: EtatParcours): NomChamp[] {
  return (['typePiece', 'nom', 'prenom'] as const).filter((nom) => etat.champs[nom].origine === 'lecture');
}

/** Invite sous le nom et les prénoms lus : accents, apostrophe et tiret, que la lecture ne rend pas toujours. */
export function inviteAccents(etat: EtatParcours): boolean {
  return identiteLue(etat.champs);
}

/** Invite « les prénoms sont peut-être coupés », tant qu'un champ lu reste à relire. */
export function inviteCoupure(etat: EtatParcours): boolean {
  return etat.peutEtreCoupe && identiteLue(etat.champs);
}

/** Invite « vérifie où s'arrête le nom » : séparation déduite de la position ou devinée. */
export function inviteDecoupage(etat: EtatParcours): boolean {
  return (etat.decoupage === 'position' || etat.decoupage === 'devine') && identiteLue(etat.champs);
}

/**
 * Demander le devant de la carte : sur l'écran photo (`ecranPhoto` vaut alors
 * `devant`) ou en mention dans le formulaire quand le verdict y est tombé.
 * Faux pendant la lecture d'une nouvelle photo : on ne parle pas du dos
 * pendant qu'on lit peut-être déjà le devant.
 */
export function demanderDevant(etat: EtatParcours): boolean {
  return etat.dosDeCarte && etat.lecture === null;
}

/** Lecture qui continue derrière le formulaire ouvert (« On lit encore la photo… »). */
export function lectureEnFond(etat: EtatParcours): boolean {
  return etat.lecture !== null && estFormulaire(etat.etape);
}
