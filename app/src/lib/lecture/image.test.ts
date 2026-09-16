import { describe, expect, it } from 'vitest';
import {
  accentuer,
  bandeBasse,
  dimensionsReduites,
  enPgm,
  estimerAngle,
  etapesReduction,
  etirerContraste,
  PART_BANDE_BASSE,
  recadrer,
  redresser,
  tourner180,
  versGris,
  type ImageGrise,
} from './image';

/**
 * Tests des calculs de pixels, sans navigateur. Le décodage, la toile et
 * l'encodage JPEG sont vérifiés dans Chrome par le banc de mesure (images
 * fictives), pas ici.
 */

/** Image blanche parcourue de « lignes de texte » : des traits sombres, inclinés de `angle` degrés. */
function fausseCarte(angle: number, largeur = 1200, hauteur = 760): ImageGrise {
  const pixels = new Uint8Array(largeur * hauteur).fill(245);
  const pente = Math.tan((angle * Math.PI) / 180);
  for (let ligne = 0; ligne < 9; ligne++) {
    const y0 = 90 + ligne * 70;
    // Des « mots » : segments de 40 à 110 px séparés d'espaces.
    for (let x = 120; x < largeur - 120; x += 150) {
      const longueur = 40 + ((x * 7 + ligne * 13) % 70);
      for (let dx = 0; dx < longueur; dx++) {
        const xx = x + dx;
        const yc = Math.round(y0 + xx * pente);
        for (let dy = -6; dy <= 6; dy++) {
          const y = yc + dy;
          if (y >= 0 && y < hauteur) pixels[y * largeur + xx] = 20;
        }
      }
    }
  }
  return { largeur, hauteur, pixels };
}

describe('dimensionsReduites', () => {
  it('ramène le côté long à 1600 px, proportions gardées', () => {
    expect(dimensionsReduites(4000, 3000)).toEqual({ largeur: 1600, hauteur: 1200 });
    expect(dimensionsReduites(3000, 4000)).toEqual({ largeur: 1200, hauteur: 1600 });
  });

  it("n'agrandit jamais une petite image", () => {
    expect(dimensionsReduites(900, 615)).toEqual({ largeur: 900, hauteur: 615 });
  });
});

describe('etapesReduction', () => {
  it('divise par deux au plus à chaque étape, et finit aux dimensions voulues', () => {
    const etapes = etapesReduction(4000, 2735);
    expect(etapes.at(-1)).toEqual(dimensionsReduites(4000, 2735));
    let precedente = 4000;
    for (const etape of etapes) {
      expect(precedente / etape.largeur).toBeLessThanOrEqual(2);
      precedente = etape.largeur;
    }
    expect(etapes).toHaveLength(2);
  });

  it('une seule étape pour 2400 px, aucune pour une image déjà petite', () => {
    expect(etapesReduction(2400, 1773)).toEqual([{ largeur: 1600, hauteur: 1182 }]);
    expect(etapesReduction(1600, 1094)).toEqual([]);
  });
});

describe('versGris', () => {
  it('applique la luminance et compte la transparence pour du blanc', () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0]);
    const { pixels } = versGris(rgba, 2, 2);
    expect(pixels[0]).toBeGreaterThanOrEqual(254);
    expect(pixels[1]).toBe(0);
    expect(pixels[2]).toBeGreaterThan(70);
    expect(pixels[2]).toBeLessThan(80);
    expect(pixels[3]).toBeGreaterThanOrEqual(254);
  });
});

describe('estimerAngle et redresser', () => {
  it.each([0, 3, -6, 2.5, 10])('retrouve une inclinaison de %s° au demi-degré près', (angle) => {
    expect(Math.abs(estimerAngle(fausseCarte(angle)) - angle)).toBeLessThanOrEqual(0.5);
  });

  it('rend 0 sur une image sans contours', () => {
    const blanche = { largeur: 800, hauteur: 500, pixels: new Uint8Array(800 * 500).fill(240) };
    expect(estimerAngle(blanche)).toBe(0);
  });

  it('une image redressée ne penche plus, et rien n’est coupé', () => {
    const penchee = fausseCarte(-6);
    const droite = redresser(penchee, estimerAngle(penchee));
    expect(Math.abs(estimerAngle(droite))).toBeLessThanOrEqual(0.5);
    expect(droite.largeur).toBeGreaterThan(penchee.largeur);
    expect(droite.hauteur).toBeGreaterThan(penchee.hauteur);
    // Coin découvert par la rotation : blanc, le fond que Tesseract attend.
    expect(droite.pixels[0]).toBe(255);
  });

  it('angle nul : même image, sans copie', () => {
    const image = fausseCarte(0, 300, 200);
    expect(redresser(image, 0)).toBe(image);
  });
});

describe('etirerContraste', () => {
  it('étire les valeurs entre le 1er et le 99e centile', () => {
    const pixels = new Uint8Array(1000);
    for (let i = 0; i < 1000; i++) pixels[i] = 100 + Math.floor((i / 1000) * 50);
    const image = { largeur: 100, hauteur: 10, pixels };
    etirerContraste(image);
    expect(Math.min(...pixels)).toBe(0);
    expect(Math.max(...pixels)).toBe(255);
  });

  it('laisse une image presque uniforme telle quelle', () => {
    const pixels = new Uint8Array(400).map((_, i) => 120 + (i % 5));
    const avant = pixels.slice();
    etirerContraste({ largeur: 20, hauteur: 20, pixels });
    expect(pixels).toEqual(avant);
  });
});

describe('accentuer', () => {
  it("ne change pas une image uniforme et renforce un bord, sans toucher à l'original", () => {
    const uniforme = { largeur: 10, hauteur: 10, pixels: new Uint8Array(100).fill(128) };
    expect(accentuer(uniforme).pixels).toEqual(uniforme.pixels);

    const pixels = new Uint8Array(100).fill(200);
    for (let y = 0; y < 10; y++) for (let x = 5; x < 10; x++) pixels[y * 10 + x] = 50;
    const avant = pixels.slice();
    const nette = accentuer({ largeur: 10, hauteur: 10, pixels });
    expect(nette.pixels[4 * 10 + 4]).toBeGreaterThan(200);
    expect(nette.pixels[4 * 10 + 5]).toBeLessThan(50);
    expect(pixels).toEqual(avant);
  });
});

describe('recadrer, bandeBasse, tourner180, enPgm', () => {
  const image = { largeur: 4, hauteur: 10, pixels: Uint8Array.from({ length: 40 }, (_, i) => i) };

  it('découpe une tranche bornée à l’image', () => {
    const bande = recadrer(image, 2, 5);
    expect(bande).toMatchObject({ largeur: 4, hauteur: 3 });
    expect(Array.from(bande.pixels.slice(0, 4))).toEqual([8, 9, 10, 11]);
    expect(recadrer(image, -20, 99).hauteur).toBe(10);
  });

  it('la bande basse couvre les 40 % du bas', () => {
    const bande = bandeBasse(image);
    expect(bande.hauteur).toBe(Math.round(10 * PART_BANDE_BASSE));
    expect(bande.pixels.at(-1)).toBe(39);
  });

  it('demi-tour : dernier pixel en premier, source intacte, deux demi-tours pour rien', () => {
    const retournee = tourner180(image);
    expect(retournee).toMatchObject({ largeur: 4, hauteur: 10 });
    // Coin haut gauche ← coin bas droit ; rangée du haut ← rangée du bas, à l'envers.
    expect(Array.from(retournee.pixels.slice(0, 4))).toEqual([39, 38, 37, 36]);
    expect(image.pixels[0]).toBe(0);
    expect(tourner180(retournee).pixels).toEqual(image.pixels);
    // Le bas de l'image retournée, c'est le haut de l'image, tête en bas.
    expect(Array.from(bandeBasse(retournee).pixels.slice(-4))).toEqual([3, 2, 1, 0]);
  });

  it('PGM binaire : en-tête P5 puis les pixels bruts', () => {
    const pgm = enPgm(image);
    const entete = 'P5\n4 10\n255\n';
    expect(new TextDecoder().decode(pgm.slice(0, entete.length))).toBe(entete);
    expect(pgm.length).toBe(entete.length + 40);
    expect(pgm.at(-1)).toBe(39);
  });
});
