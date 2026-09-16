import type { LectureFusionnee } from '@partage/fusion-lecture';

/**
 * Lecture d'une photo de pièce dans le navigateur : ce que le reste de
 * l'application a le droit d'utiliser.
 *
 * Ce module ne fait rien à son chargement et n'importe statiquement que des
 * types : il peut être importé par une page pré-rendue (`/declarer`). Le
 * moteur (moteur.ts, tesseract.js, toiles) n'est chargé qu'au premier appel,
 * par import dynamique.
 *
 * Ce qui sort d'ici, et rien d'autre :
 *
 * - `resultat` : `{ typePiece?, nom?, prenom?, peutEtreCoupe?, decoupage? }`
 *   ou `null`. Aucun numéro, aucune date, aucun identifiant ; jamais le texte
 *   lu. Le nom et les prénoms sont À RELIRE par la personne (brief § 2.4) ;
 * - `imageAEnvoyer` : la photo réduite (JPEG 0,85, côté long ≤ 1600 px), ou
 *   `null` quand c'est le dos d'une carte. C'est la seule forme sous laquelle
 *   une photo peut partir : sans lecture aboutie, rien ne part ;
 * - `estDosDeCarte` : la photo montre la bande à trois lignes d'une carte.
 *   L'image n'est alors ni envoyée ni montrée ; le résultat vient de la bande,
 *   et l'on demande le devant (ou l'on continue sans photo).
 *
 * Rien n'est persisté : ni les champs lus, ni l'image (pas de stockage, pas
 * d'IndexedDB). Aucun journal.
 */

/** Ce que rend `lirePiece`. */
export interface LecturePiece {
  /** Champs lus, à relire ; `null` si rien d'exploitable. */
  readonly resultat: LectureFusionnee | null;
  /** Photo à envoyer à la publication ; `null` pour un dos de carte. */
  readonly imageAEnvoyer: Blob | null;
  /** Vrai si la photo est le dos d'une carte. */
  readonly estDosDeCarte: boolean;
}

export interface OptionsLecture {
  /**
   * Annule la lecture : le moteur est arrêté sur-le-champ et la promesse
   * échoue avec une `DOMException` « AbortError » (voir `estAnnulation`).
   */
  readonly signal?: AbortSignal;
}

/**
 * Pourquoi aucune lecture n'a pu avoir lieu. Même vocabulaire que
 * `CauseLectureImpossible` de machine.ts, qui ne compte PAS ces cas comme des
 * échecs de lecture :
 *
 * - `moteur_indisponible` : fichiers du moteur injoignables (hors ligne),
 *   WebAssembly ou Worker absents, Worker tombé, délai de sécurité dépassé ;
 * - `image_illisible` : le navigateur ne sait pas décoder l'image (HEIC hors
 *   Safari, fichier abîmé ou démesuré).
 */
export type CauseLectureImpossible = 'moteur_indisponible' | 'image_illisible';

/**
 * Erreur de lecture. Message fixe, sans rien de l'erreur d'origine : ni URL,
 * ni message du moteur, ni contenu de l'image.
 */
export class LectureImpossible extends Error {
  declare readonly cause: CauseLectureImpossible;

  constructor(cause: CauseLectureImpossible) {
    super('Lecture de la pièce impossible', { cause });
    this.name = 'LectureImpossible';
  }
}

/** L'erreur vient-elle d'une annulation par le signal ? */
export function estAnnulation(erreur: unknown): boolean {
  return typeof erreur === 'object' && erreur !== null && (erreur as { name?: unknown }).name === 'AbortError';
}

type ModuleMoteur = typeof import('./moteur');

/** Chargement du moteur, partagé par les appels ; oublié s'il échoue, pour réessayer au suivant. */
let chargement: Promise<ModuleMoteur> | null = null;

function chargerMoteur(): Promise<ModuleMoteur> {
  chargement ??= import('./moteur').catch((erreur: unknown) => {
    chargement = null;
    throw erreur;
  });
  return chargement;
}

/**
 * Lit la photo d'une pièce : une seule photo, le recto (ou la page des données
 * d'un passeport).
 *
 * Rejets possibles, et seulement ceux-là :
 * - `LectureImpossible` (`cause` : `moteur_indisponible` ou `image_illisible`) ;
 * - `DOMException` « AbortError » si `options.signal` est levé.
 *
 * Une lecture qui aboutit sans rien trouver n'est pas un rejet : `resultat`
 * vaut `null`, et c'est cela, un échec de lecture.
 */
export async function lirePiece(fichier: Blob, options: OptionsLecture = {}): Promise<LecturePiece> {
  const { signal } = options;
  if (signal?.aborted) throw new DOMException('Lecture annulée', 'AbortError');
  let moteur: ModuleMoteur;
  try {
    moteur = await chargerMoteur();
  } catch {
    if (signal?.aborted) throw new DOMException('Lecture annulée', 'AbortError');
    throw new LectureImpossible('moteur_indisponible');
  }
  return moteur.executerLecture(fichier, signal);
}

/**
 * Démarre le moteur d'avance, sans rien lire — à appeler au toucher de
 * « Prendre la photo » ou à l'ouverture du viseur. Le téléchargement (~2 Mo
 * la première fois) et la compilation se font pendant le cadrage. Sans effet
 * si c'est déjà fait ; silencieux en cas d'échec (la lecture réessaiera).
 */
export function prechargerLecture(): void {
  chargerMoteur().then(
    (moteur) => moteur.prechauffer(),
    () => {},
  );
}

/**
 * Arrête le moteur préchauffé qui n'a pas servi (la personne quitte la page ou
 * passe à la saisie à la main). Ne charge rien si rien n'a été chargé.
 */
export function libererLecture(): void {
  chargement?.then(
    (moteur) => moteur.liberer(),
    () => {},
  );
}

/*
 * Pas de « réduire pour l'envoi sans lire » ici : une photo que la lecture n'a
 * pas pu vérifier peut être le dos d'une carte, et ne part pas (voir
 * `decisionEnvoi`, declaration.ts). La seule image envoyable est
 * `imageAEnvoyer`, rendue par une lecture qui a abouti.
 */
