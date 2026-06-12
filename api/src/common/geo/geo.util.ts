export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

/**
 * Représentation GeoJSON d'un point WGS84, pour une colonne
 * `geography(Point,4326)`. TypeORM sérialise cet objet et l'enveloppe avec
 * `ST_GeomFromGeoJSON(...)` lors de l'INSERT/UPDATE — passer une chaîne EWKT
 * ici produirait une erreur Postgres "unknown GeoJSON type".
 *
 * Attention à l'ordre : GeoJSON est `coordinates: [lng, lat]`.
 */
export function toGeoJsonPoint({ lat, lng }: LatLng): GeoJsonPoint {
  return { type: 'Point', coordinates: [lng, lat] };
}
