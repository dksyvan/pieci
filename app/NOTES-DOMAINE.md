# Le nom de domaine

`pieci.ci` est en service depuis août 2026. Registrar **Safaricloud**, DNS et
TLS chez **Cloudflare**.

## Ce qui a réellement marché

Cloudflare ne vend pas de `.ci` — il faut passer par un registrar accrédité
ARTCI. Le domaine est donc acheté ailleurs, puis **délégué** à Cloudflare.

1. Créer la zone chez Cloudflare (*Add a domain*, plan Free) **avant** de
   valider la commande, pour récupérer les deux serveurs de noms.
2. Chez le registrar, remplacer ses serveurs par ceux de Cloudflare et
   **supprimer les autres**. En laisser un crée des réponses DNS incohérentes.
3. Ne créer aucun enregistrement DNS à la main. Cloudflare refuse d'attacher un
   domaine personnalisé à un nom d'hôte qui a déjà un CNAME — « corriger » les
   avertissements de la console casse l'étape suivante.
4. Worker `pieci` → Settings → **Domains & Routes** → *Add Custom Domain*.
5. Variable de build (voir plus bas), puis redéployer.

Le registre `.ci` n'est pas instantané : compter quelques heures entre le
paiement et l'apparition du domaine. Vérification depuis la source :

```bash
nslookup -type=NS pieci.ci ns.nic.ci
```

## Ce qu'il ne faut PAS acheter

| Proposé par le registrar | Pourquoi refuser |
|---|---|
| Certificat SSL | Cloudflare émet et renouvelle le sien, gratuitement |
| Hébergement web | Le site est un Worker, l'API est sur Render |
| Redirection courriel | Cloudflare Email Routing le fait sans frais |

## Le piège des variables

Le Worker a **deux** sections de variables. Elles ne font pas la même chose.

| Section | Agit | Pour `VITE_*` |
|---|---|---|
| Settings → **Runtime** → Variables and secrets | à l'exécution | ❌ sans effet |
| Settings → **Build** → Variables and secrets | pendant `npm run build` | ✅ ici |

Vite fige la valeur dans `index.html` à la compilation. Une variable posée côté
Runtime ne changera jamais rien, et le symptôme — des balises de partage qui
gardent l'ancienne adresse — n'oriente pas vers la cause.

Après modification : **Retry build**. Si le résultat semble périmé, *Clear
Cache* dans la section Build.

## Changer de domaine à nouveau

Une seule valeur bouge : `VITE_SITE_URL`. Elle alimente `og:url`, `og:image`,
`twitter:image` et le JSON-LD, par substitution de `%VITE_SITE_URL%`.

Puis vider le cache des aperçus sur le [débogueur Facebook](https://developers.facebook.com/tools/debug/)
— pour la nouvelle URL **et pour l'ancienne**, sans quoi ceux qui ont déjà reçu
l'ancien lien garderont l'ancien aperçu.

L'avertissement `fb:app_id` du débogueur est **du bruit** : cette balise ne sert
qu'aux statistiques de Facebook Analytics, outil abandonné. Elle n'affecte pas
l'aperçu.

## L'API

Elle répond sur `pieci.onrender.com`. Lui donner `api.pieci.ci` est possible
mais sans urgence — cette URL n'est jamais vue par un utilisateur.

⚠️ La changer **casse les applications mobiles déjà installées**, qui ont
l'ancienne compilée dedans. À faire avant la première publication sur les
stores, ou jamais.