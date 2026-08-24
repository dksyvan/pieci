# keep-warm — maintien en éveil de l'API

Petit Worker Cloudflare qui empêche l'instance Render gratuite de s'endormir,
et donc supprime les ~33 secondes de réveil pour le visiteur.

## Ce qu'il fait

Toutes les 10 minutes, de 06h à minuit (heure de Côte d'Ivoire), il appelle
`https://pieci.onrender.com/sante`. Render ne voyant jamais 15 minutes de
silence, l'instance reste chaude sur cette plage.

La nuit (minuit–06h), il laisse Render s'endormir : presque personne ne déclare
une pièce à 3h, et le front affiche de toute façon un état « le registre se
réveille » pour le rare visiteur nocturne.

## Pourquoi pas 24h/24

Le palier gratuit de Render plafonne à **750 heures d'instance par mois** et par
espace de travail. Un éveil permanent en consomme ~730–744 : presque tout, sans
marge. La plage 06h–minuit tombe à **~547 h/mois** — de la marge, et aucun
risque de suspension.

## Déploiement (une seule fois)

Depuis ce dossier :

```bash
npx wrangler deploy
```

`wrangler` demandera de te connecter à ton compte Cloudflare au premier appel.
La cron s'active automatiquement — rien d'autre à faire.

Alternative sans ligne de commande : tableau de bord Cloudflare → **Workers &
Pages** → *Create* → coller `src/index.js` → onglet *Triggers* → *Cron
Triggers* → ajouter `*/10 6-23 * * *`.

## Vérifier

- Visiter l'URL du Worker (`https://pieci-keep-warm.<compte>.workers.dev`)
  déclenche un ping immédiat et affiche le temps de réponse de Render.
- Dans les logs du Worker, chaque exécution de la cron apparaît toutes les
  10 minutes sur la plage active.

## Le jour où tu passes Render en Starter

Ce Worker devient inutile — le palier payant ne s'endort pas. Le supprimer
(dashboard → Settings → Delete) ou le laisser : il ne fait alors qu'un ping
sans effet, sans coût.