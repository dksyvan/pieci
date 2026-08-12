import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TYPES_PIECE, type TypePiece } from '../types';
import { COMMUNES } from '../data/communes';
import { normaliser } from '../lib/matching';
import { useApp } from '../context/AppContext';
import { PieceCard } from '../components/PieceCard';
import { IconeCarte, IconeFleche, IconeRecherche } from '../components/Icones';

const FILTRES_TYPE: Array<'Tous' | TypePiece> = ['Tous', ...TYPES_PIECE];
const FILTRES_COMMUNE: string[] = ['Toutes', ...Object.keys(COMMUNES).slice(0, 9)];

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
          normaliser(
            `${p.prenom} ${p.nomInitiale} ${p.commune} ${p.quartier ?? ''} ${p.typePiece}`,
          ).includes(normaliser(recherche));
        return okType && okCommune && okRecherche;
      }),
    [piecesTrouvees, recherche, type, commune],
  );

  const filtre = type !== 'Tous' || commune !== 'Toutes' || recherche !== '';

  return (
    <section className="section wrap">
      <div className="section-tete">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
          <div>
            <span className="cote">Le registre</span>
            <h2 style={{ marginTop: 6 }}>Pièces trouvées</h2>
          </div>
          <Link to="/carte" className="lien" style={{ alignSelf: 'flex-end' }}>
            <IconeCarte taille={15} />
            Voir sur la carte
          </Link>
        </div>
        <p>
          Parcours les pièces déclarées. Les données sensibles restent floutées — elles ne se révèlent
          qu’à toi, après vérification. Ta pièce est peut-être déjà là dedans.
        </p>
      </div>

      <div className="grille" style={{ rowGap: 'var(--s-3)', marginBottom: 'var(--s-4)' }}>
        <div className="col-a">
          <label className="recherche">
            <IconeRecherche taille={16} />
            <input
              type="search"
              placeholder="Nom, commune, quartier…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              aria-label="Rechercher dans le registre"
            />
          </label>
        </div>
        <p
          className="donnee col-b"
          style={{ color: 'var(--color-sourdine)', alignSelf: 'center', textAlign: 'right' }}
        >
          {String(liste.length).padStart(4, '0')} / {String(piecesTrouvees.length).padStart(4, '0')}{' '}
          entrées
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--s-2)' }}>
        {FILTRES_TYPE.map((t) => (
          <button
            key={t}
            type="button"
            className={'jeton' + (type === t ? ' actif' : '')}
            aria-pressed={type === t}
            onClick={() => setType(t)}
          >
            {t === 'Tous' ? 'Tous types' : t}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--s-4)' }}>
        {FILTRES_COMMUNE.map((c) => (
          <button
            key={c}
            type="button"
            className={'jeton' + (commune === c ? ' actif' : '')}
            aria-pressed={commune === c}
            onClick={() => setCommune(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {chargement && (
        <div className="lignes">
          {[0, 1, 2, 3, 4].map((i) => (
            <div className="ligne" key={i}>
              <div className="vignette squelette" />
              <div style={{ paddingTop: 2 }}>
                <div className="squelette" style={{ height: 15, width: `${52 + i * 7}%` }} />
                <div className="squelette" style={{ height: 11, width: '38%', marginTop: 7 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!chargement && liste.length > 0 && (
        <div className="lignes">
          {liste.map((p) => (
            <PieceCard key={p.id} piece={p} />
          ))}
        </div>
      )}

      {!chargement && liste.length === 0 && (
        <div className="vide">
          <h3>{filtre ? 'Aucune pièce ne correspond.' : 'Le registre est encore vide.'}</h3>
          <p>
            {filtre
              ? 'Essaie un autre filtre, ou crée ton alerte : dès qu’une pièce à ce nom est déclarée, on te prévient direct.'
              : 'Personne n’a encore déclaré de pièce. Si tu en as ramassé une aujourd’hui, c’est toi qui ouvres le registre.'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--s-4)', marginTop: 'var(--s-3)', flexWrap: 'wrap' }}>
            <Link to="/perdu" className="lien">
              Créer une alerte
              <IconeFleche taille={15} />
            </Link>
            {filtre && (
              <button
                type="button"
                className="lien"
                onClick={() => {
                  setType('Tous');
                  setCommune('Toutes');
                  setRecherche('');
                }}
              >
                Effacer les filtres
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
