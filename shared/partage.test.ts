import { describe, expect, it } from 'vitest';
import { TYPES_PIECE } from './types';
import { depuisPieceBrute } from './api-types';
import {
  ORIGINE,
  descriptionDePartage,
  initialesPrenom,
  lienFacebook,
  lienWhatsApp,
  lieuDe,
  messageComplet,
  nomAffiche,
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
  nom: "N'GUESSAN",
  prenomInitiales: 'A.',
  commune: 'Yopougon',
  quartier: 'Niangon Sud',
};

describe('identité publiée — table du brief', () => {
  /**
   * Même table que api/src/common/affichage.test.ts, et que la vue SQL
   * vérifiée sur la base de production. Si l'une diverge, un nom
   * s'affiche différemment selon l'endroit où on le lit.
   */
  it.each([
    ["N'Guessan", 'Adjoua', "N'GUESSAN A."],
    ['Diby', 'Serge-Yvan', 'DIBY S-Y.'],
    ['Koffi-Brou', 'Marie Ange', 'KOFFI-BROU M.A.'],
    ['Tié Bi', 'Kouamé', 'TIÉ BI K.'],
    ['Zamble Lou', '', 'ZAMBLE LOU'],
  ])('%s + %s → %s', (nom, prenom, attendu) => {
    expect(nomAffiche(nom, prenom)).toBe(attendu);
  });

  it('traite l’apostrophe comme une lettre du prénom, droite ou typographique', () => {
    expect(initialesPrenom("N'Da")).toBe('N.');
    expect(initialesPrenom('N’Da')).toBe('N.');
  });

  it('réduit les espaces multiples, et met en capitale une initiale accentuée', () => {
    expect(initialesPrenom('  Jean   Marc  ')).toBe('J.M.');
    expect(initialesPrenom('élodie')).toBe('É.');
  });

  it('rend null pour un prénom vide', () => {
    expect(initialesPrenom('')).toBeNull();
    expect(initialesPrenom('   ')).toBeNull();
  });

  it('assemble l’identité telle que la renvoie la vue', () => {
    expect(nomPublic(PIECE)).toBe("N'GUESSAN A.");
    expect(nomPublic({ nom: 'ZAMBLE LOU', prenomInitiales: null })).toBe('ZAMBLE LOU');
  });

  it('n’écrit jamais le prénom entier, même dans le message complet', () => {
    const message = messageComplet(PIECE);
    expect(message).not.toContain('Adjoua');
    expect(message).toContain("N'GUESSAN A.");
  });
});

describe('forme renvoyée par la vue publique', () => {
  it('se lit telle quelle, sans rien recomposer', () => {
    const p = depuisPieceBrute({
      id: 'x',
      type_piece: 'CNI',
      nom: "N'GUESSAN",
      prenom_initiales: 'A.',
      commune: 'Yopougon',
      quartier: null,
      date_trouvaille: '2026-09-14',
      photo_floutee_url: null,
      depot_nom: null,
      lat: 5.35,
      lng: -4.07,
    });
    expect(nomPublic(p)).toBe("N'GUESSAN A.");
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

  /**
   * Depuis que l'endroit s'ecrit librement, les gens nomment la commune
   * d'eux-memes. La coller derriere donnait « Mairie de Yopougon, Yopougon »
   * jusque dans le titre des pages et les messages partages.
   */
  it('n’ajoute pas la commune quand le texte la nomme deja', () => {
    expect(lieuDe({ commune: 'Yopougon', quartier: 'Mairie de Yopougon' })).toBe(
      'Mairie de Yopougon',
    );
    expect(lieuDe({ commune: 'Cocody', quartier: 'Cocody Angré 8e tranche' })).toBe(
      'Cocody Angré 8e tranche',
    );
    expect(lieuDe({ commune: 'Adjamé', quartier: 'marché d’ADJAME' })).toBe('marché d’ADJAME');
    expect(lieuDe({ commune: 'Port-Bouët', quartier: 'vers port bouet' })).toBe('vers port bouet');
    expect(lieuDe({ commune: 'Yopougon', quartier: 'carrefour Gesco' })).toBe(
      'carrefour Gesco, Yopougon',
    );
  });
});

describe('message envoyé', () => {
  const message = messageComplet(PIECE);

  it('se comprend seul, sans le site autour', () => {
    expect(message).toContain('CNI trouvée à Niangon Sud, Yopougon');
    expect(message).toContain("N'GUESSAN A.");
    expect(message).toContain(urlPiece(PIECE.id));
  });

  it('dit la gratuité — la question se pose vraiment', () => {
    expect(message).toContain('gratuite');
  });

  it('ne commence pas par l’URL', () => {
    expect(message.startsWith('http')).toBe(false);
  });

  /**
   * Les initiales portent déjà leur point : ponctuer la phrase sans regarder
   * donnait « au nom de Serge Alan D.. ». Figé pour toutes les phrases, avec
   * et sans prénom.
   */
  it('ne double jamais le point final, et en met un quand il manque', () => {
    for (const type of TYPES_PIECE) {
      for (const piece of [
        { ...PIECE, typePiece: type },
        { ...PIECE, typePiece: type, nom: 'ZAMBLE LOU', prenomInitiales: null },
      ]) {
        expect(messageComplet(piece), type).not.toContain('..');
        expect(titreDePartage(piece), type).not.toContain('..');
        expect(descriptionDePartage(piece), type).not.toContain('..');
      }
    }
    expect(descriptionDePartage({ ...PIECE, nom: 'ZAMBLE LOU', prenomInitiales: null })).toContain(
      'ZAMBLE LOU. Si',
    );
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
    expect(d).toContain("N'GUESSAN A.");
    expect(d).toContain('gratuite');
  });
});

describe('liens de partage', () => {
  it('encode le message dans le lien WhatsApp', () => {
    const lien = lienWhatsApp(messageComplet(PIECE));
    expect(lien.startsWith('https://wa.me/?text=')).toBe(true);
    // Un saut de ligne non encodé casse le lien dès le premier retour.
    expect(lien).not.toContain('\n');
    expect(decodeURIComponent(lien.slice('https://wa.me/?text='.length))).toContain("N'GUESSAN A.");
  });

  it('passe à Facebook l’URL de la pièce, encodée', () => {
    const lien = lienFacebook(urlPiece(PIECE.id));
    expect(lien).toContain(encodeURIComponent(`${ORIGINE}/piece/${PIECE.id}`));
  });
});
