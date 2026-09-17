import { describe, expect, it } from 'vitest';
import { TypePiece } from '../common/enums';
import { trouverMatches, type PersonnePiece } from './matching';

/**
 * Retenue sur le nom seul : l'existence d'une correspondance ne doit rien
 * apprendre du prénom à qui crée des alertes ou déclare des pièces, sans que
 * le vrai propriétaire au nom imparfaitement écrit ne perde la sienne.
 */
function personne(nom: string, prenom: string): PersonnePiece {
  return { nom, prenom, typePiece: TypePiece.CNI, lat: null, lng: null, date: '2026-09-01T00:00:00Z' };
}

function retenu(nomAlerte: string, nomPiece: string, prenomAlerte = 'Aya', prenomPiece = 'Aya'): boolean {
  const piece = { id: 'piece-1', ...personne(nomPiece, prenomPiece) };
  return trouverMatches(personne(nomAlerte, prenomAlerte), [piece], { nomSeul: true }).length === 1;
}

describe('trouverMatches — retenue sur le nom seul', () => {
  it('ne dépend jamais du prénom saisi', () => {
    const couples: [string, string][] = [
      ['Kouassi', 'Kouassi'],
      ['Kouame', 'Kouassi'],
      ['Kouasi', "N'Guessan Kouassi"],
    ];
    for (const [alerte, piece] of couples) {
      const decisions = ['Adjoua', 'Adj', 'A', 'Zzz', ''].map((p) => retenu(alerte, piece, p, 'Adjoua'));
      expect(new Set(decisions).size, `${alerte} / ${piece}`).toBe(1);
    }
  });

  it.each([
    ['Kouassi', "N'Guessan Kouassi", 'nom composé partiel'],
    ["N'Guessan", "N'Guessan Kouassi", 'premier nom seulement'],
    ['Yao', "N'Guessan Yao", 'dernier nom seulement'],
    ['Konan', 'Kouame epse Konan', 'nom d’épouse'],
    ['Kouasi', 'Kouassi', 'une faute'],
    ['Kouasi', "N'Guessan Kouassi", 'nom partiel avec une faute'],
    ['Wattara', 'Ouattara', 'variante d’écriture'],
    ['Yaho', 'Yao', 'une faute sur un nom court'],
    ['Kouassiyao', 'Kouassi Yao', 'espace oublié entre deux noms'],
    ['Kouassi Adjoua', 'Kouassi', 'prénom écrit dans le champ du nom'],
  ])('retient « %s » pour « %s » (%s)', (alerte, piece) => {
    expect(retenu(alerte, piece)).toBe(true);
  });

  it.each([
    ['Kouame', 'Kouassi'],
    ['Konan', 'Kone'],
    ['Yao', 'Koffi'],
  ])('écarte « %s » pour « %s »', (alerte, piece) => {
    expect(retenu(alerte, piece)).toBe(false);
  });

  it('reste rapide sur des noms longs faits de mots courts, candidat après candidat', () => {
    const nomPiege = Array(33).fill('ab').join(' ');
    const base = Array.from({ length: 2000 }, (_, i) => ({ id: `p${i}`, ...personne(nomPiege, 'Aya') }));
    const debut = performance.now();
    trouverMatches(personne(Array(33).fill('ba').join(' '), 'Aya'), base, { nomSeul: true });
    expect(performance.now() - debut).toBeLessThan(2500);
  });

  it('garde le score complet, prénom compris', () => {
    const piece = { id: 'piece-1', ...personne('Kouassi', 'Adjoua') };
    const [exact] = trouverMatches(personne('Kouassi', 'Adjoua'), [piece], { nomSeul: true });
    const [autre] = trouverMatches(personne('Kouassi', 'Zzz'), [piece], { nomSeul: true });
    expect(exact.score).toBeGreaterThan(autre.score);
  });
});
