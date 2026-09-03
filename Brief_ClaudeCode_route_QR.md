# Brief technique — Route `/qr` avec suivi des scans

*À transmettre à Claude Code dans le dépôt Pièci.*

---

## 1. Objectif

Faire pointer tous les QR codes (polo, casquette, flyers, stickers) vers une adresse **de notre propre domaine**, pour deux raisons :

1. **Mesurer** combien de scans viennent de chaque support (savoir si le merch fonctionne).
2. **Ne jamais dépendre d'un raccourcisseur externe** qui pourrait expirer et casser des vêtements déjà imprimés.

---

## 2. URL à encoder dans le QR

```
https://pieci.ci/qr?s=polo
```

Le paramètre `s` (source) identifie le support :

| Support | URL à encoder |
|---|---|
| Polo (dos) | `https://pieci.ci/qr?s=polo` |
| Casquette | `https://pieci.ci/qr?s=casquette` |
| Flyer | `https://pieci.ci/qr?s=flyer` |
| Sticker (points de dépôt) | `https://pieci.ci/qr?s=sticker` |
| Kakémono / événement | `https://pieci.ci/qr?s=event` |

---

## 3. Comportement attendu

`GET /qr?s=<source>` doit :

1. **Enregistrer le scan** (source, date/heure, user-agent).
2. **Rediriger en 302** vers :
   `https://pieci.ci/?utm_source=merch&utm_medium=qr&utm_campaign=<source>`
3. Être **instantané** — pas d'écran intermédiaire, pas d'attente de la base : la redirection ne doit jamais être bloquée par l'enregistrement (log en asynchrone / *fire and forget*).
4. Fonctionner même si `s` est absent ou inconnu → valeur par défaut `inconnu`, et rediriger quand même.

---

## 4. Implémentation suggérée

Le front est déployé sur **Cloudflare Pages** : le plus simple et le plus rapide est une **Pages Function** côté serveur (redirection HTTP réelle, sans charger le SPA).

Créer `app/functions/qr.ts` :

- lire `s` depuis la query string,
- envoyer le log vers l'API NestJS (`POST /scans-qr`) **sans attendre la réponse** (`ctx.waitUntil`),
- retourner une `Response` 302 avec l'en-tête `Location` vers l'accueil + UTM.

Côté **API NestJS**, ajouter :

- une entité `scans_qr` : `id`, `source`, `user_agent`, `created_at`
- un endpoint public `POST /scans-qr` (rate-limité)
- un endpoint `GET /scans-qr/stats` (protégé) renvoyant le total et le détail par source et par jour.

---

## 5. ⚠️ Contrainte de confidentialité (principe non négociable du projet)

**Ne pas stocker d'adresse IP.** Ce n'est pas nécessaire pour ce besoin : on veut juste compter les scans par support.

Si une donnée géographique est souhaitée plus tard, utiliser uniquement le **pays** fourni par Cloudflare (`request.cf.country`), jamais l'IP brute. Aucune donnée ne doit permettre d'identifier une personne.

---

## 6. Tests attendus

- `/qr?s=polo` redirige bien en 302 vers l'accueil avec les UTM.
- `/qr` sans paramètre fonctionne et enregistre `inconnu`.
- Une panne de l'API n'empêche **jamais** la redirection.
- Un scan est bien enregistré en base.

---

## 7. Prompt à copier-coller dans Claude Code

> Ajoute une route `/qr` sur le front (Cloudflare Pages Function dans `app/functions/qr.ts`) qui :
> 1. lit le paramètre `s` (source du QR : polo, casquette, flyer, sticker, event ; défaut `inconnu`),
> 2. enregistre le scan via un appel asynchrone à l'API (`POST /scans-qr`) **sans bloquer la réponse** (`ctx.waitUntil`),
> 3. renvoie une redirection **302** vers `https://pieci.ci/?utm_source=merch&utm_medium=qr&utm_campaign=<source>`.
>
> Côté API NestJS, crée l'entité `scans_qr` (`id`, `source`, `user_agent`, `created_at`), l'endpoint public rate-limité `POST /scans-qr`, et un endpoint protégé `GET /scans-qr/stats` (total, par source, par jour).
>
> **Important : ne stocke aucune adresse IP** — c'est contraire au principe de confidentialité du projet (section 2 du `CLAUDE.md`). La redirection doit fonctionner même si l'API est indisponible. Ajoute une migration et des tests.

---

## 8. Après le déploiement

Générer le QR code avec ces paramètres :

- Contenu : `https://pieci.ci/qr?s=polo`
- Format : **SVG** (vectoriel, pour l'impression)
- **Correction d'erreur : niveau H** (30 %) — indispensable sur textile, tolère les plis et l'usure
- Couleur des modules : **bleu nuit `#0F2A43`** sur fond **blanc**
- Option : logo Pièci au centre (possible grâce au niveau H)

👉 **Tester le scan sur le tissu imprimé avant de lancer la série complète.**
