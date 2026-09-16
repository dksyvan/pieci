import { describe, expect, it } from 'vitest';
import { estAnnulation, LectureImpossible, libererLecture, lirePiece } from './index';

/**
 * Surface publique du module de lecture. Ces tests tournent en environnement
 * node, comme le pré-rendu : importer le module ne doit rien exiger du
 * navigateur (ni Worker, ni toile, ni document).
 */

describe('module de lecture, côté pré-rendu', () => {
  it("s'importe sans navigateur et ne charge rien tant qu'on ne lit pas", () => {
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
    expect(typeof lirePiece).toBe('function');
    // Rien n'a été chargé : libérer ne fait rien et ne lève pas.
    expect(() => libererLecture()).not.toThrow();
  });
});

describe('LectureImpossible', () => {
  it('porte une cause et un message fixe, rien d’autre', () => {
    const erreur = new LectureImpossible('image_illisible');
    expect(erreur).toBeInstanceOf(Error);
    expect(erreur.name).toBe('LectureImpossible');
    expect(erreur.cause).toBe('image_illisible');
    expect(erreur.message).toBe('Lecture de la pièce impossible');
    expect(estAnnulation(erreur)).toBe(false);
  });
});

describe('lirePiece', () => {
  it('signal déjà levé : AbortError immédiat', async () => {
    const controleur = new AbortController();
    controleur.abort();
    const erreur = await lirePiece(new Blob([]), { signal: controleur.signal }).catch((e) => e);
    expect(estAnnulation(erreur)).toBe(true);
  });

  it('fichier vide : image_illisible (aucune image à lire)', async () => {
    const erreur = await lirePiece(new Blob([])).catch((e) => e);
    expect(erreur).toBeInstanceOf(LectureImpossible);
    expect(erreur.cause).toBe('image_illisible');
  });
});
