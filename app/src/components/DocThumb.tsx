import { urlMedia } from '../lib/api';

interface DocThumbProps {
  /** Affiche la vignette en grand format (utilisé dans les cartes de résultat). */
  big?: boolean;
  /** URL relative de la photo déjà floutée par le serveur, si la pièce en a une. */
  photoFlouteeUrl?: string | null;
}

/** Vignette de pièce d'identité floutée (aucune donnée sensible n'est jamais affichée). */
export function DocThumb({ big, photoFlouteeUrl }: DocThumbProps) {
  const style = big ? { width: 84, height: 60 } : undefined;

  if (photoFlouteeUrl) {
    return (
      <div className="doc-thumb" style={style}>
        <img src={urlMedia(photoFlouteeUrl)} alt="Photo de la pièce (floutée)" />
        <div className="lock-badge">
          🔒<span>Floutée</span>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-thumb blurred" style={style}>
      <div className="lines">
        <div className="av" />
        <div className="ln" />
        <div className="ln s" />
      </div>
      <div className="lock-badge">
        🔒<span>Floutée</span>
      </div>
    </div>
  );
}
