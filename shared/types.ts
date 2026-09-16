/**
 * Types de pièces d'identité gérées par Pièci (cf. CLAUDE.md section 4).
 */
export type TypePiece =
  | 'CNI'
  | 'Passeport'
  | 'Permis de conduire'
  | 'Carte étudiante'
  | 'Carte consulaire';

export const TYPES_PIECE: TypePiece[] = [
  'CNI',
  'Passeport',
  'Permis de conduire',
  'Carte étudiante',
  'Carte consulaire',
];

/**
 * Raisons pour lesquelles une déclaration part sans photo de la pièce.
 *
 * Liste fermée, sans texte libre : elle sert à mesurer combien de personnes
 * empruntent la sortie « sans photo », et pourquoi, pour savoir si l'on peut
 * rendre la photo obligatoire. `non_precisee` n'est jamais proposée à l'écran :
 * le formulaire la pose lui-même quand on publie via « Saisir à la main » sans
 * photo ni raison, au lieu de bloquer. Le sens de chaque valeur est détaillé
 * dans le jumeau de l'API.
 *
 * Jumeau de `api/src/pieces-trouvees/raisons-photo.ts` : l'API se compile
 * seule et ne peut pas importer ce fichier. Les deux listes sont comparées par
 * `api/src/pieces-trouvees/pieces-trouvees.service.test.ts`, qui lit celle-ci
 * en texte — garder la forme `[ 'a', 'b', … ] as const` sur une seule
 * déclaration. Toute valeur hors liste est refusée par l'API (400).
 */
export const RAISONS_PHOTO_ABSENTE = [
  'plus_en_main',
  'appareil',
  'photo_ratee',
  'prefere_pas',
  'autre',
  'non_precisee',
] as const;

export type RaisonPhotoAbsente = (typeof RAISONS_PHOTO_ABSENTE)[number];

/** Coordonnées géographiques (latitude / longitude). */
export interface Coordonnees {
  lat: number;
  lng: number;
}

/**
 * Forme commune à une trouvaille et à une alerte de perte pour les besoins
 * du matching : identité de la pièce + position + date.
 */
export interface PersonnePiece {
  nom: string;
  prenom: string;
  typePiece: TypePiece;
  /**
   * Position, quand on l'a. Le lieu est facultatif à la déclaration d'une
   * perte — quelqu'un qui a perdu sa pièce ne sait pas toujours où. Une
   * alerte sans position doit rester appariable : l'identité et le type
   * pèsent 0,85 à eux seuls, très au-dessus du seuil de rétention.
   */
  lat: number | null;
  lng: number | null;
  /** Date ISO 8601 (trouvaille) ou date de création de l'alerte (perte). */
  date: string;
}

/** Pièce trouvée, telle que publiée par un "bon samaritain". */
export interface Trouvaille extends PersonnePiece {
  id: number;
  commune: string;
  depot: string;
  contact: string;
}
