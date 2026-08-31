import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { lieuDe, nomPublic, titreDePartage } from '@partage/partage';
import { CartePiece } from '../components/CartePiece';
import { PartagePiece } from '../components/PartagePiece';
import { IconeFleche, IconeSceau } from '../components/Icones';
import { ApiError, getPieceTrouvee, urlMedia, type PieceTrouveePublique } from '../lib/api';
import { pieceServeur } from '../lib/fiche';
import { relDate } from '../lib/format';

/**
 * Un seul état plutôt que deux.
 *
 * « Chargement » et « pièce » ne sont pas des faits indépendants : une fiche
 * chargée sans pièce, ou une pièce sans état, n'existent pas. Les tenir
 * ensemble supprime ces combinaisons impossibles — et fait qu'une arrivée de
 * données ne provoque qu'un seul rendu.
 */
type Fiche =
  | { etat: 'chargement' }
  | { etat: 'ok'; piece: PieceTrouveePublique }
  | { etat: 'absente' }
  | { etat: 'panne' };

/** Date en toutes lettres, figée en fr-FR pour que serveur et client s'accordent. */
function dateLongue(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Fiche publique d'une pièce trouvée — l'unité que l'on partage.
 *
 * Sa raison d'être n'est pas le site : c'est ce qui est collé dans un groupe
 * WhatsApp de quartier ou dans un groupe Facebook d'objets trouvés. Le
 * visiteur type n'a jamais entendu parler de Pièci, arrive sur un lien qu'un
 * ami a fait suivre, et décide en quelques secondes. La page répond donc dans
 * l'ordre à ses trois questions : de quoi s'agit-il, est-ce que ça me
 * concerne, qu'est-ce que je fais maintenant.
 *
 * Elle n'est pas indexée (voir contenu/pages.ts). L'arbitrage est ancien et
 * tient toujours : on indexe le lieu, jamais la personne — un cache Google
 * survit des mois à la restitution. Un lien partagé, lui, est un geste
 * délibéré, limité au cercle qui peut reconnaître le nom, et il cesse de
 * répondre dès que la pièce quitte le registre.
 */
export function Piece() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fiche, setFiche] = useState<Fiche>({ etat: 'chargement' });

  /**
   * `/piece` sans identifiant est le gabarit pré-rendu que le Worker habille
   * pour chaque pièce. Il doit se rendre — sans quoi il n'y aurait rien à
   * habiller — mais un visiteur qui l'atteint vraiment n'a rien à y faire.
   */
  useEffect(() => {
    if (!id) navigate('/trouvees', { replace: true });
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;

    const injectee = pieceServeur(id);
    if (injectee) {
      /*
       * Fiche écrite au bord par le Worker : elle est déjà là, et la poser
       * tout de suite épargne un aller-retour vers une API qui peut sortir de
       * veille — or ce visiteur-ci arrive d'un message, sans aucune raison
       * particulière de patienter.
       *
       * La règle voudrait qu'on lise cette valeur pendant le rendu. Ce serait
       * pire : le HTML servi est le gabarit d'attente, et rendre la fiche
       * complète dès le premier passage ferait diverger l'hydratation — un
       * rendu client entier, plus une erreur en console, là où l'on ne paie
       * ici qu'un rendu de plus.
       */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFiche({ etat: 'ok', piece: injectee });
      return;
    }

    let vivant = true;
    getPieceTrouvee(id)
      .then((piece) => {
        if (vivant) setFiche({ etat: 'ok', piece });
      })
      .catch((err) => {
        // Une pièce restituée sort de la vue publique : l'API répond 404, et
        // c'est une fin normale, pas une panne. On distingue les deux, parce
        // que « réessaie » n'a de sens que dans un seul des deux cas.
        if (vivant) setFiche({ etat: err instanceof ApiError ? 'absente' : 'panne' });
      });

    return () => {
      vivant = false;
    };
  }, [id]);

  useEffect(() => {
    if (fiche.etat === 'ok') document.title = `${titreDePartage(fiche.piece)} | Pièci`;
  }, [fiche]);

  if (fiche.etat === 'chargement') {
    return (
      <section className="section wrap" aria-busy="true">
        <div className="section-tete">
          <span className="cote">Registre</span>
          <h2 style={{ marginTop: 6 }}>Chargement de la fiche…</h2>
          <p>Un instant, on va chercher la pièce au registre.</p>
        </div>
      </section>
    );
  }

  if (fiche.etat !== 'ok') {
    return (
      <section className="section wrap">
        <div className="vide">
          <h3>
            {fiche.etat === 'absente'
              ? 'Cette pièce n’est plus au registre.'
              : 'La fiche n’a pas pu être chargée.'}
          </h3>
          <p>
            {fiche.etat === 'absente'
              ? 'Elle a été rendue à son propriétaire, ou la déclaration a expiré. C’est plutôt une bonne nouvelle.'
              : 'La connexion a coupé quelque part. Réessaie dans un instant.'}
          </p>
          <p style={{ marginTop: 'var(--s-4)' }}>
            <Link to="/trouvees" className="btn">
              Voir le registre
              <IconeFleche taille={15} />
            </Link>
          </p>
        </div>
      </section>
    );
  }

  const { piece } = fiche;

  return (
    <section className="section wrap">
      <div className="section-tete">
        <span className="cote">Pièce trouvée · au registre</span>
        <h2 style={{ marginTop: 6 }}>
          {piece.typePiece} au nom de {nomPublic(piece)}
        </h2>
        <p>
          Trouvée à {lieuDe(piece)}, {relDate(piece.dateTrouvaille)}. Si c’est ta pièce — ou celle de
          quelqu’un que tu connais — la récupération est gratuite et ne passe par aucun
          intermédiaire.
        </p>
      </div>

      <div className="fiche-piece">
        <div className="panneau">
          <div className="panneau-tete">
            <span className="label">Ce qui est déclaré</span>
            <span className="cote">Identité masquée</span>
          </div>

          <dl className="fiche-faits">
            <div>
              <dt>Document</dt>
              <dd>{piece.typePiece}</dd>
            </div>
            <div>
              <dt>Au nom de</dt>
              <dd>{nomPublic(piece)}</dd>
            </div>
            <div>
              <dt>Trouvée à</dt>
              <dd>{lieuDe(piece)}</dd>
            </div>
            <div>
              <dt>Déclarée le</dt>
              <dd>{dateLongue(piece.dateTrouvaille)}</dd>
            </div>
            {piece.depotNom && (
              <div>
                <dt>Déposée à</dt>
                <dd>{piece.depotNom}</dd>
              </div>
            )}
          </dl>

          <p className="aide" style={{ marginTop: 'var(--s-4)' }}>
            <IconeSceau taille={14} /> Le nom entier, la photo nette et le contact du trouveur ne
            sont montrés qu’au propriétaire, après vérification. C’est pour ça qu’on n’affiche ici
            que l’initiale.
          </p>

          <div style={{ marginTop: 'var(--s-5)' }}>
            <Link to="/perdu" className="btn btn-plein btn-large">
              C’est ma pièce — la récupérer
            </Link>
          </div>
        </div>

        <div>
          {piece.photoFlouteeUrl ? (
            <img
              className="fiche-photo"
              src={urlMedia(piece.photoFlouteeUrl)}
              alt={`Photo floutée de la pièce déclarée au nom de ${nomPublic(piece)}`}
            />
          ) : (
            <CartePiece
              nom={nomPublic(piece).toUpperCase()}
              type={piece.typePiece}
              cachet="DÉCLARÉE"
              inclinaison={1.4}
            />
          )}

          <div style={{ marginTop: 'var(--s-5)' }}>
            <PartagePiece
              piece={piece}
              titre="Tu connais peut-être quelqu’un qui la cherche"
              intro="Un nom circule plus vite qu’une recherche. Envoie cette fiche dans ton groupe de quartier : c’est comme ça que la plupart des pièces retrouvent leur propriétaire."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
