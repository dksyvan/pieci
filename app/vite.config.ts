import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Code partagé avec l'application mobile — voir shared/README.md */
const partage = fileURLToPath(new URL('../shared', import.meta.url))

/**
 * Pages publiques dignes d'être indexées, avec leur priorité relative. Le
 * suivi (`/suivi`) est une consultation par numéro : aucune valeur pour un
 * moteur de recherche, donc absent.
 */
const PAGES: Array<{ chemin: string; priorite: string }> = [
  { chemin: '/', priorite: '1.0' },
  { chemin: '/declarer', priorite: '0.9' },
  { chemin: '/perdu', priorite: '0.9' },
  { chemin: '/trouvees', priorite: '0.7' },
  { chemin: '/carte', priorite: '0.5' },
  { chemin: '/soutenir', priorite: '0.4' },
]

/**
 * Émet un sitemap.xml au build, à partir de la même origine que les balises
 * Open Graph. Google ne peut indexer que ce qu'il découvre ; sans carte, un
 * domaine neuf sans liens entrants reste invisible.
 */
function sitemap(origine: string): Plugin {
  return {
    name: 'pieci-sitemap',
    apply: 'build',
    generateBundle() {
      const base = origine.replace(/\/+$/, '')
      const date = new Date().toISOString().slice(0, 10)
      const urls = PAGES.map(
        (p) =>
          `  <url>\n    <loc>${base}${p.chemin}</loc>\n    <lastmod>${date}</lastmod>\n    <priority>${p.priorite}</priority>\n  </url>`,
      ).join('\n')

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const origine = env.VITE_SITE_URL || 'https://pieci.ci'

  return {
    resolve: {
      alias: { '@partage': partage },
    },
    // Le dossier partagé vit hors de la racine du projet : il faut l'autoriser
    // explicitement, sinon le serveur de dev refuse de le servir.
    server: {
      fs: { allow: ['..', partage] },
    },
    plugins: [
      react(),
      tailwindcss(),
      sitemap(origine),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html}'],
        },
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Pièci — Ta pièce retrouvée',
          short_name: 'Pièci',
          description:
            "Pièci — la plateforme ivoirienne qui rapproche automatiquement les pièces d'identité trouvées et leurs propriétaires.",
          lang: 'fr',
          start_url: '/',
          display: 'standalone',
          background_color: '#F4F2EC',
          theme_color: '#F4F2EC',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    test: {
      environment: 'node',
      // Les tests du code partagé tournent avec la suite du web : c'est ici que
      // vivent Vitest et ses types.
      include: ['src/**/*.test.{ts,tsx}', '../shared/**/*.test.ts'],
    },
  }
})