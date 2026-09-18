import { useEffect, useState } from 'react';
import { COMMUNES, type LatLng } from '@partage/communes';
import { communeLaPlusProche, resoudreCommune } from '@partage/lieux';
import type { ReperesAutour } from '@partage/api-types';
import { getReperes } from '../lib/api';
import { libelle, memeLieu } from '../lib/repere';
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

type Etat = 'repos' | 'chargement' | 'ok' | 'erreur' | 'refus';

/** Longueur retenue par l'API pour ce champ (`quartier`, varchar 150). */
const MAX = 150;

/**
 * Précision au-delà de laquelle on ne propose plus de repère.
 *
 * Le téléphone rend toujours une position, mais pas toujours celle du GPS :
 * faute de satellites, il répond avec l'antenne relais ou la borne Wi-Fi, et
 * annonce alors une marge de plusieurs kilomètres. Proposer « la pharmacie »
 * sur un relevé pareil, c'est envoyer quelqu'un chercher au mauvais carrefour.
 * Passé ce seuil on garde la commune, qui reste juste, et on se tait sur le
 * reste.
 */
const PRECISION_MAX_M = 1500;

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
  const [autour, setAutour] = useState<ReperesAutour>({ reperes: [], quartier: null });
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

  /**
   * Relève la position, en déduit la commune, puis demande les lieux nommés.
   *
   * Trois choses à savoir sur ce qui se passe ici :
   *
   * - `enableHighAccuracy` allume le GPS. Sans lui, le navigateur a le droit
   *   de répondre avec l'antenne relais — plusieurs centaines de mètres, et
   *   aucun repère ne veut plus rien dire ;
   * - la commune n'est retenue que si elle est vraiment sous les pieds (voir
   *   `communeLaPlusProche`). Prendre « la plus proche » sans regarder la
   *   distance envoyait quelqu'un de Man sur Daloa, à deux cents kilomètres ;
   * - les repères ne remplissent rien tout seuls. Ils se proposent, et c'est
   *   la personne qui touche : le lieu le plus proche n'est pas toujours celui
   *   qui parle aux gens du coin, et elle seule le sait.
   */
  const localiser = () => {
    if (!navigator.geolocation) {
      setEtat('erreur');
      return;
    }
    setEtat('chargement');
    setAutour({ reperes: [], quartier: null });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        setCoords([latitude, longitude]);
        setCommune(communeLaPlusProche(latitude, longitude)?.commune ?? '');
        setCorrigeAMain(false);
        setEtat('ok');

        if (accuracy > PRECISION_MAX_M) return;
        void getReperes(latitude, longitude).then(setAutour);
      },
      (err) => setEtat(err.code === err.PERMISSION_DENIED ? 'refus' : 'erreur'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  /**
   * Ce qu'on propose de taper du doigt.
   *
   * Le libellé s'arrête au quartier : la commune a sa propre ligne juste en
   * dessous, et l'écrire deux fois ferait passer une aide pour du remplissage.
   * Quand la carte ne connaît aucun lieu nommé — c'est fréquent, la couverture
   * d'Abidjan est très inégale — il reste le quartier seul, et sinon rien du
   * tout : le champ libre a toujours été là, il suffit.
   */
  const quartierUtile =
    autour.quartier && !memeLieu(autour.quartier, commune) ? autour.quartier : null;

  const propositions: Array<{ texte: string; metres: number | null }> = autour.reperes.length
    ? autour.reperes.map((r) => ({
        texte: libelle(r.nom, autour.quartier, commune),
        metres: r.distance,
      }))
    : quartierUtile
      ? [{ texte: quartierUtile, metres: null }]
      : [];

  const choisirCommune = (valeur: string) => {
    setCorrigeAMain(true);
    setEtat('repos');
    setAutour({ reperes: [], quartier: null });
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
            // On ne retombe pas en 'repos' après un relevé réussi : c'est cet
            // état qui protège la position exacte. Sans ça, ajouter « près de
            // la pharmacie » derrière un repère ramenait les coordonnées au
            // centre de la commune — et le rapprochement perdait les mètres
            // qu'on venait de gagner.
            if (etat !== 'ok') setEtat('repos');
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

      {propositions.length > 0 && (
        <div className="reperes">
          <p className="reperes-intro">Un de ces endroits&nbsp;? Touche pour l’écrire.</p>
          <div className="reperes-liste">
            {propositions.map((p) => (
              <button
                key={p.texte}
                type="button"
                className="repere"
                onClick={() => setLieu(p.texte.slice(0, MAX))}
              >
                {p.texte}
                {p.metres !== null && <span className="repere-loin">{p.metres} m</span>}
              </button>
            ))}
          </div>
        </div>
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

      {/* Refuser n'est pas une panne : la phrase ne doit pas sonner comme un
          reproche, et surtout ne pas laisser croire que la déclaration est
          bloquée. Elle ne l'est pas. */}
      {etat === 'refus' && (
        <p className="erreur" role="alert">
          Tu as refusé la position, c’est ton droit. Écris l’endroit à la main, le résultat sera
          le même.
        </p>
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
