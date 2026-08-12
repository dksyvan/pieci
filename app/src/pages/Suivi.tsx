import { useState, type FormEvent } from 'react';
import { ListeCorrespondances } from '../components/ListeCorrespondances';
import { useApp } from '../context/AppContext';
import { ApiError, getCorrespondances, type Correspondance } from '../lib/api';

export function Suivi() {
  const { afficherToast } = useApp();

  const [telephone, setTelephone] = useState('');
  const [resultats, setResultats] = useState<Correspondance[] | null>(null);
  const [telephoneRecherche, setTelephoneRecherche] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const rechercher = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!telephone.trim() || enCours) return;

    setEnCours(true);
    try {
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
        <span className="cote">Où ça en est</span>
        <h2 style={{ marginTop: 6 }}>Suivre mes correspondances</h2>
        <p>
          Que tu aies déclaré une pièce trouvée ou une perte, entre ton numéro pour voir où ça en est —
          y compris les correspondances trouvées après ta déclaration.
        </p>
      </div>

      <div className="dossier">
        <form className="panneau" onSubmit={rechercher} noValidate>
          <div className="panneau-tete">
            <span className="label">Identification</span>
            <span className="cote">1 champ</span>
          </div>

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
            <p className="aide">Le même que celui utilisé lors de ta déclaration.</p>
          </div>

          <button className="btn btn-plein btn-large" disabled={!telephone.trim() || enCours}>
            {enCours ? 'Consultation…' : 'Consulter mon dossier'}
          </button>
        </form>

        <div>
          {resultats === null && (
            <div className="vide">
              <h3>Entre ton numéro pour voir.</h3>
              <p>
                Le même que celui de ta déclaration. S’il y a des correspondances, elles s’affichent
                ici avec leur niveau de confiance.
              </p>
            </div>
          )}

          {resultats !== null && telephoneRecherche && (
            <ListeCorrespondances
              resultats={resultats}
              telephone={telephoneRecherche}
              onChange={remplacer}
              messageVide={
                <>
                  <h3>Rien pour ce numéro.</h3>
                  <p>
                    Soit on n’a pas encore trouvé de correspondance, soit la déclaration a été faite
                    avec un autre numéro. Vérifie les chiffres et réessaie doucement.
                  </p>
                </>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
