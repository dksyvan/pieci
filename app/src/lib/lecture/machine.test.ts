import { describe, expect, it } from 'vitest';
import type { LectureFusionnee } from '@partage/fusion-lecture';
import {
  champsLus,
  DELAI_ABANDON_MS,
  DELAI_INDICE_MS,
  DELAI_OUVRIR_FORMULAIRE_MS,
  DELAIS_LECTURE,
  demanderDevant,
  doitDemanderType,
  etatInitial,
  inviteAccents,
  inviteCoupure,
  inviteDecoupage,
  lectureEnFond,
  photoAEnvoyer,
  photoAffichable,
  RAISONS_PROPOSEES,
  raisonPhotoAbsente,
  reduireParcours,
  type CauseLectureImpossible,
  type EtatParcours,
  type EvenementDelai,
  type EvenementParcours,
  type RaisonProposee,
} from './machine';
import source from './machine.ts?raw';

/**
 * Le parcours « la photo d'abord », rejoué événement par événement, sans
 * horloge ni moteur de lecture : les délais arrivent comme des événements.
 *
 * Données : le spécimen de la norme ICAO 9303 (ERIKSSON ANNA MARIA) et des
 * noms inventés. Aucun numéro, aucune date.
 */

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

/** Un pas : un événement, ou une fonction qui le construit d'après l'état (pour le numéro de lecture). */
type Pas = EvenementParcours | ((etat: EtatParcours) => EvenementParcours);

const jouer = (pas: Pas[], depart: EtatParcours = etatInitial()): EtatParcours =>
  pas.reduce<EtatParcours>((etat, p) => reduireParcours(etat, typeof p === 'function' ? p(etat) : p), depart);

const image = (etiquette: string) => new Blob([etiquette], { type: 'image/jpeg' });

const photo = (img: Blob): Pas => ({ type: 'PHOTO_PRISE', image: img });
/** Fin de la lecture en cours (numéro courant). */
const lu =
  (lecture: LectureFusionnee | null, estDosDeCarte = false): Pas =>
  (etat) => ({ type: 'LECTURE_TERMINEE', numero: etat.dernierNumero, lecture, estDosDeCarte });
const delai =
  (type: EvenementDelai['type']): Pas =>
  (etat) => ({ type, numero: etat.dernierNumero });
const impossible =
  (cause: CauseLectureImpossible): Pas =>
  (etat) => ({ type: 'LECTURE_IMPOSSIBLE', numero: etat.dernierNumero, cause });

const PASSEPORT: LectureFusionnee = { typePiece: 'Passeport', nom: 'ERIKSSON', prenom: 'ANNA MARIA', peutEtreCoupe: false };
const RECTO_NGUESSAN: LectureFusionnee = { typePiece: 'CNI', nom: "N'GUESSAN", prenom: 'ADJOUA', decoupage: 'libelles' };
const DOS_NGUESSAN: LectureFusionnee = { typePiece: 'CNI', nom: 'NGUESSAN', prenom: 'ADJOUA', peutEtreCoupe: false };

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

describe('état initial', () => {
  it("écran photo d'ouverture, rien à envoyer, rien de lu", () => {
    const e = etatInitial();
    expect(e.etape).toBe('photo');
    expect(e.ecranPhoto).toBe('ouverture');
    expect(e.lecture).toBeNull();
    expect(photoAEnvoyer(e)).toBeNull();
    expect(raisonPhotoAbsente(e)).toBe('non_precisee');
    expect(champsLus(e)).toEqual([]);
    expect(doitDemanderType(e)).toBe(true);
  });

  it('deux états initiaux ne partagent rien', () => {
    expect(etatInitial()).not.toBe(etatInitial());
    expect(etatInitial().champs).not.toBe(etatInitial().champs);
  });
});

describe('photo → lecture → vérification', () => {
  it('la photo ouvre une lecture numérotée ; l’image lue n’est ni affichable ni envoyable', () => {
    const a = image('a');
    const e = jouer([photo(a)]);
    expect(e.etape).toBe('lecture');
    expect(e.lecture).toEqual({ numero: 1, lente: false });
    expect(e.imageEnLecture).toBe(a);
    expect(photoAffichable(e)).toBeNull();
    expect(photoAEnvoyer(e)).toBeNull();
  });

  it('passeport lu : vérification, champs marqués, photo retenue, pas de question du type', () => {
    const a = image('a');
    const e = jouer([photo(a), lu(PASSEPORT)]);
    expect(e.etape).toBe('verification');
    expect(e.champs).toEqual({
      typePiece: { valeur: 'Passeport', origine: 'lecture' },
      nom: { valeur: 'ERIKSSON', origine: 'lecture' },
      prenom: { valeur: 'ANNA MARIA', origine: 'lecture' },
    });
    expect(e.lecture).toBeNull();
    expect(e.imageEnLecture).toBeNull();
    expect(photoAffichable(e)).toBe(a);
    expect(photoAEnvoyer(e)).toBe(a);
    expect(raisonPhotoAbsente(e)).toBeUndefined();
    expect(e.echecs).toBe(0);
    expect(champsLus(e)).toEqual(['typePiece', 'nom', 'prenom']);
    expect(doitDemanderType(e)).toBe(false);
    expect(inviteAccents(e)).toBe(true);
  });

  it('nom et prénoms lus sans type : on pose la question du type', () => {
    const e = jouer([photo(image('a')), lu({ nom: 'KONÉ', prenom: 'AWA', decoupage: 'libelles' })]);
    expect(e.etape).toBe('verification');
    expect(e.champs.typePiece).toEqual({ valeur: '', origine: null });
    expect(doitDemanderType(e)).toBe(true);
  });

  it('résultat partiel (nom seul) : c’est un succès, pas un échec', () => {
    const e = jouer([photo(image('a')), lu({ typePiece: 'Permis de conduire', nom: 'KONÉ', decoupage: 'numerotation' })]);
    expect(e.etape).toBe('verification');
    expect(e.echecs).toBe(0);
    expect(e.champs.prenom).toEqual({ valeur: '', origine: null });
  });

  it('découpage deviné ou déduit de la position : invite à vérifier où s’arrête le nom', () => {
    const devine = jouer([photo(image('a')), lu({ nom: 'ZAMBLE', prenom: 'LOU SERGE', decoupage: 'devine' })]);
    const position = jouer([photo(image('a')), lu({ nom: 'ZAMBLE', prenom: 'LOU SERGE', decoupage: 'position' })]);
    const libelles = jouer([photo(image('a')), lu({ nom: 'ZAMBLE', prenom: 'LOU SERGE', decoupage: 'libelles' })]);
    expect(inviteDecoupage(devine)).toBe(true);
    expect(inviteDecoupage(position)).toBe(true);
    expect(inviteDecoupage(libelles)).toBe(false);
  });

  it('prénoms peut-être coupés : invite tant qu’un champ lu reste à relire', () => {
    const lecture: LectureFusionnee = {
      typePiece: 'CNI',
      nom: 'NGUESSAN KOUASSI',
      prenom: 'ADJOUA MARIE ANGE',
      peutEtreCoupe: true,
    };
    let e = jouer([photo(image('a')), lu(lecture)]);
    expect(inviteCoupure(e)).toBe(true);
    e = jouer([{ type: 'CHAMP_MODIFIE', champ: 'prenom', valeur: 'Adjoua Marie-Ange Victoire' }], e);
    expect(inviteCoupure(e)).toBe(true); // le nom lu reste à relire
    e = jouer([{ type: 'CHAMP_MODIFIE', champ: 'nom', valeur: "N'Guessan Kouassi" }], e);
    expect(inviteCoupure(e)).toBe(false);
    expect(inviteAccents(e)).toBe(false);
  });
});

describe('sortie « Je ne peux pas prendre de photo »', () => {
  it('photo → raison → saisie, avec la raison choisie et sans photo', () => {
    let e = jouer([{ type: 'SANS_PHOTO' }]);
    expect(e.etape).toBe('raison');
    e = jouer([{ type: 'RAISON_CHOISIE', raison: 'plus_en_main' }], e);
    expect(e.etape).toBe('saisie');
    expect(e.raison).toBe('plus_en_main');
    expect(photoAEnvoyer(e)).toBeNull();
    expect(raisonPhotoAbsente(e)).toBe('plus_en_main');
  });

  it('les cinq raisons proposées, jamais non_precisee', () => {
    expect(RAISONS_PROPOSEES).toEqual(['plus_en_main', 'appareil', 'photo_ratee', 'prefere_pas', 'autre']);
    for (const raison of RAISONS_PROPOSEES) {
      expect(raisonPhotoAbsente(jouer([{ type: 'SANS_PHOTO' }, { type: 'RAISON_CHOISIE', raison }]))).toBe(raison);
    }
  });

  it('non_precisee ou une valeur hors liste ne se choisissent pas', () => {
    const e = jouer([{ type: 'SANS_PHOTO' }]);
    expect(reduireParcours(e, { type: 'RAISON_CHOISIE', raison: 'non_precisee' as RaisonProposee })).toBe(e);
    expect(reduireParcours(e, { type: 'RAISON_CHOISIE', raison: 'texte libre' as RaisonProposee })).toBe(e);
  });

  it('retour à la photo : l’écran photo revient tel qu’il était (ici, la reprise)', () => {
    const a = image('a');
    const e = jouer([photo(a), lu(null), { type: 'SANS_PHOTO' }, { type: 'RETOUR_PHOTO' }]);
    expect(e.etape).toBe('photo');
    expect(e.ecranPhoto).toBe('reprise');
    expect(e.photo).toBe(a);
  });

  it('choisir une raison écarte la photo gardée d’un premier échec', () => {
    const e = jouer([photo(image('a')), lu(null), { type: 'SANS_PHOTO' }, { type: 'RAISON_CHOISIE', raison: 'photo_ratee' }]);
    expect(photoAEnvoyer(e)).toBeNull();
    expect(raisonPhotoAbsente(e)).toBe('photo_ratee');
  });

  it('la question n’est posée que depuis l’écran photo', () => {
    const verification = jouer([photo(image('a')), lu(PASSEPORT)]);
    expect(reduireParcours(verification, { type: 'SANS_PHOTO' })).toBe(verification);
    const lecture = jouer([photo(image('a'))]);
    expect(reduireParcours(lecture, { type: 'SANS_PHOTO' })).toBe(lecture);
  });
});

describe('formulaire', () => {
  it('première modification d’un champ lu : il passe en « main » et perd sa marque', () => {
    let e = jouer([photo(image('a')), lu(DOS_NGUESSAN)]);
    e = jouer([{ type: 'CHAMP_MODIFIE', champ: 'nom', valeur: "N'GUESSAN" }], e);
    expect(e.champs.nom).toEqual({ valeur: "N'GUESSAN", origine: 'main' });
    expect(e.champs.prenom.origine).toBe('lecture');
    expect(champsLus(e)).toEqual(['typePiece', 'prenom']);
  });

  it('une « modification » à l’identique ne retire pas la marque (même référence)', () => {
    const e = jouer([photo(image('a')), lu(PASSEPORT)]);
    expect(reduireParcours(e, { type: 'CHAMP_MODIFIE', champ: 'nom', valeur: 'ERIKSSON' })).toBe(e);
    expect(reduireParcours(e, { type: 'TYPE_CHOISI', typePiece: 'Passeport' })).toBe(e);
  });

  it('type choisi : origine « main », la question reste affichée', () => {
    let e = jouer([photo(image('a')), lu({ nom: 'KONÉ', prenom: 'AWA', decoupage: 'libelles' })]);
    e = jouer([{ type: 'TYPE_CHOISI', typePiece: 'Carte étudiante' }], e);
    expect(e.champs.typePiece).toEqual({ valeur: 'Carte étudiante', origine: 'main' });
    expect(doitDemanderType(e)).toBe(true);
    expect(reduireParcours(e, { type: 'TYPE_CHOISI', typePiece: 'Carte bancaire' as never })).toBe(e);
  });

  it('champs et type ne bougent pas hors du formulaire', () => {
    for (const e of [etatInitial(), jouer([photo(image('a'))]), jouer([{ type: 'SANS_PHOTO' }])]) {
      expect(reduireParcours(e, { type: 'CHAMP_MODIFIE', champ: 'nom', valeur: 'KONÉ' })).toBe(e);
      expect(reduireParcours(e, { type: 'TYPE_CHOISI', typePiece: 'CNI' })).toBe(e);
    }
  });

  it('« Reprendre la photo » : l’ancienne photo reste jusqu’au verdict de la nouvelle, jamais la nouvelle avant', () => {
    const a = image('a');
    const b = image('b');
    let e = jouer([photo(a), lu(PASSEPORT), { type: 'RETOUR_PHOTO' }]);
    expect(e.etape).toBe('photo');
    expect(e.ecranPhoto).toBe('ouverture');
    expect(photoAffichable(e)).toBe(a);
    e = jouer([photo(b)], e);
    expect(photoAffichable(e)).toBe(a);
    e = jouer([lu(PASSEPORT)], e);
    expect(photoAffichable(e)).toBe(b);
  });

  it('nouvelle lecture attendue : remplace les champs lus, jamais ceux écrits à la main', () => {
    const e = jouer([
      photo(image('a')),
      lu({ typePiece: 'CNI', nom: 'KONE', prenom: 'AWA', decoupage: 'libelles' }),
      { type: 'CHAMP_MODIFIE', champ: 'prenom', valeur: 'Awa Mariam' },
      { type: 'RETOUR_PHOTO' },
      photo(image('b')),
      lu({ typePiece: 'CNI', nom: 'KONÉ', prenom: 'AWA', decoupage: 'libelles' }),
    ]);
    expect(e.champs.nom).toEqual({ valeur: 'KONÉ', origine: 'lecture' });
    expect(e.champs.prenom).toEqual({ valeur: 'Awa Mariam', origine: 'main' });
  });

  it('photo ajoutée depuis le formulaire : on y reste, la lecture tourne derrière', () => {
    const a = image('a');
    let e = jouer([{ type: 'SAISIR_MAIN' }, { type: 'CHAMP_MODIFIE', champ: 'nom', valeur: 'Koné' }, photo(a)]);
    expect(e.etape).toBe('saisie');
    expect(lectureEnFond(e)).toBe(true);
    e = jouer([lu({ typePiece: 'CNI', nom: 'KONÉ', prenom: 'AWA', decoupage: 'libelles' })], e);
    expect(e.champs.nom).toEqual({ valeur: 'Koné', origine: 'main' });
    expect(e.champs.prenom).toEqual({ valeur: 'AWA', origine: 'lecture' });
    expect(e.etape).toBe('verification');
    expect(photoAEnvoyer(e)).toBe(a);
  });
});

// ---------------------------------------------------------------------------
// Délais
// ---------------------------------------------------------------------------

describe('délais', () => {
  it('5 s, 8 s, 25 s, dans l’ordre', () => {
    expect([DELAI_INDICE_MS, DELAI_OUVRIR_FORMULAIRE_MS, DELAI_ABANDON_MS]).toEqual([5_000, 8_000, 25_000]);
    expect(DELAIS_LECTURE).toEqual([
      { apresMs: 5_000, type: 'INDICE' },
      { apresMs: 8_000, type: 'OUVRIR_FORMULAIRE' },
      { apresMs: 25_000, type: 'ABANDON' },
    ]);
  });

  it('INDICE : la lecture devient « lente », sans changer d’étape', () => {
    const e = jouer([photo(image('a')), delai('INDICE')]);
    expect(e.etape).toBe('lecture');
    expect(e.lecture).toEqual({ numero: 1, lente: true });
    expect(reduireParcours(e, { type: 'INDICE', numero: 1 })).toBe(e);
  });

  it('OUVRIR_FORMULAIRE : saisie pendant que la lecture continue ; l’image reste invisible', () => {
    const a = image('a');
    const e = jouer([photo(a), delai('INDICE'), delai('OUVRIR_FORMULAIRE')]);
    expect(e.etape).toBe('saisie');
    expect(lectureEnFond(e)).toBe(true);
    expect(photoAffichable(e)).toBeNull();
    // Publier maintenant arrêterait la lecture sans verdict : l'image part, comme après ABANDON.
    expect(photoAEnvoyer(e)).toBe(a);
    expect(raisonPhotoAbsente(e)).toBeUndefined();
  });

  it('OUVRIR_FORMULAIRE après un dos de carte lu : on ouvre sur la vérification', () => {
    const e = jouer([photo(image('dos')), lu(DOS_NGUESSAN, true), photo(image('devant')), delai('OUVRIR_FORMULAIRE')]);
    expect(e.etape).toBe('verification');
  });

  it('ABANDON dans le formulaire : silencieux — aucun champ touché, aucun échec, la photo est gardée', () => {
    const a = image('a');
    const avant = jouer([photo(a), delai('INDICE'), delai('OUVRIR_FORMULAIRE')]);
    const e = jouer([delai('ABANDON')], avant);
    expect(e.etape).toBe('saisie');
    expect(e.lecture).toBeNull();
    expect(e.champs).toBe(avant.champs);
    expect(e.echecs).toBe(0);
    expect(photoAffichable(e)).toBe(a);
    expect(lectureEnFond(e)).toBe(false);
  });

  it('ABANDON sans ouverture préalable : saisie directe, sans échec', () => {
    const e = jouer([photo(image('a')), delai('ABANDON')]);
    expect(e.etape).toBe('saisie');
    expect(e.echecs).toBe(0);
  });

  it('les minuteurs d’une lecture précédente sont ignorés', () => {
    const e = jouer([photo(image('a')), { type: 'RETOUR_PHOTO' }, photo(image('b'))]);
    expect(e.lecture?.numero).toBe(2);
    for (const type of ['INDICE', 'OUVRIR_FORMULAIRE', 'ABANDON'] as const) {
      expect(reduireParcours(e, { type, numero: 1 })).toBe(e);
    }
  });

  it('OUVRIR_FORMULAIRE hors de l’écran de lecture : rien', () => {
    const e = jouer([photo(image('a')), delai('OUVRIR_FORMULAIRE')]);
    expect(reduireParcours(e, { type: 'OUVRIR_FORMULAIRE', numero: 1 })).toBe(e);
  });
});

// ---------------------------------------------------------------------------
// Compteur d'échecs
// ---------------------------------------------------------------------------

describe('compteur d’échecs', () => {
  it('premier échec : écran de reprise, photo gardée', () => {
    const a = image('a');
    const e = jouer([photo(a), lu(null)]);
    expect(e.etape).toBe('photo');
    expect(e.ecranPhoto).toBe('reprise');
    expect(e.echecs).toBe(1);
    expect(photoAEnvoyer(e)).toBe(a);
  });

  it('deuxième échec : saisie à la main automatique, en gardant la photo', () => {
    const b = image('b');
    const e = jouer([photo(image('a')), lu(null), photo(b), lu(null)]);
    expect(e.etape).toBe('saisie');
    expect(e.echecs).toBe(2);
    expect(photoAEnvoyer(e)).toBe(b);
    expect(raisonPhotoAbsente(e)).toBeUndefined();
  });

  it('type seul, sans nom ni prénoms : échec, mais le type est gardé', () => {
    const e = jouer([photo(image('a')), lu({ typePiece: 'Permis de conduire' })]);
    expect(e.echecs).toBe(1);
    expect(e.champs.typePiece).toEqual({ valeur: 'Permis de conduire', origine: 'lecture' });
    expect(doitDemanderType(e)).toBe(false);
  });

  it.each<[string, Pas]>([
    ['délai dépassé', delai('ABANDON')],
    ['moteur ou réseau indisponible', impossible('moteur_indisponible')],
    ['image indécodable', impossible('image_illisible')],
  ])('%s : saisie à la main directe, sans compter d’échec', (_, pas) => {
    const e = jouer([photo(image('a')), pas]);
    expect(e.etape).toBe('saisie');
    expect(e.echecs).toBe(0);
    expect(e.lecture).toBeNull();
  });

  it('moteur indisponible : la photo est gardée ; image indécodable : pas de photo, non_precisee', () => {
    const a = image('a');
    const moteur = jouer([photo(a), impossible('moteur_indisponible')]);
    expect(photoAEnvoyer(moteur)).toBe(a);
    const illisible = jouer([photo(image('heic')), impossible('image_illisible')]);
    expect(photoAEnvoyer(illisible)).toBeNull();
    expect(raisonPhotoAbsente(illisible)).toBe('non_precisee');
  });

  it('photo écartée après coup (indécodable, ou pas vérifiable) : plus rien à envoyer, raison posée ou gardée', () => {
    const a = image('a');
    // « Saisir à la main » pendant la lecture : l'image devient la photo, sans verdict.
    const gardee = jouer([photo(a), { type: 'SAISIR_MAIN' }]);
    expect(photoAEnvoyer(gardee)).toBe(a);

    const illisible = reduireParcours(gardee, { type: 'PHOTO_ECARTEE', image: a, raison: null });
    expect(illisible.etape).toBe('saisie');
    expect(photoAEnvoyer(illisible)).toBeNull();
    expect(photoAffichable(illisible)).toBeNull();
    expect(raisonPhotoAbsente(illisible)).toBe('non_precisee');

    const nonVerifiee = reduireParcours(gardee, { type: 'PHOTO_ECARTEE', image: a, raison: 'appareil' });
    expect(raisonPhotoAbsente(nonVerifiee)).toBe('appareil');
  });

  it('photo écartée : sans effet sur une autre image, ou avec une raison hors liste (même référence)', () => {
    const a = image('a');
    const gardee = jouer([photo(a), { type: 'SAISIR_MAIN' }]);
    expect(reduireParcours(gardee, { type: 'PHOTO_ECARTEE', image: image('b'), raison: null })).toBe(gardee);
    expect(
      reduireParcours(gardee, { type: 'PHOTO_ECARTEE', image: a, raison: 'non_precisee' as RaisonProposee }),
    ).toBe(gardee);
  });

  it('image indécodable en reprise : la photo d’avant reste', () => {
    const a = image('a');
    const e = jouer([photo(a), lu(null), photo(image('heic')), impossible('image_illisible')]);
    expect(e.echecs).toBe(1);
    expect(photoAEnvoyer(e)).toBe(a);
  });

  it('une panne entre deux échecs ne compte pas : il faut deux vraies lectures vides', () => {
    const e = jouer([photo(image('a')), lu(null), photo(image('b')), impossible('moteur_indisponible')]);
    expect(e.echecs).toBe(1);
    expect(e.etape).toBe('saisie');
  });

  it('échec tardif, formulaire ouvert : compté, mais on reste dans le formulaire', () => {
    const a = image('a');
    const e = jouer([
      photo(a),
      delai('OUVRIR_FORMULAIRE'),
      { type: 'CHAMP_MODIFIE', champ: 'nom', valeur: 'Koné' },
      lu(null),
    ]);
    expect(e.echecs).toBe(1);
    expect(e.etape).toBe('saisie');
    expect(e.champs.nom).toEqual({ valeur: 'Koné', origine: 'main' });
    expect(photoAEnvoyer(e)).toBe(a);
  });

  it('après deux échecs, un troisième essai raté mène droit à la saisie', () => {
    const e = jouer([
      photo(image('a')),
      lu(null),
      photo(image('b')),
      lu(null),
      { type: 'RETOUR_PHOTO' },
      photo(image('c')),
      lu(null),
    ]);
    expect(e.echecs).toBe(3);
    expect(e.etape).toBe('saisie');
  });
});

// ---------------------------------------------------------------------------
// Résultat tardif
// ---------------------------------------------------------------------------

describe('résultat tardif', () => {
  const ouvert = (): EtatParcours => jouer([photo(image('a')), delai('INDICE'), delai('OUVRIR_FORMULAIRE')]);

  it('ne remplit que les champs vides que la personne n’a pas touchés', () => {
    const e = jouer(
      [
        { type: 'CHAMP_MODIFIE', champ: 'nom', valeur: "N'Guessan" },
        { type: 'TYPE_CHOISI', typePiece: 'Carte consulaire' },
        lu({ typePiece: 'CNI', nom: 'NGUESSAN', prenom: 'ADJOUA', peutEtreCoupe: false }),
      ],
      ouvert(),
    );
    expect(e.champs).toEqual({
      typePiece: { valeur: 'Carte consulaire', origine: 'main' },
      nom: { valeur: "N'Guessan", origine: 'main' },
      prenom: { valeur: 'ADJOUA', origine: 'lecture' },
    });
    // Des prénoms viennent d'être remplis : l'introduction invite à relire.
    expect(e.etape).toBe('verification');
    expect(lectureEnFond(e)).toBe(false);
  });

  it('un champ touché puis vidé n’est pas rempli', () => {
    const e = jouer(
      [
        { type: 'CHAMP_MODIFIE', champ: 'prenom', valeur: 'A' },
        { type: 'CHAMP_MODIFIE', champ: 'prenom', valeur: '' },
        lu({ nom: 'KONÉ', prenom: 'AWA', decoupage: 'libelles' }),
      ],
      ouvert(),
    );
    expect(e.champs.prenom).toEqual({ valeur: '', origine: 'main' });
    expect(e.champs.nom).toEqual({ valeur: 'KONÉ', origine: 'lecture' });
  });

  it('ne réécrit pas un champ déjà lu sur une photo précédente, que la personne est en train de relire', () => {
    const b = image('b');
    const e = jouer([
      photo(image('a')),
      lu({ nom: 'KONE', prenom: 'AWA', decoupage: 'devine' }),
      // Photo ajoutée depuis la vérification : son résultat arrive formulaire ouvert.
      photo(b),
      lu({ typePiece: 'Carte étudiante', nom: 'KONÉ', prenom: 'AWA MARIAM', decoupage: 'libelles' }),
    ]);
    expect(e.etape).toBe('verification');
    expect(e.champs).toEqual({
      typePiece: { valeur: 'Carte étudiante', origine: 'lecture' },
      nom: { valeur: 'KONE', origine: 'lecture' },
      prenom: { valeur: 'AWA', origine: 'lecture' },
    });
    // Le découpage suit la lecture qui a écrit les champs affichés, pas la dernière.
    expect(inviteDecoupage(e)).toBe(true);
    expect(photoAEnvoyer(e)).toBe(b);
  });

  it('tous les champs déjà écrits : le résultat ne change rien, et ce n’est pas un échec', () => {
    const e = jouer(
      [
        { type: 'CHAMP_MODIFIE', champ: 'nom', valeur: 'Koné' },
        { type: 'CHAMP_MODIFIE', champ: 'prenom', valeur: 'Awa' },
        { type: 'TYPE_CHOISI', typePiece: 'CNI' },
        lu({ typePiece: 'CNI', nom: 'KONÉ', prenom: 'AWA', decoupage: 'devine' }),
      ],
      ouvert(),
    );
    expect(e.echecs).toBe(0);
    expect(champsLus(e)).toEqual([]);
    expect(e.etape).toBe('saisie');
    expect(inviteDecoupage(e)).toBe(false);
  });

  it('résultat d’une lecture remplacée ou annulée : ignoré, même référence', () => {
    const remplacee = jouer([photo(image('a')), delai('OUVRIR_FORMULAIRE'), photo(image('b'))]);
    const evenement: EvenementParcours = { type: 'LECTURE_TERMINEE', numero: 1, lecture: PASSEPORT, estDosDeCarte: false };
    expect(reduireParcours(remplacee, evenement)).toBe(remplacee);
    const annulee = jouer([photo(image('a')), { type: 'SAISIR_MAIN' }]);
    expect(reduireParcours(annulee, evenement)).toBe(annulee);
    expect(reduireParcours(annulee, { type: 'LECTURE_IMPOSSIBLE', numero: 1, cause: 'image_illisible' })).toBe(annulee);
  });
});

// ---------------------------------------------------------------------------
// « Saisir à la main » depuis chaque état
// ---------------------------------------------------------------------------

describe('« Saisir à la main » depuis chaque état', () => {
  const A = image('a');
  const cas: Array<{
    nom: string;
    pas: Pas[];
    photo: Blob | null;
    raison: ReturnType<typeof raisonPhotoAbsente>;
  }> = [
    { nom: 'photo (ouverture)', pas: [], photo: null, raison: 'non_precisee' },
    { nom: 'photo (reprise)', pas: [photo(A), lu(null)], photo: A, raison: undefined },
    { nom: 'photo (devant)', pas: [photo(A), lu(DOS_NGUESSAN, true)], photo: null, raison: 'photo_ratee' },
    { nom: 'raison', pas: [{ type: 'SANS_PHOTO' }], photo: null, raison: 'non_precisee' },
    { nom: 'lecture', pas: [photo(A), delai('INDICE')], photo: A, raison: undefined },
    { nom: 'verification', pas: [photo(A), lu(PASSEPORT)], photo: A, raison: undefined },
    { nom: 'saisie, lecture en fond', pas: [photo(A), delai('OUVRIR_FORMULAIRE')], photo: A, raison: undefined },
  ];

  it.each(cas)('$nom → saisie', ({ pas, photo: attendue, raison }) => {
    const avant = jouer(pas);
    const e = reduireParcours(avant, { type: 'SAISIR_MAIN' });
    expect(e.etape).toBe('saisie');
    expect(e.lecture).toBeNull();
    expect(e.imageEnLecture).toBeNull();
    expect(e.echecs).toBe(avant.echecs);
    expect(e.champs).toEqual(avant.champs);
    expect(photoAEnvoyer(e)).toBe(attendue);
    expect(raisonPhotoAbsente(e)).toBe(raison);
    expect(demanderDevant(e)).toBe(false);
    // Tout résultat de la lecture annulée arrive trop tard.
    expect(reduireParcours(e, { type: 'LECTURE_TERMINEE', numero: avant.dernierNumero, lecture: PASSEPORT, estDosDeCarte: false })).toBe(e);
    expect(reduireParcours(e, { type: 'ABANDON', numero: avant.dernierNumero })).toBe(e);
  });

  it('depuis la saisie, sans lecture ni dos en cours : rien ne change (même référence)', () => {
    const e = jouer([{ type: 'SAISIR_MAIN' }]);
    expect(reduireParcours(e, { type: 'SAISIR_MAIN' })).toBe(e);
  });
});

// ---------------------------------------------------------------------------
// Dos de carte
// ---------------------------------------------------------------------------

describe('dos de carte', () => {
  it('lu à la place du devant : champs remplis par la bande, image lâchée, on demande le devant', () => {
    const dos = image('dos');
    const e = jouer([photo(dos), lu(DOS_NGUESSAN, true)]);
    expect(e.etape).toBe('photo');
    expect(e.ecranPhoto).toBe('devant');
    expect(demanderDevant(e)).toBe(true);
    expect(e.champs).toEqual({
      typePiece: { valeur: 'CNI', origine: 'lecture' },
      nom: { valeur: 'NGUESSAN', origine: 'lecture' },
      prenom: { valeur: 'ADJOUA', origine: 'lecture' },
    });
    expect(e.imageEnLecture).toBeNull();
    expect(photoAffichable(e)).toBeNull();
    expect(photoAEnvoyer(e)).toBeNull();
    expect(raisonPhotoAbsente(e)).toBe('photo_ratee');
    expect(e.echecs).toBe(0);
  });

  it('continuer sans photo : vérification des champs lus, raison photo_ratee', () => {
    const e = jouer([photo(image('dos')), lu(DOS_NGUESSAN, true), { type: 'CONTINUER_SANS_PHOTO' }]);
    expect(e.etape).toBe('verification');
    expect(photoAEnvoyer(e)).toBeNull();
    expect(raisonPhotoAbsente(e)).toBe('photo_ratee');
    expect(demanderDevant(e)).toBe(false);
  });

  it('puis le devant : c’est lui la photo ; accents du devant, découpage de la bande', () => {
    const devant = image('devant');
    const e = jouer([
      photo(image('dos')),
      lu({ typePiece: 'CNI', nom: 'TIE BI', prenom: 'KOUAME SERGE', peutEtreCoupe: false }, true),
      photo(devant),
      // Seul, le devant aurait coupé au mauvais endroit (libellé « Nom et prénoms »).
      lu({ typePiece: 'CNI', nom: 'TIÉ', prenom: 'BI KOUAMÉ SERGE', decoupage: 'devine' }),
    ]);
    expect(e.etape).toBe('verification');
    expect(e.champs.nom).toEqual({ valeur: 'TIÉ BI', origine: 'lecture' });
    expect(e.champs.prenom).toEqual({ valeur: 'KOUAMÉ SERGE', origine: 'lecture' });
    expect(inviteDecoupage(e)).toBe(false);
    expect(photoAEnvoyer(e)).toBe(devant);
    expect(raisonPhotoAbsente(e)).toBeUndefined();
    expect(demanderDevant(e)).toBe(false);
  });

  it('devant illisible après le dos : pas un échec, le nom de la bande suffit', () => {
    const devant = image('devant');
    const e = jouer([photo(image('dos')), lu(DOS_NGUESSAN, true), photo(devant), lu(null)]);
    expect(e.echecs).toBe(0);
    expect(e.etape).toBe('verification');
    expect(e.champs.nom.valeur).toBe('NGUESSAN');
    expect(photoAEnvoyer(e)).toBe(devant);
  });

  it('devant lu d’abord, dos ensuite : l’orthographe du devant n’est pas perdue', () => {
    const e = jouer([photo(image('devant')), lu(RECTO_NGUESSAN), { type: 'RETOUR_PHOTO' }, photo(image('dos')), lu(DOS_NGUESSAN, true)]);
    expect(e.champs.nom).toEqual({ valeur: "N'GUESSAN", origine: 'lecture' });
    expect(photoAEnvoyer(e)).toBeNull();
    expect(e.ecranPhoto).toBe('devant');
  });

  it('bande illisible : aucun nom pris sur le dos (il porte d’autres noms), mais on demande le devant', () => {
    const e = jouer([
      photo(image('dos')),
      lu({ typePiece: 'CNI', nom: 'KOUASSI', prenom: 'AMENAN', decoupage: 'libelles' }, true),
    ]);
    expect(e.champs.nom).toEqual({ valeur: '', origine: null });
    expect(e.champs.typePiece).toEqual({ valeur: 'CNI', origine: 'lecture' });
    expect(e.etape).toBe('photo');
    expect(e.ecranPhoto).toBe('devant');
    expect(e.echecs).toBe(0);
    expect(photoAEnvoyer(e)).toBeNull();
  });

  it('dos reconnu après l’ouverture du formulaire : on y reste, l’image n’est jamais envoyée', () => {
    const dos = image('dos');
    let e = jouer([
      photo(dos),
      delai('OUVRIR_FORMULAIRE'),
      { type: 'CHAMP_MODIFIE', champ: 'nom', valeur: "N'Guessan" },
    ]);
    expect(photoAEnvoyer(e)).toBe(dos); // avant le verdict, rien ne la distingue d'un devant
    e = jouer([lu(DOS_NGUESSAN, true)], e);
    expect(e.etape).toBe('verification');
    expect(e.champs.nom).toEqual({ valeur: "N'Guessan", origine: 'main' });
    expect(e.champs.prenom).toEqual({ valeur: 'ADJOUA', origine: 'lecture' });
    expect(photoAEnvoyer(e)).toBeNull();
    expect(photoAffichable(e)).toBeNull();
    expect(demanderDevant(e)).toBe(true);
    // « Reprendre la photo » mène à la demande du devant.
    e = jouer([{ type: 'RETOUR_PHOTO' }], e);
    expect(e.ecranPhoto).toBe('devant');
  });

  it('la dernière photo prise l’emporte : un dos écarte aussi la photo gardée d’un échec', () => {
    const e = jouer([photo(image('a')), lu(null), photo(image('dos')), lu(DOS_NGUESSAN, true)]);
    expect(photoAEnvoyer(e)).toBeNull();
    expect(photoAffichable(e)).toBeNull();
  });

  it('retour arrière pendant la lecture du devant : la demande du devant revient intacte', () => {
    const avant = jouer([photo(image('dos')), lu(DOS_NGUESSAN, true)]);
    const pendant = jouer([photo(image('devant'))], avant);
    expect(demanderDevant(pendant)).toBe(false);
    expect(reduireParcours(pendant, { type: 'CONTINUER_SANS_PHOTO' })).toBe(pendant);
    const e = jouer([{ type: 'RETOUR_PHOTO' }], pendant);
    expect(e.etape).toBe('photo');
    expect(e.ecranPhoto).toBe('devant');
    expect(demanderDevant(e)).toBe(true);
    expect(jouer([{ type: 'CONTINUER_SANS_PHOTO' }], e).etape).toBe('verification');
  });

  it('continuer sans photo n’existe que quand on demande le devant', () => {
    const e = jouer([photo(image('a')), lu(null)]);
    expect(reduireParcours(e, { type: 'CONTINUER_SANS_PHOTO' })).toBe(e);
  });

  it('prénoms peut-être coupés sur la bande : invite', () => {
    const e = jouer([
      photo(image('dos')),
      lu({ typePiece: 'CNI', nom: 'NGUESSAN KOUASSI', prenom: 'ADJOUA MARIE ANGE', peutEtreCoupe: true }, true),
      { type: 'CONTINUER_SANS_PHOTO' },
    ]);
    expect(inviteCoupure(e)).toBe(true);
  });

  /**
   * Marche aléatoire (graine fixe) : quel que soit l'enchaînement, une image
   * que la lecture a reconnue comme un dos n'est plus jamais ni affichable ni
   * à envoyer, et l'image en cours de lecture n'est jamais affichable.
   *
   * Le délai est relevé à trente secondes, et ce n'est pas un aveu de lenteur :
   * seize mille pas de marche prennent deux secondes seuls, et davantage quand
   * toute la suite tourne en parallèle sur la même machine. Le plafond de cinq
   * secondes par défaut faisait échouer ce test une fois sur deux selon la
   * charge du poste — un test qui ment sur l'état du code, et qu'on finit par
   * ignorer. Ce test n'a jamais mesuré une vitesse : il explore des états.
   */
  it('jamais publié ni aperçu, quel que soit l’enchaînement (marche aléatoire)', { timeout: 30_000 }, () => {
    let graine = 0x5eed;
    const hasard = () => {
      graine = (graine + 0x6d2b79f5) | 0;
      let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const choisir = <T,>(liste: readonly T[]): T => liste[Math.floor(hasard() * liste.length)];
    const lectures: Array<LectureFusionnee | null> = [null, PASSEPORT, RECTO_NGUESSAN, DOS_NGUESSAN, { typePiece: 'CNI' }];
    const CLES = Object.keys(etatInitial()).sort();

    let dosVus = 0;
    let dosTardifs = 0;
    for (let marche = 0; marche < 400; marche++) {
      let e = etatInitial();
      const dos = new Set<Blob>();
      for (let pas = 0; pas < 40; pas++) {
        const numero = hasard() < 0.85 ? e.dernierNumero : Math.max(0, e.dernierNumero - 1);
        const evenement: EvenementParcours = choisir<EvenementParcours>([
          { type: 'PHOTO_PRISE', image: image(`m${marche}p${pas}`) },
          { type: 'PHOTO_PRISE', image: image(`m${marche}p${pas}`) },
          { type: 'SANS_PHOTO' },
          { type: 'RAISON_CHOISIE', raison: choisir(RAISONS_PROPOSEES) },
          { type: 'RETOUR_PHOTO' },
          { type: 'CONTINUER_SANS_PHOTO' },
          { type: 'SAISIR_MAIN' },
          { type: 'LECTURE_TERMINEE', numero, lecture: choisir(lectures), estDosDeCarte: hasard() < 0.4 },
          { type: 'LECTURE_TERMINEE', numero, lecture: choisir(lectures), estDosDeCarte: hasard() < 0.4 },
          { type: 'LECTURE_IMPOSSIBLE', numero, cause: choisir(['moteur_indisponible', 'image_illisible'] as const) },
          { type: 'INDICE', numero },
          { type: 'OUVRIR_FORMULAIRE', numero },
          { type: 'ABANDON', numero },
          { type: 'CHAMP_MODIFIE', champ: choisir(['nom', 'prenom'] as const), valeur: choisir(['', 'Koné', 'Awa']) },
          { type: 'TYPE_CHOISI', typePiece: choisir(['', 'CNI', 'Passeport'] as const) },
        ]);
        if (evenement.type === 'LECTURE_TERMINEE' && evenement.estDosDeCarte && e.lecture?.numero === evenement.numero) {
          dos.add(e.imageEnLecture!);
          dosVus++;
          if (e.etape !== 'lecture') dosTardifs++;
        }
        const echecsAvant = e.echecs;
        e = reduireParcours(e, evenement);

        const envoyee = photoAEnvoyer(e);
        const affichee = photoAffichable(e);
        if (envoyee) expect(dos.has(envoyee)).toBe(false);
        if (affichee) {
          expect(dos.has(affichee)).toBe(false);
          expect(affichee).not.toBe(e.imageEnLecture);
        }
        // Invariants de forme.
        expect(e.lecture === null).toBe(e.imageEnLecture === null);
        if (e.etape === 'lecture') expect(e.lecture).not.toBeNull();
        if (e.photo) expect(e.raison).toBeNull();
        expect(raisonPhotoAbsente(e) === undefined).toBe(envoyee !== null);
        expect(e.echecs).toBeGreaterThanOrEqual(echecsAvant);
        expect(Object.keys(e).sort()).toEqual(CLES);
      }
    }
    // La marche a bien exercé les deux cas : verdict sur l'écran de lecture, et verdict tardif.
    // Graine fixe : 182 verdicts « dos », dont 119 tardifs.
    expect(dosVus - dosTardifs).toBeGreaterThan(40);
    expect(dosTardifs).toBeGreaterThan(40);
  });
});

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

describe('rien d’autre que type, nom, prénoms n’entre dans l’état', () => {
  it('les clés inconnues d’une lecture sont écartées', () => {
    const polluee = {
      ...PASSEPORT,
      texte: 'TEXTE BRUT DE LA PHOTO',
      lignes: ['LIGNE DE LA BANDE'],
      numeroPiece: 'NUMERO',
      dateNaissance: 'DATE',
    } as LectureFusionnee;
    const e = jouer([photo(image('a')), lu(polluee)]);
    const serialise = JSON.stringify(e);
    for (const fuite of ['TEXTE BRUT', 'LIGNE DE LA BANDE', 'NUMERO', 'DATE', 'texte', 'lignes', 'numeroPiece', 'dateNaissance']) {
      expect(serialise).not.toContain(fuite);
    }
    expect(e.lectureDuRecto).toEqual(PASSEPORT);
  });

  it('valeurs invalides ignorées : type inconnu, découpage inconnu, nom trop long ou vide', () => {
    const e = jouer([
      photo(image('a')),
      lu({ typePiece: 'Carte bancaire', nom: 'K'.repeat(129), prenom: '   ', decoupage: 'au hasard' } as unknown as LectureFusionnee),
    ]);
    expect(e.echecs).toBe(1);
    expect(e.champs.typePiece.valeur).toBe('');
    expect(e.champs.nom.valeur).toBe('');
    expect(e.lectureDuRecto).toBeNull();
  });

  it('un drapeau « dos de carte » qui n’est pas exactement true ne compte pas', () => {
    const a = image('a');
    const e = jouer([
      photo(a),
      (etat) => ({ type: 'LECTURE_TERMINEE', numero: etat.dernierNumero, lecture: PASSEPORT, estDosDeCarte: 'oui' as unknown as boolean }),
    ]);
    expect(e.dosDeCarte).toBe(false);
    expect(photoAEnvoyer(e)).toBe(a);
  });

  it('valeurs lues rognées', () => {
    const e = jouer([photo(image('a')), lu({ nom: '  KONÉ ', prenom: ' AWA', decoupage: 'libelles' })]);
    expect(e.champs.nom.valeur).toBe('KONÉ');
    expect(e.champs.prenom.valeur).toBe('AWA');
  });
});

describe('machine.ts — pure, muette, sans mémoire', () => {
  it('ni console, ni minuteur, ni stockage, ni exception', () => {
    expect(source).not.toMatch(/\bconsole\s*\./);
    expect(source).not.toMatch(/\blogger\b/);
    expect(source).not.toMatch(/\b(setTimeout|setInterval|requestAnimationFrame|Date\.now)\b/);
    expect(source).not.toMatch(/\b(localStorage|sessionStorage|indexedDB|caches)\b/);
    expect(source).not.toMatch(/\bthrow\b/);
    expect(source).not.toMatch(/\bfrom ['"]react['"]/);
  });
});
