import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { bandeConfiance } from '@partage/matching';
import { relDate } from '../lib/format';
import {
  ApiError,
  confirmerCorrespondance,
  obtenirContact,
  rejeterCorrespondance,
  repondreDefi,
  type ContactInfo,
  type Correspondance,
} from '../lib/api';
import { useApp } from '../context/useApp';
import { PanneauDon } from './PanneauDon';
import { IconeFleche } from './Icones';

/**
 * La question posée au demandeur avant qu'il puisse confirmer.
 *
 * N'apparaît que si les prénoms saisis à la création de l'alerte ne
 * correspondent pas à ceux de la pièce : le vrai propriétaire, qui les a
 * écrits sans y penser, ne la voit jamais. Le message d'erreur vient tel quel
 * de l'API, volontairement neutre — il ne dit ni ce qui est faux, ni combien
 * de prénoms sont attendus.
 */
function FormulaireDefi({
  correspondance,
  telephone,
  onReussi,
  onRejeter,
  occupe,
}: {
  correspondance: Correspondance;
  telephone: string;
  onReussi: (maj: Correspondance) => void;
  onRejeter: () => void;
  occupe: boolean;
}) {
  const [prenoms, setPrenoms] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const id = `defi-${correspondance.id}`;

  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (envoi || !prenoms.trim()) return;
    setEnvoi(true);
    setErreur(null);
    try {
      onReussi(await repondreDefi(correspondance.id, telephone, prenoms));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form className="defi" onSubmit={envoyer} noValidate>
      <label htmlFor={id}>Quels sont les prénoms inscrits sur la pièce, en entier&nbsp;?</label>
      <p className="aide">L’annonce n’affiche que les initiales.</p>
      <input
        id={id}
        value={prenoms}
        autoComplete="off"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : undefined}
        onChange={(e) => {
          setPrenoms(e.target.value);
          setErreur(null);
        }}
      />
      {erreur && (
        <p className="erreur" id={`${id}-erreur`} role="alert">
          {erreur}
        </p>
      )}
      <button className="btn btn-plein" disabled={envoi || !prenoms.trim()}>
        {envoi ? 'Vérification…' : 'Vérifier'}
      </button>
      <button type="button" className="lien" onClick={onRejeter} disabled={envoi || occupe}>
        Pas la mienne
      </button>
    </form>
  );
}

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
  /**
   * Correspondances dont la confirmation a été refusée faute de défi : une
   * alerte antérieure à la pièce garde le bouton, ses prénoms sont vérifiés
   * au clic, et s'ils ne concordent pas, la question prend la place du bouton.
   */
  const [questions, setQuestions] = useState<ReadonlySet<string>>(new Set());

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
      if (err instanceof ApiError && err.code === 'DEFI_REQUIS') {
        setQuestions((prev) => new Set(prev).add(id));
      }
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
        // Le score n'est envoyé qu'au trouveur : pour le demandeur, il
        // trahissait le prénom et le lieu exact (voir l'API).
        const bande = r.score === null ? null : bandeConfiance(r.score);
        const pct = r.score === null ? 0 : Math.round(r.score * 100);
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
        } else if (r.defiRequis || questions.has(r.id)) {
          action = (
            <FormulaireDefi
              correspondance={r}
              telephone={telephone}
              onReussi={onChange}
              onRejeter={() => executer(r.id, rejeterCorrespondance)}
              occupe={occupe}
            />
          );
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
            {bande ? (
              <div className="jauge" style={{ color: bande.couleur }}>
                <div className="jauge-val">{pct}%</div>
                <div className="jauge-barre">
                  <span style={{ width: `${pct}%` } as CSSProperties} />
                </div>
                <div className="jauge-lbl">{bande.label}</div>
              </div>
            ) : (
              <div className="jauge" style={{ color: 'var(--color-sourdine)' }}>
                <div className="jauge-lbl" style={{ marginTop: 0 }}>
                  À vérifier
                </div>
              </div>
            )}

            <div>
              <div className="ligne-nom">
                {r.pieceTrouvee.nom} {r.pieceTrouvee.prenom}
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
