/**
 * Le libellé qu'un repère écrit dans le champ de lieu.
 *
 * Hors du composant parce que c'est la seule chose que la personne relira
 * avant de publier, et que ça se teste seul — sans navigateur, sans rendu.
 */

/** Deux noms de lieu qui désignent le même endroit, accents et casse mis à part. */
export function memeLieu(a: string, b: string): boolean {
  const propre = (x: string) =>
    x
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  return propre(a) === propre(b);
}

/**
 * Ce qu'on écrit dans le champ quand un repère est touché.
 *
 * Le quartier n'est ajouté que s'il apprend quelque chose. La carte rend
 * souvent le nom de la commune à la place du quartier — « Yopougon » quand
 * aucun quartier n'est cartographié — et « Ciné Cool, Yopougon » sur une fiche
 * qui affiche déjà « Commune : Yopougon » juste en dessous fait passer une
 * aide pour du remplissage.
 */
export function libelle(nom: string, quartier: string | null, commune: string): string {
  if (!quartier) return nom;
  if (memeLieu(quartier, commune)) return nom;
  if (nom.toLowerCase().includes(quartier.toLowerCase())) return nom;
  return `${nom}, ${quartier}`;
}

/**
 * Lieu écrit librement, commune déduite.
 *
 * Une liste de communes demandait à quelqu'un qui pense « Gesco » de traduire
 * en « Yopougon » — une commune d'un million d'habitants, qui ne dit presque
 * rien à celui qui cherche sa pièce. On demande donc l'endroit tel qu'on le
 * nomme, et la commune se déduit (voir `shared/lieux.ts`).
 *
 * La déduction est toujours montrée, avec de quoi la corriger. Ce n'est pas
 * une politesse : elle tolère les fautes de frappe, donc elle se trompe
 * parfois — « Kouassi » est à une lettre de « Koumassi ». Un rapprochement
 * silencieux enverrait la pièce sur la mauvaise page de registre sans que
 * personne ne puisse s'en apercevoir.
 */
