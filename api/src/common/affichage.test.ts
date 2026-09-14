import { describe, expect, it } from 'vitest';
import { initialesPrenom, nomAffiche } from './affichage';

/**
 * Même table que shared/partage.test.ts et que la vue SQL (vérifiée sur la
 * base de production le 14/09/2026). Si l'un des trois diverge, un nom
 * s'afficherait différemment selon qu'on le lit sur le site, dans une
 * correspondance ou dans l'API.
 */

describe('nomAffiche — table du brief', () => {
  it.each([
    ["N'Guessan", 'Adjoua', "N'GUESSAN A."],
    ['Diby', 'Serge-Yvan', 'DIBY S-Y.'],
    ['Koffi-Brou', 'Marie Ange', 'KOFFI-BROU M.A.'],
    ['Tié Bi', 'Kouamé', 'TIÉ BI K.'],
    ['Zamble Lou', '', 'ZAMBLE LOU'],
  ])('%s + %s → %s', (nom, prenom, attendu) => {
    expect(nomAffiche(nom, prenom)).toBe(attendu);
  });
});

describe('initialesPrenom — cas limites', () => {
  it('traite l’apostrophe comme une lettre du prénom, droite ou typographique', () => {
    expect(initialesPrenom("N'Da")).toBe('N.');
    expect(initialesPrenom('N’Da')).toBe('N.');
  });

  it('réduit les espaces multiples et ignore ceux des bords', () => {
    expect(initialesPrenom('  Jean   Marc  ')).toBe('J.M.');
  });

  it('met en capitale une initiale accentuée', () => {
    expect(initialesPrenom('élodie')).toBe('É.');
  });

  it('rend null pour un prénom vide ou blanc', () => {
    expect(initialesPrenom('')).toBeNull();
    expect(initialesPrenom('   ')).toBeNull();
    expect(initialesPrenom(null)).toBeNull();
  });

  it('conserve les accents du nom et son apostrophe', () => {
    expect(nomAffiche('Kéita', 'Aya')).toBe('KÉITA A.');
    expect(nomAffiche("N'Guessan Kouassi", 'Aya')).toBe("N'GUESSAN KOUASSI A.");
  });
});
