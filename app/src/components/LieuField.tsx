import { useEffect, useState } from 'react';
import { COMMUNES, type LatLng } from '@partage/communes';
import { haversine } from '@partage/matching';
import { resoudreCommune } from '@partage/lieux';
import { IconeCarte, IconeValide } from './Icones';

interface LieuFieldProps {
  /** Ce que la personne écrit : « Niangon Sud à Gauche », « carrefour Gesco ». */
  lieu: string;
  setLieu: (lieu: string) => void;
  /** Commune déduite du texte, ou choisie à la main en dernier recours. */
  commune: string;
  setCommune: (commune: string) => void;
  setCoords: (coords: LatLng | null) => void;
  label: string;
  aide?: string;
  erreur?: string;
}

type Etat = 'repos' | 'chargement' | 'ok' | 'erreur';

/** Longueur retenue par l'API pour ce champ (`quartier`, varchar 150). */
const MAX = 150;

/**
 * Lieu écrit librement, commune déduite.
 *
 * Une liste de communes demandait à quelqu'un qui pense « Gesco » de traduire
 * en « Yopougon » — une commune d'un million d'habitants, qui ne dit presque
 * rien à celui qui cherche sa pièce. On demande donc l'endroit tel qu'on le
 * nomme, et la commune se déduit (voir `shared/lieux.ts`).
 *
 * La déduction est toujours montrée, avec de quoi la corriger. Ce n'est pas
 * une politesse : elle tolère les fautes de frappe, donc elle se trompe
 * parfois — « Kouassi » est à une lettre de « Koumassi ». Un rapprochement
 * silencieux enverrait la pièce sur la mauvaise page de registre sans que
 * personne ne puisse s'en apercevoir.
 */
export function LieuField({
  lieu,
  setLieu,
  commune,
  setCommune,
  setCoords,
  label,
  aide,
  erreur,
}: LieuFieldProps) {
  const [etat, setEtat] = useState<Etat>('repos');
  const [corrigeAMain, setCorrigeAMain] = useState(false);
  /**
   * La liste de secours n'apparaît qu'une fois le champ quitté.
   *
   * Pendant la frappe, elle surgirait à « Nia » pour disparaître à
   * « Niangon » — un clignotement sous les doigts. Et rien ne l'annonce : la
   * liste porte déjà « — Choisir la commune — », dire en plus qu'on n'a pas
   * reconnu ne renseigne personne et sonne comme un reproche.
   */
  const [quitte, setQuitte] = useState(false);

  // Tant que la personne n'a pas repris la main, la commune suit le texte.
  useEffect(() => {
    if (corrigeAMain || etat === 'ok') return;
    const { commune: deduite } = resoudreCommune(lieu);
    setCommune(deduite ?? '');
    setCoords(deduite ? COMMUNES[deduite] : null);
  }, [lieu, corrigeAMain, etat, setCommune, setCoords]);

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

  const choisirCommune = (valeur: string) => {
    setCorrigeAMain(true);
    setEtat('repos');
    setCommune(valeur);
    setCoords(valeur ? COMMUNES[valeur] : null);
  };

  const listeCommunes = (
    <select
      id="commune"
      value={commune}
      aria-label="Commune"
      onChange={(e) => choisirCommune(e.target.value)}
    >
      <option value="">— Choisir la commune —</option>
      {Object.keys(COMMUNES).map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );

  return (
    <div className="champ">
      <label htmlFor="lieu">{label}</label>
      <div className="duo">
        <input
          id="lieu"
          value={lieu}
          maxLength={MAX}
          autoComplete="off"
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? 'lieu-erreur' : 'lieu-aide'}
          onChange={(e) => {
            setLieu(e.target.value);
            setCorrigeAMain(false);
            setQuitte(false);
            setEtat('repos');
          }}
          onBlur={() => setQuitte(true)}
          placeholder="Niangon Sud à Gauche, près de la pharmacie"
        />
        <button type="button" className="btn" onClick={localiser} disabled={etat === 'chargement'}>
          <IconeCarte taille={15} />
          {etat === 'chargement' ? 'Localisation…' : 'Je suis sur place'}
        </button>
      </div>

      {erreur && (
        <p className="erreur" id="lieu-erreur">
          {erreur}
        </p>
      )}

      {/* Ce qui a été compris, toujours visible et toujours corrigeable. */}
      {commune && (
        <p className="constat">
          <IconeValide taille={14} />
          Commune&nbsp;: <b>{commune}</b>
          {etat === 'ok' && ' (relevée par ta position)'}
          <button
            type="button"
            className="lien"
            style={{ marginLeft: 'var(--s-2)' }}
            onClick={() => choisirCommune('')}
          >
            Changer
          </button>
        </p>
      )}

      {/* Rien de reconnu : la liste, sans commentaire. Elle se montre une fois
          le champ quitté, ou dès qu'une soumission l'a réclamée. */}
      {!commune && lieu.trim().length > 0 && (quitte || Boolean(erreur)) && (
        <div style={{ marginTop: 'var(--s-2)' }}>{listeCommunes}</div>
      )}

      {etat === 'erreur' && (
        <p className="erreur" role="alert">
          Position indisponible. Écris l’endroit à la main, le résultat sera le même.
        </p>
      )}

      {aide && !erreur && (
        <p className="aide" id="lieu-aide">
          {aide}
        </p>
      )}
    </div>
  );
}
