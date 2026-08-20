/** Coordonnées [latitude, longitude] d'une commune ou ville. */
export type LatLng = [number, number];

/**
 * Centroïdes approximatifs des communes/villes couvertes par Pièci.
 * Utilisés comme position par défaut et pour la détection de la commune
 * la plus proche dans {@link GeoField}.
 */
export const COMMUNES: Record<string, LatLng> = {
  Cocody: [5.345, -3.978],
  Yopougon: [5.345, -4.071],
  Abobo: [5.420, -4.020],
  Plateau: [5.323, -4.022],
  Treichville: [5.293, -4.005],
  Marcory: [5.300, -3.983],
  Koumassi: [5.300, -3.948],
  Adjamé: [5.360, -4.022],
  'Port-Bouët': [5.255, -3.930],
  Attécoubé: [5.340, -4.040],
  Bingerville: [5.355, -3.900],
  Bouaké: [7.690, -5.030],
  Yamoussoukro: [6.820, -5.276],
  'San-Pédro': [4.748, -6.636],
  Daloa: [6.877, -6.450],
  Korhogo: [9.458, -5.629],
};
