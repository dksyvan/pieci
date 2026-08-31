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
 * Il fait le même métier sur les fiches `/piece/:id`, pour une raison
 * jumelle : ce qui distingue une fiche d'une autre, ce sont les balises que
 * lisent WhatsApp et Facebook au moment du partage. Elles ne peuvent pas être
 * écrites au build — la pièce n'existait pas — ni par React, que ces robots
 * n'exécutent pas. Le bord est le seul endroit qui voie passer la requête et
 * sache de quelle pièce il s'agit.
 *
 * Ce Worker n'intercepte que ces deux familles de chemins et `/api/*` (voir
 * `run_worker_first` dans wrangler.toml) : tout le reste du site part du
 * serveur d'assets sans passer par ici, donc sans coût ni risque ajoutés.
 *
 * Deux écritures, indissociables : les nombres dans le HTML pour les robots,
 * et le même agrégat dans `window.__PIECI_STATS__` pour que le premier rendu
 * React reproduise exactement ce texte (voir src/lib/stats.ts). En cas de
 * panne ou de lenteur de l'API, la page statique part telle quelle — le
 * registre ne doit jamais attendre son compteur.
 */

import { depuisPieceBrute } from '../../shared/api-types.ts';
import { descriptionDePartage, nomPublic, titreDePartage } from '../../shared/partage.ts';

/** Réponse d'API au-delà de laquelle on renonce : le keep-warm rend une
 * attente plus longue anormale, et la page se suffit sans ses comptes. */
const DELAI_STATS_MS = 1500;

/** Durée de cache des comptes au bord. Dix minutes de retard sur un compteur
 * est invisible ; dix requêtes par seconde vers Render ne le serait pas. */
const CACHE_STATS_S = 600;

/** Préfixe sous lequel l'API est servie depuis notre propre domaine. */
const PREFIXE_API = '/api';

/** Préfixe des fiches partagées, servies par le gabarit `/piece`. */
const PREFIXE_FICHE = '/piece/';

/**
 * Attente maximale pour la fiche d'une pièce.
 *
 * Plus généreuse que pour les comptes, et pour une raison : sans elle la page
 * part sans balises d'aperçu, et un lien sans aperçu dans un fil WhatsApp
 * ressemble à un lien douteux — personne ne l'ouvre. Mieux vaut attendre un
 * peu que partager une vignette vide.
 */
const DELAI_FICHE_MS = 3000;

/**
 * En-têtes de saut : ils décrivent le lien entre deux machines voisines, pas
 * le message transporté. Un intermédiaire doit les consommer, jamais les
 * relayer (RFC 9110 §7.6.1).
 *
 * `expect` n'est pas là par principe : `curl` l'envoie dès qu'un corps dépasse
 * le kilooctet, l'amont répond alors « 100 Continue », et un statut sous 200
 * ne peut pas servir à construire une `Response`. Le relais tombait sur tout
 * envoi de photo.
 */
const ENTETES_DE_SAUT = [
  'connection',
  'expect',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // L'API passe par notre domaine : voir relayerApi() pour le pourquoi.
    if (url.pathname === PREFIXE_API || url.pathname.startsWith(`${PREFIXE_API}/`)) {
      return relayerApi(request, url, env);
    }

    const statique = () => env.ASSETS.fetch(request);

    if (request.method !== 'GET') return statique();

    // Les fiches partagées : un gabarit unique, habillé pièce par pièce.
    if (url.pathname.startsWith(PREFIXE_FICHE)) return servirFiche(request, url, env);

    const [page, stats] = await Promise.all([statique(), chargerStats(env)]);

    const type = page.headers.get('content-type') ?? '';
    if (!stats || !type.includes('text/html')) return page;

    const compteListe = comptePourChemin(stats, url.pathname);

    return new HTMLRewriter()
      .on('span[data-compte="liste"]', new Remplaceur(formater(compteListe)))
      .on('span[data-compte="total"]', new Remplaceur(formater(stats.total)))
      .on('head', new InjecteurStats(stats))
      .transform(page);
  },
};

/**
 * Relaie `/api/*` vers l'API applicative.
 *
 * Trois raisons, dans l'ordre d'importance :
 *
 * 1. Les bloqueurs de traqueurs coupent `onrender.com` — un domaine
 *    d'hébergeur mutualisé, présent dans leurs listes. Le site s'affichait
 *    alors parfaitement, mais le registre restait vide : la panne la plus
 *    trompeuse qui soit. Servi depuis pieci.ci, l'appel ne ressemble plus à
 *    un appel tiers, parce qu'il n'en est plus un.
 * 2. Même origine, donc plus de CORS : plus de requête préalable OPTIONS sur
 *    chaque écriture, et plus de panne muette le jour où l'on ajoute un
 *    domaine sans penser à `FRONTEND_URL`.
 * 3. L'hébergeur cesse d'être exposé dans le code livré au navigateur.
 *
 * Le corps de la requête est transmis tel quel, sans être mis en mémoire :
 * l'envoi de photo peut peser plusieurs mégaoctets.
 */
async function relayerApi(request, url, env) {
  if (!env.API_URL) {
    return Response.json(
      { message: 'API non configurée sur ce déploiement.' },
      { status: 503 },
    );
  }

  const chemin = url.pathname.slice(PREFIXE_API.length) || '/';
  const cible = new URL(chemin + url.search, env.API_URL);

  const enTetesAmont = new Headers(request.headers);
  for (const nom of ENTETES_DE_SAUT) enTetesAmont.delete(nom);

  // Le corps est transmis en flux, sans être mis en mémoire : une photo peut
  // peser plusieurs mégaoctets, et `duplex: 'half'` est ce qui autorise ce
  // flux à circuler.
  const reponse = await fetch(cible, {
    method: request.method,
    headers: enTetesAmont,
    body: request.body,
    duplex: 'half',
  });

  // Un statut hors 200-599 ne peut pas construire une `Response` : plutôt que
  // de laisser l'exception passer pour une panne du site, on la traduit.
  if (reponse.status < 200 || reponse.status > 599) {
    return Response.json(
      { message: `Réponse inattendue de l’API (${reponse.status}).` },
      { status: 502 },
    );
  }

  // Le registre change à chaque déclaration : rien de tout ceci ne doit
  // dormir dans un cache intermédiaire. Seuls les comptes agrégés sont mis en
  // cache, et ils le sont ailleurs (chargerStats).
  const enTetes = new Headers(reponse.headers);
  for (const nom of ENTETES_DE_SAUT) enTetes.delete(nom);
  enTetes.set('cache-control', 'no-store');

  return new Response(reponse.body, {
    status: reponse.status,
    statusText: reponse.statusText,
    headers: enTetes,
  });
}

/**
 * Sert la fiche d'une pièce trouvée.
 *
 * Le gabarit `/piece` est pré-rendu une fois pour toutes ; ce qui change d'une
 * pièce à l'autre, ce sont les balises que lisent WhatsApp, Facebook et les
 * robots d'aperçu. Elles ne peuvent pas être écrites au build — la pièce
 * n'existait pas — ni par React, que ces robots n'exécutent pas. Restait le
 * bord, qui voit passer la requête et sait de quelle pièce il s'agit.
 *
 * Si l'API ne répond pas, ou si la pièce a été restituée, le gabarit part tel
 * quel : le site s'affiche, le client demande la fiche à son tour et dira ce
 * qu'il faut. Une page nue vaut mieux qu'une page absente.
 */
async function servirFiche(request, url, env) {
  const id = url.pathname.slice(PREFIXE_FICHE.length).replace(/\/+$/, '');
  const gabarit = new Request(new URL('/piece', url).toString(), {
    method: 'GET',
    headers: request.headers,
  });

  const [page, brute] = await Promise.all([env.ASSETS.fetch(gabarit), chargerPiece(env, id)]);

  const type = page.headers.get('content-type') ?? '';
  if (!brute || !type.includes('text/html')) return page;

  const piece = depuisPieceBrute(brute);
  const titre = `${titreDePartage(piece)} | Pièci`;
  const description = descriptionDePartage(piece);
  const lien = new URL(`${PREFIXE_FICHE}${id}`, url).toString();

  let rewriter = new HTMLRewriter()
    .on('title', new Remplaceur(titre))
    .on('meta[name="description"]', new Attribut('content', description))
    .on('meta[property="og:title"]', new Attribut('content', titre))
    .on('meta[property="og:description"]', new Attribut('content', description))
    .on('meta[property="og:url"]', new Attribut('content', lien))
    .on('meta[name="twitter:title"]', new Attribut('content', titre))
    .on('meta[name="twitter:description"]', new Attribut('content', description))
    .on('link[rel="canonical"]', new Attribut('href', lien))
    .on('head', new InjecteurFiche(brute));

  // La photo floutée dit mieux que le logo qu'il s'agit d'une vraie
  // déclaration. Ses dimensions ne sont pas celles de l'image par défaut :
  // on retire les deux balises plutôt que d'annoncer un format faux, que les
  // robots d'aperçu utilisent pour réserver la place.
  if (piece.photoFlouteeUrl) {
    rewriter = rewriter
      .on('meta[property="og:image"]', new Attribut('content', piece.photoFlouteeUrl))
      .on('meta[name="twitter:image"]', new Attribut('content', piece.photoFlouteeUrl))
      .on('meta[property="og:image:alt"]', new Attribut('content', `Photo floutée de la pièce déclarée au nom de ${nomPublic(piece)}`))
      .on('meta[property="og:image:width"]', new Retrait())
      .on('meta[property="og:image:height"]', new Retrait());
  }

  const reponse = rewriter.transform(page);

  // Une fiche change d'état — elle sort du registre à la restitution. Un cache
  // long ferait vivre son aperçu bien après.
  const enTetes = new Headers(reponse.headers);
  enTetes.set('cache-control', 'public, max-age=0, s-maxage=60');
  return new Response(reponse.body, { status: reponse.status, headers: enTetes });
}

/** Une pièce du registre public — ou `null`, sans jamais jeter. */
async function chargerPiece(env, id) {
  if (!env.API_URL || !id) return null;
  try {
    const reponse = await fetch(`${env.API_URL}/pieces-trouvees/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(DELAI_FICHE_MS),
    });
    if (!reponse.ok) return null;

    const piece = await reponse.json();
    return typeof piece?.id === 'string' && typeof piece.prenom === 'string' ? piece : null;
  } catch {
    return null;
  }
}

class Attribut {
  constructor(nom, valeur) {
    this.nom = nom;
    this.valeur = valeur;
  }
  element(e) {
    e.setAttribute(this.nom, this.valeur);
  }
}

class Retrait {
  element(e) {
    e.remove();
  }
}

class InjecteurFiche {
  constructor(brute) {
    this.brute = brute;
  }
  element(e) {
    // `<` échappé : un prénom contenant « </script> » terminerait la balise et
    // ferait passer le reste de la fiche pour du balisage. Le cas est absurde,
    // la conséquence ne l'est pas.
    const json = JSON.stringify(this.brute).replace(/</g, '\\u003c');
    e.append(`<script>window.__PIECI_PIECE__=${json}</script>`, { html: true });
  }
}

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
