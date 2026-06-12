import { useState } from 'react';
import { COMMUNES, type LatLng } from '../data/communes';
import { haversine } from '../lib/matching';

interface GeoFieldProps {
  commune: string;
  setCommune: (commune: string) => void;
  setCoords: (coords: LatLng | null) => void;
}

type EtatGeolocalisation = 'idle' | 'loading' | 'ok' | 'err';

/** Champ de sélection de commune, avec détection optionnelle de la position. */
export function GeoField({ commune, setCommune, setCoords }: GeoFieldProps) {
  const [etat, setEtat] = useState<EtatGeolocalisation>('idle');

  const localiser = () => {
    if (!navigator.geolocation) {
      setEtat('err');
      return;
    }
    setEtat('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let meilleureCommune: string | null = null;
        let meilleureDistance = Infinity;
        Object.entries(COMMUNES).forEach(([nomCommune, [lat, lng]]) => {
          const distance = haversine(latitude, longitude, lat, lng);
          if (distance < meilleureDistance) {
            meilleureDistance = distance;
            meilleureCommune = nomCommune;
          }
        });
        setCoords([latitude, longitude]);
        if (meilleureCommune) setCommune(meilleureCommune);
        setEtat('ok');
      },
      () => setEtat('err'),
      { timeout: 8000 },
    );
  };

  return (
    <div className="field">
      <label>Commune / Zone</label>
      <div className="row2">
        <select
          value={commune}
          onChange={(e) => {
            const valeur = e.target.value;
            setCommune(valeur);
            setCoords(valeur ? COMMUNES[valeur] : null);
          }}
        >
          <option value="">— Choisir —</option>
          {Object.keys(COMMUNES).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-outline" onClick={localiser} style={{ justifyContent: 'center' }}>
          {etat === 'loading' ? '📡 …' : '📍 Ma position'}
        </button>
      </div>
      {etat === 'ok' && (
        <div className="geo-box" style={{ marginTop: 10 }}>
          ✓ Position détectée — commune la plus proche : <b style={{ marginLeft: 4 }}>{commune}</b>
        </div>
      )}
      {etat === 'err' && (
        <div className="hint" style={{ color: 'var(--color-red)' }}>
          Position indisponible — choisis ta commune manuellement.
        </div>
      )}
    </div>
  );
}
