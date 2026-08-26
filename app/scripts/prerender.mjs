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
    const { PAGES_FIXES } = await vite.ssrLoadModule('/src/contenu/pages.ts');
    const { GUIDES } = await vite.ssrLoadModule('/src/contenu/index.ts');

    const origine = (process.env.VITE_SITE_URL || 'https://pieci.ci').replace(/\/+$/, '');

    /** Toutes les pages à écrire, fixes et guides confondues. */
    const pages = [
      ...PAGES_FIXES.map((p) => ({ ...p, guide: null })),
      ...GUIDES.map((g) => ({
        chemin: `/guides/${g.slug}`,
        titre: `${g.titre} | Pièci`,
        description: g.description,
        priorite: '0.8',
        guide: g,
      })),
    ];

    const echecs = [];

    for (const page of pages) {
      let corps;
      try {
        corps = renderToString(rendre(page.chemin));
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
      html = remplacerMeta(html, 'description', page.description);
      html = remplacerMeta(html, 'og:title', page.titre, 'property');
      html = remplacerMeta(html, 'og:description', page.description, 'property');
      html = remplacerMeta(html, 'og:url', canonique, 'property');
      html = remplacerMeta(html, 'twitter:title', page.titre);
      html = remplacerMeta(html, 'twitter:description', page.description);

      // Canonique : sans elle, `/guides/x` et `/guides/x/` sont deux pages
      // distinctes aux yeux de Google, qui se font concurrence.
      html = html.replace(
        '</head>',
        `  <link rel="canonical" href="${attr(canonique)}" />\n${
          page.guide ? donneesGuide(page.guide, canonique, origine) : ''
        }  </head>`,
      );

      html = html.replace('<div id="root"></div>', `<div id="root">${corps}</div>`);

      const cible = page.chemin === '/' ? join(dist, 'index.html') : join(dist, page.chemin, 'index.html');
      await mkdir(dirname(cible), { recursive: true });
      await writeFile(cible, html, 'utf8');
    }

    await ecrireSitemap(pages, origine);
    await ecrireRobots(origine);

    console.log(`Pré-rendu : ${pages.length - echecs.length}/${pages.length} pages écrites`);
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

/** Balisage structuré d'un guide : article + fil d'Ariane. */
function donneesGuide(guide, canonique, origine) {
  const donnees = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.titre,
      description: guide.description,
      inLanguage: 'fr',
      datePublished: guide.miseAJour,
      dateModified: guide.miseAJour,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonique },
      author: { '@type': 'Organization', name: 'Pièci', url: `${origine}/` },
      publisher: { '@type': 'Organization', name: 'Pièci', url: `${origine}/` },
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

  return donnees
    .map((d) => `  <script type="application/ld+json">${JSON.stringify(d)}</script>\n`)
    .join('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
