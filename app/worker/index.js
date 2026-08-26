/**
 * Worker de bord : sert les fichiers pré-rendus et, sur les pages du registre,
 * y écrit les comptes vivants.
 *
 * Le problème qu'il règle : le pré-rendu fige les pages dans leur état de
 * chargement, si bien qu'un robot lisait « — / — entrées » et concluait à une
 * page morte. Servir la liste elle-même exposerait des données personnelles
 * dans des caches qui survivent des mois à la restitution ; servir le *compte*
 * donne le signal de vie sans exposer personne.
 *
 * Ce Worker n'intercepte que `/trouvees` et ses déclinaisons (voir
 * `run_worker_first` dans wrangler.toml) : tout le reste du site part du
 * serveur d'assets sans passer par ici, donc sans coût ni risque ajoutés.
 *
 * Deux écritures, indissociables : les nombres dans le HTML pour les robots,
 * et le même agrégat dans `window.__PIECI_STATS__` pour que le premier rendu
 * React reproduise exactement ce texte (voir src/lib/stats.ts). En cas de
 * panne ou de lenteur de l'API, la page statique part telle quelle — le
 * registre ne doit jamais attendre son compteur.
 */

/** Réponse d'API au-delà de laquelle on renonce : le keep-warm rend une
 * attente plus longue anormale, et la page se suffit sans ses comptes. */
const DELAI_STATS_MS = 1500;

/** Durée de cache des comptes au bord. Dix minutes de retard sur un compteur
 * est invisible ; dix requêtes par seconde vers Render ne le serait pas. */
const CACHE_STATS_S = 600;

export default {
  async fetch(request, env) {
    const statique = () => env.ASSETS.fetch(request);

    if (request.method !== 'GET') return statique();

    const [page, stats] = await Promise.all([statique(), chargerStats(env)]);

    const type = page.headers.get('content-type') ?? '';
    if (!stats || !type.includes('text/html')) return page;

    const compteListe = comptePourChemin(stats, new URL(request.url).pathname);

    return new HTMLRewriter()
      .on('span[data-compte="liste"]', new Remplaceur(formater(compteListe)))
      .on('span[data-compte="total"]', new Remplaceur(formater(stats.total)))
      .on('head', new InjecteurStats(stats))
      .transform(page);
  },
};

/** Miroir du format côté client (src/lib/stats.ts) : quatre chiffres. */
function formater(valeur) {
  return String(valeur).padStart(4, '0');
}

class Remplaceur {
  constructor(texte) {
    this.texte = texte;
  }
  element(e) {
    e.setInnerContent(this.texte);
  }
}

class InjecteurStats {
  constructor(stats) {
    this.stats = stats;
  }
  element(e) {
    // Script classique en tête : il s'exécute avant le bundle (module différé),
    // donc avant l'hydratation qui en dépend.
    e.append(`<script>window.__PIECI_STATS__=${JSON.stringify(this.stats)}</script>`, {
      html: true,
    });
  }
}

/**
 * Compte propre à la page : total sur /trouvees, compte de la commune ou du
 * type sur une page filtrée. Un segment qui ne correspond à aucun agrégat vaut
 * zéro — c'est le cas d'une commune sans aucune pièce, et le HTML de repli
 * (page inconnue) n'a de toute façon aucun marqueur à réécrire.
 */
function comptePourChemin(stats, chemin) {
  const segment = chemin.split('/')[2];
  if (!segment) return stats.total;

  for (const groupe of [stats.parCommune, stats.parType]) {
    for (const [nom, n] of Object.entries(groupe)) {
      if (slugifier(nom) === segment) return n;
    }
  }
  return 0;
}

/**
 * Miroir de `slugifier` dans src/contenu/registre.ts. Dupliqué sciemment :
 * le Worker est empaqueté seul par wrangler, sans les alias du build Vite, et
 * dix lignes recopiées coûtent moins qu'un couplage de configuration. Si la
 * version du site change, celle-ci doit suivre.
 */
function slugifier(valeur) {
  return valeur
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Les comptes, depuis le cache de bord ou l'API — ou `null`, sans jamais jeter. */
async function chargerStats(env) {
  try {
    const reponse = await fetch(`${env.API_URL}/pieces-trouvees/stats`, {
      signal: AbortSignal.timeout(DELAI_STATS_MS),
      cf: { cacheTtl: CACHE_STATS_S, cacheEverything: true },
    });
    if (!reponse.ok) return null;

    const stats = await reponse.json();
    return typeof stats?.total === 'number' &&
      typeof stats.parCommune === 'object' &&
      typeof stats.parType === 'object'
      ? stats
      : null;
  } catch {
    return null;
  }
}
