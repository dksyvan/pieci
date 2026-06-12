import { useNavigate } from 'react-router-dom';
import type { PieceTrouveePublique } from '../lib/api';
import { TYPE_ICONES } from '../types';
import { relDate } from '../lib/format';
import { DocThumb } from './DocThumb';

interface PieceCardProps {
  piece: PieceTrouveePublique;
}

/** Carte d'une pièce trouvée, dans le respect du principe de confidentialité. */
export function PieceCard({ piece }: PieceCardProps) {
  const navigate = useNavigate();

  return (
    <div className="card">
      <div className="card-top">
        <DocThumb big photoFlouteeUrl={piece.photoFlouteeUrl} />
        <div style={{ minWidth: 0 }}>
          <h3>
            {piece.prenom} {piece.nomInitiale}
          </h3>
          <div className="meta">
            📍 {piece.commune}
            {piece.quartier ? `, ${piece.quartier}` : ''}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="pill pill-orange">
              {TYPE_ICONES[piece.typePiece]} {piece.typePiece}
            </span>
            {piece.depotNom && <span className="pill pill-green">📦 {piece.depotNom}</span>}
          </div>
        </div>
      </div>
      <div className="card-foot">
        <span className="date">Trouvée {relDate(piece.dateTrouvaille)}</span>
        <button className="linkbtn" onClick={() => navigate('/perdu')}>
          C'est ma pièce →
        </button>
      </div>
    </div>
  );
}
