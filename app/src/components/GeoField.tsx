import { useState } from 'react';
import { COMMUNES, type LatLng } from '../data/communes';
import { haversine } from '../lib/matching';
import { IconeCarte, IconeValide } from './Icones';

interface GeoFieldProps {
  commune: string;
  setCommune: (commune: string) => void;
  setCoords: (coords: LatLng | null) => void;
}

type Etat = 'repos' | 'chargement' | 'ok' | 'erreur';

/** Sélection de la commune, avec détection optionnelle de la position. */
export function GeoField({ commune, setCommune, setCoords }: GeoFieldProps) {
  const [etat, setEtat] = useState<Etat>('repos');

  const localiser = () => {
    if (!navigator.geolocation) {
      setEtat('erreur');
      return;
    }
    setEtat('chargement');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let plusProche: string | null = null;
        let distanceMin = Infinity;
        Object.entries(COMMUNES).forEach(([nom, [lat, lng]]) => {
          const d = haversine(latitude, longitude, lat, lng);
          if (d < distanceMin) {
            distanceMin = d;
            plusProche = nom;
          }
        });
        setCoords([latitude, longitude]);
        if (plusProche) setCommune(plusProche);
        setEtat('ok');
      },
      () => setEtat('erreur'),
      { timeout: 8000 },
    );
  };

  return (
    <div className="champ">
      <label htmlFor="commune">Commune ou ville</label>
      <div className="duo">
        <select
          id="commune"
          value={commune}
          onChange={(e) => {
            const valeur = e.target.value;
            setCommune(valeur);
            setCoords(valeur ? COMMUNES[valeur] : null);
            setEtat('repos');
          }}
        >
          <option value="">— Choisir —</option>
          {Object.keys(COMMUNES).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          onClick={localiser}
          disabled={etat === 'chargement'}
        >
          <IconeCarte taille={15} />
          {etat === 'chargement' ? 'Localisation…' : 'Ma position'}
        </button>
      </div>

      {etat === 'ok' && commune && (
        <p className="constat">
          <IconeValide taille={14} />
          Position relevée — commune la plus proche&nbsp;: <b>{commune}</b>
        </p>
      )}
      {etat === 'erreur' && (
        <p className="erreur" role="alert">
          Position indisponible. Choisis ta commune dans la liste, le résultat sera le même.
        </p>
      )}
    </div>
  );
}
