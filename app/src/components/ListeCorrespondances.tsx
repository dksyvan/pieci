import { useState, type CSSProperties, type ReactNode } from 'react';
import { TYPE_ICONES } from '../types';
import { bandeConfiance } from '../lib/matching';
import { relDate } from '../lib/format';
import {
  ApiError,
  confirmerCorrespondance,
  obtenirContact,
  rejeterCorrespondance,
  type ContactInfo,
  type Correspondance,
} from '../lib/api';
import { useApp } from '../context/AppContext';

interface Props {
  resultats: Correspondance[];
  telephone: string;
  onChange: (maj: Correspondance) => void;
  messageVide?: ReactNode;
}

/** Affiche et gère une liste de correspondances (confirmer/rejeter/contact) pour un numéro donné. */
export function ListeCorrespondances({ resultats, telephone, onChange, messageVide }: Props) {
  const { afficherToast } = useApp();
  const [contacts, setContacts] = useState<Record<string, ContactInfo>>({});
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  const erreur = (err: unknown) =>
    afficherToast(`⚠️ ${err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie.'}`);

  const executer = async (id: string, action: (id: string, telephone: string) => Promise<Correspondance>) => {
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
      <div className="panel empty">
        <div className="big">😌</div>
        {messageVide ?? <b>Aucune correspondance pour l'instant.</b>}
      </div>
    );
  }

  return (
    <>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--color-night)', marginBottom: 12 }}>
        {resultats.length} correspondance{resultats.length > 1 ? 's' : ''} trouvée{resultats.length > 1 ? 's' : ''}
      </div>
      {resultats.map((r) => {
        const b = bandeConfiance(r.score);
        const pct = Math.round(r.score * 100);

        let action: ReactNode;
        if (r.statut === 'rejetee') {
          action = <span className="meta">Correspondance écartée</span>;
        } else if (r.statut === 'confirmee') {
          const contact = contacts[r.id];
          action = contact ? (
            <div style={{ textAlign: 'right', fontSize: 13.5 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--color-night)' }}>
                {contact.prenom} {contact.nom}
              </div>
              <div className="meta">{contact.telephone}</div>
              {contact.email && <div className="meta">{contact.email}</div>}
            </div>
          ) : (
            <button
              className="btn btn-dark"
              onClick={() => gererContact(r.id)}
              disabled={actionEnCours === r.id}
              style={{ padding: '10px 16px' }}
            >
              📞 Voir les coordonnées
            </button>
          );
        } else if (r.confirmeParMoi) {
          action = <span className="meta">⏳ En attente de l'autre partie pour confirmer la correspondance</span>;
        } else {
          action = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <button
                className="btn btn-dark"
                onClick={() => executer(r.id, confirmerCorrespondance)}
                disabled={actionEnCours === r.id}
                style={{ padding: '10px 16px' }}
              >
                C'est ma pièce →
              </button>
              <button
                className="linkbtn"
                onClick={() => executer(r.id, rejeterCorrespondance)}
                disabled={actionEnCours === r.id}
              >
                Pas la mienne
              </button>
            </div>
          );
        }

        return (
          <div className="match" key={r.id}>
            <div className="conf">
              <div className="ring" style={{ '--p': pct, '--c': b.couleur } as CSSProperties}>
                <span style={{ color: b.couleur }}>{pct}%</span>
              </div>
              <div className="lbl" style={{ color: b.couleur }}>
                {b.label}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: 'var(--color-night)' }}>
                {r.pieceTrouvee.prenom} {r.pieceTrouvee.nom}
              </div>
              <div className="meta">
                {TYPE_ICONES[r.pieceTrouvee.typePiece]} {r.pieceTrouvee.typePiece} · 📍 {r.pieceTrouvee.commune}
                {r.pieceTrouvee.quartier ? `, ${r.pieceTrouvee.quartier}` : ''}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 3 }}>
                trouvée {relDate(r.pieceTrouvee.dateTrouvaille)}
              </div>
            </div>
            {action}
          </div>
        );
      })}
    </>
  );
}
