import { useState, type FormEvent } from 'react';
import { ListeCorrespondances } from '../components/ListeCorrespondances';
import { useApp } from '../context/AppContext';
import { ApiError, getCorrespondances, type Correspondance } from '../lib/api';

export function Suivi() {
  const { afficherToast } = useApp();

  const [telephone, setTelephone] = useState('');
  const [resultats, setResultats] = useState<Correspondance[] | null>(null);
  const [telephoneRecherche, setTelephoneRecherche] = useState<string | null>(null);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);

  const rechercher = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!telephone || rechercheEnCours) return;

    setRechercheEnCours(true);
    try {
      setResultats(await getCorrespondances(telephone));
      setTelephoneRecherche(telephone);
    } catch (err) {
      afficherToast(`⚠️ ${err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie.'}`);
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
          <h2>Suivre mes correspondances</h2>
          <p>
            Que tu aies déclaré une pièce trouvée ou une perte, entre ton numéro pour voir l'état de tes
            correspondances — y compris celles trouvées après ta déclaration.
          </p>
        </div>
      </div>
      <div className="form-wrap">
        <form className="panel" onSubmit={rechercher}>
          <div className="field">
            <label>Ton numéro de téléphone</label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex : 0700000000"
            />
            <div className="hint">Le même numéro que celui utilisé lors de ta déclaration.</div>
          </div>
          <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }} disabled={!telephone || rechercheEnCours}>
            {rechercheEnCours ? 'Recherche…' : 'Voir mes correspondances'}
          </button>
        </form>
        <div>
          {resultats === null && (
            <div className="panel empty">
              <div className="big">🔔</div>
              Entre ton numéro pour voir si une correspondance a été trouvée.
            </div>
          )}
          {resultats !== null && telephoneRecherche && (
            <ListeCorrespondances resultats={resultats} telephone={telephoneRecherche} onChange={remplacer} />
          )}
        </div>
      </div>
    </section>
  );
}
