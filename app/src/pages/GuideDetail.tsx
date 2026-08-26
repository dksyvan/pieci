import { Link, useParams } from 'react-router-dom';
import { guideParSlug, GUIDES } from '../contenu';
import type { Bloc } from '../contenu/types';
import { IconeFleche } from '../components/Icones';

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/**
 * Date en toutes lettres, calculée à la main.
 *
 * `toLocaleDateString` dépend de la bibliothèque de localisation du moteur :
 * celle de Node au pré-rendu, celle du navigateur à l'hydratation. Deux
 * chaînes différentes au même endroit du DOM, et React repart de zéro sur
 * toute la page. Une table de douze mois coûte moins cher que ce risque.
 */
function enToutesLettres(iso: string): string {
  const [an, mois, jour] = iso.split('-');
  return `${Number(jour)} ${MOIS[Number(mois) - 1]} ${an}`;
}

/** Rend un bloc de contenu dans la grammaire visuelle du registre. */
function RendreBloc({ bloc }: { bloc: Bloc }) {
  switch (bloc.type) {
    case 'paragraphe':
      return <p className="guide-p">{bloc.texte}</p>;

    case 'liste':
      return (
        <ul className="guide-liste">
          {bloc.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

    case 'etapes':
      return (
        <ol className="guide-etapes">
          {bloc.items.map((e) => (
            <li key={e.titre}>
              <b>{e.titre}</b>
              <p className="guide-p">{e.texte}</p>
            </li>
          ))}
        </ol>
      );

    case 'encadre':
      return (
        <aside className="guide-encadre">
          <b>{bloc.titre}</b>
          <p className="guide-p">{bloc.texte}</p>
        </aside>
      );

    case 'tableau':
      return (
        <div className="guide-tableau">
          <table>
            <thead>
              <tr>
                {bloc.entetes.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloc.lignes.map((ligne) => (
                <tr key={ligne.join('|')}>
                  {ligne.map((cell, i) => (
                    <td key={i} className={i === 0 ? 'donnee' : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/**
 * Page d'un guide.
 *
 * Le contenu est entièrement pré-rendu : c'est du texte lisible sans
 * JavaScript, ce qui est tout l'intérêt de ces pages. L'appel à l'action vers
 * le registre vient à la fin — après avoir réellement répondu à la question.
 */
export function GuideDetail() {
  const { slug } = useParams();
  const guide = guideParSlug(slug);

  if (!guide) {
    return (
      <section className="section wrap">
        <div className="vide">
          <h1>Ce guide n’existe pas.</h1>
          <p>Il a peut-être été renommé. Voici tous les guides disponibles.</p>
          <Link to="/guides" className="lien" style={{ marginTop: 'var(--s-3)' }}>
            Voir les guides
            <IconeFleche taille={15} />
          </Link>
        </div>
      </section>
    );
  }

  const connexes = (guide.connexes ?? [])
    .map((s) => GUIDES.find((g) => g.slug === s))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  return (
    <article className="section wrap guide">
      <Link to="/guides" className="cote guide-retour">
        ← Tous les guides
      </Link>

      <h1 className="guide-titre">{guide.titre}</h1>
      <p className="guide-chapo">{guide.chapo}</p>

      <p className="guide-date">
        Mis à jour le{' '}
        <time dateTime={guide.miseAJour}>{enToutesLettres(guide.miseAJour)}</time>
      </p>

      {guide.sections.map((section) => (
        <section key={section.titre} className="guide-section">
          <h2>{section.titre}</h2>
          {section.blocs.map((bloc, i) => (
            <RendreBloc key={i} bloc={bloc} />
          ))}
        </section>
      ))}

      <div className="guide-appel">
        <b>Votre pièce est peut-être déjà dans le registre.</b>
        <p className="guide-p">
          La recherche se fait par votre nom, sans aucun numéro à retrouver. C’est gratuit, et ça
          prend deux minutes.
        </p>
        <div className="guide-appel-actions">
          <Link to="/perdu" className="btn btn-plein">
            J’ai perdu ma pièce
          </Link>
          <Link to="/declarer" className="btn">
            J’ai trouvé une pièce
          </Link>
        </div>
      </div>

      {connexes.length > 0 && (
        <nav className="guide-connexes" aria-label="Guides liés">
          <span className="cote">À lire aussi</span>
          <div className="lignes">
            {connexes.map((g) => (
              <Link key={g.slug} to={`/guides/${g.slug}`} className="ligne acces">
                <span>
                  <span className="ligne-nom">{g.titre}</span>
                  <span className="ligne-meta">{g.question}</span>
                </span>
                <span className="ligne-fin">
                  <IconeFleche taille={18} />
                </span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </article>
  );
}