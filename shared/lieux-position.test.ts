import { describe, expect, it } from 'vitest';
import { RAYON_COMMUNE_KM, communeLaPlusProche } from './lieux';

/**
 * Le bouton « Je suis sur place » prenait la commune la plus proche, quelle
 * que soit la distance. Ces tests tiennent la correction : une position hors
 * de portée ne vaut pas une commune.
 *
 * Les coordonnées citées sont des points publics de villes ivoiriennes, pas
 * des positions de personnes.
 */
describe('communeLaPlusProche', () => {
  it('rend la commune sous laquelle on se tient', () => {
    // Quelque part dans Yopougon, à moins d'un kilomètre de son centre.
    const trouve = communeLaPlusProche(5.3465, -4.0655);

    expect(trouve?.commune).toBe('Yopougon');
    expect(trouve?.distanceKm).toBeLessThan(1);
  });

  it('distingue deux communes d’Abidjan voisines', () => {
    expect(communeLaPlusProche(5.3, -3.983)?.commune).toBe('Marcory');
    expect(communeLaPlusProche(5.3, -3.948)?.commune).toBe('Koumassi');
  });

  it('ne rattache rien depuis une ville absente de la liste', () => {
    // Man : environ 200 km de Daloa, la plus proche des seize.
    expect(communeLaPlusProche(7.412, -7.554)).toBeNull();

    // Gagnoa : une centaine de kilomètres de Daloa, toujours trop loin.
    expect(communeLaPlusProche(6.134, -5.951)).toBeNull();
  });

  it('ne rattache rien depuis un autre pays', () => {
    // Accra, Ghana.
    expect(communeLaPlusProche(5.603, -0.187)).toBeNull();
    // Paris.
    expect(communeLaPlusProche(48.857, 2.352)).toBeNull();
  });

  it('reconnaît les villes de l’intérieur quand on y est vraiment', () => {
    expect(communeLaPlusProche(7.69, -5.03)?.commune).toBe('Bouaké');
    expect(communeLaPlusProche(9.458, -5.629)?.commune).toBe('Korhogo');
    expect(communeLaPlusProche(4.748, -6.636)?.commune).toBe('San-Pédro');
  });

  it('tient le rayon annoncé, ni plus ni moins', () => {
    // Un point à ~0,18° au nord de Bouaké, soit une vingtaine de kilomètres.
    const proche = communeLaPlusProche(7.69 + 0.18, -5.03);
    expect(proche?.commune).toBe('Bouaké');
    expect(proche?.distanceKm).toBeLessThan(RAYON_COMMUNE_KM);

    // À 0,3°, soit une trentaine de kilomètres, on ne dit plus rien.
    expect(communeLaPlusProche(7.69 + 0.3, -5.03)).toBeNull();
  });

  it('accepte un rayon donné, pour les cas où l’on sait ce qu’on cherche', () => {
    expect(communeLaPlusProche(7.412, -7.554, 250)?.commune).toBe('Daloa');
    expect(communeLaPlusProche(5.3465, -4.0655, 1)?.commune).toBe('Yopougon');
  });
});
