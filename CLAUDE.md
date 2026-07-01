# Pièci — Contexte projet (à lire par Claude Code)

## 1. Le produit

**Pièci** est une plateforme web (mobile-first) pour la Côte d'Ivoire qui met en relation :
- les personnes qui **trouvent** une pièce d'identité égarée (elles la déclarent),
- les personnes qui l'ont **perdue** (elles sont notifiées automatiquement).

Remplace l'usage actuel des statuts WhatsApp (éphémères, non cherchables) par une base durable, cherchable et géolocalisée, avec **matching automatique**.

**Slogan :** « Ta pièce retrouvée. »

## 2. Principes non négociables

- **Confidentialité by design** : en public, n'afficher que `prénom + initiale du nom + type + commune/quartier + date relative + photo floutée`. **Jamais** le numéro de pièce ni le nom complet, ni la `photoOriginaleUrl`. Le contact ne se révèle qu'après mise en relation confirmée.
- **Mobile-first**, PWA installable (Android/iOS/web).
- **Récupération sûre** : remise via points de dépôt (mairies, commissariats, etc.) ou un point libre saisi par le déclarant (`point_depot_autre`), pas de rencontre privée imposée.

## 3. État du projet : fonctionnalités terminées

Toutes les fonctionnalités prévues (déclaration, alertes, matching, confirmation, notifications, expiration à 90 jours, upload photo + floutage, PWA) sont **implémentées et testées en local**. Le projet est en cours de **mise en prod** (voir section 6).

## 4. Stack réelle

- **Frontend** (`app/`) : Vite + React 19 + TypeScript + Tailwind v4 + Leaflet (carte) + vite-plugin-pwa.
- **Backend** (`api/`) : NestJS 11 + TypeORM 0.3 + PostgreSQL/PostGIS.
- **Auth** : par numéro de téléphone (find-or-create, pas d'OTP implémenté pour l'instant).
- **Photos** : upload → pipeline `sharp` (rotate, resize 1600px, clone, blur sigma 25, export webp) → **Supabase Storage** (bucket public `photos`, dossiers `originales/` et `floutees/`, noms = UUID). Confidentialité : repose sur la non-divulgation de l'URL originale (jamais renvoyée par l'API publique) + l'imprévisibilité de l'UUID, pas sur des permissions de bucket séparées.

## 5. Logique métier : algorithme de matching

Rapprochement perte ↔ trouvaille par **score de confiance** pondéré, porté en TypeScript dans `api/src/matching/` :
- Similarité nom **45 %** (Levenshtein + similarité par jetons, normalisation sans accents — tolère fautes et variantes type « N'Guessan »/« Nguessan »)
- Similarité prénom **20 %**
- Type de pièce **20 %** (correspondance exacte)
- Proximité géographique **10 %** (Haversine + décroissance `exp(-d/25)`)
- Proximité temporelle **5 %** (`exp(-jours/30)`)

Seuil d'affichage `score ≥ 0.55`. Bandes : ≥0,80 *forte* · 0,65–0,80 *probable* · 0,55–0,65 *à vérifier*.
Mise à l'échelle : *blocking* par `typePiece|commune` + pré-filtre géographique PostGIS (GIST) avant calcul du score.

## 6. Modèle de données (réel, voir `api/src/database/migrations/`)

Types de pièces : `CNI`, `Passeport`, `Permis de conduire`, `Carte étudiante`, `Carte consulaire`.

Entités principales : `utilisateurs`, `points_depot` (géo PostGIS), `pieces_trouvees` (géo, `quartier`, `point_depot_id` ou `point_depot_autre`, `photo_originale_url`/`photo_floutee_url`, `statut`, expiration 90 jours), `alertes_perte` (même logique côté perte), `correspondances` (score, niveau_confiance, statut, double confirmation trouveur/demandeur), `notifications`, `journal_acces_contact`. Vue publique `v_pieces_trouvees_publiques` (exclut tout champ sensible).

## 7. Charte graphique (design tokens)

```
--orange:#F77F2E   (primaire, actions, identité CI)
--green:#13A05C    (succès, "retrouvé", confiance)
--night:#0F2A43    (texte, en-têtes, sérieux)
--cream:#F7F5F0    (fond)
--sun:#FFC542      (accent, badges)
--red:#E5484D      (erreurs)
```
Typo : titres **Sora** (700/800), corps **Inter**. Logo : pin + carte d'identité + coche verte (`logo_pieci_concept.svg`).
Ton : confiance (français clair) sur les écrans sensibles ; chaleur (nouchi maîtrisé) en communication.

## 8. Mise en prod — stack gratuite (en cours)

Contrainte forte : **zéro coût**, app à but non lucratif.

- **Frontend** → Cloudflare Pages (root dir `app`, build `npm run build`, output `dist`, env `VITE_API_URL`)
- **API** → Render free web service (root dir `api`, build `npm install && npm run build`, start `npm run start:prod`)
- **DB + Storage** → Supabase free (Postgres+PostGIS, Storage bucket `photos`)

### Statut actuel
- ✅ **Supabase** : projet créé (ref `kdmjuoxvpfgnjptrdyst`), migrations exécutées (PostGIS/pg_trgm/unaccent/uuid-ossp activés, schéma complet créé), upload photo testé bout-en-bout (URLs publiques `https://kdmjuoxvpfgnjptrdyst.supabase.co/storage/v1/object/public/photos/...` confirmées accessibles).
- ✅ **GitHub** : repo `dksyvan/pieci` connecté.
- ⚠️ **Render** : service `pieci` déployé (`https://pieci.onrender.com`) mais répond **502** au démarrage — cause non identifiée, à diagnostiquer via les logs Render (suspects : root directory ≠ `api`, variable d'env manquante, ou connexion DB Supabase).
- ❌ **Cloudflare Pages** : pas encore configuré correctement. Première tentative = un **Worker** créé par erreur (au lieu d'un projet **Pages**) avec root `/app` et `npx wrangler deploy` — à refaire en choisissant l'option **Pages** dans le flux de création, pas Worker.

### Variables d'environnement API (`api/.env`, jamais commité)
`DATABASE_URL`, `DB_SSL=true`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=photos`, `FRONTEND_URL` (à renseigner avec l'URL Cloudflare Pages une fois connue, pour restreindre le CORS — actuellement permissif tant qu'elle est vide). Mêmes valeurs à reporter dans les variables d'environnement Render (sauf `PORT`, géré automatiquement par Render).

### Prochaines étapes
1. Diagnostiquer et corriger le 502 Render (lire les logs).
2. Recréer le projet Cloudflare Pages (pas Worker) avec `VITE_API_URL=https://pieci.onrender.com`.
3. Une fois Cloudflare Pages déployé, ajouter son URL dans `FRONTEND_URL` sur Render et redéployer l'API.
4. Vérifier le flux complet en prod (déclarer une pièce, upload photo, matching, confirmation).

## 9. Conventions

- Code et commentaires : français pour le métier, anglais possible pour le technique.
- Tests unitaires pour l'algorithme de matching (cas : accents, fautes, noms inversés, mauvais type, personne différente).
- Toujours respecter le principe de confidentialité (section 2) dans chaque écran et chaque endpoint.
- Ne jamais committer `api/.env` ni `app/.env.local` (secrets). `app/.env` (valeur `VITE_API_URL` locale) est commité sans risque : les variables `VITE_*` sont toujours publiques côté client, et Cloudflare Pages l'écrase via sa propre variable d'environnement au build.
