import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImageGrise, ImagePreparee } from './image';
import { LectureImpossible } from './index';
import {
  assainirSortie,
  CHEMIN_OCR,
  combinerLectures,
  creerEnCaptant,
  doitLireBande,
  executerLecture,
  familleCarte,
  ligneBandeProbable,
  zoneBande,
  type Dependances,
  type Moteur,
  type Passe,
  type TexteLu,
  type TravailleurTesseract,
} from './moteur';

/**
 * Tests du moteur sans navigateur : les décisions (quelles passes, où est la
 * bande, qu'est-ce qui sort) et le contrat de sortie, avec un moteur factice
 * qui rend des textes écrits d'avance. Le vrai moteur est mesuré dans Chrome
 * par le banc (images fictives).
 *
 * Données : uniquement les spécimens de la norme ICAO 9303 (État fictif UTO,
 * ERIKSSON ANNA MARIA) et des noms inventés.
 */

// Spécimen ICAO 9303 partie 5 (carte, TD1).
const TD1 = ['I<UTOD231458907<<<<<<<<<<<<<<<', '7408122F1204159UTO<<<<<<<<<<<6', 'ERIKSSON<<ANNA<MARIA<<<<<<<<<<'];
// Spécimen ICAO 9303 partie 4 (passeport, TD3).
const TD3 = ['P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'];
/** Numéros et dates des spécimens : ne doivent jamais sortir, sous aucune forme. */
const INTERDITS = ['D23145890', 'L898902C3', 'ZE184226B', '740812', '120415', '7408122'];

const CLES_PERMISES = ['typePiece', 'nom', 'prenom', 'peutEtreCoupe', 'decoupage'];

const RECTO_CNI = [
  "RÉPUBLIQUE D'UTOPIE",
  "CARTE NATIONALE D'IDENTITÉ",
  'Nom : KOUAMÉ',
  'Prénoms : AFFOUÉ ESTELLE',
  'Né(e) le : 01/01/1990 à UTOPIA-VILLE',
  'N° UT 0000 0000 0',
].join('\n');

const PERMIS_SANS_PRENOMS = ['PERMIS DE CONDUIRE', 'Nom : ZAMBLÉ LOU', 'Date de naissance : 02/03/1985'].join('\n');
const PERMIS_EPARS = ['PERMIS DE CONDUIRE', 'Nom : ZAMBLÉ LOU', 'Prénoms : IRÈNE'].join('\n');

const PAGE_PASSEPORT = [
  "RÉPUBLIQUE D'UTOPIE",
  'PASSEPORT / PASSPORT',
  'Nom / Surname',
  'ERIKSSON',
  'Prénoms / Given names',
  'ANNA MARIA',
  'Date de naissance : 12 AOÛT 1974',
  // « fra » lit la bande à sa façon : chevrons parfois pris pour des « K ».
  'P<UTOERIKSSON<<ANNA<MARIAKKKKKKKKKKKKKKKKKKK',
  'L898902C36UTO7408122F1204159ZE184226B<<<<<10',
].join('\n');

/** TSV d'une page lue : une rangée par mot (niveau 5), boîte en pixels. */
function tsv(lignes: { texte: string; haut: number; hauteur: number }[]): string {
  return lignes
    .map((l, i) => `5\t1\t1\t1\t${i + 1}\t1\t40\t${l.haut}\t900\t${l.hauteur}\t91\t${l.texte}`)
    .join('\n');
}

const IMAGE: ImageGrise = { largeur: 1000, hauteur: 600, pixels: new Uint8Array(1000 * 600).fill(250) };
const ENVOI = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
const PREPAREE: ImagePreparee = { envoi: ENVOI, lecture: IMAGE, angle: 0 };

type Script = (passe: Passe, image: ImageGrise) => TexteLu | Promise<TexteLu>;

/** Moteur factice : rend ce que dit le script pour chaque passe, et note tout. */
function moteurFactice(script: Script) {
  const passes: { passe: Passe; hauteur: number }[] = [];
  const etat = { arrete: 0 };
  const moteur: Moteur = {
    async lire(image, passe, signal) {
      if (signal.aborted) throw new DOMException('Lecture annulée', 'AbortError');
      passes.push({ passe, hauteur: image.hauteur });
      return script(passe, image);
    },
    arreter() {
      etat.arrete++;
    },
  };
  return { moteur, passes, etat };
}

function dependances(moteur: Moteur, preparee: ImagePreparee | null = PREPAREE): Dependances {
  return { preparer: async () => preparee, moteur: async () => moteur };
}

const texte = (t: string, tsvTexte = ''): TexteLu => ({ texte: t, tsv: tsvTexte });

/** Contrat de sortie : jamais une clé de trop, jamais un chiffre, jamais un numéro ou une date de spécimen. */
function verifierContrat(resultat: unknown) {
  if (resultat === null) return;
  expect(Object.keys(resultat as object).every((cle) => CLES_PERMISES.includes(cle))).toBe(true);
  const json = JSON.stringify(resultat);
  expect(json).not.toMatch(/\d/);
  for (const interdit of INTERDITS) expect(json).not.toContain(interdit);
}

let espions: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  espions = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((m) => vi.spyOn(console, m));
});
afterEach(() => {
  // Aucune lecture ne doit écrire dans la console.
  for (const espion of espions) {
    expect(espion).not.toHaveBeenCalled();
    espion.mockRestore();
  }
});

describe('ligneBandeProbable', () => {
  it('reconnaît les lignes des spécimens, même mal lues par « fra »', () => {
    for (const ligne of [...TD1, ...TD3]) expect(ligneBandeProbable(ligne)).toBe(true);
    expect(ligneBandeProbable('ERIKSSONKKANNAKMARIAKKKKKKKKKK')).toBe(true);
    expect(ligneBandeProbable('I « UTO D 23145890 7 « « « « « « « « «')).toBe(true);
  });

  it("écarte les lignes d'un recto", () => {
    for (const ligne of RECTO_CNI.split('\n')) expect(ligneBandeProbable(ligne)).toBe(false);
    expect(ligneBandeProbable("RÉPUBLIQUE DE CÔTE D'IVOIRE")).toBe(false);
    expect(ligneBandeProbable('<<<')).toBe(false);
    expect(ligneBandeProbable('<'.repeat(200))).toBe(false);
  });
});

describe('familleCarte (dos de carte reconnu sans être lu)', () => {
  it('bande entière, ou écourtée à droite ou à gauche', () => {
    expect(familleCarte(TD1.join('\n'))).toBe('carte-autre');
    // Coupée à droite : lignes de 20 caractères, sous le seuil de familleMrz.
    expect(familleCarte(TD1.map((l) => l.slice(0, 20)).join('\n'))).toBe('carte-autre');
    // Ligne 1 seule, écourtée, d'une carte ivoirienne (une lettre de l'État mal lue).
    expect(familleCarte('IDC1V0012345678<<<<')).toBe('carte-civ');
    // Coupée à gauche : seule la fin de la ligne 2 garde sa forme.
    expect(familleCarte(TD1.map((l) => l.slice(6)).join('\n'))).toBe('carte-autre');
    // Lue par « fra », chevrons en « ».
    expect(familleCarte('7408122F1204159UTO « « « «')).toBe('carte-autre');
  });

  it('jamais pour une page de passeport, un recto, ou une ligne de nom', () => {
    expect(familleCarte(TD3.join('\n'))).toBeUndefined();
    expect(familleCarte(PAGE_PASSEPORT)).toBeUndefined();
    // Ligne 2 de passeport écourtée d'un côté ou de l'autre.
    expect(familleCarte(TD3[1].slice(0, 30))).toBeUndefined();
    expect(familleCarte(TD3[1].slice(13))).toBeUndefined();
    expect(familleCarte(RECTO_CNI)).toBeUndefined();
    expect(familleCarte(TD1[2])).toBeUndefined();
    expect(familleCarte('PAPE<<ADAMA<<<<<<<<')).toBeUndefined();
    expect(familleCarte('')).toBeUndefined();
    expect(familleCarte(`${TD1.join('\n')}\n${'x'.repeat(9000)}`)).toBeUndefined();
  });
});

describe('doitLireBande (heuristique économe)', () => {
  it('oui pour un passeport reconnu, ou des lignes de bande', () => {
    expect(doitLireBande('rien de lisible', { typePiece: 'Passeport' })).toBe(true);
    expect(doitLireBande(TD1.join('\n'), null)).toBe(true);
    expect(doitLireBande(PAGE_PASSEPORT, null)).toBe(true);
  });

  it('non pour un recto de carte, un permis, un texte vide ou démesuré', () => {
    expect(doitLireBande(RECTO_CNI, { typePiece: 'CNI', nom: 'KOUAMÉ' })).toBe(false);
    expect(doitLireBande(PERMIS_EPARS, { typePiece: 'Permis de conduire' })).toBe(false);
    expect(doitLireBande('', null)).toBe(false);
    expect(doitLireBande(`${TD3.join('\n')}\n${'x'.repeat(9000)}`, null)).toBe(false);
  });
});

describe('zoneBande', () => {
  it('encadre les lignes de bande vues par la première lecture, avec une marge', () => {
    const t = tsv([
      { texte: 'Nom / Surname', haut: 100, hauteur: 30 },
      { texte: 'ERIKSSON', haut: 140, hauteur: 40 },
      { texte: TD3[0], haut: 470, hauteur: 36 },
      { texte: TD3[1], haut: 520, hauteur: 36 },
    ]);
    const zone = zoneBande(t, 600)!;
    expect(zone.haut).toBeLessThan(470);
    expect(zone.haut).toBeGreaterThan(300);
    expect(zone.bas).toBe(600);
  });

  it('élargit davantage quand une seule ligne est reconnue', () => {
    const zone = zoneBande(tsv([{ texte: TD1[2], haut: 300, hauteur: 30 }]), 600)!;
    expect(zone.haut).toBeLessThanOrEqual(300 - 2.8 * 30 + 1);
    expect(zone.bas).toBeGreaterThanOrEqual(330 + 2.8 * 30 - 1);
  });

  it('null sans ligne de bande, sur une entrée vide, malformée ou démesurée', () => {
    expect(zoneBande(tsv([{ texte: 'Prénoms : AFFOUÉ', haut: 10, hauteur: 20 }]), 600)).toBeNull();
    expect(zoneBande('', 600)).toBeNull();
    expect(zoneBande('5\tpas\tassez', 600)).toBeNull();
    expect(zoneBande('x'.repeat(300_000), 600)).toBeNull();
  });
});

describe('combinerLectures', () => {
  it('la première lecture gagne, la seconde comble ses trous', () => {
    expect(
      combinerLectures(
        { typePiece: 'Permis de conduire', nom: 'ZAMBLÉ LOU', decoupage: 'libelles' },
        { nom: 'ZAMBLE LOU', prenom: 'IRÈNE', decoupage: 'libelles' },
      ),
    ).toEqual({ typePiece: 'Permis de conduire', nom: 'ZAMBLÉ LOU', prenom: 'IRÈNE', decoupage: 'libelles' });
  });

  it('nom et prénoms de lectures différentes : le découpage le moins sûr', () => {
    expect(combinerLectures({ nom: 'KOUAMÉ', decoupage: 'position' }, { prenom: 'AFFOUÉ', decoupage: 'devine' })?.decoupage).toBe(
      'devine',
    );
    expect(combinerLectures(null, { prenom: 'AFFOUÉ', decoupage: 'libelles' })).toEqual({ prenom: 'AFFOUÉ', decoupage: 'libelles' });
    expect(combinerLectures(null, null)).toBeNull();
  });
});

describe('assainirSortie', () => {
  it('ne recopie que les clés permises', () => {
    const sortie = assainirSortie({
      typePiece: 'CNI',
      nom: 'KOUAMÉ',
      prenom: 'AFFOUÉ ESTELLE',
      decoupage: 'libelles',
      numero: 'D23145890',
      texte: TD1.join('\n'),
      naissance: '740812',
    });
    expect(sortie).toEqual({ typePiece: 'CNI', nom: 'KOUAMÉ', prenom: 'AFFOUÉ ESTELLE', decoupage: 'libelles' });
  });

  it('écarte un nom à chiffres, un type inconnu, des drapeaux mal typés', () => {
    expect(assainirSortie({ nom: 'ERIKSSON 7408', prenom: 'ANNA', typePiece: 'Permis', peutEtreCoupe: 'oui', decoupage: 'autre' })).toEqual({
      prenom: 'ANNA',
    });
    expect(assainirSortie({ nom: 'D23145890' })).toBeNull();
    expect(assainirSortie({ peutEtreCoupe: true })).toBeNull();
    expect(assainirSortie('ERIKSSON')).toBeNull();
    expect(assainirSortie(null)).toBeNull();
  });
});

describe('executerLecture', () => {
  it('recto de carte lu du premier coup : une seule passe, pas de modèle « mrz », image gardée', async () => {
    const { moteur, passes, etat } = moteurFactice(() => texte(RECTO_CNI));
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(lecture.resultat).toEqual({ typePiece: 'CNI', nom: 'KOUAMÉ', prenom: 'AFFOUÉ ESTELLE', decoupage: 'libelles' });
    expect(lecture.estDosDeCarte).toBe(false);
    expect(lecture.imageAEnvoyer).toBe(ENVOI);
    expect(passes.map((p) => `${p.passe.modele}${p.passe.psm}`)).toEqual(['fra3']);
    expect(etat.arrete).toBe(1);
    verifierContrat(lecture.resultat);
  });

  it('paire incomplète : seconde lecture en texte épars, champs réunis', async () => {
    const { moteur, passes } = moteurFactice((passe) => texte(passe.psm === '11' ? PERMIS_EPARS : PERMIS_SANS_PRENOMS));
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(passes.map((p) => `${p.passe.modele}${p.passe.psm}`)).toEqual(['fra3', 'fra11']);
    expect(lecture.resultat).toMatchObject({ typePiece: 'Permis de conduire', nom: 'ZAMBLÉ LOU', prenom: 'IRÈNE' });
    verifierContrat(lecture.resultat);
  });

  it('page de passeport : bande recadrée là où la première lecture l’a vue, lue avec « mrz »', async () => {
    const mise = tsv([
      { texte: 'ERIKSSON', haut: 120, hauteur: 30 },
      { texte: TD3[0], haut: 470, hauteur: 34 },
      { texte: TD3[1], haut: 520, hauteur: 34 },
    ]);
    const { moteur, passes } = moteurFactice((passe) => (passe.modele === 'mrz' ? texte(TD3.join('\n')) : texte(PAGE_PASSEPORT, mise)));
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(passes.map((p) => `${p.passe.modele}${p.passe.psm}`)).toEqual(['fra3', 'mrz6']);
    const bande = passes[1];
    expect(bande.hauteur).toBeLessThan(IMAGE.hauteur / 2);
    expect(bande.passe).toMatchObject({ alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<', redresser: true });
    expect(lecture.resultat).toMatchObject({ typePiece: 'Passeport', nom: 'ERIKSSON', prenom: 'ANNA MARIA', peutEtreCoupe: false });
    expect(lecture.estDosDeCarte).toBe(false);
    expect(lecture.imageAEnvoyer).toBe(ENVOI);
    verifierContrat(lecture.resultat);
  });

  it('passeport reconnu sans ligne de bande situable : le bas de l’image est lu', async () => {
    const { moteur, passes } = moteurFactice((passe) =>
      passe.modele === 'mrz' ? texte(TD3.join('\n')) : texte('PASSEPORT\nNom / Surname\nERIKSSON'),
    );
    await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(passes[1]).toMatchObject({ passe: { modele: 'mrz' }, hauteur: Math.round(IMAGE.hauteur * 0.4) });
  });

  it('dos de carte lu : estDosDeCarte, aucune image à envoyer, nom de la bande seulement', async () => {
    const { moteur, passes } = moteurFactice((passe) =>
      passe.modele === 'mrz' ? texte(TD1.join('\n')) : texte(`Domicile : UTOPIA-VILLE\n${TD1.join('\n')}`),
    );
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(lecture.estDosDeCarte).toBe(true);
    expect(lecture.imageAEnvoyer).toBeNull();
    // Carte d'un autre État que la Côte d'Ivoire : pas de type.
    expect(lecture.resultat).toEqual({ nom: 'ERIKSSON', prenom: 'ANNA MARIA', peutEtreCoupe: false });
    expect(passes.map((p) => p.passe.psm)).toEqual(['3', '6']);
    verifierContrat(lecture.resultat);
  });

  it('dos de carte reconnu mais bande illisible : image gardée sur le téléphone quand même', async () => {
    const faux = ['I<CIVD231458900<<<<<<<<<<<<<<<', '7408120F1204150CIV<<<<<<<<<<<1', 'KOUAME<<AFFOUE<ESTELLE<<<<<<<<'];
    const { moteur } = moteurFactice((passe) => (passe.modele === 'mrz' ? texte('illisible') : texte(faux.join('\n'))));
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(lecture.estDosDeCarte).toBe(true);
    expect(lecture.imageAEnvoyer).toBeNull();
    expect(lecture.resultat).toEqual({ typePiece: 'CNI' });
  });

  it('rien de lisible : résultat null, image gardée (échec de lecture, pas une panne)', async () => {
    const { moteur, passes } = moteurFactice(() => texte('   \n  '));
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(lecture).toEqual({ resultat: null, imageAEnvoyer: ENVOI, estDosDeCarte: false });
    // Recto, recto épars, puis la contre-vérification : bas de l'image, bas de
    // l'image retournée, image retournée.
    expect(passes.map((p) => `${p.passe.modele}${p.passe.psm}`)).toEqual(['fra3', 'fra11', 'mrz6', 'mrz6', 'fra3']);
    expect(passes[2].hauteur).toBe(Math.round(IMAGE.hauteur * 0.4));
  });

  it('dos de carte tête en bas : reconnu sur l’image retournée, rien à envoyer', async () => {
    // Première rangée marquée : elle finit en bas de ce qu'on lit si, et
    // seulement si, l'image a été retournée (la bande tête en bas y est).
    const pixels = new Uint8Array(1000 * 600).fill(255);
    pixels.fill(7, 0, 1000);
    const preparee: ImagePreparee = { envoi: ENVOI, lecture: { largeur: 1000, hauteur: 600, pixels }, angle: 0 };
    const { moteur, passes } = moteurFactice((passe, image) => {
      if (image.pixels[image.pixels.length - 1] !== 7) return texte('>>>3>>3>>>VI}VW>YNNV\n0202/L0/LO : 8] 99:1A1/9G');
      return texte(passe.modele === 'mrz' ? TD1.join('\n') : '');
    });
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur, preparee));
    expect(lecture.estDosDeCarte).toBe(true);
    expect(lecture.imageAEnvoyer).toBeNull();
    expect(lecture.resultat).toEqual({ nom: 'ERIKSSON', prenom: 'ANNA MARIA', peutEtreCoupe: false });
    expect(passes.map((p) => `${p.passe.modele}${p.passe.psm}`)).toEqual(['fra3', 'fra11', 'mrz6', 'mrz6']);
    verifierContrat(lecture.resultat);
  });

  it('dos de carte coupé sur le côté, où « fra » ne lit rien : reconnu par le bas de l’image', async () => {
    const coupe = TD1.map((ligne) => ligne.slice(0, 24));
    const { moteur, passes } = moteurFactice((passe) => texte(passe.modele === 'mrz' ? coupe.join('\n') : ''));
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(lecture.estDosDeCarte).toBe(true);
    expect(lecture.imageAEnvoyer).toBeNull();
    expect(passes.map((p) => `${p.passe.modele}${p.passe.psm}`)).toEqual(['fra3', 'fra11', 'mrz6']);
  });

  it('page de passeport reconnue sans nom ni bande lisible : pas de contre-vérification, image gardée', async () => {
    const { moteur, passes } = moteurFactice((passe) => texte(passe.modele === 'mrz' ? 'illisible' : 'PASSEPORT / PASSPORT'));
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(lecture.estDosDeCarte).toBe(false);
    expect(lecture.imageAEnvoyer).toBe(ENVOI);
    expect(passes.map((p) => `${p.passe.modele}${p.passe.psm}`)).toEqual(['fra3', 'mrz6', 'fra11']);
  });

  it('panne pendant la contre-vérification : pas de verdict (moteur_indisponible), jamais « pas un dos »', async () => {
    const { moteur, etat } = moteurFactice((passe) =>
      passe.modele === 'mrz' ? Promise.reject(new Error('modèle injoignable')) : texte('rien'),
    );
    const erreur = await executerLecture(ENVOI, undefined, dependances(moteur)).catch((e) => e);
    expect(erreur).toBeInstanceOf(LectureImpossible);
    expect(erreur.cause).toBe('moteur_indisponible');
    expect(etat.arrete).toBe(1);
  });

  it('image indécodable : image_illisible, sans démarrer le moteur', async () => {
    const demarrer = vi.fn();
    const erreur = await executerLecture(ENVOI, undefined, { preparer: async () => null, moteur: demarrer }).catch((e) => e);
    expect(erreur).toBeInstanceOf(LectureImpossible);
    expect(erreur.cause).toBe('image_illisible');
    expect(demarrer).not.toHaveBeenCalled();
  });

  it('moteur injoignable : moteur_indisponible, sans rien de l’erreur d’origine', async () => {
    const origine = new Error('Network error while fetching https://exemple.invalide/ocr/fra.traineddata.gz');
    const erreur = await executerLecture(ENVOI, undefined, {
      preparer: async () => PREPAREE,
      moteur: async () => {
        throw origine;
      },
    }).catch((e) => e);
    expect(erreur).toBeInstanceOf(LectureImpossible);
    expect(erreur.cause).toBe('moteur_indisponible');
    expect(erreur.message).toBe('Lecture de la pièce impossible');
    expect(JSON.stringify(erreur)).not.toContain('exemple');
    expect(String(erreur.stack)).not.toContain('exemple');
  });

  it('panne pendant la première lecture : moteur_indisponible, moteur arrêté', async () => {
    const { moteur, etat } = moteurFactice(() => Promise.reject(new Error(TD1.join('\n'))));
    const erreur = await executerLecture(ENVOI, undefined, dependances(moteur)).catch((e) => e);
    expect(erreur).toBeInstanceOf(LectureImpossible);
    expect(erreur.cause).toBe('moteur_indisponible');
    expect(`${erreur.message}${erreur.stack}`).not.toContain('ERIKSSON');
    expect(etat.arrete).toBe(1);
  });

  it('panne pendant la lecture de la bande : on rend ce que le recto a donné', async () => {
    const { moteur } = moteurFactice((passe) =>
      passe.modele === 'mrz' ? Promise.reject(new Error('modèle injoignable')) : texte(PAGE_PASSEPORT),
    );
    const lecture = await executerLecture(ENVOI, undefined, dependances(moteur));
    expect(lecture.resultat?.typePiece).toBe('Passeport');
    expect(lecture.imageAEnvoyer).toBe(ENVOI);
    verifierContrat(lecture.resultat);
  });

  it('annulation avant ou pendant : AbortError, moteur arrêté', async () => {
    const deja = new AbortController();
    deja.abort();
    await expect(executerLecture(ENVOI, deja.signal, dependances(moteurFactice(() => texte('')).moteur))).rejects.toMatchObject({
      name: 'AbortError',
    });

    const controleur = new AbortController();
    const { moteur, etat } = moteurFactice(
      () =>
        new Promise<TexteLu>(() => {
          controleur.abort();
        }),
    );
    const erreur = await executerLecture(ENVOI, controleur.signal, dependances(moteur)).catch((e) => e);
    expect(erreur).toMatchObject({ name: 'AbortError' });
    expect(etat.arrete).toBe(1);
  });
});

describe('creerEnCaptant', () => {
  const portee = globalThis as { Worker?: unknown };
  let avant: unknown;
  beforeEach(() => {
    avant = portee.Worker;
  });
  afterEach(() => {
    portee.Worker = avant;
  });

  it('capte le Worker construit pendant l’appel, puis rétablit le constructeur', () => {
    class FauxWorker {
      constructor(public url: string) {}
    }
    portee.Worker = FauxWorker;
    let construit: unknown = null;
    const { capte } = creerEnCaptant(
      (langue) => {
        construit = new (globalThis as unknown as { Worker: new (u: string) => unknown }).Worker(`/ocr/${langue}`);
        return new Promise<TravailleurTesseract>(() => {});
      },
      'fra',
      1,
      {},
    );
    expect(capte).toBe(construit);
    expect(capte).toBeInstanceOf(FauxWorker);
    expect(portee.Worker).toBe(FauxWorker);
  });

  it('rétablit le constructeur même si la création lève', () => {
    class FauxWorker {}
    portee.Worker = FauxWorker;
    expect(() =>
      creerEnCaptant(
        () => {
          throw new Error('synchrone');
        },
        'fra',
        1,
        {},
      ),
    ).toThrow('synchrone');
    expect(portee.Worker).toBe(FauxWorker);
  });
});

describe('garde-fous du code de lecture', () => {
  const fichiers = ['moteur.ts', 'image.ts', 'index.ts'].map((f) => [f, readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')] as const);

  it('aucun appel à console, aucun logger passé à tesseract.js', () => {
    for (const [, source] of fichiers) {
      expect(source).not.toMatch(/\bconsole\s*\??\.\s*(log|info|warn|error|debug|trace|dir|table|group|assert|count|time)\b/);
      expect(source).not.toMatch(/\blogger\s*:/);
    }
  });

  it('fichiers du moteur sur notre origine, sans cache IndexedDB ni Worker blob:', () => {
    const moteur = fichiers.find(([f]) => f === 'moteur.ts')![1];
    expect(CHEMIN_OCR).toMatch(/^\/ocr\/tesseract-\d+\.\d+\.\d+[\w-]*\/$/);
    expect(moteur).toContain("cacheMethod: 'none'");
    expect(moteur).toContain('workerBlobURL: false');
    expect(moteur).not.toMatch(/jsdelivr|unpkg|https?:\/\//);
    // Import dynamique uniquement : le pré-rendu ne doit rien charger du moteur.
    expect(moteur).not.toMatch(/^import[^\n]*['"]tesseract\.js['"]/m);
  });

  it('le dossier servi est celui que produit scripts/copier-ocr.mjs', async () => {
    const { DOSSIER_OCR } = (await import('../../../scripts/copier-ocr.mjs')) as { DOSSIER_OCR: string };
    expect(CHEMIN_OCR).toBe(`/ocr/${DOSSIER_OCR}/`);
  });
});
