# Passer le projet Pièci sur Claude Code

Ce guide explique comment continuer la construction de l'appli **réelle** (full-stack) dans Claude Code.

## 1. Installer Claude Code

Dans un terminal :

```bash
npm install -g @anthropic-ai/claude-code
```

(Pré-requis : Node.js installé. Sur Windows, tu peux utiliser le terminal PowerShell ou Git Bash.)

## 2. Ouvrir le projet

Place-toi dans le dossier du projet, puis lance Claude Code :

```bash
cd "APPLICATION POUR RECHERCHER SA PIÈCE D'IDENTITÉ ÉGARÉE EN CI"
claude
```

Claude Code lira automatiquement le fichier **`CLAUDE.md`** (tout le contexte du projet y est) ainsi que les documents de Phase 1 et 2.

## 3. Prompt de démarrage (à copier-coller dans Claude Code)

> Je continue le projet **Pièci** décrit dans `CLAUDE.md`. On a déjà un prototype React dans `Pieci_prototype.html` (UI + algorithme de matching de référence) et les specs dans les fichiers `Phase1_*` et `Phase2_*`.
>
> Objectif : construire la vraie application full-stack. Commence par :
> 1. Initialiser un dépôt **Vite + React + TypeScript + Tailwind** dans un sous-dossier `app/`, en reprenant les design tokens et les composants du prototype.
> 2. Porter l'algorithme de matching en **TypeScript** dans un module `src/lib/matching.ts`, avec des **tests unitaires** (accents, fautes de frappe, noms inversés, mauvais type, personne différente).
> 3. Me proposer le schéma de base de données (PostgreSQL + PostGIS) avant de l'implémenter.
>
> Respecte strictement le principe de confidentialité de la section 2 du `CLAUDE.md`. Avance étape par étape et montre-moi le résultat avant de passer à la suite.

## 4. Conseils

- Laisse Claude Code travailler **par étapes** et valide à chaque palier (comme on l'a fait ici).
- Pour les services externes (SMS/WhatsApp, hébergement), prépare les comptes en parallèle.
- Garde ce dossier comme **source de vérité** : tout nouveau choix produit doit être reporté dans `CLAUDE.md`.

## 5. Ce qui est déjà prêt dans ce dossier

| Fichier | Contenu |
|---|---|
| `CLAUDE.md` | Contexte complet pour Claude Code |
| `Phase1_Dossier_Pieci.md` | Marché, nom, charte, organigramme |
| `Phase2_Specs_et_Algorithmes.md` | Specs + algorithme détaillé |
| `Phase2_Plan_Lancement.md` | Marketing & Community Management |
| `Pieci_prototype.html` | Prototype React fonctionnel (référence) |
| `logo_pieci_concept.svg` | Logo |
