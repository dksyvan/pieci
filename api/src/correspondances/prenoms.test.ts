import { describe, expect, it } from 'vitest';
import { prenomsConcordent } from './prenoms';

/**
 * Le défi des prénoms protège l'accès aux coordonnées du trouveur, une fois le
 * nom de famille devenu public. Deux exigences opposées, figées ici : ne
 * jamais punir le vrai propriétaire pour la forme, ne jamais laisser les
 * initiales affichées servir de réponse.
 */

describe('le propriétaire passe', () => {
  it.each([
    ['Serge-Yvan', 'Serge-Yvan', 'identique'],
    ['serge yvan', 'Serge-Yvan', 'casse et tiret'],
    ['Yvan Serge', 'Serge-Yvan', 'ordre inversé'],
    ['Élodie', 'elodie', 'accent'],
    ["N'Da", 'N’Da', 'apostrophe droite ou typographique'],
    ['Nda', "N'Da", 'apostrophe oubliée'],
    ['Marieange', 'Marie Ange', 'espace oublié'],
    ['Adjuoa', 'Adjoua', 'une faute sur un prénom long'],
    ['Serge Yvn', 'Serge-Yvan', 'une faute sur deux prénoms'],
    ['Serge Yvan', 'Serge', 'le trouveur n’a tapé qu’un des prénoms'],
    ['Amenan Marie', 'Amenan', 'un prénom de plus, dans l’autre ordre'],
    ['Aya', 'Aya.', 'ponctuation saisie par le trouveur'],
    ['Adjoua Aya', 'Aya', 'un prénom de plus, même court'],
  ])('« %s » pour « %s » (%s)', (saisis, attendus) => {
    expect(prenomsConcordent(saisis, attendus)).toBe(true);
  });
});

describe('les initiales publiques ne suffisent pas', () => {
  it('refuse les initiales elles-mêmes', () => {
    expect(prenomsConcordent('S Y', 'Serge-Yvan')).toBe(false);
    expect(prenomsConcordent('S-Y', 'Serge-Yvan')).toBe(false);
    expect(prenomsConcordent('A', 'Adjoua')).toBe(false);
  });

  it('refuse un prénom complété par l’initiale affichée de l’autre', () => {
    // L'annonce montre « … A.Y. » : « Ange Y » est à une lettre de « Ange Ya ».
    expect(prenomsConcordent('Ange Y', 'Ange Ya')).toBe(false);
  });

  it('ne tolère aucune faute sur un prénom court', () => {
    // Sur « Aya », une faute tolérée ferait passer « Ay ».
    expect(prenomsConcordent('Ay', 'Aya')).toBe(false);
    expect(prenomsConcordent('Ayo', 'Aya')).toBe(false);
  });

  it('refuse un seul des deux prénoms', () => {
    expect(prenomsConcordent('Serge', 'Serge-Yvan')).toBe(false);
  });

  it('refuse plus d’un prénom en trop — une liste de prénoms courants n’est pas une réponse', () => {
    expect(prenomsConcordent('Kouassi Amenan Marie', 'Amenan')).toBe(false);
    expect(prenomsConcordent('Adjoua Aya Akissi', 'Aya')).toBe(false);
  });

  it('ne tolère pas de faute sur le prénom attendu quand un prénom saisi est une initiale', () => {
    expect(prenomsConcordent('Serge Y', 'Serge Ya')).toBe(false);
  });

  it('reconnaît chaque sorte de faute unique, et pas davantage', () => {
    expect(prenomsConcordent('Adjoxa', 'Adjoua')).toBe(true); // remplacée
    expect(prenomsConcordent('Adjouaa', 'Adjoua')).toBe(true); // ajoutée
    expect(prenomsConcordent('Adjua', 'Adjoua')).toBe(true); // oubliée
    expect(prenomsConcordent('Dajoua', 'Adjoua')).toBe(true); // inversée au début
    expect(prenomsConcordent('Adjoau', 'Adjoua')).toBe(true); // inversée à la fin
    expect(prenomsConcordent('Adouja', 'Adjoua')).toBe(false); // deux lettres déplacées
    expect(prenomsConcordent('Djoua', 'Adjouaa')).toBe(false); // une oubliée, une ajoutée
  });

  it('refuse deux fautes', () => {
    expect(prenomsConcordent('Adjuaa', 'Adjoua')).toBe(false);
  });

  it('refuse une réponse ou un prénom attendu vides', () => {
    expect(prenomsConcordent('', 'Adjoua')).toBe(false);
    expect(prenomsConcordent('   ', 'Adjoua')).toBe(false);
    expect(prenomsConcordent('Adjoua', '')).toBe(false);
  });
});
