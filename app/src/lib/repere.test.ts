import { describe, expect, it } from 'vitest';
import { libelle, memeLieu } from './repere';

/**
 * Le libellé qu'un repère écrit dans le champ.
 *
 * C'est la seule chose que la personne relira avant de publier, et c'est aussi
 * ce que lira le propriétaire de la pièce. Deux fautes à éviter : répéter la
 * commune, qui figure déjà sur sa propre ligne, et répéter le quartier quand
 * il est déjà dans le nom du repère.
 *
 * Les lieux cités sont inventés.
 */
describe('libelle', () => {
  it('ajoute le quartier quand il apprend quelque chose', () => {
    expect(libelle('Carrefour Timotel', 'Niangon Sud', 'Yopougon')).toBe(
      'Carrefour Timotel, Niangon Sud',
    );
  });

  it('se tait quand la carte ne connaît pas de quartier', () => {
    expect(libelle('Carrefour Timotel', null, 'Yopougon')).toBe('Carrefour Timotel');
  });

  it('ne répète pas la commune, qui a déjà sa ligne', () => {
    // Cas courant : aucun quartier n'est cartographié, la carte rend le nom de
    // la commune à la place.
    expect(libelle('Ciné Cool', 'Yopougon', 'Yopougon')).toBe('Ciné Cool');
    expect(libelle('Ciné Cool', 'YOPOUGON', 'Yopougon')).toBe('Ciné Cool');
  });

  it('ne répète pas le quartier déjà contenu dans le nom', () => {
    expect(libelle('Marché de Niangon Sud', 'Niangon Sud', 'Yopougon')).toBe(
      'Marché de Niangon Sud',
    );
  });

  it('garde le quartier quand la commune est autre', () => {
    expect(libelle('Terminus 27', 'Niangon Sud', 'Cocody')).toBe('Terminus 27, Niangon Sud');
  });
});

describe('memeLieu', () => {
  it('ignore la casse et les accents', () => {
    expect(memeLieu('Attécoubé', 'attecoube')).toBe(true);
    expect(memeLieu('Adjamé', 'ADJAME')).toBe(true);
    expect(memeLieu(' Cocody ', 'Cocody')).toBe(true);
  });

  it('ne confond pas deux endroits différents', () => {
    expect(memeLieu('Yopougon', 'Yamoussoukro')).toBe(false);
    expect(memeLieu('Niangon Sud', 'Niangon Nord')).toBe(false);
    expect(memeLieu('Abobo', '')).toBe(false);
  });
});
