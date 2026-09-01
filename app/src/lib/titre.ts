import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PAGES_FIXES } from '../contenu/pages';
import { GUIDES } from '../contenu';
import { pageRegistreParSlug } from '../contenu/registre';

/** Titre par défaut, pour un chemin qu'on ne reconnaît pas. */
const DEFAUT = 'Pièci — Ta pièce retrouvée';

/**
 * Pages volontairement absentes du sitemap, qui méritent tout de même un
 * titre à elles. `/suivi` est une consultation par numéro de téléphone : rien
 * à y indexer, mais quelqu'un qui garde l'onglet ouvert en attendant une
 * correspondance doit pouvoir le retrouver parmi ses autres onglets.
 */
const HORS_SITEMAP: Record<string, string> = {
  '/suivi': 'Mes correspondances — suivre ma déclaration | Pièci',
  '/piece': 'Pièce trouvée — fiche du registre | Pièci',
  '/saisie': 'Saisie en série — vider un tiroir de pièces | Pièci',
};

/**
 * Titre d'une page à partir de son chemin. La même table sert au pré-rendu
 * (scripts/prerender.mjs) et à la navigation côté client : un titre ajouté ici
 * apparaît des deux côtés, sans risque de divergence.
 */
function titrePour(chemin: string): string {
  const propre = chemin.length > 1 ? chemin.replace(/\/+$/, '') : chemin;

  const fixe = PAGES_FIXES.find((p) => p.chemin === propre);
  if (fixe) return fixe.titre;

  if (propre in HORS_SITEMAP) return HORS_SITEMAP[propre];

  const slug = propre.startsWith('/guides/') ? propre.slice('/guides/'.length) : null;
  const guide = slug ? GUIDES.find((g) => g.slug === slug) : undefined;
  if (guide) return `${guide.titre} | Pièci`;

  // La fiche d'une pièce précise son propre titre une fois chargée (voir
  // pages/Piece.tsx) : ici on ne donne que le titre d'attente, celui que porte
  // l'onglet pendant que la fiche arrive.
  if (propre.startsWith('/piece/')) return HORS_SITEMAP['/piece'];

  if (propre.startsWith('/trouvees/')) {
    const page = pageRegistreParSlug(propre.slice('/trouvees/'.length));
    if (page) return page.titre;
  }

  return DEFAUT;
}

/**
 * Tient le titre de l'onglet à jour pendant la navigation.
 *
 * Le HTML pré-rendu porte déjà le bon titre au premier chargement — c'est lui
 * que voient les moteurs. Mais une navigation côté client ne recharge pas le
 * document : sans ce crochet, l'onglet garderait le titre de la page d'entrée,
 * et l'historique du navigateur deviendrait illisible.
 */
export function useTitreDePage(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titrePour(pathname);
  }, [pathname]);
}
