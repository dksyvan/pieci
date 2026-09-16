import { rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Code partagé avec l'application mobile — voir shared/README.md */
const partage = fileURLToPath(new URL('../shared', import.meta.url))

/**
 * Nom du dossier des fichiers du moteur de lecture (public/ocr/<nom>/), défini
 * une seule fois dans scripts/copier-ocr.mjs, qui les y copie. Import par URL :
 * le script est du JavaScript sans déclaration de types, et une URL absolue
 * reste juste quand Vite compile cette configuration dans un dossier temporaire.
 */
const { DOSSIER_OCR } = (await import(new URL('./scripts/copier-ocr.mjs', import.meta.url).href)) as {
  DOSSIER_OCR: string
}

/**
 * Vite recopie public/ tel quel, fichiers cachés compris : public/ocr/.gitignore
 * (qui écarte de git les fichiers du moteur) arriverait dans dist/, et wrangler
 * le publierait sous /ocr/.gitignore — il n'ignore d'office que .assetsignore,
 * _headers et _redirects. On le retire du build une fois écrit.
 */
function sansGitignoreOcr(): Plugin {
  let sortie = ''
  return {
    name: 'pieci:ocr-sans-gitignore',
    apply: 'build',
    configResolved(config) {
      sortie = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      rmSync(join(sortie, 'ocr', '.gitignore'), { force: true })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Chargé pour la substitution de %VITE_SITE_URL% dans index.html, et pour
  // savoir vers quoi relayer /api en développement. Le sitemap, lui, est écrit
  // par scripts/prerender.mjs, qui connaît la liste complète des pages.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    resolve: {
      alias: { '@partage': partage },
    },
    // Transmis au code de lecture (src/lib/lecture/moteur.ts) et au service
    // worker, qui en fait la clé de son cache : `define` s'applique aussi à la
    // construction du service worker par vite-plugin-pwa.
    define: {
      __OCR_DOSSIER__: JSON.stringify(DOSSIER_OCR),
    },
    // Le dossier partagé vit hors de la racine du projet : il faut l'autoriser
    // explicitement, sinon le serveur de dev refuse de le servir.
    server: {
      fs: { allow: ['..', partage] },
      // En production, /api est relayé vers l'API par le Worker Cloudflare
      // (app/worker/index.js). Le serveur de développement fait la même chose,
      // pour que le chemin emprunté soit le même des deux côtés : sans cela,
      // le relais ne serait jamais exercé avant la mise en ligne.
      proxy: {
        '/api': {
          target: env.API_URL_DEV || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (chemin) => chemin.replace(/^\/api/, ''),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      sansGitignoreOcr(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html}'],
          // Le moteur de lecture n'est PAS précaché : ~6 Mo (cœur ~3,8 Mo par
          // variante, modèles) que chaque visiteur téléchargerait à
          // l'installation du service worker, alors que seuls ceux qui
          // déclarent une pièce s'en servent. Et les cœurs dépassent la limite
          // de 2 Mio de Workbox, qui fait ÉCHOUER le build (vite-plugin-pwa
          // 1.x lève une erreur au lieu d'avertir). Ils sont mis en cache à la
          // première lecture, par la route /ocr/ de src/sw.js.
          globIgnores: ['ocr/**'],
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
          // Même valeur que le <meta name="theme-color"> de index.html : les
          // deux teintent la même barre de navigateur, et divergeraient sans
          // que rien ne le signale.
          theme_color: '#0F2A43',
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