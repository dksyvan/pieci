/**
 * Pré-rendu des pages en HTML statique, après `vite build`.
 *
 * Le problème qu'il règle : une application React ordinaire sert un `<div>`
 * vide et fabrique la page en JavaScript. Google sait exécuter ce JavaScript,
 * mais le fait dans une seconde passe, différée de plusieurs jours à plusieurs
 * semaines pour un domaine neuf — et les autres robots (WhatsApp, Bing, les
 * assistants) ne le font pas du tout. Ce script écrit le HTML complet de
 * chaque page dans `dist/`, de sorte que le contenu soit lisible à la première
 * requête, sans exécuter une ligne de script.
 *
 * Le rendu passe par un serveur Vite en mode intergiciel plutôt que par un
 * second empaquetage : `ssrLoadModule` applique les mêmes alias, la même
 * substitution d'environnement et les mêmes réglages que le build client, sans
 * qu'on ait à les redéclarer — et donc sans qu'ils puissent diverger.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(racine, 'dist');

/** Retour à la ligne. Nommé pour rester lisible dans les `join`. */
const SAUT = String.fromCharCode(10);

/** Échappe ce qui part dans un attribut HTML. */
const attr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Remplace le contenu d'une balise meta déjà présente dans le gabarit.
 *
 * Le motif est assemblé sans classe d'échappement : `[^>]` accepte les retours
 * à la ligne, ce qui couvre d'un seul geste les balises écrites sur une ligne
 * et celles que le gabarit répartit sur quatre.
 */
function remplacerMeta(html, cle, valeur, type = 'name') {
  const motif = new RegExp(
    '(<meta[^>]{0,80}' + type + '="' + cle + '"[^>]{0,80}content=")[^"]*(")',
    'i',
  );
  return html.replace(motif, '$1' + attr(valeur) + '$2');
}

async function main() {
  const gabarit = await readFile(join(dist, 'index.html'), 'utf8');

  const vite = await createServer({
    root: racine,
    logLevel: 'warn',
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { rendre } = await vite.ssrLoadModule('/src/entry-static.tsx');
    const { PAGES_FIXES, PAGES_NON_INDEXEES } = await vite.ssrLoadModule('/src/contenu/pages.ts');
    const { GUIDES } = await vite.ssrLoadModule('/src/contenu/index.ts');
    // `texteBrut` réduit un texte enrichi à sa chaîne visible. Le balisage
    // structuré passe obligatoirement par elle : c'est ce qui garantit qu'un
    // `FAQPage` déclare exactement ce que le visiteur lit, condition posée par
    // Google et impossible à tenir avec deux listes tenues séparément.
    const { texteBrut } = await vite.ssrLoadModule('/src/contenu/types.ts');
    const { PAGES_REGISTRE } = await vite.ssrLoadModule('/src/contenu/registre.ts');

    const origine = (process.env.VITE_SITE_URL || 'https://pieci.ci').replace(/\/+$/, '');

    /**
     * Toutes les pages à écrire.
     *
     * Les pages de registre sont pré-rendues sans leur liste : celle-ci arrive
     * du client, et la figer dans le HTML servirait des entrées périmées. Ce
     * qui est indexé, c'est ce qui ne bouge pas — le lieu, le type de document,
     * le contexte, et les liens vers les autres vues. La page reste valide
     * quand son contenu a entièrement tourné, ce qu'une fiche individuelle ne
     * pourrait pas faire.
     */
    const pages = [
      ...PAGES_FIXES.map((p) => ({ ...p, guide: null })),
      ...GUIDES.map((g) => ({
        chemin: `/guides/${g.slug}`,
        titre: `${g.titre} | Pièci`,
        description: g.description,
        // Un brouillon est écrit comme les autres — c'est ce qui permet de le
        // relire en ligne, dans sa vraie mise en page. Mais sans priorité : il
        // reçoit alors `noindex` et n'entre pas au sitemap, par le même
        // mécanisme que /suivi. Publier revient à retirer le drapeau dans
        // src/contenu/guides-brouillons.ts, et rien d'autre.
        priorite: g.brouillon ? null : '0.8',
        guide: g,
      })),
      ...PAGES_REGISTRE.map((p) => ({
        chemin: `/trouvees/${p.slug}`,
        titre: p.titre,
        description: p.description,
        priorite: '0.6',
        guide: null,
      })),
      ...PAGES_NON_INDEXEES.map((p) => ({ ...p, priorite: null, guide: null })),
    ];

    const echecs = [];

    /**
     * Efface la pile d'appels que React laisse dans le HTML pré-rendu.
     *
     * Une page chargée en `lazy()` sous un `Suspense` ne se rend pas jusqu'au
     * bout avec `renderToString` : React insère alors un `<template>` portant
     * le message d'erreur (`data-msg`) et la pile d'appels de la machine qui a
     * compilé (`data-cstck`) — soit `file:///C:/Users/…`. Invisible à l'écran,
     * présent dans la source de la page publiée : le nom de compte et
     * l'arborescence du poste de build se retrouvent en ligne.
     *
     * Seul `data-cstck` part. Le gabarit et son `data-msg` restent : c'est à
     * eux que React reconnaît une zone qu'il doit rendre côté navigateur. Les
     * supprimer transforme un repli prévu ("switched to client rendering") en
     * vraie erreur d'hydratation, vérifié en comparant la console avec celle
     * de la production.
     */
    function sansDiagnosticReact(html) {
      return html.replace(/ data-cstck="[^"]*"/g, '');
    }

    for (const page of pages) {
      let corps;
      try {
        corps = renderToString(rendre(page.chemin));
        corps = sansDiagnosticReact(corps);
      } catch (err) {
        // Une page qui refuse de se rendre hors navigateur (Leaflet, par
        // exemple) ne doit pas faire tomber le build : elle reste servie par
        // le repli client, comme avant. On le signale, sans plus.
        echecs.push(`${page.chemin} — ${err.message.split('\n')[0]}`);
        continue;
      }

      const canonique = `${origine}${page.chemin === '/' ? '/' : page.chemin}`;

      let html = gabarit;
      html = html.replace(/<title>[^<]*<\/title>/i, `<title>${attr(page.titre)}</title>`);
      // L'aperçu au partage peut différer du titre indexé : deux lecteurs,
      // deux besoins (voir PageFixe dans src/contenu/pages.ts). Sans valeur
      // propre, il reprend celle de Google.
      const titrePartage = page.titrePartage ?? page.titre;
      const descriptionPartage = page.descriptionPartage ?? page.description;

      html = remplacerMeta(html, 'description', page.description);
      // Un guide est un article, pas le site. La distinction n'est pas
      // cosmétique : elle est ce qui autorise Facebook et LinkedIn à afficher
      // l'aperçu comme une publication datée plutôt que comme une page
      // d'accueil, et elle accompagne le balisage `Article` plus bas.
      html = remplacerMeta(html, 'og:type', page.guide ? 'article' : 'website', 'property');
      html = remplacerMeta(html, 'og:title', titrePartage, 'property');
      html = remplacerMeta(html, 'og:description', descriptionPartage, 'property');
      html = remplacerMeta(html, 'og:url', canonique, 'property');
      html = remplacerMeta(html, 'twitter:title', titrePartage);
      html = remplacerMeta(html, 'twitter:description', descriptionPartage);

      // Une page sans priorité ne va pas au sitemap : on le dit aussi aux
      // robots, plutôt que de compter sur leur discrétion.
      const noindex =
        page.priorite === null
          ? '  <meta name="robots" content="noindex, follow" />\n'
          : '';

      // Canonique : sans elle, `/guides/x` et `/guides/x/` sont deux pages
      // distinctes aux yeux de Google, qui se font concurrence.
      html = html.replace(
        '</head>',
        `  <link rel="canonical" href="${attr(canonique)}" />\n${noindex}${
          page.guide ? donneesGuide(page.guide, canonique, origine, texteBrut) : ''
        }  </head>`,
      );

      html = html.replace('<div id="root"></div>', `<div id="root">${corps}</div>`);

      const cible = page.chemin === '/' ? join(dist, 'index.html') : join(dist, page.chemin, 'index.html');
      await mkdir(dirname(cible), { recursive: true });
      await writeFile(cible, html, 'utf8');
    }

    await ecrireSitemap(pages, origine);
    await ecrireRobots(origine);
    const redirections = await ecrireRedirections(GUIDES, echecs);

    const brouillons = GUIDES.filter((g) => g.brouillon).map((g) => g.slug);

    console.log(`Pré-rendu : ${pages.length - echecs.length}/${pages.length} pages écrites`);
    console.log(`  sitemap : ${pages.filter((p) => p.priorite !== null).length} URL`);
    if (redirections) console.log(`  redirections : ${redirections}`);
    // Dit à voix haute, parce que c'est exactement ce qu'on oublie : une page
    // laissée en brouillon des mois après que sa procédure a été confirmée.
    for (const slug of brouillons) {
      console.log(`  brouillon (noindex, hors sitemap, hors index) : /guides/${slug}`);
    }
    for (const e of echecs) console.warn(`  non pré-rendue : ${e}`);
  } finally {
    await vite.close();
  }
}

/**
 * Carte du site. Elle est écrite ici plutôt que par un greffon de build parce
 * que c'est ici, et seulement ici, qu'on connaît la liste complète des pages —
 * les vingt-trois guides inclus. Une seconde liste tenue ailleurs finirait par
 * diverger de celle-ci, et les guides oubliés seraient invisibles.
 */
async function ecrireSitemap(pages, origine) {
  const date = new Date().toISOString().slice(0, 10);
  const urls = pages
    // Une priorité nulle marque une page pré-rendue mais hors index : elle a
    // reçu un `noindex`, l'inscrire ici se contredirait.
    .filter((p) => p.priorite !== null)
    .map((p) => {
      const loc = `${origine}${p.chemin === '/' ? '/' : p.chemin}`;
      const modif = p.guide ? p.guide.miseAJour : date;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${modif}</lastmod>
    <priority>${p.priorite}</priority>
  </url>`;
    })
    .join(SAUT);

  await writeFile(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    'utf8',
  );
}

/**
 * robots.txt. `/suivi` est exclu : c'est une consultation par numéro de
 * téléphone, sans intérêt pour un moteur et sans raison d'être indexée.
 */
async function ecrireRobots(origine) {
  const contenu = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /suivi',
    '',
    `Sitemap: ${origine}/sitemap.xml`,
    '',
  ].join(SAUT);
  await writeFile(join(dist, 'robots.txt'), contenu, 'utf8');
}

/**
 * Balisage structuré d'un guide : article, fil d'Ariane, et questions
 * fréquentes quand le guide en porte.
 *
 * `texteBrut` est passé en paramètre plutôt qu'importé : ce script tourne dans
 * Node, le modèle de contenu est du TypeScript chargé par Vite. Le faire
 * transiter par la signature rend visible que le texte déclaré vient bien du
 * même objet que le texte affiché.
 */
function donneesGuide(guide, canonique, origine, texteBrut) {
  const organisation = { '@type': 'Organization', name: 'Pièci', url: `${origine}/` };

  const donnees = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.titre,
      description: guide.description,
      // `fr-CI` et non `fr` : ces guides décrivent des démarches ivoiriennes —
      // l'ONECI, le RNPP, le 1340 — et seraient trompeurs ailleurs. La
      // précision du pays est une information, pas un détail de balisage.
      inLanguage: 'fr-CI',
      datePublished: guide.miseAJour,
      dateModified: guide.miseAJour,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonique },
      author: organisation,
      publisher: organisation,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${origine}/` },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: `${origine}/guides` },
        { '@type': 'ListItem', position: 3, name: guide.titre, item: canonique },
      ],
    },
  ];

  // Les questions déclarées sont exactement celles de la page, réponses
  // comprises : elles sortent du même tableau que le rendu (voir la section
  // « Questions fréquentes » de src/pages/GuideDetail.tsx). Déclarer une
  // question qui n'est pas visible fait sanctionner la page entière.
  if (guide.faq?.length) {
    donnees.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: 'fr-CI',
      mainEntity: guide.faq.map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: { '@type': 'Answer', text: texteBrut(q.reponse) },
      })),
    });
  }

  return donnees.map((d) => `  <script type="application/ld+json">${jsonDansScript(d)}</script>\n`).join('');
}

/**
 * Sérialise une donnée destinée à un `<script>`.
 *
 * Un `</script>` présent dans un texte fermerait la balise et livrerait le
 * reste au navigateur comme du HTML. Aucun guide n'en contient aujourd'hui, et
 * c'est bien le problème : la faute n'apparaîtrait qu'au jour où quelqu'un
 * citerait une balise dans un article. Échapper `<` coûte un remplacement et
 * reste du JSON valide.
 */
function jsonDansScript(donnee) {
  return JSON.stringify(donnee).replace(/</g, '\\u003c');
}

/**
 * Redirections définitives des adresses alternatives vers le guide réel.
 *
 * Un sujet n'a qu'une page. Quand une seconde adresse a été annoncée ailleurs
 * — un brief, une affiche, un ancien lien — elle redirige plutôt que de
 * devenir une page jumelle : deux pages du même site sur la même requête se
 * dévaluent l'une l'autre, et c'est Google qui choisit laquelle survit.
 *
 * Le fichier `_redirects` est lu par Cloudflare avant le service des fichiers
 * statiques, et n'est pas publié lui-même. La redirection est donc un vrai 301
 * côté serveur ; celle de GuideDetail.tsx ne couvre que la navigation interne.
 */
async function ecrireRedirections(guides, echecs) {
  const lignes = guides.flatMap((g) =>
    (g.alias ?? []).map((alias) => `/guides/${alias} /guides/${g.slug} 301`),
  );
  if (lignes.length === 0) return 0;

  const cible = join(dist, '_redirects');
  // Le dossier public/ n'en contient pas aujourd'hui. S'il venait à en porter
  // un, Vite l'aurait recopié ici et l'écraser perdrait ses règles sans bruit.
  let existant = '';
  try {
    existant = await readFile(cible, 'utf8');
  } catch {
    // Absent : c'est le cas normal.
  }
  if (existant.includes('/guides/')) {
    echecs.push('_redirects contient déjà des règles /guides/ — règles d’alias non écrites');
    return 0;
  }

  const contenu = (existant ? existant.replace(/\s*$/, SAUT) : '') + lignes.join(SAUT) + SAUT;
  await writeFile(cible, contenu, 'utf8');
  return lignes.length;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
