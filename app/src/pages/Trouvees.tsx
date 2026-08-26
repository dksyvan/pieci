import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TYPES_PIECE, type TypePiece } from '@partage/types';
import { COMMUNES } from '@partage/communes';
import { normaliser } from '@partage/matching';
import { useApp } from '../context/AppContext';
import { PAGES_REGISTRE, pageRegistreParSlug, slugifier } from '../contenu/registre';
import { PieceCard } from '../components/PieceCard';
import { IconeCarte, IconeFleche, IconeRecherche } from '../components/Icones';

const COMMUNES_LISTEES = Object.keys(COMMUNES);

/**
 * Le registre, entier ou filtré par commune ou par type.
 *
 * Les filtres sont des liens, pas des boutons : chaque combinaison a son URL,
 * donc se partage, se met en favori, et se laisse parcourir par un robot. La
 * recherche libre, elle, reste en état local — la mettre dans l'URL
 * fabriquerait une infinité de pages sans valeur.
 */
export function Trouvees() {
  const { piecesTrouvees, chargement } = useApp();
  const { filtre: slug } = useParams();
  const [recherche, setRecherche] = useState('');

  const page = pageRegistreParSlug(slug);
  const commune = page?.genre === 'commune' ? page.valeur : null;
  const type = page?.genre === 'type' ? (page.valeur as TypePiece) : null;

  const liste = useMemo(
    () =>
      piecesTrouvees.filter((p) => {
        const okType = !type || p.typePiece === type;
        const okCommune = !commune || p.commune === commune;
        const okRecherche =
          !recherche ||
          normaliser(
            `${p.prenom} ${p.nomInitiale} ${p.commune} ${p.quartier ?? ''} ${p.typePiece}`,
          ).includes(normaliser(recherche));
        return okType && okCommune && okRecherche;
      }),
    [piecesTrouvees, recherche, type, commune],
  );

  const restreint = Boolean(page) || recherche !== '';

  // Un slug inconnu ne doit pas passer pour une page vide : on le dit.
  if (slug && !page) {
    return (
      <section className="section wrap">
        <div className="vide">
          <h1>Ce filtre n’existe pas.</h1>
          <p>La commune ou le type de pièce demandé ne fait pas partie du registre.</p>
          <Link to="/trouvees" className="lien" style={{ marginTop: 'var(--s-3)' }}>
            Voir tout le registre
            <IconeFleche taille={15} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section wrap">
      <div className="section-tete">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'var(--s-3)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span className="cote">Le registre</span>
            <h1 style={{ marginTop: 6, fontSize: 'var(--t-sub)', letterSpacing: '-0.03em' }}>
              {commune
                ? `Pièces trouvées à ${commune}`
                : type
                  ? `${type} — pièces trouvées`
                  : 'Pièces trouvées'}
            </h1>
          </div>
          <Link to="/carte" className="lien" style={{ alignSelf: 'flex-end' }}>
            <IconeCarte taille={15} />
            Voir sur la carte
          </Link>
        </div>

        <p>
          {page
            ? page.intro
            : 'Parcours les pièces déclarées. Les données sensibles restent floutées — elles ne se révèlent qu’à toi, après vérification. Ta pièce est peut-être déjà là dedans.'}
        </p>

        {page?.guide && (
          <Link to={`/guides/${page.guide}`} className="lien" style={{ marginTop: 'var(--s-3)' }}>
            {commune ? `Perdre sa pièce à ${commune} : le guide` : 'Lire le guide correspondant'}
            <IconeFleche taille={15} />
          </Link>
        )}
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

      <nav className="jetons" aria-label="Filtrer par type de pièce">
        <Jeton to="/trouvees" actif={!type}>
          Tous types
        </Jeton>
        {TYPES_PIECE.map((t) => (
          <Jeton key={t} to={`/trouvees/${slugifier(t)}`} actif={type === t}>
            {t}
          </Jeton>
        ))}
      </nav>

      <nav className="jetons" aria-label="Filtrer par commune" style={{ marginBottom: 'var(--s-4)' }}>
        <Jeton to="/trouvees" actif={!commune}>
          Toutes
        </Jeton>
        {COMMUNES_LISTEES.map((c) => (
          <Jeton key={c} to={`/trouvees/${slugifier(c)}`} actif={commune === c}>
            {c}
          </Jeton>
        ))}
      </nav>

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
          <h2 style={{ fontSize: 'var(--t-sub)', letterSpacing: '-0.03em' }}>
            {restreint ? 'Aucune pièce ne correspond.' : 'Le registre est encore vide.'}
          </h2>
          <p>
            {restreint
              ? 'Essaie un autre filtre, ou crée ton alerte : dès qu’une pièce à ce nom est déclarée, on te prévient direct.'
              : 'Personne n’a encore déclaré de pièce. Si tu en as ramassé une aujourd’hui, c’est toi qui ouvres le registre.'}
          </p>
          <div
            style={{ display: 'flex', gap: 'var(--s-4)', marginTop: 'var(--s-3)', flexWrap: 'wrap' }}
          >
            <Link to="/perdu" className="lien">
              Créer une alerte
              <IconeFleche taille={15} />
            </Link>
            {restreint && (
              <Link
                to="/trouvees"
                className="lien"
                onClick={() => setRecherche('')}
              >
                Voir tout le registre
              </Link>
            )}
          </div>
        </div>
      )}

      {!page && <PlanDuRegistre />}
    </section>
  );
}

/** Filtre cliquable. Un lien, pour que chaque vue ait sa propre adresse. */
function Jeton({
  to,
  actif,
  children,
}: {
  to: string;
  actif: boolean;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={'jeton' + (actif ? ' actif' : '')} aria-current={actif ? 'page' : undefined}>
      {children}
    </Link>
  );
}

/**
 * Plan du registre, en pied de la vue générale.
 *
 * Il donne à chaque page d'agrégat un lien depuis une page atteignable — sans
 * quoi la moitié d'entre elles resteraient invisibles pour un robot, et pour
 * quiconque n'a pas pensé à faire défiler les filtres.
 *
 * Replié par défaut : déplié, il ajoute près d'un écran de liens sur
 * téléphone, sur une page qu'on nous a déjà reproché de trop faire défiler.
 * Le contenu d'un `<details>` reste dans le HTML servi, donc lisible et
 * suivable par un robot — c'est l'affichage qui est différé, pas le balisage.
 */
function PlanDuRegistre() {
  const communes = PAGES_REGISTRE.filter((p) => p.genre === 'commune');
  const types = PAGES_REGISTRE.filter((p) => p.genre === 'type');

  return (
    <details className="plan-registre">
      <summary>
        <span className="cote">Parcourir</span>
        <span className="plan-registre-titre">Par commune ou par type de pièce</span>
      </summary>

      <nav className="plan-registre-corps" aria-label="Parcourir le registre">
        <div>
          <span className="cote">Par commune</span>
          <ul>
            {communes.map((p) => (
              <li key={p.slug}>
                <Link to={`/trouvees/${p.slug}`}>Pièces trouvées à {p.valeur}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="cote">Par type de pièce</span>
          <ul>
            {types.map((p) => (
              <li key={p.slug}>
                <Link to={`/trouvees/${p.slug}`}>{p.valeur} trouvée</Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </details>
  );
}
