import { urlMedia } from '../lib/api';

interface DocThumbProps {
  /** Format réduit, pour les extraits de registre en colonne étroite. */
  petite?: boolean;
  /** URL de la photo déjà floutée par le serveur, si la pièce en a une. */
  photoFlouteeUrl?: string | null;
}

/**
 * Vignette d'une pièce déclarée. Aucune donnée sensible n'est jamais rendue :
 * soit la photo floutée par le serveur, soit une trame neutre.
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
    <span className={classe} role="img" aria-label="Aucune photo fournie">
      <span className="vignette-trames" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}
