import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { COMMUNES } from '@partage/communes';
import { compteurValorisant } from '@partage/vitrine';
import { relDate } from '../lib/format';
import { CartePiece } from '../components/CartePiece';
import { IconeFleche } from '../components/Icones';

/**
 * Les trois temps de la procédure. Volontairement courts : la plupart des
 * visiteurs arrivent d'un lien WhatsApp, sur téléphone, et ne liront pas un
 * paragraphe par étape.
 */
const ETAPES = [
  {
    cote: '01',
    titre: 'Tu trouves',
    texte: 'Une photo, le type de pièce, le quartier. Le numéro est flouté avant publication.',
  },
  {
    cote: '02',
    titre: 'On rapproche',
    texte:
      'L’algorithme compare et prévient le propriétaire. Il tolère les variantes : « Nguessan » ou « N’Guessan », c’est pareil.',
  },
  {
    cote: '03',
    titre: 'On restitue',
    texte:
      'Vous confirmez tous les deux, et là seulement les numéros s’échangent. Remise en mairie ou au commissariat.',
  },
];

/**
 * Mot rassurant affiché seulement si le chargement s'éternise. Invisible quand
 * l'API répond vite ; il n'apparaît qu'au-delà de 5 s, le temps qu'un réveil
 * Render devienne perceptible. Le bloc parent le démonte dès la fin du
 * chargement, ce qui annule le minuteur.
 */
function IndiceReveil() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <p className="aide" style={{ marginTop: 'var(--s-3)' }}>
      Le registre se réveille, un instant… Le serveur se rallume après une période calme.
    </p>
  );
}

export function Accueil() {
  const { piecesTrouvees, chargement, erreurChargement, recharger } = useApp();

  const nbCommunes = Object.keys(COMMUNES).length;
  const montrerCompteur = compteurValorisant(piecesTrouvees.length);

  return (
    <>
      <div className="registre">
        <div className="wrap registre-in">
          <div className="accueil-tete">
            <div className="tete-texte">
              <span className="timbre">Fait avec fierté en Côte d’Ivoire</span>
              <h1 className="titre-hero">
                Ta pièce égarée
                <br />a une <em>deuxième chance</em>.
              </h1>
              <p className="accueil-lead">
                Fini les statuts WhatsApp qui se perdent. Celui qui trouve déclare, celui qui a perdu
                est prévenu{' '}
                <em style={{ fontStyle: 'normal', color: 'var(--color-cachet)' }}>automatiquement</em>.
              </p>
            </div>

            <div className="tete-carte">
              <CartePiece />
            </div>

            <div className="tete-actions">
              <div className="actions-cle">
                <Link to="/declarer" className="action-cle">
                  <span className="action-cle-titre">J’ai trouvé une pièce hein</span>
                  <span className="action-cle-note">45 secondes, une photo.</span>
                </Link>
                <Link to="/perdu" className="action-cle">
                  <span className="action-cle-titre">J’ai perdu ma pièce oh</span>
                  <span className="action-cle-note">On compare tout de suite.</span>
                </Link>
              </div>

              <dl className="bilan">
                <div>
                  <dd>{nbCommunes}</dd>
                  <dt>communes couvertes</dt>
                </div>
                {montrerCompteur && (
                  <div>
                    <dd>{piecesTrouvees.length}</dd>
                    <dt>pièces déclarées</dt>
                  </div>
                )}
                <span className="note">Gratuit, et ça le sera toujours.</span>
              </dl>
            </div>
          </div>
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

            <dl>
              {ETAPES.map(({ cote, titre, texte }, index) => (
                <div
                  key={cote}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '46px 1fr',
                    gap: 'var(--s-3)',
                    paddingBlock: 'var(--s-4)',
                    borderTop: index === 0 ? 'none' : '1px solid var(--color-filet)',
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

          {/* `sans-entrees` masque la colonne sur mobile quand le registre est
              vraiment vide — jamais sur erreur : le message doit se voir. */}
          <aside
            className={
              'col-d' +
              (!chargement && !erreurChargement && piecesTrouvees.length === 0 ? ' sans-entrees' : '')
            }
          >
            <div className="section-tete">
              <span className="cote">Fraîchement déclarées</span>
              <h2 style={{ marginTop: 6, fontSize: 'var(--t-sub)' }}>Les dernières</h2>
            </div>

            {chargement && (
              <div className="lignes">
                {[0, 1, 2].map((i) => (
                  <div className="ligne" key={i} style={{ gridTemplateColumns: '1fr' }}>
                    <div>
                      <div className="squelette" style={{ height: 13, width: '68%' }} />
                      <div className="squelette" style={{ height: 10, width: '45%', marginTop: 6 }} />
                    </div>
                  </div>
                ))}
                <IndiceReveil />
              </div>
            )}

            {/* Échec réseau ≠ registre vide : on ne promet pas un registre à
                ouvrir quand c'est la connexion qui manque. */}
            {!chargement && erreurChargement && (
              <div className="vide" role="alert">
                <h3>Le registre ne répond pas.</h3>
                <p>
                  Vérifie ta connexion, ou patiente un instant — le serveur se réveille peut-être
                  après une période calme.
                </p>
                <button type="button" className="lien" onClick={recharger} style={{ marginTop: 'var(--s-3)' }}>
                  Réessayer
                  <IconeFleche taille={15} />
                </button>
              </div>
            )}

            {!chargement && !erreurChargement && piecesTrouvees.length === 0 && (
              <div className="vide">
                <h3>Tu as trouvé une pièce&nbsp;?</h3>
                <p>
                  Déclare-la en 45&nbsp;secondes, c’est gratuit. C’est toi qui ouvres le registre — et
                  quelqu’un, quelque part, arrêtera de chercher.
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
                    <div className="ligne" key={p.id} style={{ gridTemplateColumns: '1fr auto' }}>
                      <div>
                        <div className="ligne-nom" style={{ fontSize: '0.9375rem' }}>
                          {p.prenom} {p.nomInitiale}.
                        </div>
                        <div className="ligne-meta donnee">
                          {p.typePiece.toUpperCase()} · {p.commune}
                        </div>
                      </div>
                      <time className="donnee" dateTime={p.dateTrouvaille} style={{ color: 'var(--color-sourdine)' }}>
                        {relDate(p.dateTrouvaille)}
                      </time>
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
