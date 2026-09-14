import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { TYPES_PIECE, type TypePiece } from '@partage/types';
import type { LatLng } from '@partage/communes';
import { MESSAGE_TELEPHONE, normaliserTelephone, telephoneValide } from '@partage/telephone';
import { LieuField } from '../components/LieuField';
import { BandeauPush } from '../components/BandeauPush';
import { ListeCorrespondances } from '../components/ListeCorrespondances';
import { useApp } from '../context/useApp';
import {
  ApiError,
  creerAlertePerte,
  getCorrespondances,
  repondreDefi,
  type Correspondance,
} from '../lib/api';
import { montrerPremierChamp, type ErreursChamps } from '../lib/formulaire';

export function Perdu() {
  const { afficherToast } = useApp();

  /**
   * Arrivée depuis la fiche d'une pièce (« C'est ma pièce ») : le type et le
   * nom sont déjà connus, affichés publiquement. Il ne reste que les prénoms
   * — que l'annonce ne montre pas, et qui prouvent que c'est bien la sienne.
   * Le type n'est repris que s'il fait partie de la liste, l'état de
   * navigation pouvant venir de n'importe où.
   *
   * L'identifiant de la pièce sert à répondre tout de suite au défi des
   * prénoms avec ceux que la personne vient d'écrire : l'alerte étant créée
   * après la publication de la pièce, le serveur exige cette réponse, et
   * la lui faire retaper serait inutile.
   */
  const depuisFiche = useLocation().state as {
    typePiece?: unknown;
    nom?: unknown;
    pieceId?: unknown;
  } | null;
  const typeFiche = TYPES_PIECE.find((t) => t === depuisFiche?.typePiece) ?? '';
  const nomFiche = typeof depuisFiche?.nom === 'string' ? depuisFiche.nom : '';
  const pieceFiche = typeof depuisFiche?.pieceId === 'string' ? depuisFiche.pieceId : null;

  const [typePiece, setTypePiece] = useState<TypePiece | ''>(typeFiche);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState(nomFiche);
  const [telephone, setTelephone] = useState('');
  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const [resultats, setResultats] = useState<Correspondance[] | null>(null);
  const [telephoneRecherche, setTelephoneRecherche] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [pushEcarte, setPushEcarte] = useState(false);

  /** Même contrat que sur /declarer : bouton toujours actif, erreurs à l'envoi. */
  const [erreurs, setErreurs] = useState<ErreursChamps>({});

  const effacerErreur = (champ: string) =>
    setErreurs((prev) =>
      champ in prev
        ? Object.fromEntries(Object.entries(prev).filter(([cle]) => cle !== champ))
        : prev,
    );

  const rechercher = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enCours) return;

    const manquants: ErreursChamps = {};
    if (!typePiece) manquants.type = 'Choisis le type de pièce perdue.';
    if (!prenom.trim()) manquants.prenom = 'Écris les prénoms inscrits sur la pièce.';
    if (!nom.trim()) manquants.nom = 'Écris le nom inscrit sur la pièce.';
    if (!telephone.trim()) manquants.tel = 'Ton numéro, pour te montrer tes correspondances.';
    else if (!telephoneValide(telephone)) manquants.tel = MESSAGE_TELEPHONE;

    setErreurs(manquants);
    if (Object.keys(manquants).length > 0 || !typePiece) {
      montrerPremierChamp(manquants);
      return;
    }

    // Forme canonique : le numéro est la clé du compte (voir shared/telephone.ts).
    const numero = normaliserTelephone(telephone);

    setEnCours(true);
    try {
      await creerAlertePerte({
        utilisateur: { telephone: numero, prenom, nom },
        typePiece,
        prenom,
        nom,
        ...(commune && coords ? { commune, lat: coords[0], lng: coords[1] } : {}),
        ...(quartier.trim() ? { quartier: quartier.trim() } : {}),
      });
      let liste = await getCorrespondances(numero);

      const aVerifier = pieceFiche
        ? liste.find((c) => c.pieceTrouvee.id === pieceFiche && c.defiRequis)
        : undefined;
      if (aVerifier) {
        try {
          const verifiee = await repondreDefi(aVerifier.id, numero, prenom);
          liste = liste.map((c) => (c.id === verifiee.id ? verifiee : c));
        } catch (err) {
          // La question reste affichée sous la correspondance : la personne
          // corrige ses prénoms là, sans refaire son alerte.
          afficherToast(
            !(err instanceof ApiError)
              ? 'Une erreur est survenue, réessaie.'
              : err.status === 429
                ? err.message
                : `${err.message} Vérifie tes prénoms dans la question ci-dessous.`,
          );
        }
      }

      setResultats(liste);
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

          {nomFiche && (
            <p className="aide" style={{ marginBottom: 'var(--s-3)' }}>
              Le type et le nom viennent de la fiche. Écris tes prénoms <b>en entier</b>, comme sur
              la pièce : l’annonce n’en montre que les initiales, c’est ce qui prouve qu’elle est à
              toi.
            </p>
          )}

          <div className="champ">
            <label htmlFor="type">Type de pièce perdue</label>
            <select
              id="type"
              value={typePiece}
              aria-invalid={erreurs.type ? true : undefined}
              aria-describedby={erreurs.type ? 'type-erreur' : undefined}
              onChange={(e) => {
                setTypePiece(e.target.value as TypePiece | '');
                effacerErreur('type');
              }}
            >
              <option value="">— Choisir —</option>
              {TYPES_PIECE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            {erreurs.type && (
              <p className="erreur" id="type-erreur">
                {erreurs.type}
              </p>
            )}
          </div>

          <div className="duo">
            <div className="champ">
              <label htmlFor="prenom">Prénoms sur la pièce (tous)</label>
              <input
                id="prenom"
                value={prenom}
                aria-invalid={erreurs.prenom ? true : undefined}
                aria-describedby={erreurs.prenom ? 'prenom-erreur' : undefined}
                onChange={(e) => {
                  setPrenom(e.target.value);
                  effacerErreur('prenom');
                }}
                placeholder="Adjoua"
              />
              {erreurs.prenom && (
                <p className="erreur" id="prenom-erreur">
                  {erreurs.prenom}
                </p>
              )}
            </div>
            <div className="champ">
              <label htmlFor="nom">Nom sur la pièce</label>
              <input
                id="nom"
                value={nom}
                aria-invalid={erreurs.nom ? true : undefined}
                aria-describedby={erreurs.nom ? 'nom-erreur' : undefined}
                onChange={(e) => {
                  setNom(e.target.value);
                  effacerErreur('nom');
                }}
                placeholder="N’Guessan"
              />
              {erreurs.nom && (
                <p className="erreur" id="nom-erreur">
                  {erreurs.nom}
                </p>
              )}
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
              aria-invalid={erreurs.tel ? true : undefined}
              aria-describedby={erreurs.tel ? 'tel-erreur' : undefined}
              onChange={(e) => {
                setTelephone(e.target.value);
                effacerErreur('tel');
              }}
              placeholder="07 00 00 00 00"
            />
            {erreurs.tel && (
              <p className="erreur" id="tel-erreur">
                {erreurs.tel}
              </p>
            )}
            <p className="aide">
              C’est pour te montrer tes correspondances et te recontacter. Jamais affiché
              publiquement, promis.
            </p>
          </div>

          <LieuField
            label="Où l’as-tu perdue ? (facultatif)"
            aide="Même approximatif — un quartier, un marché, une ligne de gbaka. Une pièce trouvée près de là remonte en premier."
            lieu={quartier}
            setLieu={setQuartier}
            commune={commune}
            setCommune={setCommune}
            setCoords={setCoords}
          />

          <button className="btn btn-plein btn-large" disabled={enCours}>
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
