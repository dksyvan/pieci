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

/**
 * Un lien dans le fil du texte.
 *
 * Il en faut, et ce n'est pas une concession : renvoyer vers l'ONECI, vers
 * rnpp.ci ou vers le 1340 est ce qui rend ces pages utilisables. Un guide sur
 * le duplicata d'une CNI qui ne dit pas *où* acheter le timbre ne sert à
 * personne, et Google le sait aussi bien que le lecteur.
 */
export interface Lien {
  /** Texte visible. Il doit décrire la destination : « liste des centres
   *  d'enrôlement », jamais « ici » ni « ce lien ». */
  texte: string;
  /**
   * Destination. Trois formes, distinguées au rendu :
   * - interne (« /perdu ») → navigation sans rechargement ;
   * - externe (« https://… ») → nouvel onglet, `rel="noopener"` ;
   * - téléphone (« tel:1340 ») → composeur, dans le même onglet.
   */
  href: string;
}

/**
 * Texte d'un bloc.
 *
 * La forme courte — une simple chaîne — couvre le cas ordinaire et laisse les
 * vingt-trois guides déjà écrits tels quels. Le tableau ne sert que lorsqu'un
 * lien traverse la phrase : `['Payez le timbre sur ', {texte: 'rnpp.ci', href:
 * 'https://rnpp.ci'}, ', et gardez le reçu.']`.
 */
export type Texte = string | Array<string | Lien>;

/** Un bloc de contenu à l'intérieur d'une section. */
export type Bloc =
  | { type: 'paragraphe'; texte: Texte }
  | { type: 'liste'; items: Texte[] }
  | { type: 'etapes'; items: Array<{ titre: string; texte: Texte }> }
  | { type: 'encadre'; titre: string; texte: Texte }
  | { type: 'tableau'; entetes: string[]; lignes: Texte[][] };

export interface Section {
  /** Devient un <h2> et une ancre. */
  titre: string;
  blocs: Bloc[];
}

/**
 * Une question fréquente.
 *
 * Le même objet nourrit le texte affiché et le `FAQPage` du balisage
 * structuré. C'est volontaire et c'est la seule garantie qui tienne : Google
 * exige que les questions déclarées soient celles que le visiteur lit, et une
 * seconde liste tenue à part finirait par diverger sans que rien ne le
 * signale. Ici, diverger est impossible — il n'y a qu'une liste.
 */
export interface Question {
  question: string;
  reponse: Texte;
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
  /**
   * Encadré d'alerte en tête d'article, avant même le sommaire.
   *
   * Réservé à ce qui doit être lu avant le reste : une procédure non
   * confirmée, une information en cours de vérification. Distinct d'un bloc
   * `encadre`, qui conseille au fil du texte — celui-ci prévient.
   */
  avertissement?: { titre: string; texte: Texte };
  sections: Section[];
  /** Questions fréquentes, en fin d'article. Reprises en `FAQPage`. */
  faq?: Question[];
  /**
   * Brouillon : la page se construit et se lit à son adresse, mais elle est
   * en `noindex`, absente du sitemap, absente de l'index /guides et des
   * « à lire aussi ».
   *
   * Sert à faire relire un article en ligne, dans sa vraie mise en page, sans
   * l'exposer aux moteurs. Une page à moitié publiée est pire qu'une page
   * absente : Google l'indexe en quelques heures et la garde des semaines.
   */
  brouillon?: true;
  /**
   * Adresses alternatives, redirigées définitivement vers `slug`.
   *
   * Un même sujet ne doit avoir qu'une page. Quand une seconde adresse a été
   * annoncée ailleurs — un brief, une affiche, un ancien lien — elle est
   * inscrite ici et redirige, plutôt que de devenir une page jumelle qui se
   * disputerait la même requête avec l'originale.
   */
  alias?: string[];
  /** Slugs d'autres guides à proposer en fin de page. Le maillage interne compte. */
  connexes?: string[];
}

/**
 * Réduit un `Texte` à sa chaîne visible.
 *
 * Utilisé par le balisage structuré, qui ne peut pas contenir de HTML, et par
 * les tests. Le passage par cette fonction est ce qui garantit que le
 * `FAQPage` déclare mot pour mot ce qui est affiché.
 */
export function texteBrut(texte: Texte): string {
  if (typeof texte === 'string') return texte;
  return texte.map((part) => (typeof part === 'string' ? part : part.texte)).join('');
}

/** Un lien est-il externe au site ? Les liens `tel:` ne le sont pas non plus. */
export function estLienExterne(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
