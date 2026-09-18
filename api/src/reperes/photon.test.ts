import { describe, expect, it } from 'vitest';
import { REPERES_MAX, classerReperes, estUnCode } from './photon';

/**
 * Le point de référence de tous ces tests : un carrefour quelconque de
 * Yopougon. Les lieux cités sont inventés — aucun commerce réel n'est nommé.
 */
const LAT = 5.3465;
const LNG = -4.0655;

/** Décalage approximatif en degrés pour une distance donnée, à cette latitude. */
function aMetres(metres: number): [number, number] {
  return [LNG, LAT + metres / 111_320];
}

function trait(
  nom: string,
  metres: number,
  osm_key = 'amenity',
  osm_value = 'restaurant',
  district?: string,
) {
  return {
    geometry: { coordinates: aMetres(metres) as [number, number] },
    properties: { name: nom, osm_key, osm_value, district },
  };
}

describe('estUnCode', () => {
  it('reconnaît une référence cadastrale', () => {
    expect(estUnCode('L120')).toBe(true);
    expect(estUnCode('Rue L120')).toBe(true);
    expect(estUnCode('rue C17')).toBe(true);
    expect(estUnCode('Voie 4')).toBe(true);
    expect(estUnCode('Avenue 13')).toBe(true);
  });

  it('laisse passer un nom que quelqu’un prononcerait', () => {
    expect(estUnCode('Boulevard Latrille')).toBe(false);
    expect(estUnCode('Carrefour Timotel')).toBe(false);
    expect(estUnCode('Terminus 27')).toBe(false);
    expect(estUnCode('Zone 4')).toBe(false);
    expect(estUnCode('Rue du Commerce')).toBe(false);
  });
});

describe('classerReperes', () => {
  it('ne rend rien quand la carte ne connaît rien', () => {
    expect(classerReperes([], LAT, LNG)).toEqual({ reperes: [], quartier: null });
  });

  it('écarte ce qui est trop loin pour servir de repère', () => {
    const { reperes } = classerReperes(
      [trait('Pharmacie du Carrefour', 80), trait('Station Totale', 900)],
      LAT,
      LNG,
    );

    expect(reperes.map((r) => r.nom)).toEqual(['Pharmacie du Carrefour']);
  });

  it('met l’arrêt et le service devant la boutique', () => {
    const { reperes } = classerReperes(
      [
        trait('Chez Jovy', 30, 'shop', 'convenience'),
        trait('Pharmacie Sainte-Rita', 120, 'amenity', 'pharmacy'),
        trait('Terminus 27', 200, 'highway', 'bus_stop'),
      ],
      LAT,
      LNG,
    );

    // L'arrêt d'abord bien qu'il soit le plus loin : c'est ainsi qu'on donne
    // un rendez-vous ici.
    expect(reperes.map((r) => r.nom)).toEqual([
      'Terminus 27',
      'Pharmacie Sainte-Rita',
      'Chez Jovy',
    ]);
  });

  it('départage deux repères de même force par la distance', () => {
    const { reperes } = classerReperes(
      [
        trait('Pharmacie du Marché', 200, 'amenity', 'pharmacy'),
        trait('Pharmacie de la Paix', 40, 'amenity', 'pharmacy'),
      ],
      LAT,
      LNG,
    );

    expect(reperes.map((r) => r.nom)).toEqual(['Pharmacie de la Paix', 'Pharmacie du Marché']);
  });

  it('ne propose jamais un nom qui n’est qu’un matricule', () => {
    const { reperes } = classerReperes(
      [trait('Rue L120', 20, 'highway', 'residential'), trait('Marché de Gesco', 150, 'amenity', 'marketplace')],
      LAT,
      LNG,
    );

    expect(reperes.map((r) => r.nom)).toEqual(['Marché de Gesco']);
  });

  it('ne dit pas deux fois la même chose', () => {
    const { reperes } = classerReperes(
      [
        trait('Pharmacie Sainte-Rita', 40, 'amenity', 'pharmacy'),
        trait('PHARMACIE SAINTE-RITA', 60, 'amenity', 'pharmacy'),
        trait('Pharmacie Sainté-Rita', 90, 'amenity', 'pharmacy'),
      ],
      LAT,
      LNG,
    );

    expect(reperes).toHaveLength(1);
    expect(reperes[0]!.distance).toBe(40);
  });

  it('relève le quartier, même à plusieurs centaines de mètres', () => {
    const { quartier, reperes } = classerReperes(
      [trait('Niangon Sud', 700, 'place', 'neighbourhood'), trait('Chez Jovy', 30, 'shop', 'bakery')],
      LAT,
      LNG,
    );

    expect(quartier).toBe('Niangon Sud');
    // Le quartier ne se répète pas dans les propositions.
    expect(reperes.map((r) => r.nom)).toEqual(['Chez Jovy']);
  });

  it('retombe sur le district quand aucun quartier n’est cartographié', () => {
    const { quartier } = classerReperes(
      [trait('Chez Jovy', 30, 'shop', 'bakery', 'Niangon Sud')],
      LAT,
      LNG,
    );

    expect(quartier).toBe('Niangon Sud');
  });

  it('ne propose pas plus que ce qu’un pouce peut trier', () => {
    const traits = Array.from({ length: 12 }, (_, i) =>
      trait(`Boutique ${String.fromCharCode(65 + i)}`, 20 + i, 'shop', 'convenience'),
    );

    expect(classerReperes(traits, LAT, LNG).reperes).toHaveLength(REPERES_MAX);
  });

  it('donne la distance en mètres, arrondie', () => {
    const { reperes } = classerReperes([trait('Chez Jovy', 150)], LAT, LNG);

    expect(reperes[0]!.distance).toBeGreaterThan(140);
    expect(reperes[0]!.distance).toBeLessThan(160);
    expect(Number.isInteger(reperes[0]!.distance)).toBe(true);
  });

  it('ignore un trait sans nom ou sans coordonnées', () => {
    const { reperes } = classerReperes(
      [
        { geometry: { coordinates: aMetres(10) }, properties: { osm_key: 'shop' } },
        { properties: { name: 'Sans position', osm_key: 'shop' } },
        trait('Chez Jovy', 30, 'shop', 'bakery'),
      ],
      LAT,
      LNG,
    );

    expect(reperes.map((r) => r.nom)).toEqual(['Chez Jovy']);
  });
});
