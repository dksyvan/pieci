import { useState, type FormEvent } from 'react';
import { TYPES_PIECE, type TypePiece } from '../types';
import type { LatLng } from '../data/communes';
import { GeoField } from '../components/GeoField';
import { BandeauPush } from '../components/BandeauPush';
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
  const [enCours, setEnCours] = useState(false);
  const [pushEcarte, setPushEcarte] = useState(false);

  const valide = Boolean(typePiece && prenom.trim() && nom.trim() && telephone.trim());

  const rechercher = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valide || !typePiece || enCours) return;

    setEnCours(true);
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
      afficherToast(err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie.');
    } finally {
      setEnCours(false);
    }
  };

  const remplacer = (mise: Correspondance) => {
    setResultats((prev) => prev?.map((r) => (r.id === mise.id ? mise : r)) ?? null);
  };

  return (
    <section className="section wrap">
      <div className="section-tete">
        <span className="cote">Déclarer une perte</span>
        <h2 style={{ marginTop: 6 }}>J’ai perdu ma pièce oh</h2>
        <p>
          Crée ton alerte. On la compare tout de suite aux pièces déjà déclarées — et si rien ne sort
          aujourd’hui, pas de drap : l’alerte reste active et on te prévient pour les prochaines.
        </p>
      </div>

      <div className="dossier">
        <form className="panneau" onSubmit={rechercher} noValidate>
          <div className="panneau-tete">
            <span className="label">Renseignements</span>
            <span className="cote">4 champs requis</span>
          </div>

          <div className="champ">
            <label htmlFor="type">Type de pièce perdue</label>
            <select
              id="type"
              value={typePiece}
              onChange={(e) => setTypePiece(e.target.value as TypePiece | '')}
            >
              <option value="">— Choisir —</option>
              {TYPES_PIECE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="duo">
            <div className="champ">
              <label htmlFor="prenom">Prénom sur la pièce</label>
              <input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Adjoua" />
            </div>
            <div className="champ">
              <label htmlFor="nom">Nom sur la pièce</label>
              <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="N’Guessan" />
            </div>
          </div>
          <p className="aide" style={{ marginTop: -8, marginBottom: 'var(--s-3)' }}>
            Écris comme tu prononces, ne fatigue pas. L’algorithme de DIBY Yvan tolère les fautes
            d’orthographe et les variantes de noms — « Nguessan » ou « N’Guessan », c’est pareil.
          </p>

          <div className="champ">
            <label htmlFor="tel">Ton numéro de téléphone</label>
            <input
              id="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="07 00 00 00 00"
            />
            <p className="aide">
              C’est pour te montrer tes correspondances et te recontacter. Jamais affiché
              publiquement, promis.
            </p>
          </div>

          <GeoField commune={commune} setCommune={setCommune} setCoords={setCoords} />

          <div className="champ">
            <label htmlFor="quartier">Quartier (facultatif)</label>
            <input
              id="quartier"
              value={quartier}
              onChange={(e) => setQuartier(e.target.value)}
              placeholder="Niangon Sud à Gauche"
            />
          </div>

          <button className="btn btn-plein btn-large" disabled={!valide || enCours}>
            {enCours ? 'Recherche en cours…' : 'Lancer la recherche'}
          </button>
        </form>

        <div>
          {resultats === null && (
            <div className="vide">
              <h3>On n’a pas encore cherché.</h3>
              <p>
                Remplis les quatre champs à gauche et lance la recherche. Les correspondances
                s’affichent ici, de la plus sûre à la moins sûre.
              </p>
            </div>
          )}

          {resultats !== null && telephoneRecherche && (
            <>
              {!pushEcarte && (
                <div style={{ marginBottom: 'var(--s-4)' }}>
                  <BandeauPush telephone={telephoneRecherche} onTermine={() => setPushEcarte(true)} />
                </div>
              )}
              <ListeCorrespondances
                resultats={resultats}
                telephone={telephoneRecherche}
                onChange={remplacer}
                messageVide={
                  <>
                    <h3>Rien à ce nom pour l’instant.</h3>
                    <p>
                      Ton alerte est bien enregistrée, ça va aller. Dès qu’une pièce à ce nom est
                      déclarée, tu la vois ici — et tu reçois une notification si tu les as activées.
                    </p>
                  </>
                }
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
