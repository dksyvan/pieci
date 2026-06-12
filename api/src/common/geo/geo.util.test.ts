import { describe, expect, it } from 'vitest';
import { toGeoJsonPoint } from './geo.util';

describe('toGeoJsonPoint', () => {
  it('formate lat/lng en GeoJSON Point (coordinates: [lng, lat])', () => {
    expect(toGeoJsonPoint({ lat: 5.345, lng: -3.978 })).toEqual({
      type: 'Point',
      coordinates: [-3.978, 5.345],
    });
  });
});
