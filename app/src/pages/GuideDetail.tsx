import { Fragment } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { cibleAlias, guideParSlug, GUIDES_PUBLIES } from '../contenu';
import { estLienExterne, type Bloc, type Lien, type Texte } from '../contenu/types';
import { slugifier } from '../contenu/registre';
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

/**
 * Identifiant d'ancre d'une section.
 *
 * Réutilise le `slugifier` du registre plutôt que d'en écrire un second : deux
 * normalisations d'accents qui divergent, et le sommaire renverrait vers des
 * ancres absentes sur la moitié des titres.
 */
function ancre(titre: string): string {
  return slugifier(titre);
}

/** Ancre de la rubrique des questions fréquentes, citée aussi par le sommaire. */
const ANCRE_FAQ = 'questions-frequentes';

/**
 * Un lien dans le fil du texte.
 *
 * Trois destinations, trois comportements :
 * - interne : `Link`, pour ne pas recharger l'application ;
 * - externe : nouvel onglet — on ne veut pas qu'un lecteur parti sur le site
 *   de l'ONECI perde la page qui lui expliquait quoi y faire — avec
 *   `rel="noopener noreferrer"`, sans quoi la page ouverte garde une prise sur
 *   la nôtre ;
 * - téléphone : même onglet, c'est le composeur qui s'ouvre, pas une page.
 */
function RendreLien({ lien }: { lien: Lien }) {
  if (lien.href.startsWith('/')) {
    return (
      <Link to={lien.href} className="guide-lien">
        {lien.texte}
      </Link>
    );
  }

  if (!estLienExterne(lien.href)) {
    // `tel:` et tout autre protocole confié au système.
    return (
      <a href={lien.href} className="guide-lien">
        {lien.texte}
      </a>
    );
  }

  return (
    <a
      href={lien.href}
      className="guide-lien guide-lien-externe"
      target="_blank"
      rel="noopener noreferrer"
      /* Une page qui s'ouvre ailleurs sans prévenir désoriente : le lecteur ne
         comprend pas pourquoi le bouton « précédent » ne fait plus rien. La
         mention passe par `aria-label` et non par un `<span class="sr-only">`,
         qui serait un nœud de texte DANS le paragraphe — et ferait diverger le
         texte affiché de celui déclaré au `FAQPage`. Le libellé visible ouvre
         l'étiquette, comme l'exige « Label in Name ». */
      aria-label={`${lien.texte} (nouvel onglet)`}
    >
      {lien.texte}
    </a>
  );
}

/**
 * Rend un `Texte` : une chaîne telle quelle, ou une suite de fragments dont
 * certains sont des liens.
 */
function RendreTexte({ texte }: { texte: Texte }) {
  if (typeof texte === 'string') return <>{texte}</>;

  return (
    <>
      {texte.map((part, i) =>
        typeof part === 'string' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <RendreLien key={i} lien={part} />
        ),
      )}
    </>
  );
}

/** Rend un bloc de contenu dans la grammaire visuelle du registre. */
function RendreBloc({ bloc }: { bloc: Bloc }) {
  switch (bloc.type) {
    case 'paragraphe':
      return (
        <p className="guide-p">
          <RendreTexte texte={bloc.texte} />
        </p>
      );

    case 'liste':
      return (
        <ul className="guide-liste">
          {/* Clé par l'index, et non plus par le texte : un item peut
              désormais être un tableau de fragments, qui ne fait pas une clé. */}
          {bloc.items.map((item, i) => (
            <li key={i}>
              <RendreTexte texte={item} />
            </li>
          ))}
        </ul>
      );

    case 'etapes':
      return (
        <ol className="guide-etapes">
          {bloc.items.map((e) => (
            <li key={e.titre}>
              <b>{e.titre}</b>
              <p className="guide-p">
                <RendreTexte texte={e.texte} />
              </p>
            </li>
          ))}
        </ol>
      );

    case 'encadre':
      return (
        <aside className="guide-encadre">
          <b>{bloc.titre}</b>
          <p className="guide-p">
            <RendreTexte texte={bloc.texte} />
          </p>
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
              {bloc.lignes.map((ligne, i) => (
                <tr key={i}>
                  {ligne.map((cell, j) => (
                    <td key={j} className={j === 0 ? 'donnee' : undefined}>
                      <RendreTexte texte={cell} />
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

  // Une adresse annoncée ailleurs pour un guide qui vit sous un autre slug.
  // La redirection définitive est posée au bord (dist/_redirects, écrit par
  // scripts/prerender.mjs) ; celle-ci ne sert qu'à la navigation interne,
  // quand l'application est déjà chargée et qu'aucune requête ne part.
  const cible = guide ? undefined : cibleAlias(slug);
  if (cible) return <Navigate to={`/guides/${cible}`} replace />;

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

  // Un brouillon n'est proposé à la lecture depuis nulle part : il ne doit pas
  // non plus être proposé *par* un autre guide.
  const connexes = (guide.connexes ?? [])
    .map((s) => GUIDES_PUBLIES.find((g) => g.slug === s))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  /**
   * Sommaire — seulement sur les articles où il sert.
   *
   * Sur trois sections il ajoute un écran à franchir avant d'atteindre le
   * texte ; sur huit, il évite de faire défiler à l'aveugle un article
   * administratif lu sur un téléphone.
   */
  const entrees = [
    ...guide.sections.map((s) => ({ ancre: ancre(s.titre), titre: s.titre })),
    ...(guide.faq?.length ? [{ ancre: ANCRE_FAQ, titre: 'Questions fréquentes' }] : []),
  ];
  const sommaire = entrees.length >= 4 ? entrees : [];

  return (
    <article className="section wrap guide">
      <Link to="/guides" className="cote guide-retour">
        ← Tous les guides
      </Link>

      {guide.brouillon && (
        <p className="guide-brouillon">
          Brouillon — cette page n’est pas publiée : elle est en <code>noindex</code>, absente du
          sitemap et de la liste des guides.
        </p>
      )}

      <h1 className="guide-titre">{guide.titre}</h1>
      <p className="guide-chapo">{guide.chapo}</p>

      <p className="guide-date">
        Mis à jour le <time dateTime={guide.miseAJour}>{enToutesLettres(guide.miseAJour)}</time>
      </p>

      {guide.avertissement && (
        <aside className="guide-avertissement" role="note">
          <b>{guide.avertissement.titre}</b>
          <p className="guide-p">
            <RendreTexte texte={guide.avertissement.texte} />
          </p>
        </aside>
      )}

      {sommaire.length > 0 && (
        <nav className="guide-sommaire" aria-label="Sommaire">
          <span className="cote">Dans cet article</span>
          <ol>
            {sommaire.map((e) => (
              <li key={e.ancre}>
                <a href={`#${e.ancre}`}>{e.titre}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {guide.sections.map((section) => (
        <section key={section.titre} className="guide-section">
          <h2 id={ancre(section.titre)}>{section.titre}</h2>
          {section.blocs.map((bloc, i) => (
            <RendreBloc key={i} bloc={bloc} />
          ))}
        </section>
      ))}

      {/* Questions fréquentes. Le même tableau nourrit ce rendu et le
          `FAQPage` du balisage structuré (voir scripts/prerender.mjs) : Google
          exige que les questions déclarées soient celles qu'on lit, et c'est
          la seule façon de garantir qu'elles ne divergent jamais. */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="guide-section guide-faq">
          <h2 id={ANCRE_FAQ}>Questions fréquentes</h2>
          {guide.faq.map((q) => (
            <div key={q.question} className="guide-faq-item">
              <h3>{q.question}</h3>
              <p className="guide-p">
                <RendreTexte texte={q.reponse} />
              </p>
            </div>
          ))}
        </section>
      )}

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
