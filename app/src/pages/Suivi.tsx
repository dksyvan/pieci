import { useEffect, useState, type FormEvent } from 'react';
import { MESSAGE_TELEPHONE, normaliserTelephone, telephoneValide } from '@partage/telephone';
import { BandeauPush } from '../components/BandeauPush';
import { IconeValide } from '../components/Icones';
import { ListeCorrespondances } from '../components/ListeCorrespondances';
import { useApp } from '../context/useApp';
import { ApiError, getCorrespondances, type Correspondance } from '../lib/api';
import { abonnementLocal } from '../lib/push';

export function Suivi() {
  const { afficherToast } = useApp();

  const [telephone, setTelephone] = useState('');
  const [erreurTel, setErreurTel] = useState<string | null>(null);
  const [resultats, setResultats] = useState<Correspondance[] | null>(null);
  const [telephoneRecherche, setTelephoneRecherche] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  /**
   * Abonnement de cet appareil : `null` tant qu'on ne sait pas.
   *
   * C'est ici que la proposition doit revenir. Quelqu'un qui consulte cette
   * page vient précisément parce qu'il n'a pas été prévenu — c'est le moment
   * où l'intérêt de la notification se démontre tout seul, sans insister.
   */
  const [abonne, setAbonne] = useState<boolean | null>(null);
  const [pushEcarte, setPushEcarte] = useState(false);

  useEffect(() => {
    let vivant = true;
    void abonnementLocal().then((oui) => {
      if (vivant) setAbonne(oui);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const rechercher = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enCours) return;

    // Vérifié ici plutôt qu'au retour de l'API : sans cela, c'est le message
    // anglais de class-validator qui remontait jusqu'à l'utilisateur.
    if (!telephoneValide(telephone)) {
      setErreurTel(MESSAGE_TELEPHONE);
      document.getElementById('tel')?.focus();
      return;
    }
    setErreurTel(null);

    // La forme canonique part vers l'API : le numéro est la clé du compte,
    // « 07 00 00 00 00 » et « 0700000000 » doivent désigner la même personne.
    const numero = normaliserTelephone(telephone);

    setEnCours(true);
    try {
      setResultats(await getCorrespondances(numero));
      setTelephoneRecherche(numero);
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
              aria-invalid={erreurTel ? true : undefined}
              aria-describedby={erreurTel ? 'tel-erreur' : undefined}
              onChange={(e) => {
                setTelephone(e.target.value);
                setErreurTel(null);
              }}
              placeholder="07 00 00 00 00"
            />
            {erreurTel && (
              <p className="erreur" id="tel-erreur">
                {erreurTel}
              </p>
            )}
            <p className="aide">Le même que celui utilisé lors de ta déclaration.</p>
          </div>

          <button className="btn btn-plein btn-large" disabled={enCours}>
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

          {resultats !== null && telephoneRecherche && abonne === false && !pushEcarte && (
            <div style={{ marginBottom: 'var(--s-4)' }}>
              <BandeauPush
                telephone={telephoneRecherche}
                onTermine={() => {
                  setPushEcarte(true);
                  // « Plus tard » et « c'est activé » passent tous deux par
                  // ici : on relit l'état réel plutôt que de le supposer, sans
                  // quoi un refus afficherait la confirmation d'un abonnement
                  // qui n'existe pas.
                  void abonnementLocal().then(setAbonne);
                }}
              />
            </div>
          )}

          {resultats !== null && abonne === true && (
            <p className="constat" style={{ marginBottom: 'var(--s-4)' }}>
              <IconeValide taille={14} />
              Les notifications sont actives sur cet appareil&nbsp;: tu seras prévenu sans avoir à
              revenir.
            </p>
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
