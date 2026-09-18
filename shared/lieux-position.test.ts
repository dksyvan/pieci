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

  it('couvre les villes de l’intérieur, et pas seulement Abidjan', () => {
    // Ces deux-là n'étaient rattachées à rien tant que la table ne comptait
    // que seize points : Man se voyait attribuer Daloa, à 135 km.
    expect(communeLaPlusProche(7.412, -7.554)?.commune).toBe('Man');
    expect(communeLaPlusProche(6.134, -5.951)?.commune).toBe('Gagnoa');
  });

  it('ne rattache rien depuis un lieu que la table ne couvre pas', () => {
    // Plein océan, à 150 km au sud d'Abidjan.
    expect(communeLaPlusProche(4.0, -4.0)).toBeNull();
  });

  it('ne rattache rien depuis un autre pays', () => {
    // Accra, Ghana.
    expect(communeLaPlusProche(5.603, -0.187)).toBeNull();
    // Paris.
    expect(communeLaPlusProche(48.857, 2.352)).toBeNull();
  });

  it('reconnaît les grandes villes quand on y est vraiment', () => {
    expect(communeLaPlusProche(7.69, -5.03)?.commune).toBe('Bouaké');
    expect(communeLaPlusProche(9.458, -5.629)?.commune).toBe('Korhogo');
    expect(communeLaPlusProche(4.748, -6.636)?.commune).toBe('San-Pédro');
  });

  it('tient le rayon annoncé, ni plus ni moins', () => {
    // Au large de Grand-Lahou, à une quinzaine de kilomètres de la côte : la
    // ville reste la plus proche, et elle est dans le rayon.
    const proche = communeLaPlusProche(5.12, -5.0);
    expect(proche?.commune).toBe('Grand-Lahou');
    expect(proche?.distanceKm).toBeLessThan(RAYON_COMMUNE_KM);

    // Deux fois plus loin en mer, plus rien : une position hors de portée ne
    // vaut pas une commune, même s'il en existe toujours une « la plus proche ».
    expect(communeLaPlusProche(4.95, -5.0)).toBeNull();
  });

  it('accepte un rayon donné, pour les cas où l’on sait ce qu’on cherche', () => {
    expect(communeLaPlusProche(4.95, -5.0, 100)?.commune).toBe('Grand-Lahou');
    expect(communeLaPlusProche(5.3465, -4.0655, 1)?.commune).toBe('Yopougon');
  });

  /**
   * L'extension à tout le pays ne doit pas déplacer ce qui marchait : les
   * relevés d'Abidjan tombent toujours sur la commune, jamais sur une ville
   * voisine devenue plus proche du centroïde.
   */
  it('ne se laisse pas voler Abidjan par les villes alentour', () => {
    expect(communeLaPlusProche(5.345, -4.071)?.commune).toBe('Yopougon');
    expect(communeLaPlusProche(5.345, -3.978)?.commune).toBe('Cocody');
    expect(communeLaPlusProche(5.42, -4.02)?.commune).toBe('Abobo');
    expect(communeLaPlusProche(5.255, -3.93)?.commune).toBe('Port-Bouët');
  });
});
