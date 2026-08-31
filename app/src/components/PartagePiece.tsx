import { useState } from 'react';
import type { PieceTrouveePublique } from '@partage/api-types';
import {
  ORIGINE,
  lienFacebook,
  lienWhatsApp,
  messageComplet,
  titreDePartage,
  urlPiece,
} from '@partage/partage';
import { IconeCopier, IconeFacebook, IconePartage, IconeValide, IconeWhatsApp } from './Icones';

interface PartagePieceProps {
  piece: Pick<
    PieceTrouveePublique,
    'id' | 'typePiece' | 'prenom' | 'nomInitiale' | 'commune' | 'quartier'
  >;
  /** Texte d'accroche : il change selon qu'on vient de déclarer ou qu'on relaie. */
  titre: string;
  intro: string;
}

type Copie = 'repos' | 'faite' | 'echec';

/**
 * Partage d'une pièce trouvée.
 *
 * C'est le geste central du service, pas une décoration de fin de page. Une
 * pièce déclarée qui reste sur pieci.ci n'est vue que par les gens déjà
 * venus ; la même pièce relayée dans le groupe WhatsApp du quartier ou dans un
 * groupe « objets trouvés » atteint exactement les personnes qui connaissent
 * son propriétaire. Le registre attend qu'on vienne à lui ; le partage va
 * chercher les gens là où ils sont déjà.
 *
 * WhatsApp d'abord, et pas par habitude : c'est là que se tient la vie de
 * quartier en Côte d'Ivoire. Facebook ensuite, pour les groupes d'objets
 * trouvés. Le lien nu en dernier, pour tout le reste — SMS, Telegram, un
 * message collé à la main.
 */
export function PartagePiece({ piece, titre, intro }: PartagePieceProps) {
  const [copie, setCopie] = useState<Copie>('repos');

  // L'origine réelle plutôt que l'origine publique : un lien de préproduction
  // qui renvoie sur la production ne se teste pas.
  const origine = typeof window === 'undefined' ? ORIGINE : window.location.origin;
  const url = urlPiece(piece.id, origine);
  const message = messageComplet(piece, origine);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopie('faite');
    } catch {
      setCopie('echec');
    }
    setTimeout(() => setCopie('repos'), 4000);
  };

  /**
   * Feuille de partage du système, quand le navigateur en propose une : elle
   * ouvre toutes les applications installées, y compris celles qu'on n'a pas
   * prévues ici. Absente sur ordinateur, d'où les liens directs à côté.
   */
  const partageNatif =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      ? () => {
          void navigator.share({ title: titreDePartage(piece), text: message, url }).catch(() => {});
        }
      : null;

  return (
    <div className="panneau">
      <div className="panneau-tete">
        <span className="label">Faire circuler</span>
        <span className="cote">Le plus utile</span>
      </div>

      <h3 style={{ marginBottom: 'var(--s-2)' }}>{titre}</h3>
      <p style={{ color: 'var(--color-sourdine)', lineHeight: 'var(--lh-lead)' }}>{intro}</p>

      <div className="rangee-partage">
        <a
          className="btn btn-plein"
          href={lienWhatsApp(message)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconeWhatsApp taille={16} />
          WhatsApp
        </a>
        <a
          className="btn"
          href={lienFacebook(url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconeFacebook taille={16} />
          Facebook
        </a>
        <button type="button" className="btn" onClick={copier}>
          {copie === 'faite' ? <IconeValide taille={16} /> : <IconeCopier taille={16} />}
          {copie === 'faite' ? 'Copié' : 'Copier le message'}
        </button>
        {partageNatif && (
          <button type="button" className="btn" onClick={partageNatif} aria-label="Partager autrement">
            <IconePartage taille={16} />
            Autre
          </button>
        )}
      </div>

      {copie === 'echec' && (
        <p className="erreur" role="alert" style={{ marginTop: 'var(--s-2)' }}>
          Le presse-papiers a refusé. Sélectionne le message ci-dessous et copie-le à la main.
        </p>
      )}

      {/* Le message est montré, pas seulement envoyé : on ne fait rien partir
          au nom de quelqu'un sans qu'il ait lu ce qui part. */}
      <details className="depli">
        <summary>Voir le message qui sera envoyé</summary>
        <pre className="message-partage">{message}</pre>
      </details>
    </div>
  );
}
