import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { TYPES_PIECE, TYPE_ICONES, type TypePiece } from '../types';
import type { LatLng } from '../data/communes';
import { GeoField } from '../components/GeoField';
import { useApp } from '../context/AppContext';
import { bandeConfiance } from '../lib/matching';
import { relDate } from '../lib/format';
import {
  ApiError,
  confirmerCorrespondance,
  creerAlertePerte,
  getCorrespondances,
  obtenirContact,
  rejeterCorrespondance,
  type ContactInfo,
  type Correspondance,
} from '../lib/api';

export function Perdu() {
  const { afficherToast } = useApp();

  const [typePiece, setTypePiece] = useState<TypePiece | ''>('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const [resultats, setResultats] = useState<Correspondance[] | null>(null);
  const [telephoneRecherche, setTelephoneRecherche] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, ContactInfo>>({});
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  const valide = Boolean(typePiece && prenom && nom && telephone);

  const erreur = (err: unknown) =>
    afficherToast(`⚠️ ${err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie.'}`);

  const rechercher = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valide || !typePiece || rechercheEnCours) return;

    setRechercheEnCours(true);
    try {
      await creerAlertePerte({
        utilisateur: { telephone, prenom, nom },
        typePiece,
        prenom,
        nom,
        ...(commune && coords ? { commune, lat: coords[0], lng: coords[1] } : {}),
        ...(quartier.trim() ? { quartier: quartier.trim() } : {}),
      });
      setResultats(await getCorrespondances(telephone));
      setTelephoneRecherche(telephone);
      setContacts({});
    } catch (err) {
      erreur(err);
    } finally {
      setRechercheEnCours(false);
    }
  };

  const remplacer = (mise: Correspondance) => {
    setResultats((prev) => prev?.map((r) => (r.id === mise.id ? mise : r)) ?? null);
  };

  const executer = async (id: string, action: (id: string, telephone: string) => Promise<Correspondance>) => {
    if (!telephoneRecherche) return;
    setActionEnCours(id);
    try {
      remplacer(await action(id, telephoneRecherche));
    } catch (err) {
      erreur(err);
    } finally {
      setActionEnCours(null);
    }
  };

  const gererContact = async (id: string) => {
    if (!telephoneRecherche) return;
    setActionEnCours(id);
    try {
      const contact = await obtenirContact(id, telephoneRecherche);
      setContacts((prev) => ({ ...prev, [id]: contact }));
    } catch (err) {
      erreur(err);
    } finally {
      setActionEnCours(null);
    }
  };

  return (
    <section className="block wrap">
      <div className="sec-head">
        <div>
          <h2>J'ai perdu ma pièce</h2>
          <p>Crée ton alerte. On la compare instantanément aux pièces déclarées — et on te préviendra des prochaines.</p>
        </div>
      </div>
      <div className="form-wrap">
        <form className="panel" onSubmit={rechercher}>
          <div className="field">
            <label>Type de pièce perdue</label>
            <select value={typePiece} onChange={(e) => setTypePiece(e.target.value as TypePiece | '')}>
              <option value="">— Choisir —</option>
              {TYPES_PIECE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="row2">
            <div className="field">
              <label>Ton prénom</label>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex : Adjoua" />
            </div>
            <div className="field">
              <label>Ton nom</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Kouassi" />
            </div>
          </div>
          <div className="field">
            <label>Ton numéro de téléphone</label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex : 0700000000"
            />
            <div className="hint">
              Sert uniquement à te montrer tes correspondances et à te recontacter — jamais affiché publiquement.
            </div>
          </div>
          <GeoField commune={commune} setCommune={setCommune} setCoords={setCoords} />
          <div className="field">
            <label>Quartier (optionnel)</label>
            <input
              value={quartier}
              onChange={(e) => setQuartier(e.target.value)}
              placeholder="Ex : Niangon Sud à Gauche"
            />
          </div>
          <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }} disabled={!valide || rechercheEnCours}>
            {rechercheEnCours ? 'Recherche…' : 'Lancer la recherche'}
          </button>
          <div className="hint">L'algorithme de DIBY Yvan tolère les fautes d'orthographe et les variantes de noms (ex. « Nguessan » / « N'Guessan »).</div>
        </form>
        <div>
          {resultats === null && (
            <div className="panel empty">
              <div className="big">👈🏾</div>
              Remplis le formulaire et lance la recherche pour voir les correspondances classées par niveau de confiance.
            </div>
          )}
          {resultats !== null && resultats.length === 0 && (
            <div className="panel empty">
              <div className="big">😌</div>
              <b>Aucune correspondance pour l'instant.</b>
              <br />
              Ton alerte est enregistrée — tu seras notifié dès qu'une pièce correspondante est déclarée.
            </div>
          )}
          {resultats !== null && resultats.length > 0 && (
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
          )}
        </div>
      </div>
    </section>
  );
}
