import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import {
  diagnosticDemande,
  ecouterDiagnostic,
  type ExtractionDiagnostic,
  type RapportDiagnostic,
} from '../lib/lecture/diagnostic';

/**
 * Mode diagnostic de la lecture — VERSION D'ESSAI SEULEMENT.
 *
 * Affiché sous le formulaire de /declarer quand la version a été construite
 * avec `VITE_DIAGNOSTIC_LECTURE=1` ET que l'adresse contient `?diagnostic`.
 * Dans un build normal, Declarer.tsx ne le rend jamais et il n'est pas
 * empaqueté (voir lib/lecture/diagnostic.ts).
 *
 * Ce qui est montré : pour chaque passe de la dernière lecture, les lignes lues
 * (mots porteurs de chiffres et bande à chevrons remplacés par « • »), sa
 * durée, et ce que l'extracteur en a tiré. Le rapport vit dans l'état de ce
 * composant, et nulle part ailleurs : pas de réseau, pas de stockage, pas de
 * console ; il disparaît avec la page.
 *
 * `translate="no"` : sans lui, la traduction automatique de la page (Chrome,
 * Safari, téléphone réglé dans une autre langue) enverrait les lignes lues au
 * service de traduction (relevé en revue).
 */

const abonnementVide = () => () => {};
/** Au pré-rendu et à l'hydratation, rien : le mode ne dépend que de l'adresse, lue dans le navigateur. */
const serveur = () => false;

const BLOC: CSSProperties = {
  marginTop: 'var(--s-4, 20px)',
  padding: 'var(--s-3, 14px)',
  border: '2px dashed currentColor',
  borderRadius: 8,
};
const BANDEAU: CSSProperties = { fontWeight: 700, margin: 0 };
const LIGNES: CSSProperties = {
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 13,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  margin: '6px 0',
  padding: 8,
  background: 'rgba(127, 127, 127, 0.12)',
  borderRadius: 4,
};

/** « 1,2 s » ou « 850 ms ». */
function duree(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} s` : `${ms} ms`;
}

function Extraction({ valeur }: { valeur: ExtractionDiagnostic | null }) {
  if (!valeur) return <p style={{ margin: 0 }}>Extracteur : rien</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      <li>Type : {valeur.typePiece ?? 'rien'}</li>
      <li>Nom : {valeur.nom ?? 'rien'}</li>
      <li>Prénoms : {valeur.prenom ?? 'rien'}</li>
      <li>Découpage : {valeur.decoupage ?? 'rien'}</li>
    </ul>
  );
}

export function DiagnosticLecture() {
  const actif = useSyncExternalStore(abonnementVide, diagnosticDemande, serveur);
  const [rapport, setRapport] = useState<RapportDiagnostic | null>(null);

  // Abonnement aux lectures : le rapport arrive par un rappel, jamais par un
  // état partagé. Chaque nouvelle lecture remplace (et réaffiche) la précédente.
  useEffect(() => (actif ? ecouterDiagnostic(setRapport) : undefined), [actif]);

  if (!actif || !rapport) return null;

  const resultat = rapport.resultat;
  return (
    <section style={BLOC} aria-label="Mode diagnostic de la lecture" translate="no" className="notranslate">
      <p style={BANDEAU} role="note">
        Mode diagnostic — ce texte reste sur ton téléphone, rien n’est envoyé ni gardé.
      </p>
      <p className="aide" style={{ margin: '6px 0' }}>
        Les mots qui contiennent un chiffre, et les lignes de la bande à chevrons, sont remplacés par « • ».{' '}
        Durée totale : {duree(rapport.dureeMs)}. {rapport.estDosDeCarte ? 'Lecture : dos de carte.' : ''}
      </p>
      <button type="button" className="btn" onClick={() => setRapport(null)}>
        Masquer le diagnostic
      </button>

      <h4 style={{ marginBottom: 4 }}>Résultat rendu au formulaire</h4>
      {resultat === 'impossible' ? (
        <p style={{ margin: 0 }}>Lecture impossible</p>
      ) : resultat === 'annulee' ? (
        <p style={{ margin: 0 }}>Lecture coupée avant la fin (délai dépassé) : voici les passes déjà faites.</p>
      ) : (
        <Extraction valeur={resultat} />
      )}

      {rapport.passes.length === 0 && <p>Aucune passe n’a lu de texte.</p>}
      {rapport.passes.map((passe, i) => (
        <div key={i} style={{ marginTop: 'var(--s-3, 14px)' }}>
          <h4 style={{ margin: '0 0 4px' }}>
            {i + 1}. {passe.etiquette}
            {passe.sautee ? ' — sautée : pas assez de temps avant le plafond de 25 s' : ` — ${duree(passe.dureeMs)}`}
            {passe.interrompue ? ' — interrompue' : ''}
          </h4>
          {!passe.sautee && (
            <>
              <pre style={LIGNES}>{passe.lignes.length ? passe.lignes.join('\n') : '(aucune ligne lue)'}</pre>
              <Extraction valeur={passe.extraction} />
            </>
          )}
        </div>
      ))}
    </section>
  );
}
