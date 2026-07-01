import { useState, type FormEvent } from 'react';
import { TYPES_PIECE, type TypePiece } from '../types';
import type { LatLng } from '../data/communes';
import { GeoField } from '../components/GeoField';
import { ListeCorrespondances } from '../components/ListeCorrespondances';
import { useApp } from '../context/AppContext';
import { ApiError, creerAlertePerte, getCorrespondances, type Correspondance } from '../lib/api';

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
  const [rechercheEnCours, setRechercheEnCours] = useState(false);

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
    } catch (err) {
      erreur(err);
    } finally {
      setRechercheEnCours(false);
    }
  };

  const remplacer = (mise: Correspondance) => {
    setResultats((prev) => prev?.map((r) => (r.id === mise.id ? mise : r)) ?? null);
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
          {resultats !== null && telephoneRecherche && (
            <ListeCorrespondances
              resultats={resultats}
              telephone={telephoneRecherche}
              onChange={remplacer}
              messageVide={
                <>
                  <b>Aucune correspondance pour l'instant.</b>
                  <br />
                  Ton alerte est enregistrée — reviens vérifier sur l'onglet « Suivi » dès qu'une pièce correspondante
                  est déclarée.
                </>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
