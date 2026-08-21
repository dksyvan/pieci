# Brancher un nom de domaine

## Ce qui est déjà prêt

L'origine publique du site n'est plus écrite en dur. Elle vient de
`VITE_SITE_URL`, que Vite substitue dans `index.html` au moment du build —
balises Open Graph, Twitter Card et JSON-LD comprises. Le jour du changement,
**une seule valeur bouge**.

## La bascule, dans l'ordre

### 1. Acheter le domaine

Chez Cloudflare de préférence : le DNS est alors déjà au bon endroit, il n'y a
pas de délégation de serveurs de noms à faire.

### 2. L'attacher au Worker

Tableau de bord Cloudflare → **Workers & Pages** → projet `pieci` → **Settings**
→ **Domains & Routes** → *Add Custom Domain*.

Cloudflare crée l'enregistrement DNS et le certificat TLS tout seul si le
domaine est chez lui. La propagation prend de quelques minutes à quelques
heures.

### 3. Changer la variable

Toujours dans le projet Cloudflare → **Settings** → **Variables and Secrets** :

```
VITE_SITE_URL = https://pieci.ci
```

Puis **redéployer** — la variable est lue au build, pas à l'exécution. Un
simple changement de variable sans redéploiement ne suffit pas.

### 4. Rafraîchir le cache des aperçus

WhatsApp et Facebook gardent l'ancien aperçu en mémoire. Le
[debugger Facebook](https://developers.facebook.com/tools/debug/) force la
relecture : coller la nouvelle URL, cliquer *Scrape Again*.

### 5. Vérifier

```bash
curl -s https://pieci.ci | grep -E 'og:url|og:image'
```

Les deux doivent afficher le nouveau domaine. S'ils montrent encore
`workers.dev`, le redéploiement n'a pas eu lieu.

## L'API : faut-il un sous-domaine ?

Aujourd'hui l'API répond sur `pieci.onrender.com`. Lui donner
`api.pieci.ci` est possible — Render → Settings → Custom Domain — mais **ce
n'est pas urgent** : l'URL de l'API n'est jamais vue par un utilisateur.

Si tu le fais, trois endroits changent :

| Où | Variable |
|---|---|
| Cloudflare (projet web) | `VITE_API_URL` |
| `mobile/eas.json` | `EXPO_PUBLIC_API_URL`, dans les trois profils |
| `mobile/src/lib/api.ts` | la valeur de repli |

⚠️ Changer l'URL de l'API **casse les applications mobiles déjà installées**,
qui ont l'ancienne compilée dedans. À faire avant la première publication sur
les stores, ou jamais.

## Ce qui reste en dur

Le domaine `pieci.ci` est cité en exemple dans quelques textes d'interface et
de documentation. Ce sont des mentions rédactionnelles, sans effet technique.
