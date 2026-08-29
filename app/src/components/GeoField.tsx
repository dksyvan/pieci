import { useState } from 'react';
import { COMMUNES, type LatLng } from '@partage/communes';
import { haversine } from '@partage/matching';
import { IconeCarte, IconeValide } from './Icones';

interface GeoFieldProps {
  commune: string;
  setCommune: (commune: string) => void;
  setCoords: (coords: LatLng | null) => void;
  /**
   * Ce que le lieu désigne. Obligatoire, et sans valeur par défaut : le
   * composant sert deux pages où la même liste de communes répond à deux
   * questions opposées — où la pièce a été trouvée, ou bien où elle a été
   * perdue. Un libellé neutre comme « Commune ou ville » laissait le lecteur
   * deviner, et il devinait mal : lieu de naissance ? domicile ?
   */
  label: string;
  /** Précision sous le champ, pour lever le reste de l'ambiguïté. */
  aide?: string;
  /** Message de champ requis, affiché par le parent à la soumission. */
  erreur?: string;
}

type Etat = 'repos' | 'chargement' | 'ok' | 'erreur';

/** Sélection de la commune, avec relevé optionnel de la position. */
export function GeoField({ commune, setCommune, setCoords, label, aide, erreur }: GeoFieldProps) {
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
      <label htmlFor="commune">{label}</label>
      <div className="duo">
        <select
          id="commune"
          value={commune}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? 'commune-erreur' : 'commune-aide'}
          onChange={(e) => {
            const valeur = e.target.value;
            setCommune(valeur);
            setCoords(valeur ? COMMUNES[valeur] : null);
            setEtat('repos');
          }}
        >
          <option value="">— Choisir la commune —</option>
          {Object.keys(COMMUNES).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {/*
          « Je suis sur place » plutôt que « Ma position ». Le GPS ne connaît
          que l'endroit où l'on se tient maintenant : quelqu'un qui a ramassé
          une pièce le matin et la déclare le soir chez lui obtenait sa propre
          commune, à l'endroit précis où on lui demandait celle de la
          trouvaille. Le libellé fait maintenant le tri à sa place.
        */}
        <button type="button" className="btn" onClick={localiser} disabled={etat === 'chargement'}>
          <IconeCarte taille={15} />
          {etat === 'chargement' ? 'Localisation…' : 'Je suis sur place'}
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
          Position indisponible. Choisis la commune dans la liste, le résultat sera le même.
        </p>
      )}
      {erreur && (
        <p className="erreur" id="commune-erreur">
          {erreur}
        </p>
      )}
      {aide && !erreur && (
        <p className="aide" id="commune-aide">
          {aide}
        </p>
      )}
    </div>
  );
}
