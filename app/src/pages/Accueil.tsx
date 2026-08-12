import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { COMMUNES } from '../data/communes';
import { relDate } from '../lib/format';
import { DocThumb } from '../components/DocThumb';
import { IconeFleche } from '../components/Icones';

/** Les trois temps de la procédure — une séquence réelle, d'où la numérotation. */
const ETAPES = [
  {
    cote: '01',
    titre: 'Tu trouves',
    texte:
      'Tu prends la photo, tu dis le type de pièce et le quartier. Le numéro et la signature sont floutés par le serveur avant même que ça s’affiche — personne ne voit rien.',
  },
  {
    cote: '02',
    titre: 'On rapproche',
    texte:
      'L’algorithme de DIBY Yvan compare avec les pièces recherchées et prévient le bon propriétaire. Il tolère les fautes d’orthographe : « Nguessan » et « N’Guessan », c’est pareil pour lui.',
  },
  {
    cote: '03',
    titre: 'On restitue',
    texte:
      'Vous confirmez tous les deux, et là seulement les numéros s’échangent. Rendez-vous dans un point de dépôt sûr — mairie, commissariat. Pas de rencontre risquée, c’est mieux non ?',
  },
];

export function Accueil() {
  const { piecesTrouvees, chargement } = useApp();

  return (
    <>
      <div className="registre">
        <div className="wrap registre-in filigrane">
          <div className="grille">
            <div className="col-a">
              <span className="timbre">Fait avec fierté en Côte d’Ivoire</span>
              <h1 className="titre-hero">
                Ta pièce égarée
                <br />a une <em>deuxième chance</em>.
              </h1>
            </div>

            <div className="col-b">
              <p
                style={{
                  fontSize: 'var(--t-lead)',
                  lineHeight: 'var(--lh-lead)',
                  maxWidth: '38ch',
                  letterSpacing: '-0.012em',
                }}
              >
                Fini les statuts WhatsApp qui se perdent. Sur Pièci, ceux qui trouvent une pièce la
                déclarent, et ceux qui l’ont perdue sont prévenus{' '}
                <em style={{ fontStyle: 'normal', color: 'var(--color-cachet)' }}>automatiquement</em>.
                Simple, rapide, et sûr.
              </p>

              <div className="lignes" style={{ marginTop: 'var(--s-4)' }}>
                <Link to="/declarer" className="ligne acces">
                  <span className="cote" style={{ paddingTop: 3 }}>
                    A
                  </span>
                  <span>
                    <span className="ligne-nom">J’ai trouvé une pièce hein</span>
                    <span className="ligne-meta">
                      Deux minutes, une photo, c’est déclaré. Le bienfait n’est jamais perdu.
                    </span>
                  </span>
                  <span className="ligne-fin">
                    <IconeFleche taille={18} />
                  </span>
                </Link>
                <Link to="/perdu" className="ligne acces">
                  <span className="cote" style={{ paddingTop: 3 }}>
                    B
                  </span>
                  <span>
                    <span className="ligne-nom">J’ai perdu ma pièce oh</span>
                    <span className="ligne-meta">
                      On compare tout de suite, et on te prévient pour les prochaines.
                    </span>
                  </span>
                  <span className="ligne-fin">
                    <IconeFleche taille={18} />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <dl className="bilan">
            <div>
              <dd>{piecesTrouvees.length}</dd>
              <dt>pièces déclarées</dt>
            </div>
            <div>
              <dd>{Object.keys(COMMUNES).length}</dd>
              <dt>communes &amp; villes</dt>
            </div>
            <span className="note">C’est gratuit et ça le sera toujours.</span>
          </dl>
        </div>
      </div>

      <section className="section wrap">
        <div className="grille">
          <div className="col-c">
            <div className="section-tete">
              <span className="cote">La marche à suivre</span>
              <h2 style={{ marginTop: 6 }}>Comment ça marche</h2>
              <p>Trois étapes, moins d’une minute. La solidarité ivoirienne, rendue efficace.</p>
            </div>

            <dl style={{ borderTop: '1px solid var(--color-encre)' }}>
              {ETAPES.map(({ cote, titre, texte }) => (
                <div
                  key={cote}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '46px 1fr',
                    gap: 'var(--s-3)',
                    borderBottom: '1px solid var(--color-filet)',
                    paddingBlock: 'var(--s-3)',
                  }}
                >
                  <dt className="cote" style={{ paddingTop: 4 }}>
                    {cote}
                  </dt>
                  <dd>
                    <b style={{ fontSize: '1.0625rem', letterSpacing: '-0.02em' }}>{titre}</b>
                    <p
                      style={{
                        marginTop: 3,
                        color: 'var(--color-sourdine)',
                        maxWidth: '58ch',
                        lineHeight: 'var(--lh-lead)',
                      }}
                    >
                      {texte}
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="col-d">
            <div className="section-tete">
              <span className="cote">Fraîchement déclarées</span>
              <h2 style={{ marginTop: 6, fontSize: 'var(--t-sub)' }}>Les dernières</h2>
            </div>

            {chargement && (
              <div className="lignes">
                {[0, 1, 2].map((i) => (
                  <div className="ligne" key={i}>
                    <div className="vignette petite squelette" />
                    <div>
                      <div className="squelette" style={{ height: 13, width: '68%' }} />
                      <div className="squelette" style={{ height: 10, width: '45%', marginTop: 6 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!chargement && piecesTrouvees.length === 0 && (
              <div className="vide">
                <h3>Personne n’a encore déclaré.</h3>
                <p>
                  Sois le premier deh. Si tu as ramassé une pièce aujourd’hui, c’est toi qui ouvres le
                  registre.
                </p>
                <Link to="/declarer" className="lien" style={{ marginTop: 'var(--s-3)' }}>
                  Déclarer une pièce
                  <IconeFleche taille={15} />
                </Link>
              </div>
            )}

            {!chargement && piecesTrouvees.length > 0 && (
              <>
                <div className="lignes">
                  {piecesTrouvees.slice(0, 4).map((p) => (
                    <div className="ligne" key={p.id} style={{ gridTemplateColumns: '44px 1fr' }}>
                      <DocThumb petite photoFlouteeUrl={p.photoFlouteeUrl} />
                      <div>
                        <div className="ligne-nom" style={{ fontSize: '0.9375rem' }}>
                          {p.prenom} {p.nomInitiale}.
                        </div>
                        <div className="ligne-meta donnee">
                          {p.typePiece.toUpperCase()} · {p.commune}
                        </div>
                        <time className="ligne-meta donnee" dateTime={p.dateTrouvaille} style={{ display: 'block' }}>
                          {relDate(p.dateTrouvaille)}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/trouvees" className="lien" style={{ marginTop: 'var(--s-3)' }}>
                  Voir tout le registre
                  <IconeFleche taille={15} />
                </Link>
              </>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
