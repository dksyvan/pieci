/**
 * Modèle de contenu des guides.
 *
 * Ces pages existent pour une raison précise : quelqu'un qui vient de perdre
 * sa pièce tape sa détresse dans Google avant de connaître Pièci. Le guide
 * doit d'abord lui être *utile* — répondre vraiment à sa question, y compris
 * quand la réponse ne nous concerne pas — puis lui montrer que le registre
 * existe. Un guide qui ne sert qu'à ramener du trafic se repère et se punit,
 * par le lecteur comme par Google.
 *
 * Le contenu est structuré plutôt qu'en markdown : il est ainsi pré-rendu en
 * HTML sémantique, dans la grammaire visuelle du reste du site, et typé.
 */

/** Un bloc de contenu à l'intérieur d'une section. */
export type Bloc =
  | { type: 'paragraphe'; texte: string }
  | { type: 'liste'; items: string[] }
  | { type: 'etapes'; items: Array<{ titre: string; texte: string }> }
  | { type: 'encadre'; titre: string; texte: string }
  | { type: 'tableau'; entetes: string[]; lignes: string[][] };

export interface Section {
  /** Devient un <h2> et une ancre. */
  titre: string;
  blocs: Bloc[];
}

export interface Guide {
  /** Segment d'URL : /guides/<slug>. Choisi pour correspondre à une recherche réelle. */
  slug: string;
  /** <title> et <h1>. Sous 60 caractères pour ne pas être tronqué par Google. */
  titre: string;
  /** <meta description>. Entre 120 et 155 caractères : c'est ce qui décide du clic. */
  description: string;
  /** Chapô affiché sous le titre. */
  chapo: string;
  /** Date de dernière révision, ISO. Google valorise la fraîcheur sur les démarches. */
  miseAJour: string;
  /** Question exacte à laquelle ce guide répond, telle qu'on la taperait. */
  question: string;
  sections: Section[];
  /** Slugs d'autres guides à proposer en fin de page. Le maillage interne compte. */
  connexes?: string[];
}