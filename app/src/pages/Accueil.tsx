import { Link } from 'react-router-dom';
import { TYPE_ICONES } from '../types';
import { useApp } from '../context/AppContext';
import { COMMUNES } from '../data/communes';
import { relDate } from '../lib/format';

interface Etape {
  numero: string;
  titre: string;
  texte: string;
  couleur: string;
}

const ETAPES: Etape[] = [
  {
    numero: '1',
    titre: 'Tu trouves',
    texte: 'Prends une photo, indique le type et l\'adresse complète. La position se remplit toute seule.',
    couleur: 'var(--color-orange)',
  },
  {
    numero: '2',
    titre: 'On rapproche',
    texte: 'Notre algorithme compare avec les pièces recherchées et prévient le bon propriétaire.',
    couleur: 'var(--color-green)',
  },
  {
    numero: '3',
    titre: 'On restitue',
    texte: 'Rendez-vous dans un point de dépôt sûr (mairie, commissariat). Aucune donnée exposée.',
    couleur: 'var(--color-night)',
  },
];

export function Accueil() {
  const { piecesTrouvees, chargement } = useApp();

  return (
    <>
      <div className="hero">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="wrap hero-in">
          <div>
            <span className="eyebrow">Fait avec fierté en Côte d'Ivoire</span>
            <h1>
              Ta pièce égarée
              <br />
              a une <span className="hl">deuxième chance</span>.
            </h1>
            <p className="lead">
              Fini les statuts WhatsApp qui se perdent. Sur Pièci, ceux qui trouvent une pièce la déclarent, et ceux
              qui l'ont perdue sont prévenus <b style={{ color: '#fff' }}>automatiquement</b>. Simple, rapide, et
              sûr.
            </p>
            <div className="cta-row">
              <Link className="btn btn-primary" to="/declarer">
                J'ai trouvé une pièce hein
              </Link>
              <Link className="btn btn-green" to="/perdu">
                J'ai perdu ma pièce oh
              </Link>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="n">{piecesTrouvees.length}</div>
                <div className="l">pièces déclarées</div>
              </div>
              <div className="stat">
                <div className="n">{Object.keys(COMMUNES).length}</div>
                <div className="l">communes & villes</div>
              </div>
              {/* <div className="stat">
                <div className="n">{pointsDepot.length}</div>
                <div className="l">points de dépôt sûrs</div>
              </div> */}
            </div>
          </div>
          <div className="glass">
            <div
              style={{
                fontFamily: 'var(-- font-head)',
                fontWeight: 600,
                fontSize: 13,
                color: '#CdDAE6',
                marginBottom: 12,
                letterSpacing: '.3px',
              }}
            >
              DÉCLARATIONS RÉCENTES
            </div>
            {chargement && <div className="mc-s">Chargement…</div>}
            {!chargement && piecesTrouvees.length === 0 && (
              <div className="mc-s">Aucune déclaration pour l'instant.</div>
            )}
            {piecesTrouvees.slice(0, 3).map((p) => (
              <div className="mini-card" key={p.id}>
                <div className="thumb blur" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mc-t">
                    {p.prenom} {p.nomInitiale}
                  </div>
                  <div className="mc-s">
                    {TYPE_ICONES[p.typePiece]} {p.typePiece} · {p.commune}
                  </div>
                </div>
                <span className="pill pill-green">{relDate(p.dateTrouvaille)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="block wrap">
        <div className="sec-head">
          <div>
            <h2>Comment ça marche</h2>
            <p>Trois étapes, moins d'une minute. La solidarité ivoirienne, rendue efficace.</p>
          </div>
        </div>
        <div className="grid">
          {ETAPES.map((etape) => (
            <div className="card" key={etape.numero} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <div className="num" style={{ background: etape.couleur, width: 40, height: 40, borderRadius: 12, fontSize: 18 }}>
                {etape.numero}
              </div>
              <div>
                <h3 style={{ marginBottom: 5 }}>{etape.titre}</h3>
                <div style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.55 }}>{etape.texte}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
