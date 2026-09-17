import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  diagnosticDemande,
  ecouterDiagnostic,
  extraction,
  lignesMasquees,
  lireAvecDiagnostic,
  masquerChiffres,
  masquerLigne,
  type RapportDiagnostic,
} from './diagnostic';
import type { ImagePreparee } from './image';
import { LectureImpossible } from './index';
import * as moteurReel from './moteur';
import type { Moteur, TexteLu } from './moteur';

/**
 * Mode diagnostic de la version d'essai : masquage, extraction, et le rapport
 * qui ne va qu'à l'écouteur. Données inventées (État fictif « UTOPIE »).
 */

const IMAGE = { largeur: 1000, hauteur: 600, pixels: new Uint8Array(1000 * 600).fill(250) };
const ENVOI = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
const PREPAREE: ImagePreparee = { envoi: ENVOI, lecture: IMAGE, angle: 0 };

const RECTO = [
  "RÉPUBLIQUE D'UTOPIE",
  "CARTE NATIONALE D'IDENTITÉ",
  'Nom : TANO',
  'Prénom(s) : AYA-LAURE ESTHER',
  'Né(e) le : 01/01/1990 à UTOPIA-VILLE',
  'N° UT 0000 0000 0',
].join('\n');

/** Module moteur réel, dont seules les dépendances (image, Tesseract) sont factices. */
function moduleFactice(lire: () => Promise<TexteLu>) {
  const moteur: Moteur = { lire, arreter: () => {} };
  return { ...moteurReel, DEPENDANCES: { preparer: async () => PREPAREE, moteur: async () => moteur } };
}

let espions: ReturnType<typeof vi.spyOn>[] = [];
beforeEach(() => {
  espions = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((m) => vi.spyOn(console, m));
});
afterEach(() => {
  for (const espion of espions) {
    expect(espion).not.toHaveBeenCalled();
    espion.mockRestore();
  }
});

describe('masquage', () => {
  it('tous les chiffres deviennent « • », de toute écriture', () => {
    expect(masquerChiffres('N° UT 0123 ² ٣ ½')).toBe('N° UT •••• • • •');
  });

  it('un mot qui porte un chiffre est masqué EN ENTIER : les O et I lus pour 0 et 1 disparaissent aussi', () => {
    expect(masquerChiffres('Né le : O1/O7/199O')).toBe('Né le : ••••••••••');
    expect(masquerChiffres('N° CIOO12345678')).toBe('N° ••••••••••••');
    expect(masquerChiffres('Taille 1,6S')).toBe('Taille ••••');
    // Date lue tout en lettres.
    expect(masquerChiffres('Né le OI/OI/IOOO')).toBe('Né le ••••••••••');
    // Rien d'autre ne change.
    expect(masquerChiffres("CARTE NATIONALE D'IDENTITÉ")).toBe("CARTE NATIONALE D'IDENTITÉ");
    expect(masquerChiffres('Prénom(s) : AYA-LAURE ESTHER')).toBe('Prénom(s) : AYA-LAURE ESTHER');
  });

  it('bande à chevrons : tout est masqué sauf les chevrons, même lue par « fra » et chiffres lus en lettres', () => {
    // Ligne 2 d'une carte (TD1) aux 0 lus O : la forme de bande suffit.
    const chevrons = (ligne: string) => ligne.replace(/[^<]/g, '•');
    expect(masquerLigne('74O8122F12O4159UTO<<<<<<<<<<<6')).toBe(chevrons('74O8122F12O4159UTO<<<<<<<<<<<6'));
    expect(masquerLigne('ERIKSSON<<ANNA<MARIA<<<<<<<<<<')).toBe('••••••••<<••••<•••••<<<<<<<<<<');
    // Passe « mrz » : tout le texte, quelle que soit sa forme.
    expect(masquerLigne('UTO ERIKSSON', true)).toBe('••• ••••••••');
    expect(lignesMasquees('I<UTOD231458907<<<<<<<<<<<<<<<\nOIOOOO', true)).toEqual([chevrons('I<UTOD231458907<<<<<<<<<<<<<<<'), '••••••']);
  });

  it('lignes non vides, masquées, bornées', () => {
    expect(lignesMasquees('  Nom : TANO \n\n01/01/1990\n')).toEqual(['Nom : TANO', '••••••••••']);
    expect(lignesMasquees('A\n'.repeat(500))).toHaveLength(120);
    expect(lignesMasquees('B'.repeat(1000))[0]).toHaveLength(200);
    expect(lignesMasquees(12 as unknown as string)).toEqual([]);
  });

  it('extraction : champs du formulaire seulement, rien qui porte un chiffre', () => {
    expect(extraction({ typePiece: 'CNI', nom: 'TANO', prenom: 'AYA 1990', decoupage: 'libelles', numero: 'UT000' })).toEqual({
      typePiece: 'CNI',
      nom: 'TANO',
      decoupage: 'libelles',
    });
    expect(extraction(null)).toBeNull();
    expect(extraction({ numero: 'UT000' })).toBeNull();
  });

  it('?diagnostic absent (tests, pré-rendu) : mode inactif', () => {
    expect(diagnosticDemande()).toBe(false);
  });
});

describe('lireAvecDiagnostic', () => {
  it('même lecture que executerLecture, et un rapport masqué pour l’écouteur seul', async () => {
    const rapports: RapportDiagnostic[] = [];
    const arreter = ecouterDiagnostic((r) => rapports.push(r));
    const lecture = await lireAvecDiagnostic(moduleFactice(async () => ({ texte: RECTO, tsv: '' })), ENVOI);
    arreter();

    expect(lecture.resultat).toEqual({ typePiece: 'CNI', nom: 'TANO', prenom: 'AYA-LAURE ESTHER', decoupage: 'libelles' });
    expect(rapports).toHaveLength(1);
    const [rapport] = rapports;
    expect(rapport.passes).toHaveLength(1);
    expect(rapport.passes[0].etiquette).toBe('Recto, découpage automatique (psm 3)');
    expect(rapport.passes[0].lignes).toContain('Né(e) le : •••••••••• à UTOPIA-VILLE');
    expect(rapport.passes[0].lignes).toContain('N° UT •••• •••• •');
    expect(typeof rapport.passes[0].dureeMs).toBe('number');
    expect(typeof rapport.dureeMs).toBe('number');
    expect(rapport.passes[0].extraction).toEqual({ typePiece: 'CNI', nom: 'TANO', prenom: 'AYA-LAURE ESTHER', decoupage: 'libelles' });
    expect(rapport.resultat).toEqual(lecture.resultat);
    // Les étiquettes portent « psm 3 » ; ce qui a été lu, lui, n'a plus aucun chiffre.
    expect(JSON.stringify(rapport.passes.map((p) => [p.lignes, p.extraction]))).not.toMatch(/\d/);
  });

  it('sans écouteur, rien n’est gardé ni envoyé', async () => {
    const recu = vi.fn();
    ecouterDiagnostic(recu)();
    await lireAvecDiagnostic(moduleFactice(async () => ({ texte: RECTO, tsv: '' })), ENVOI);
    expect(recu).not.toHaveBeenCalled();
  });

  it('lecture impossible : rapport « impossible », erreur rendue telle quelle', async () => {
    const rapports: RapportDiagnostic[] = [];
    const arreter = ecouterDiagnostic((r) => rapports.push(r));
    const erreur = await lireAvecDiagnostic(moduleFactice(() => Promise.reject(new Error('panne'))), ENVOI).catch((e) => e);
    arreter();
    expect(erreur).toBeInstanceOf(LectureImpossible);
    expect(rapports.map((r) => r.resultat)).toEqual(['impossible']);
  });

  it('lecture coupée par le plafond de la page : rapport partiel « annulee », passes déjà lues et passe interrompue', async () => {
    const rapports: RapportDiagnostic[] = [];
    const arreter = ecouterDiagnostic((r) => rapports.push(r));
    const controleur = new AbortController();
    let appels = 0;
    // Recto sans type : la passe suivante (en-tête) ne rend jamais, le plafond tombe pendant elle.
    const module = moduleFactice((() => {
      appels++;
      if (appels === 1) return Promise.resolve({ texte: 'Prénom(s) : AYA-LAURE ESTHER\nNé(e) le : 01/01/1990', tsv: '' });
      setTimeout(() => controleur.abort(), 0);
      return new Promise<TexteLu>(() => {});
    }) as () => Promise<TexteLu>);
    const erreur = await lireAvecDiagnostic(module, ENVOI, controleur.signal).catch((e) => e);
    arreter();
    expect(erreur).toMatchObject({ name: 'AbortError' });
    expect(rapports).toHaveLength(1);
    const [rapport] = rapports;
    expect(rapport.resultat).toBe('annulee');
    expect(rapport.passes[0].lignes).toEqual(['Prénom(s) : AYA-LAURE ESTHER', 'Né(e) le : ••••••••••']);
    expect(rapport.passes[0].interrompue).toBeUndefined();
    expect(JSON.stringify(rapport.passes.map((p) => [p.lignes, p.extraction]))).not.toMatch(/\d/);
  });

  it('téléphone lent : la passe sautée faute de temps est notée à sa place, sans rien de lu', async () => {
    // Horloge factice : chaque lecture prend 8 s, l'en-tête ne tient plus dans le budget de moteur.ts.
    let t = 0;
    const horloge = vi.spyOn(performance, 'now').mockImplementation(() => t);
    const rapports: RapportDiagnostic[] = [];
    const arreter = ecouterDiagnostic((r) => rapports.push(r));
    try {
      const module = moduleFactice(async () => {
        t += 8_000;
        return { texte: 'Prénom(s) : AYA-LAURE ESTHER', tsv: '' };
      });
      const lecture = await lireAvecDiagnostic(module, ENVOI);
      expect(lecture.resultat).toEqual({ prenom: 'AYA-LAURE ESTHER', decoupage: 'libelles' });
    } finally {
      arreter();
      horloge.mockRestore();
    }
    const { passes } = rapports[0];
    expect(passes[1]).toEqual({
      etiquette: 'En-tête : haut de l’image agrandi, contrasté, inversé (psm 3)',
      lignes: [],
      extraction: null,
      dureeMs: 0,
      sautee: true,
    });
    expect(passes.filter((p) => p.sautee)).toHaveLength(1);
    expect(passes[2].etiquette).toBe('Recto, texte épars (psm 11)');
  });

  it('photo remplacée pendant la lecture : l’ancienne lecture ne rapporte rien', async () => {
    const rapports: RapportDiagnostic[] = [];
    const arreter = ecouterDiagnostic((r) => rapports.push(r));
    const ancienne = new AbortController();
    let debloquer: () => void = () => {};
    const bloquee = moduleFactice(
      () => new Promise<TexteLu>((_, rejeter) => {
        debloquer = () => rejeter(new DOMException('Lecture annulée', 'AbortError'));
      }),
    );
    const premiere = lireAvecDiagnostic(bloquee, ENVOI, ancienne.signal).catch((e) => e);
    await new Promise((r) => setTimeout(r, 0));
    const seconde = lireAvecDiagnostic(moduleFactice(async () => ({ texte: RECTO, tsv: '' })), ENVOI);
    ancienne.abort();
    debloquer();
    await premiere;
    await seconde;
    arreter();
    expect(rapports.map((r) => r.resultat === null || typeof r.resultat === 'string' ? r.resultat : 'lu')).toEqual(['lu']);
  });
});

describe('garde-fous du mode diagnostic', () => {
  const sources = [
    readFileSync(new URL('./diagnostic.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../../components/DiagnosticLecture.tsx', import.meta.url), 'utf8'),
  ];

  it('ni réseau, ni stockage, ni console', () => {
    for (const source of sources) {
      expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|caches\.|document\.cookie/);
      expect(source).not.toMatch(/\bconsole\s*\??\.\s*(log|info|warn|error|debug|trace|dir|table|group|assert|count|time)\b/);
    }
  });

  it('version d’essai : drapeau lu dans l’environnement seulement, sortie hors du dist/ publié', () => {
    const config = readFileSync(new URL('../../../vite.config.ts', import.meta.url), 'utf8');
    expect(config).toContain("const ESSAI_DIAGNOSTIC = process.env.VITE_DIAGNOSTIC_LECTURE === '1'");
    // `env` de loadEnv lit aussi les fichiers .env : interdit pour ce drapeau.
    expect(config).not.toMatch(/(?<!process\.)\benv\.VITE_DIAGNOSTIC_LECTURE/);
    expect(config).toContain('__DIAGNOSTIC_LECTURE__: JSON.stringify(ESSAI_DIAGNOSTIC)');
    expect(config).toMatch(/build: ESSAI_DIAGNOSTIC \? \{ outDir: DOSSIER_ESSAI \} : \{\}/);
    expect(config).toContain("const DOSSIER_ESSAI = 'dist-essai.local'");
  });

  it('pas de traduction automatique des lignes lues', () => {
    expect(sources[1]).toMatch(/<section[^>]*translate="no"[^>]*className="notranslate"/);
  });

  it('branché seulement derrière la constante de build', () => {
    const index = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
    const declarer = readFileSync(new URL('../../pages/Declarer.tsx', import.meta.url), 'utf8');
    expect(index).toMatch(/if \(__DIAGNOSTIC_LECTURE__\) \{\s*const diagnostic = await import\('\.\/diagnostic'\)/);
    expect(declarer).toContain('{__DIAGNOSTIC_LECTURE__ && <DiagnosticLecture />}');
  });
});
