import { describe, expect, it } from 'vitest';
import type { LectureFusionnee } from '@partage/fusion-lecture';
import {
  decisionEnvoi,
  etatDeclarationInitial,
  identiteLue,
  reduireDeclaration,
  type EtatDeclaration,
  type EvenementDeclaration,
} from './declaration';
import { photoAEnvoyer, photoAffichable, raisonPhotoAbsente } from './machine';
import source from './declaration.ts?raw';

/**
 * L'état de la page de déclaration, rejoué événement par événement, sans
 * navigateur ni moteur. Données : spécimen ICAO 9303 et noms inventés.
 */

type Pas = EvenementDeclaration | ((etat: EtatDeclaration) => EvenementDeclaration);

const jouer = (pas: Pas[], depart: EtatDeclaration = etatDeclarationInitial()): EtatDeclaration =>
  pas.reduce<EtatDeclaration>((etat, p) => reduireDeclaration(etat, typeof p === 'function' ? p(etat) : p), depart);

const image = (etiquette: string) => new Blob([etiquette], { type: 'image/jpeg' });
const photo = (img: Blob): Pas => ({ type: 'PHOTO_PRISE', image: img });
const REDUITE = image('réduite');

/** Fin de la lecture en cours, attendue par la machine. */
const finie =
  (img: Blob, lecture: LectureFusionnee | null, estDosDeCarte = false): Pas =>
  (etat) => ({
    type: 'LECTURE_FINIE',
    numero: etat.parcours.dernierNumero,
    image: img,
    lecture,
    estDosDeCarte,
    imageAEnvoyer: estDosDeCarte ? null : REDUITE,
  });

const NGUESSAN: LectureFusionnee = { typePiece: 'CNI', nom: 'NGUESSAN', prenom: 'SERGE YVAN', decoupage: 'libelles' };

describe('image indécodable (fichier HEIC de galerie)', () => {
  it('attendue par la machine : lâchée, et le formulaire le dit', () => {
    const a = image('heic');
    const e = jouer([photo(a), (etat) => ({ type: 'LECTURE_ILLISIBLE', numero: etat.parcours.dernierNumero, image: a })]);
    expect(e.imageIllisible).toBe(true);
    expect(photoAEnvoyer(e.parcours)).toBeNull();
  });

  it('après « Saisir à la main » (numéro plus attendu) : la photo gardée est écartée, rien ne part', () => {
    const a = image('heic');
    const gardee = jouer([photo(a), { type: 'SAISIR_MAIN' }]);
    expect(photoAEnvoyer(gardee.parcours)).toBe(a);
    const e = reduireDeclaration(gardee, { type: 'LECTURE_ILLISIBLE', numero: 1, image: a });
    expect(e.parcours.etape).toBe('saisie');
    expect(photoAEnvoyer(e.parcours)).toBeNull();
    expect(photoAffichable(e.parcours)).toBeNull();
    expect(raisonPhotoAbsente(e.parcours)).toBe('non_precisee');
    expect(e.imageIllisible).toBe(true);
    expect(decisionEnvoi(undefined, true)).toEqual({ type: 'illisible' });
  });

  it('image d’une autre photo : rien ne change (même référence)', () => {
    const gardee = jouer([photo(image('a')), { type: 'SAISIR_MAIN' }]);
    expect(reduireDeclaration(gardee, { type: 'LECTURE_ILLISIBLE', numero: null, image: image('b') })).toBe(gardee);
  });
});

describe('dos de carte reconnu après « Saisir à la main »', () => {
  it('le verdict tardif écarte la photo et demande le devant ; pas d’aperçu', () => {
    const a = image('dos');
    const gardee = jouer([photo(a), { type: 'SAISIR_MAIN' }]);
    const e = reduireDeclaration(gardee, {
      type: 'LECTURE_FINIE',
      numero: 1,
      image: a,
      lecture: null,
      estDosDeCarte: true,
      imageAEnvoyer: null,
    });
    expect(photoAEnvoyer(e.parcours)).toBeNull();
    expect(e.parcours.dosDeCarte).toBe(true);
    expect(e.verifiee).toBeNull();
  });
});

describe('titre, invite des accents et annonce : « une lecture a rempli ce formulaire »', () => {
  it('reste vrai quand la personne corrige nom et prénoms', () => {
    const a = image('a');
    const lue = jouer([photo(a), finie(a, NGUESSAN)]);
    expect(lue.parcours.etape).toBe('verification');
    expect(lue.lus).toEqual({ nom: true, prenom: true });
    const corrigee = jouer(
      [
        { type: 'CHAMP_MODIFIE', champ: 'nom', valeur: "N'GUESSAN" },
        { type: 'CHAMP_MODIFIE', champ: 'prenom', valeur: 'SERGE-YVAN' },
      ],
      lue,
    );
    // Les marques « Lu sur la photo » partent, champ par champ…
    expect(corrigee.parcours.champs.nom.origine).toBe('main');
    expect(corrigee.parcours.champs.prenom.origine).toBe('main');
    // … mais le formulaire dit toujours qu'il a été lu.
    expect(identiteLue(corrigee)).toBe(true);
    expect(corrigee.lus).toEqual({ nom: true, prenom: true });
  });

  it('nom seul lu : l’annonce ne parle pas de prénoms', () => {
    const a = image('a');
    const e = jouer([photo(a), finie(a, { nom: 'KOFFI' })]);
    expect(e.lus).toEqual({ nom: true, prenom: false });
  });

  it('remis à zéro par un retour à la photo, puis recalculé d’après les champs encore lus', () => {
    const a = image('a');
    const corrigee = jouer([
      photo(a),
      finie(a, NGUESSAN),
      { type: 'CHAMP_MODIFIE', champ: 'nom', valeur: "N'GUESSAN" },
    ]);
    const retour = reduireDeclaration(corrigee, { type: 'RETOUR_PHOTO' });
    // Le prénom garde son origine « lecture » : toujours lu ; le nom, écrit à la main, ne l'est plus.
    expect(retour.lus).toEqual({ nom: false, prenom: true });
  });

  it('rien lu, rien à dire', () => {
    const e = jouer([{ type: 'SANS_PHOTO' }, { type: 'RAISON_CHOISIE', raison: 'plus_en_main' }]);
    expect(identiteLue(e)).toBe(false);
  });
});

describe('retour depuis l’écran photo', () => {
  it('vers l’accueil tant que le formulaire n’a jamais été ouvert, vers lui ensuite', () => {
    expect(etatDeclarationInitial().formulaireVu).toBe(false);
    const a = image('a');
    expect(jouer([photo(a)]).formulaireVu).toBe(false);
    const formulaire = jouer([photo(a), { type: 'SAISIR_MAIN' }]);
    expect(formulaire.formulaireVu).toBe(true);
    const photoDeNouveau = reduireDeclaration(formulaire, { type: 'RETOUR_PHOTO' });
    expect(photoDeNouveau.parcours.etape).toBe('photo');
    expect(photoDeNouveau.formulaireVu).toBe(true);
    // « Retour au formulaire » : la photo gardée et les champs sont toujours là.
    const revenu = reduireDeclaration(photoDeNouveau, { type: 'SAISIR_MAIN' });
    expect(revenu.parcours.etape).toBe('saisie');
    expect(photoAEnvoyer(revenu.parcours)).toBe(a);
  });
});

describe('decisionEnvoi : jamais une image sans verdict', () => {
  it('verdict « pas un dos » : la version réduite, jamais l’originale', () => {
    expect(decisionEnvoi({ estDosDeCarte: false, imageAEnvoyer: REDUITE }, false)).toEqual({ type: 'envoyer', image: REDUITE });
  });

  it('pas de verdict (moteur injoignable, Worker tombé, délai) : rien ne part', () => {
    expect(decisionEnvoi(undefined, false)).toEqual({ type: 'non-verifiee' });
    expect(decisionEnvoi({ estDosDeCarte: false, imageAEnvoyer: null }, false)).toEqual({ type: 'non-verifiee' });
  });

  it('dos de carte, image illisible : rien ne part', () => {
    expect(decisionEnvoi({ estDosDeCarte: true, imageAEnvoyer: null }, false)).toEqual({ type: 'dos' });
    expect(decisionEnvoi({ estDosDeCarte: false, imageAEnvoyer: REDUITE }, true)).toEqual({ type: 'illisible' });
  });

  it('photo pas vérifiable : « Continuer sans photo » l’écarte, raison « appareil »', () => {
    const a = image('a');
    const gardee = jouer([photo(a), (etat) => ({ type: 'LECTURE_IMPOSSIBLE', numero: etat.parcours.dernierNumero, cause: 'moteur_indisponible' })]);
    expect(photoAEnvoyer(gardee.parcours)).toBe(a);
    const sans = reduireDeclaration(gardee, { type: 'PHOTO_ECARTEE', image: a, raison: 'appareil' });
    expect(photoAEnvoyer(sans.parcours)).toBeNull();
    expect(raisonPhotoAbsente(sans.parcours)).toBe('appareil');
  });
});

describe('declaration.ts — pure et muette', () => {
  it('ni console, ni minuteur, ni stockage, ni React', () => {
    expect(source).not.toMatch(/\bconsole\s*\./);
    expect(source).not.toMatch(/\b(setTimeout|setInterval|Date\.now)\b/);
    expect(source).not.toMatch(/\b(localStorage|sessionStorage|indexedDB|caches)\b/);
    expect(source).not.toMatch(/\bfrom ['"]react['"]/);
  });
});
