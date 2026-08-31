import { describe, expect, it } from 'vitest';
import { TYPES_PIECE } from './types';
import {
  ORIGINE,
  descriptionDePartage,
  lienFacebook,
  lienWhatsApp,
  lieuDe,
  messageComplet,
  nomPublic,
  titreDePartage,
  urlPiece,
} from './partage';

/**
 * Ce message part dans des groupes WhatsApp et sur Facebook, hors de toute
 * interface : il est lu seul, par des gens qui ne connaissent pas Pièci. Deux
 * exigences donc — qu'il se comprenne sans contexte, et qu'il ne divulgue
 * jamais plus que ce que le registre affiche déjà publiquement.
 */

const PIECE = {
  id: 'e3b0c442-1234-4a1b-9f2c-000000000001',
  typePiece: 'CNI' as const,
  prenom: 'Adjoua',
  nomInitiale: 'N.',
  commune: 'Yopougon',
  quartier: 'Niangon Sud',
};

describe('identité publiée', () => {
  it('ne donne que le prénom et l’initiale', () => {
    // Le point vient de la vue SQL (`left(nom, 1) || '.'`) : le redoubler ici
    // donnerait « Adjoua N.. », ce que quatre écrans faisaient autrefois.
    expect(nomPublic(PIECE)).toBe('Adjoua N.');
    expect(nomPublic({ prenom: 'Adjoua', nomInitiale: 'N.' })).not.toContain('..');
  });

  it('n’écrit jamais le nom entier, même dans le message complet', () => {
    const message = messageComplet(PIECE);
    expect(message).not.toContain('N’Guessan');
    expect(message).toContain('Adjoua N.');
  });
});

describe('formulation', () => {
  it('accorde le participe au genre de la pièce', () => {
    expect(titreDePartage({ ...PIECE, typePiece: 'CNI' })).toContain('CNI trouvée');
    expect(titreDePartage({ ...PIECE, typePiece: 'Passeport' })).toContain('Passeport trouvé à');
    expect(titreDePartage({ ...PIECE, typePiece: 'Permis de conduire' })).toContain(
      'Permis de conduire trouvé',
    );
    expect(titreDePartage({ ...PIECE, typePiece: 'Carte étudiante' })).toContain(
      'Carte étudiante trouvée',
    );
  });

  it('couvre tous les types de pièce, sans exception', () => {
    // Un type ajouté sans son genre produirait « undefined » en plein message.
    for (const type of TYPES_PIECE) {
      const titre = titreDePartage({ ...PIECE, typePiece: type });
      expect(titre, type).toMatch(/trouvée?\sà/);
      expect(titre, type).not.toContain('undefined');
    }
  });

  it('nomme l’endroit avant la commune, et s’en passe s’il manque', () => {
    expect(lieuDe(PIECE)).toBe('Niangon Sud, Yopougon');
    expect(lieuDe({ ...PIECE, quartier: null })).toBe('Yopougon');
  });
});

describe('message envoyé', () => {
  const message = messageComplet(PIECE);

  it('se comprend seul, sans le site autour', () => {
    expect(message).toContain('CNI trouvée à Niangon Sud, Yopougon');
    expect(message).toContain('Adjoua N.');
    expect(message).toContain(urlPiece(PIECE.id));
  });

  it('dit la gratuité — la question se pose vraiment', () => {
    expect(message).toContain('gratuite');
  });

  it('ne commence pas par l’URL', () => {
    expect(message.startsWith('http')).toBe(false);
  });

  /**
   * L'initiale porte deja son point : ponctuer la phrase sans regarder donnait
   * « au nom de Adjoua N.. », dans un texte destine a circuler tel quel. Le
   * cas s'est produit en production ; il est fige ici pour toutes les phrases
   * du module, pas seulement celle qui l'a revele.
   */
  it('ne double jamais le point final', () => {
    for (const type of TYPES_PIECE) {
      const piece = { ...PIECE, typePiece: type };
      expect(messageComplet(piece), type).not.toContain('..');
      expect(titreDePartage(piece), type).not.toContain('..');
      expect(descriptionDePartage(piece), type).not.toContain('..');
    }
  });
});

describe('description d’aperçu', () => {
  it('accorde le participe, comme le titre', () => {
    expect(descriptionDePartage({ ...PIECE, typePiece: 'CNI' })).toContain('CNI déclarée');
    expect(descriptionDePartage({ ...PIECE, typePiece: 'Passeport' })).toContain(
      'Passeport déclaré à',
    );
  });

  it('dit où, au nom de qui, et ce que ça coûte', () => {
    const d = descriptionDePartage(PIECE);
    expect(d).toContain('Niangon Sud, Yopougon');
    expect(d).toContain('Adjoua N.');
    expect(d).toContain('gratuite');
  });
});

describe('liens de partage', () => {
  it('encode le message dans le lien WhatsApp', () => {
    const lien = lienWhatsApp(messageComplet(PIECE));
    expect(lien.startsWith('https://wa.me/?text=')).toBe(true);
    // Un saut de ligne non encodé casse le lien dès le premier retour.
    expect(lien).not.toContain('\n');
    expect(decodeURIComponent(lien.slice('https://wa.me/?text='.length))).toContain('Adjoua N.');
  });

  it('passe à Facebook l’URL de la pièce, encodée', () => {
    const lien = lienFacebook(urlPiece(PIECE.id));
    expect(lien).toContain(encodeURIComponent(`${ORIGINE}/piece/${PIECE.id}`));
  });
});
