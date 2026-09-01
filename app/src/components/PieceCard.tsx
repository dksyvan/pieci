import { Link } from 'react-router-dom';
import { lieuDe, nomPublic } from '@partage/partage';
import type { PieceTrouveePublique } from '../lib/api';
import { relDate } from '../lib/format';
import { DocThumb } from './DocThumb';
import { IconeFleche } from './Icones';

interface PieceCardProps {
  piece: PieceTrouveePublique;
}

/** Une entrée du registre. Identité partiellement masquée, comme sur un extrait. */
export function PieceCard({ piece }: PieceCardProps) {
  return (
    <article className="ligne">
      <DocThumb photoFlouteeUrl={piece.photoFlouteeUrl} />

      <div>
        {/* Le nom mène à la fiche : c'est la page qu'on partage, et le
            registre est le seul endroit d'où quelqu'un d'autre que le
            déclarant peut y arriver. La colonne de droite garde le chemin
            direct du propriétaire, qui n'a rien à faire d'une fiche. */}
        <h3 className="ligne-nom">
          <Link to={`/piece/${piece.id}`}>{nomPublic(piece)}</Link>
        </h3>
        <p className="ligne-meta donnee" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {piece.typePiece}
        </p>
        <p className="ligne-meta">{lieuDe(piece)}</p>
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
