# Pièci — Contexte projet (à lire par Claude Code)

> Ce fichier donne le contexte complet du projet. Les détails sont dans les fichiers `Phase1_Dossier_Pieci.md`, `Phase2_Specs_et_Algorithmes.md`, `Phase2_Plan_Lancement.md` et le prototype `Pieci_prototype.html` (référence visuelle et logique).

## 1. Le produit

**Pièci** est une plateforme web (mobile-first) pour la Côte d'Ivoire qui met en relation :
- les personnes qui **trouvent** une pièce d'identité égarée (elles la déclarent),
- les personnes qui l'ont **perdue** (elles sont notifiées automatiquement).

Remplace l'usage actuel des statuts WhatsApp (éphémères, non cherchables) par une base durable, cherchable et géolocalisée, avec **matching automatique**.

**Slogan :** « Ta pièce retrouvée. »

## 2. Principes non négociables

- **Confidentialité by design** : en public, n'afficher que `prénom + initiale du nom + type + commune + date relative + photo floutée`. **Jamais** le numéro de pièce ni le nom complet. Le contact ne se révèle qu'après mise en relation confirmée.
- **Mobile-first** : la majorité des utilisateurs sont sur smartphone (4G). Performance et légèreté prioritaires.
- **Récupération sûre** : remise via points de dépôt (mairies, commissariats), pas de rencontre privée imposée.

## 3. Logique métier : algorithme de matching

Rapprochement perte ↔ trouvaille par **score de confiance** pondéré :
- Similarité nom **45 %** (Levenshtein + similarité par jetons, normalisation sans accents — tolère fautes et variantes type « N'Guessan »/« Nguessan »)
- Similarité prénom **20 %**
- Type de pièce **20 %** (correspondance exacte)
- Proximité géographique **10 %** (Haversine + décroissance `exp(-d/25)`)
- Proximité temporelle **5 %** (`exp(-jours/30)`)

Seuil d'affichage `score ≥ 0.55`. Bandes : ≥0,80 *forte* · 0,65–0,80 *probable* · 0,55–0,65 *à vérifier*.
**Implémentation de référence fonctionnelle dans `Pieci_prototype.html`** (fonctions `normaliser`, `levenshtein`, `tokenSet`, `simNom`, `haversine`, `scoreMatch`, `trouverMatches`). À porter en TypeScript côté backend.
Mise à l'échelle : *blocking* par `typePiece|commune` + pré-filtre phonétique des noms.

## 4. Modèle de données

```
Trouvaille { id, typePiece, nom, prenom, commune, lat, lng, dateTrouvee, pointDepot, photoUrl, photoFloutee, contact, statut }
AlertePerte { id, typePiece, nom, prenom, communeProbable, lat, lng, dateCreation, contact, statut }
MiseEnRelation { id, trouvailleId, alerteId, score, statut, dateContact }
Utilisateur { id, telephone (auth OTP), nom, role }
PointDepot { id, nom, commune, lat, lng, type }
```

Types de pièces : `CNI`, `Passeport`, `Permis de conduire`, `Carte étudiante`, `Carte consulaire`.

## 5. Charte graphique (design tokens)

```
--orange:#F77F2E   (primaire, actions, identité CI)
--green:#13A05C    (succès, "retrouvé", confiance)
--night:#0F2A43    (texte, en-têtes, sérieux)
--cream:#F7F5F0    (fond)
--sun:#FFC542      (accent, badges)
--red:#E5484D      (erreurs)
```
Typo : titres **Sora** (700/800), corps **Inter**. Logo : pin + carte d'identité + coche verte (voir `logo_pieci_concept.svg`).
Ton : confiance (français clair) sur les écrans sensibles ; chaleur (nouchi maîtrisé) en communication.

## 6. Stack recommandée (full-stack réel)

- **Frontend** : React + Vite + TypeScript + Tailwind (reprendre l'UI du prototype).
- **Carte** : Leaflet + OpenStreetMap.
- **Backend + DB + Auth + Storage** : Next.js (App Router) **ou** Supabase (PostgreSQL + PostGIS pour la géo, Auth téléphone/OTP, Storage pour les photos).
- **Auth** : par numéro de téléphone (OTP SMS) — adapté au marché CI.
- **Notifications** : SMS et/ou WhatsApp Business API.
- **Photos** : upload + **floutage automatique** des zones sensibles (numéro, date de naissance) avant publication.

> Alternatives acceptables : Node/Fastify + Postgres, ou Firebase. Choisir selon l'aisance de l'équipe.

## 7. Feuille de route de build

1. Init repo (Vite+TS+Tailwind), porter les tokens et les composants du prototype.
2. Schéma DB + migrations (+ PostGIS).
3. API : CRUD trouvailles/alertes + endpoint de matching (porter l'algorithme en TS + tests unitaires).
4. Auth OTP téléphone.
5. Upload photo + floutage automatique.
6. Notifications (SMS/WhatsApp) sur match.
7. Carte + points de dépôt.
8. Modération + tableau de bord admin.
9. Tests, accessibilité, déploiement.

## 8. Conventions

- Code et commentaires : français pour le métier, anglais possible pour le technique.
- Écrire des **tests unitaires** pour l'algorithme de matching (cas : accents, fautes, noms inversés, mauvais type, personne différente).
- Toujours respecter le principe de confidentialité (section 2) dans chaque écran et chaque endpoint.
