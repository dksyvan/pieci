# Déploiement de Pièci (gratuit)

Guide pas-à-pas pour mettre Pièci en production sans frais :
**Cloudflare Pages** (frontend), **Render** (API), **Supabase** (base de
données PostGIS + stockage des photos). À faire ensemble, étape par étape.

## 1. Supabase (base de données + stockage photos)

1. Créer un compte sur https://supabase.com (gratuit, sans carte bancaire).
2. Créer un nouveau projet (choisir une région proche, ex. Europe).
   Noter le mot de passe de base de données choisi à la création.
3. **Connexion à la base** : *Project Settings → Database → Connection
   string* (onglet "URI"). Copier l'URL — elle ressemble à
   `postgres://postgres:<mot-de-passe>@db.xxxx.supabase.co:5432/postgres`.
4. **Stockage des photos** : *Storage → New bucket* → nom `photos` → cocher
   **Public bucket**.
5. **Clé d'accès serveur** : *Project Settings → API → Project API keys →
   service_role* (secret — ne jamais l'utiliser côté frontend ni la commiter).
6. Renseigner `api/.env` (copier `api/.env.example` si besoin) :
   ```
   DATABASE_URL=<connection string Supabase de l'étape 3>
   DB_SSL=true
   SUPABASE_URL=https://<projet>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<clé service_role de l'étape 5>
   SUPABASE_STORAGE_BUCKET=photos
   ```
7. Appliquer le schéma à la base Supabase (depuis `api/`) :
   ```
   npm run migration:run
   ```
   La première migration active automatiquement PostGIS, pg_trgm et unaccent
   — rien d'autre à faire côté extensions.
8. Tester en local : relancer l'API (`npm run start:dev`), déclarer une pièce
   trouvée avec photo depuis l'app — la photo doit apparaître dans
   *Storage → photos* sur le dashboard Supabase, et la version floutée doit
   s'afficher dans la liste/carte.

## 2. GitHub

1. Créer un dépôt **vide** (sans README/licence) sur https://github.com,
   ex. `pieci`.
2. Depuis la racine du projet :
   ```
   git remote add origin <url-du-depot>
   git push -u origin main
   ```

## 3. Render (API)

1. Créer un compte sur https://render.com (gratuit, sans carte bancaire).
2. *New → Web Service* → connecter le dépôt GitHub `pieci`.
3. Configuration :
   - **Root Directory** : `api`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm run start:prod`
   - **Instance Type** : Free
4. Onglet *Environment* → ajouter toutes les variables de `api/.env`
   (`DATABASE_URL`, `DB_SSL=true`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=photos`).
   `FRONTEND_URL` sera ajoutée à l'étape 5.
5. Déployer et noter l'URL générée (ex. `https://pieci-api.onrender.com`).

   ⚠️ Le service gratuit se met en veille après ~15 min sans requête ; la
   première requête après une veille peut prendre 30-60s (cold start).

## 4. Cloudflare Pages (frontend)

1. Créer un compte sur https://dash.cloudflare.com (gratuit, sans carte).
2. *Workers & Pages → Create → Pages* → connecter le dépôt GitHub `pieci`.
3. Configuration :
   - **Root Directory** : `app`
   - **Build Command** : `npm install && npm run build`
   - **Build Output Directory** : `dist`
4. Variable d'environnement : `VITE_API_URL` = URL Render de l'étape 3
   (ex. `https://pieci-api.onrender.com`).
5. Déployer et noter l'URL générée (ex. `https://pieci.pages.dev`).

## 5. Finaliser le CORS

Retourner sur Render (étape 3 → *Environment*) et ajouter la variable
`FRONTEND_URL` = URL Cloudflare Pages de l'étape 4 (ex.
`https://pieci.pages.dev`), puis redéployer l'API.

## 6. Vérification finale

- Ouvrir l'URL Cloudflare Pages : la carte et la liste des pièces trouvées
  doivent se charger (l'API peut prendre 30-60s à se réveiller la première
  fois).
- Déclarer une pièce trouvée avec photo et vérifier qu'elle apparaît
  (photo floutée visible, position correcte sur la carte).
- Installer la PWA sur un téléphone (HTTPS fourni automatiquement par
  Cloudflare Pages).
