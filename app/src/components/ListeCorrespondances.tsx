import { useState, type CSSProperties, type ReactNode } from 'react';
import { bandeConfiance } from '@partage/matching';
import { relDate } from '../lib/format';
import {
  ApiError,
  confirmerCorrespondance,
  obtenirContact,
  rejeterCorrespondance,
  type ContactInfo,
  type Correspondance,
} from '../lib/api';
import { useApp } from '../context/useApp';
import { PanneauDon } from './PanneauDon';
import { IconeFleche } from './Icones';

interface Props {
  resultats: Correspondance[];
  telephone: string;
  onChange: (maj: Correspondance) => void;
  messageVide?: ReactNode;
}

/** Affiche et gère une liste de correspondances (confirmer / rejeter / contact). */
export function ListeCorrespondances({ resultats, telephone, onChange, messageVide }: Props) {
  const { afficherToast } = useApp();
  const [contacts, setContacts] = useState<Record<string, ContactInfo>>({});
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  const erreur = (err: unknown) =>
    afficherToast(err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie.');

  const executer = async (
    id: string,
    action: (id: string, telephone: string) => Promise<Correspondance>,
  ) => {
    setActionEnCours(id);
    try {
      onChange(await action(id, telephone));
    } catch (err) {
      erreur(err);
    } finally {
      setActionEnCours(null);
    }
  };

  const gererContact = async (id: string) => {
    setActionEnCours(id);
    try {
      const contact = await obtenirContact(id, telephone);
      setContacts((prev) => ({ ...prev, [id]: contact }));
    } catch (err) {
      erreur(err);
    } finally {
      setActionEnCours(null);
    }
  };

  if (resultats.length === 0) {
    return (
      <div className="vide">
        {messageVide ?? (
          <>
            <h3>Aucune correspondance pour l’instant.</h3>
            <p>
              Ton alerte reste active : dès qu’une pièce à ce nom est déclarée, elle apparaît ici.
            </p>
          </>
        )}
      </div>
    );
  }

  /* Un don n'est proposé qu'après une restitution réellement aboutie — jamais avant. */
  const aRecupere = resultats.some((r) => r.statut === 'confirmee' && contacts[r.id]);

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--s-3)',
          borderBottom: '2px solid var(--color-encre)',
          paddingBottom: 6,
        }}
      >
        <span className="label">Correspondances</span>
        <span className="donnee">{String(resultats.length).padStart(2, '0')}</span>
      </div>

      {resultats.map((r) => {
        const bande = bandeConfiance(r.score);
        const pct = Math.round(r.score * 100);
        const occupe = actionEnCours === r.id;
        const contact = contacts[r.id];

        let action: ReactNode;

        if (r.statut === 'rejetee') {
          action = <span className="pastille p-encre">Écartée</span>;
        } else if (r.statut === 'confirmee' && contact) {
          action = (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600 }}>
                {contact.prenom} {contact.nom}
              </div>
              <a className="donnee lien" href={`tel:${contact.telephone}`} style={{ marginTop: 4 }}>
                {contact.telephone}
              </a>
              {contact.email && <div className="ligne-meta">{contact.email}</div>}
            </div>
          );
        } else if (r.statut === 'confirmee') {
          action = (
            <button
              type="button"
              className="btn btn-plein"
              onClick={() => gererContact(r.id)}
              disabled={occupe}
            >
              {occupe ? 'Ouverture…' : 'Voir les coordonnées'}
            </button>
          );
        } else if (r.confirmeParMoi) {
          action = <span className="pastille p-ambre">En attente de l’autre partie</span>;
        } else {
          action = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-plein"
                onClick={() => executer(r.id, confirmerCorrespondance)}
                disabled={occupe}
              >
                {occupe ? 'Envoi…' : 'C’est ma pièce'}
              </button>
              <button
                type="button"
                className="lien"
                onClick={() => executer(r.id, rejeterCorrespondance)}
                disabled={occupe}
              >
                Pas la mienne
              </button>
            </div>
          );
        }

        return (
          <div className="corr" key={r.id}>
            <div className="jauge" style={{ color: bande.couleur }}>
              <div className="jauge-val">{pct}%</div>
              <div className="jauge-barre">
                <span style={{ width: `${pct}%` } as CSSProperties} />
              </div>
              <div className="jauge-lbl">{bande.label}</div>
            </div>

            <div>
              <div className="ligne-nom">
                {r.pieceTrouvee.prenom} {r.pieceTrouvee.nom}
              </div>
              <div
                className="ligne-meta donnee"
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                {r.pieceTrouvee.typePiece}
              </div>
              <div className="ligne-meta">
                {r.pieceTrouvee.commune}
                {r.pieceTrouvee.quartier ? `, ${r.pieceTrouvee.quartier}` : ''} · déclarée{' '}
                {relDate(r.pieceTrouvee.dateTrouvaille)}
              </div>
            </div>

            <div className="corr-action">{action}</div>
          </div>
        );
      })}

      {aRecupere && (
        <div style={{ marginTop: 'var(--s-5)' }}>
          <PanneauDon
            titre="Ta pièce est retrouvée !"
            intro="Appelle la personne et convenez d’un point de dépôt sûr pour la remise. Si Pièci t’a évité de refaire le document, tu peux participer aux frais — c’est facultatif, et ça ne change rien au service."
          />
          <p className="aide" style={{ marginTop: 'var(--s-2)' }}>
            <IconeFleche taille={13} /> Et n’oublie pas de dire merci à la personne qui a pris le temps
            de déclarer ta pièce. Le bienfait n’est jamais perdu.
          </p>
        </div>
      )}
    </>
  );
}
