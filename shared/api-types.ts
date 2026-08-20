import type { TypePiece } from './types';

/**
 * Formes échangées avec l'API NestJS.
 *
 * Les *types* sont partagés entre le web et le mobile ; le *client* HTTP, lui,
 * reste propre à chaque plateforme — l'URL de base ne se lit pas au même
 * endroit (`import.meta.env` contre `process.env`) et l'envoi de photo attend
 * un `File` d'un côté, un `{ uri, name, type }` de l'autre. Forcer une
 * abstraction commune sur ces deux points coûterait plus qu'elle ne rapporte.
 */

/** Identité de contact (compte par téléphone, sans inscription visible). */
export interface IdentiteContact {
  telephone: string;
  prenom: string;
  nom: string;
  email?: string;
}

export interface PointDepotApi {
  id: string;
  nom: string;
  typeLieu: string;
  commune: string;
  adresse: string | null;
  telephone: string | null;
  horaires: string | null;
  lat: number;
  lng: number;
}

/** Pièce trouvée telle qu'exposée publiquement : identité partiellement masquée. */
export interface PieceTrouveePublique {
  id: string;
  typePiece: TypePiece;
  prenom: string;
  nomInitiale: string;
  commune: string;
  quartier: string | null;
  dateTrouvaille: string;
  photoFlouteeUrl: string | null;
  depotNom: string | null;
  lat: number;
  lng: number;
}

/** Forme brute renvoyée par `v_pieces_trouvees_publiques` (snake_case). */
export interface PieceTrouveePubliqueBrute {
  id: string;
  type_piece: TypePiece;
  prenom: string;
  nom_initiale: string;
  commune: string;
  quartier: string | null;
  date_trouvaille: string;
  photo_floutee_url: string | null;
  depot_nom: string | null;
  lat: number;
  lng: number;
}

export interface NouvellePieceTrouvee {
  declarant: IdentiteContact;
  typePiece: TypePiece;
  prenom: string;
  nom: string;
  commune: string;
  quartier?: string;
  lat: number;
  lng: number;
  pointDepotId?: string;
  pointDepotAutre?: string;
  photoOriginaleUrl?: string;
  photoFlouteeUrl?: string;
}

/** URLs des deux versions d'une photo téléversée. */
export interface PhotoUploadee {
  photoOriginaleUrl: string;
  photoFlouteeUrl: string;
}

export interface NouvelleAlertePerte {
  utilisateur: IdentiteContact;
  typePiece: TypePiece;
  prenom: string;
  nom: string;
  commune?: string;
  quartier?: string;
  lat?: number;
  lng?: number;
}

export type NiveauConfiance = 'forte' | 'probable' | 'a_verifier';
export type StatutCorrespondance = 'suggeree' | 'confirmee' | 'rejetee';

export interface CorrespondancePiece {
  id: string;
  typePiece: TypePiece;
  prenom: string;
  nom: string;
  commune: string;
  quartier: string | null;
  dateTrouvaille: string;
  photoFlouteeUrl: string | null;
}

export interface CorrespondanceAlerte {
  id: string;
  typePiece: TypePiece;
  prenom: string;
  nom: string;
  commune: string | null;
  quartier: string | null;
}

/**
 * Vue d'une correspondance pour l'une des deux parties : aucune donnée de
 * contact tant que `statut !== 'confirmee'`.
 */
export interface Correspondance {
  id: string;
  score: number;
  niveauConfiance: NiveauConfiance;
  statut: StatutCorrespondance;
  dateCalcul: string;
  pieceTrouvee: CorrespondancePiece;
  alertePerte: CorrespondanceAlerte;
  confirmeParMoi: boolean;
  confirmeParAutre: boolean;
}

/** Coordonnées de l'autre partie, révélées une fois la correspondance confirmée. */
export interface ContactInfo {
  prenom: string;
  nom: string;
  telephone: string;
  email: string | null;
}

/** Convertit la forme snake_case du serveur vers celle utilisée par les apps. */
export function depuisPieceBrute(p: PieceTrouveePubliqueBrute): PieceTrouveePublique {
  return {
    id: p.id,
    typePiece: p.type_piece,
    prenom: p.prenom,
    nomInitiale: p.nom_initiale,
    commune: p.commune,
    quartier: p.quartier,
    dateTrouvaille: p.date_trouvaille,
    photoFlouteeUrl: p.photo_floutee_url,
    depotNom: p.depot_nom,
    lat: p.lat,
    lng: p.lng,
  };
}
