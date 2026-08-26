import { describe, expect, it } from 'vitest';
import { MESSAGE_TELEPHONE, normaliserTelephone, telephoneValide } from './telephone';

/**
 * Ce module a un jumeau côté API (`api/src/common/telephone.ts`), que l'API
 * ne peut pas importer d'ici — elle se compile seule. Les deux doivent donner
 * les mêmes réponses : ces tests fixent le contrat des deux côtés.
 */

describe('normaliserTelephone', () => {
  it('ramène toutes les écritures courantes à dix chiffres', () => {
    for (const saisie of [
      '0700000000',
      '07 00 00 00 00',
      '07-00-00-00-00',
      '+225 07 00 00 00 00',
      '+2250700000000',
      '225 0700000000',
      ' 07 00 00 00 00 ',
    ]) {
      expect(normaliserTelephone(saisie), saisie).toBe('0700000000');
    }
  });

  it("ne retire l'indicatif que s'il reste un numéro complet", () => {
    expect(normaliserTelephone('2250000000')).toBe('2250000000');
  });

  it('laisse une saisie incomplète telle quelle, chiffres seuls', () => {
    expect(normaliserTelephone('0556')).toBe('0556');
    expect(normaliserTelephone('mon numéro')).toBe('');
  });
});

describe('telephoneValide', () => {
  it('accepte les écritures qui se ramènent à dix chiffres', () => {
    expect(telephoneValide('07 00 00 00 00')).toBe(true);
    expect(telephoneValide('+225 0700000000')).toBe(true);
  });

  it('refuse ce que la base ne saurait pas rapprocher', () => {
    // « 0556 » est la saisie qui déclenchait le message anglais de l'API.
    expect(telephoneValide('0556')).toBe(false);
    expect(telephoneValide('07000000001')).toBe(false);
    expect(telephoneValide('')).toBe(false);
  });
});

describe('MESSAGE_TELEPHONE', () => {
  it('est en français et annonce la longueur attendue', () => {
    expect(MESSAGE_TELEPHONE).toContain('10 chiffres');
    expect(MESSAGE_TELEPHONE).not.toMatch(/[a-z]+ must be/i);
  });
});
