import { useMemo, useState } from 'react';
import { TYPES_PIECE, type TypePiece } from '../types';
import { COMMUNES } from '../data/communes';
import { normaliser } from '../lib/matching';
import { useApp } from '../context/AppContext';
import { PieceCard } from '../components/PieceCard';

const FILTRES_TYPE: Array<'Tous' | TypePiece> = ['Tous', ...TYPES_PIECE];
const FILTRES_COMMUNE: string[] = ['Toutes', ...Object.keys(COMMUNES)].slice(0, 10);

export function Trouvees() {
  const { piecesTrouvees, chargement } = useApp();
  const [recherche, setRecherche] = useState('');
  const [type, setType] = useState<'Tous' | TypePiece>('Tous');
  const [commune, setCommune] = useState('Toutes');

  const liste = useMemo(
    () =>
      piecesTrouvees.filter((p) => {
        const okType = type === 'Tous' || p.typePiece === type;
        const okCommune = commune === 'Toutes' || p.commune === commune;
        const okRecherche =
          !recherche ||
          normaliser(`${p.prenom} ${p.nomInitiale} ${p.commune} ${p.quartier ?? ''} ${p.typePiece}`).includes(normaliser(recherche));
        return okType && okCommune && okRecherche;
      }),
    [piecesTrouvees, recherche, type, commune],
  );

  return (
    <section className="block wrap">
      <div className="sec-head">
        <div>
          <h2>Pièces trouvées</h2>
          <p>Parcours les pièces déclarées. Les données sensibles restent floutées — elles ne se révèlent qu'à toi, après vérification.</p>
        </div>
      </div>
      <div className="filters">
        <div className="search">
          🔎
          <input placeholder="Rechercher un nom, une commune…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        {FILTRES_TYPE.map((t) => (
          <button key={t} className={'chip' + (type === t ? ' on' : '')} onClick={() => setType(t)}>
            {t === 'Tous' ? 'Tous les types' : t}
          </button>
        ))}
      </div>
      <div className="chips" style={{ marginBottom: 24 }}>
        {FILTRES_COMMUNE.map((c) => (
          <button key={c} className={'chip' + (commune === c ? ' on' : '')} onClick={() => setCommune(c)}>
            {c}
          </button>
        ))}
      </div>
      {chargement ? (
        <div className="empty">
          <div className="big">⏳</div>
          Chargement des pièces déclarées…
        </div>
      ) : liste.length ? (
        <div className="grid">
          {liste.map((p) => (
            <PieceCard key={p.id} piece={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="big">🤷🏾</div>
          Aucune pièce ne correspond. Essaie un autre filtre, ou crée une alerte dans « J'ai perdu ».
        </div>
      )}
    </section>
  );
}
