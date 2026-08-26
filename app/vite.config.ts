import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Code partagé avec l'application mobile — voir shared/README.md */
const partage = fileURLToPath(new URL('../shared', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Chargé pour la substitution de %VITE_SITE_URL% dans index.html ; le
  // sitemap, lui, est écrit par scripts/prerender.mjs, qui connaît la liste
  // complète des pages — guides compris.
  loadEnv(mode, process.cwd(), '')

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