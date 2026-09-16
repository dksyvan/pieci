import type { LectureFusionnee } from '@partage/fusion-lecture';
import { etatInitial, reduireParcours, type EtatParcours, type EvenementParcours } from './machine';

/**
 * État de la page de déclaration : la machine du parcours (machine.ts), plus
 * ce que la page apprend des lectures qu'elle lance elle-même et qu'aucune
 * étape de la machine n'attend plus (« Saisir à la main », vérification au
 * moment de publier).
 *
 * Réducteur pur, comme la machine : testé en environnement node, importable
 * par le pré-rendu (ni Worker, ni WASM, ni toile, ni React). Aucun texte
 * d'interface ici. Ce qui n'entre jamais dans cet état : le texte lu, un
 * numéro, une date — les lectures n'y arrivent que par la machine, qui les
 * recopie clé par clé.
 */

/**
 * Ce qu'une lecture terminée a appris d'une image, gardé tant que l'image vit :
 * de quoi ne jamais envoyer un dos de carte, et envoyer la version réduite.
 * Ni nom, ni prénoms : ceux-là sont dans l'état du parcours et nulle part
 * ailleurs.
 */
export interface Verdict {
  readonly estDosDeCarte: boolean;
  readonly imageAEnvoyer: Blob | null;
}

/** Nom et prénoms qu'une lecture a remplis dans ce formulaire (voir `EtatDeclaration.lus`). */
export interface IdentiteLue {
  readonly nom: boolean;
  readonly prenom: boolean;
}

export interface EtatDeclaration {
  readonly parcours: EtatParcours;
  /**
   * La dernière image n'a pas pu être ouverte (HEIC d'une galerie, fichier
   * abîmé). La machine la lâche et passe au formulaire sans rien en dire : on
   * le dit, sinon la personne croit sa photo jointe.
   */
  readonly imageIllisible: boolean;
  /**
   * Dernière image dont une lecture a rendu un verdict « pas un dos de carte »,
   * avec sa version réduite. Seule image dont on montre un aperçu : une photo
   * retenue SANS verdict (« Saisir à la main » pendant la lecture, moteur
   * indisponible) peut encore être un dos, et un dos ne s'affiche jamais.
   * L'aperçu montre la version réduite (1600 px) : décoder la photo d'origine
   * — 12 Mpx, près de 50 Mo en mémoire — pour une vignette de 64 px coûterait
   * cher à un petit téléphone.
   */
  readonly verifiee: { readonly image: Blob; readonly reduite: Blob | null } | null;
  /**
   * Nom, prénoms : une lecture les a remplis dans ce formulaire. Contrairement
   * à l'origine champ par champ (qui passe à « main » dès la première frappe,
   * et retire la marque « Lu sur la photo »), cela reste vrai quand la
   * personne corrige : le titre « On a lu la pièce », l'invite des accents et
   * l'annonce ne basculent pas en « écris toi-même » au moment même où elle
   * suit la consigne. Remis à zéro en retournant à la photo, avec une nouvelle
   * photo, ou en choisissant de ne pas en prendre.
   */
  readonly lus: IdentiteLue;
  /**
   * Le formulaire a déjà été ouvert : ce qui y est écrit ne vit qu'en mémoire,
   * et quitter la page depuis l'écran photo le perdrait. L'écran photo propose
   * alors d'y revenir plutôt que de retourner à l'accueil.
   */
  readonly formulaireVu: boolean;
}

export type EvenementDeclaration =
  | EvenementParcours
  /**
   * Fin d'une lecture, quelle que soit la façon dont elle a été lancée.
   * `numero` : celui de la lecture pour la machine, ou `null` quand la lecture
   * a été lancée par la page au moment de publier.
   */
  | {
      type: 'LECTURE_FINIE';
      numero: number | null;
      image: Blob;
      lecture: LectureFusionnee | null;
      estDosDeCarte: boolean;
      imageAEnvoyer: Blob | null;
    }
  /** Image que le navigateur ne sait pas décoder, attendue par la machine (`numero`) ou non. */
  | { type: 'LECTURE_ILLISIBLE'; numero: number | null; image: Blob };

const AUCUN_LU: IdentiteLue = { nom: false, prenom: false };

export const etatDeclarationInitial = (): EtatDeclaration => ({
  parcours: etatInitial(),
  imageIllisible: false,
  verifiee: null,
  lus: AUCUN_LU,
  formulaireVu: false,
});

/**
 * Verdict d'une lecture.
 *
 * Attendu (même numéro) : c'est `LECTURE_TERMINEE`, tel quel.
 *
 * Plus attendu : la machine ignore un résultat dont le numéro ne correspond
 * plus, et c'est juste pour les champs — la personne a choisi « Saisir à la
 * main », on ne remplit pas derrière son dos. Mais la lecture, elle, a continué
 * (voir `demarrerLecture` dans la page), et si elle a reconnu le DOS d'une
 * carte dans la photo retenue, cette photo ne doit ni partir ni rester
 * affichée. On rejoue alors, d'un bloc, ce qui se serait passé si la photo
 * avait été ajoutée depuis le formulaire : `PHOTO_PRISE` puis
 * `LECTURE_TERMINEE`. Le réducteur de la machine reste la seule règle — photo
 * lâchée, raison `photo_ratee`, demande du devant, champs complétés seulement
 * s'ils n'ont jamais été touchés.
 */
function verdictDeLecture(etat: EtatParcours, verdict: Extract<EvenementDeclaration, { type: 'LECTURE_FINIE' }>) {
  const { numero, image, lecture, estDosDeCarte } = verdict;
  if (numero !== null && etat.lecture?.numero === numero) {
    return reduireParcours(etat, { type: 'LECTURE_TERMINEE', numero, lecture, estDosDeCarte });
  }
  if (!estDosDeCarte || etat.lecture || etat.photo !== image) return etat;
  const rouverte = reduireParcours(etat, { type: 'PHOTO_PRISE', image });
  if (!rouverte.lecture) return etat;
  return reduireParcours(rouverte, {
    type: 'LECTURE_TERMINEE',
    numero: rouverte.lecture.numero,
    lecture,
    estDosDeCarte: true,
  });
}

/**
 * Image indécodable. Attendue : `LECTURE_IMPOSSIBLE`, la machine la lâche.
 * Plus attendue (« Saisir à la main » l'avait gardée comme photo) : elle est
 * écartée de la même façon — le fichier brut, avec ses métadonnées, ne part
 * jamais faute de version réduite.
 */
function imageIllisible(etat: EtatParcours, evenement: Extract<EvenementDeclaration, { type: 'LECTURE_ILLISIBLE' }>) {
  const { numero, image } = evenement;
  if (numero !== null && etat.lecture?.numero === numero) {
    return reduireParcours(etat, { type: 'LECTURE_IMPOSSIBLE', numero, cause: 'image_illisible' });
  }
  return reduireParcours(etat, { type: 'PHOTO_ECARTEE', image, raison: null });
}

export function reduireDeclaration(etat: EtatDeclaration, evenement: EvenementDeclaration): EtatDeclaration {
  const parcours =
    evenement.type === 'LECTURE_FINIE'
      ? verdictDeLecture(etat.parcours, evenement)
      : evenement.type === 'LECTURE_ILLISIBLE'
        ? imageIllisible(etat.parcours, evenement)
        : reduireParcours(etat.parcours, evenement);
  // Retenu même quand la machine n'attendait plus ce verdict : l'image, elle,
  // est peut-être encore la photo retenue.
  const verifiee =
    evenement.type === 'LECTURE_FINIE' && !evenement.estDosDeCarte
      ? { image: evenement.image, reduite: evenement.imageAEnvoyer }
      : etat.verifiee;
  // Même référence : rien à faire, et React ne refait pas le rendu.
  if (parcours === etat.parcours && verifiee === etat.verifiee) return etat;

  const illisible =
    evenement.type === 'LECTURE_ILLISIBLE'
      ? true
      : evenement.type === 'LECTURE_IMPOSSIBLE'
        ? evenement.cause === 'image_illisible'
        : evenement.type === 'PHOTO_PRISE' || evenement.type === 'RETOUR_PHOTO'
          ? false
          : etat.imageIllisible;

  const remise = evenement.type === 'PHOTO_PRISE' || evenement.type === 'RETOUR_PHOTO' || evenement.type === 'RAISON_CHOISIE';
  const avant = remise ? AUCUN_LU : etat.lus;
  const nom = avant.nom || parcours.champs.nom.origine === 'lecture';
  const prenom = avant.prenom || parcours.champs.prenom.origine === 'lecture';
  const lus = nom === etat.lus.nom && prenom === etat.lus.prenom ? etat.lus : { nom, prenom };

  const formulaireVu = etat.formulaireVu || parcours.etape === 'verification' || parcours.etape === 'saisie';
  return { parcours, imageIllisible: illisible, verifiee, lus, formulaireVu };
}

/** Une lecture a-t-elle rempli le nom ou les prénoms de ce formulaire ? */
export const identiteLue = (etat: EtatDeclaration): boolean => etat.lus.nom || etat.lus.prenom;

/**
 * Que faire de l'image candidate au moment de publier, une fois la lecture
 * attendue ou relancée :
 *
 * - `envoyer` : une lecture a dit « pas un dos », et en a tiré la version
 *   réduite (JPEG réencodé par la toile, donc sans métadonnées) ;
 * - `dos` : c'est le dos d'une carte, rien ne part, on demande le devant ;
 * - `illisible` : le navigateur ne sait pas l'ouvrir, rien ne part ;
 * - `non-verifiee` : aucune lecture n'a pu aboutir (moteur injoignable,
 *   Worker tombé, délai dépassé). Rien ne part : ce peut être un dos, qui porte
 *   en clair le numéro et la date de naissance. Jamais de repli sur le fichier
 *   d'origine ni sur une réduction faite sans lecture.
 */
export type DecisionEnvoi =
  | { readonly type: 'envoyer'; readonly image: Blob }
  | { readonly type: 'dos' }
  | { readonly type: 'illisible' }
  | { readonly type: 'non-verifiee' };

export function decisionEnvoi(verdict: Verdict | undefined, illisible: boolean): DecisionEnvoi {
  if (illisible) return { type: 'illisible' };
  if (!verdict) return { type: 'non-verifiee' };
  if (verdict.estDosDeCarte) return { type: 'dos' };
  return verdict.imageAEnvoyer ? { type: 'envoyer', image: verdict.imageAEnvoyer } : { type: 'non-verifiee' };
}
