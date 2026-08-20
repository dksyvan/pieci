import { urlMedia } from '../lib/api';

interface DocThumbProps {
  /** Format réduit, pour les extraits de registre en colonne étroite. */
  petite?: boolean;
  /** URL de la photo déjà floutée par le serveur, si la pièce en a une. */
  photoFlouteeUrl?: string | null;
}

/**
 * Vignette d'une pièce déclarée.
 *
 * Sans photo, on ne montre pas un rectangle vide : on dessine la pièce
 * elle-même, en miniature. C'est le même objet que l'illustration d'accueil,
 * réduit à ce qui reste lisible à 56 pixels — bandeau, portrait, deux champs
 * caviardés. Aucune donnée n'y est jamais inscrite.
 */
export function DocThumb({ petite, photoFlouteeUrl }: DocThumbProps) {
  const classe = 'vignette' + (petite ? ' petite' : '');

  if (photoFlouteeUrl) {
    return (
      <span className={classe}>
        <img src={urlMedia(photoFlouteeUrl)} alt="Pièce déclarée, photo floutée" loading="lazy" />
        <span className="vignette-sceau">Floutée</span>
      </span>
    );
  }

  return (
    <span className={classe} role="img" aria-label="Pièce déclarée, sans photo">
      <svg viewBox="0 0 56 38" aria-hidden="true" focusable="false">
        <rect width="56" height="38" fill="var(--color-carte)" />
        <rect width="56" height="8" fill="var(--color-encre)" />

        {/* Portrait */}
        <rect x="5" y="13" width="14" height="18" fill="var(--color-papier-2)" />
        <circle cx="12" cy="19.5" r="3.6" fill="var(--color-filet-2)" />
        <path d="M6.6 31c.6-3.6 2.6-5.5 5.4-5.5s4.8 1.9 5.4 5.5Z" fill="var(--color-filet-2)" />

        {/* Champs caviardés */}
        <rect x="23" y="14" width="26" height="3.2" fill="var(--color-filet)" />
        <rect x="23" y="20" width="20" height="2.6" fill="var(--color-filet)" />
        <rect x="23" y="25" width="24" height="2.6" fill="var(--color-filet)" />

        {/* Le cachet, réduit à son cercle et sa coche */}
        <g transform="translate(45 30)">
          <circle r="7" fill="var(--color-carte)" />
          <circle r="6.2" fill="none" stroke="var(--color-cachet)" strokeWidth="1.1" />
          <path
            d="m-2.6 0 1.8 2 3.6-4"
            fill="none"
            stroke="var(--color-cachet)"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
        </g>
      </svg>
    </span>
  );
}
