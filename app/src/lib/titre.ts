import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PAGES_FIXES } from '../contenu/pages';
import { GUIDES } from '../contenu';

/** Titre par défaut : pages sans métadonnées propres, comme le suivi. */
const DEFAUT = 'Pièci — Ta pièce retrouvée';

/**
 * Titre d'une page à partir de son chemin. La même table sert au pré-rendu
 * (scripts/prerender.mjs) et à la navigation côté client : un titre ajouté ici
 * apparaît des deux côtés, sans risque de divergence.
 */
function titrePour(chemin: string): string {
  const propre = chemin.length > 1 ? chemin.replace(/\/+$/, '') : chemin;

  const fixe = PAGES_FIXES.find((p) => p.chemin === propre);
  if (fixe) return fixe.titre;

  const slug = propre.startsWith('/guides/') ? propre.slice('/guides/'.length) : null;
  const guide = slug ? GUIDES.find((g) => g.slug === slug) : undefined;
  if (guide) return `${guide.titre} | Pièci`;

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
