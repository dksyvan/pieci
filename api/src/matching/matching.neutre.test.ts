import { describe, expect, it } from 'vitest';
import { TypePiece } from '../common/enums';
import { trouverMatches, type PersonnePiece } from './matching';

/**
 * Une alerte créée après la publication d'une pièce ne doit rien apprendre
 * du prénom par la seule existence de la correspondance. Le nom ci-dessous
 * est choisi pour que le prénom fasse basculer le seuil : c'est exactement
 * la position qu'un curieux chercherait à atteindre.
 */
const piece = {
  id: 'piece-1',
  nom: 'Kouassi',
  prenom: 'Adjoua',
  typePiece: TypePiece.CNI,
  lat: null,
  lng: null,
  date: '2026-09-01T00:00:00Z',
};

function perte(prenom: string): PersonnePiece {
  return { nom: 'Kouame', prenom, typePiece: TypePiece.CNI, lat: null, lng: null, date: '2026-09-01T00:00:00Z' };
}

describe('trouverMatches — prénom neutre', () => {
  it('sans l’option, le prénom décide bien de la rétention (le cas est pertinent)', () => {
    expect(trouverMatches(perte('Adjoua'), [piece])).toHaveLength(1);
    expect(trouverMatches(perte('Zzz'), [piece])).toHaveLength(0);
  });

  it('avec l’option, la rétention ne dépend plus du prénom saisi', () => {
    const essais = ['Adjoua', 'Adj', 'A', 'Aya', 'Zzz', ''];
    const retenus = essais.map((p) => trouverMatches(perte(p), [piece], { prenomNeutre: true }).length);
    expect(new Set(retenus).size).toBe(1);
  });

  it('garde le vrai score, pour le trouveur', () => {
    const [exact] = trouverMatches(perte('Adjoua'), [piece], { prenomNeutre: true });
    const [autre] = trouverMatches(perte('Zzz'), [piece], { prenomNeutre: true });
    expect(exact.score).toBeGreaterThan(autre.score);
  });
});
