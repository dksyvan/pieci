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

/**
 * Version d'essai du mode diagnostic de la lecture (src/lib/lecture/diagnostic.ts).
 *
 * Le drapeau n'est lu QUE dans l'environnement du processus, jamais dans un
 * fichier .env : un .env.local oublié (ignoré par git) l'aurait activé sans
 * bruit. Et la version d'essai s'écrit dans dist-essai.local/, pas dans le
 * dist/ que wrangler.toml publie : un `wrangler deploy` lancé après un essai ne
 * peut pas la mettre en ligne (relevé en revue).
 *
 * Procédure : `node scripts/copier-ocr.mjs && npx tsc -b &&
 * VITE_DIAGNOSTIC_LECTURE=1 npx vite build`, puis servir ce dossier (par
 * exemple `VITE_DIAGNOSTIC_LECTURE=1 npx vite preview --host`). Pas de
 * pré-rendu : scripts/prerender.mjs écrit dans dist/, il refuse donc de tourner
 * avec le drapeau (plugin ci-dessous), et la page se construit dans le
 * navigateur.
 *
 * Sous PowerShell, le drapeau reste posé pour toute la session :
 * `$env:VITE_DIAGNOSTIC_LECTURE='1'; npx vite build`, puis
 * `Remove-Item Env:VITE_DIAGNOSTIC_LECTURE` avant tout `npm run build` (qui,
 * sinon, échoue au pré-rendu : c'est voulu). Sur le téléphone, même réseau
 * Wi-Fi : l'adresse « Network » de `vite preview --host`, suivie de
 * `/declarer?diagnostic`. En HTTP, pas de viseur dans la page : c'est
 * l'appareil photo du système qui s'ouvre (voir camera.ts).
 */
const ESSAI_DIAGNOSTIC = process.env.VITE_DIAGNOSTIC_LECTURE === '1'
/** Suffixe « .local » : ignoré par git (app/.gitignore), comme tout ce qui ne vaut que sur ce poste. */
const DOSSIER_ESSAI = 'dist-essai.local'

function gardeVersionEssai(): Plugin {
  return {
    name: 'pieci:garde-version-essai',
    config(config, { command }) {
      if (!ESSAI_DIAGNOSTIC) return
      // Build de publication (intégration continue, Cloudflare) : jamais la version d'essai.
      if (command === 'build' && (process.env.CI || process.env.CF_PAGES || process.env.WORKERS_CI)) {
        throw new Error('VITE_DIAGNOSTIC_LECTURE=1 refusé dans un build de publication (CI).')
      }
      // Serveur en mode intergiciel : c'est scripts/prerender.mjs, qui écrirait dans dist/.
      if (command === 'serve' && config.server?.middlewareMode) {
        throw new Error(`Version d'essai : pas de pré-rendu (il écrirait dans dist/). Construire avec « npx vite build » vers ${DOSSIER_ESSAI}/.`)
      }
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
    // Version d'essai à part : voir ESSAI_DIAGNOSTIC.
    build: ESSAI_DIAGNOSTIC ? { outDir: DOSSIER_ESSAI } : {},
    resolve: {
      alias: { '@partage': partage },
    },
    // Transmis au code de lecture (src/lib/lecture/moteur.ts) et au service
    // worker, qui en fait la clé de son cache : `define` s'applique aussi à la
    // construction du service worker par vite-plugin-pwa.
    define: {
      __OCR_DOSSIER__: JSON.stringify(DOSSIER_OCR),
      // Mode diagnostic de la lecture (src/lib/lecture/diagnostic.ts) : compilé
      // seulement pour la version d'essai (voir ESSAI_DIAGNOSTIC). Partout
      // ailleurs `false`, et le code qu'il garde est supprimé du build.
      __DIAGNOSTIC_LECTURE__: JSON.stringify(ESSAI_DIAGNOSTIC),
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
      gardeVersionEssai(),
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