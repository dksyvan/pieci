import { Link } from 'react-router-dom';
import { RUBRIQUES } from '../contenu';
import { IconeFleche } from '../components/Icones';

/**
 * Index des guides. Sert autant au lecteur qu'au maillage interne : chaque
 * guide y est lié depuis une page atteignable, ce qui permet à un robot de
 * tout découvrir en partant de l'accueil.
 */
export function Guides() {
  return (
    <section className="section wrap">
      <div className="section-tete">
        <span className="cote">Guides pratiques</span>
        <h1 style={{ marginTop: 6, fontSize: 'var(--t-title)', letterSpacing: '-0.038em' }}>
          Perdre une pièce, ça s’explique
        </h1>
        <p>
          Ce qu’il faut faire, dans quel ordre, et ce que personne ne vous dit. Écrit pour la Côte
          d’Ivoire, sans jargon.
        </p>
      </div>

      {RUBRIQUES.map((rubrique) => (
        <div key={rubrique.titre} className="guides-rubrique">
          <h2>{rubrique.titre}</h2>
          <p className="guides-rubrique-intro">{rubrique.intro}</p>

          <div className="lignes">
            {rubrique.guides.map((g) => (
              <Link key={g.slug} to={`/guides/${g.slug}`} className="ligne acces">
                <span>
                  <span className="ligne-nom">{g.titre}</span>
                  <span className="ligne-meta">{g.description}</span>
                </span>
                <span className="ligne-fin">
                  <IconeFleche taille={18} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
