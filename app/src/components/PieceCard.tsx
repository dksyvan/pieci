import { Link } from 'react-router-dom';
import type { PieceTrouveePublique } from '../lib/api';
import { relDate } from '../lib/format';
import { DocThumb } from './DocThumb';
import { IconeFleche } from './Icones';

interface PieceCardProps {
  piece: PieceTrouveePublique;
}

/** Une entrée du registre. Identité partiellement masquée, comme sur un extrait. */
export function PieceCard({ piece }: PieceCardProps) {
  const lieu = piece.quartier ? `${piece.commune}, ${piece.quartier}` : piece.commune;

  return (
    <article className="ligne">
      <DocThumb photoFlouteeUrl={piece.photoFlouteeUrl} />

      <div>
        <h3 className="ligne-nom">
          {piece.prenom} {piece.nomInitiale}.
        </h3>
        <p className="ligne-meta donnee" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {piece.typePiece}
        </p>
        <p className="ligne-meta">{lieu}</p>
        {piece.depotNom && (
          <p style={{ marginTop: 6 }}>
            <span className="pastille p-officiel">Déposée · {piece.depotNom}</span>
          </p>
        )}
      </div>

      <div className="ligne-fin">
        <time className="donnee" style={{ color: 'var(--color-sourdine)' }} dateTime={piece.dateTrouvaille}>
          {relDate(piece.dateTrouvaille)}
        </time>
        <Link to="/perdu" className="lien">
          C’est la mienne
          <IconeFleche taille={15} />
        </Link>
      </div>
    </article>
  );
}
