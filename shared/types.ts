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
