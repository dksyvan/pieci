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

export const TYPE_ICONES: Record<TypePiece, string> = {
  CNI: '',
  Passeport: '📘',
  'Permis de conduire': '🚗',
  'Carte étudiante': '🎓',
  'Carte consulaire': '🛂',
};

/** Coordonnées géographiques (latitude / longitude). */
export interface Coordonnees {
  lat: number;
  lng: number;
}

/**
 * Forme commune à une trouvaille et à une alerte de perte pour les besoins
 * du matching : identité de la pièce + position + date.
 */
export interface PersonnePiece extends Coordonnees {
  nom: string;
  prenom: string;
  typePiece: TypePiece;
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
