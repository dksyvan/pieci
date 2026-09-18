import type { RaisonPhotoAbsente, TypePiece } from './types';

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

/**
 * Pièce trouvée telle qu'exposée publiquement.
 *
 * Le nom de famille en capitales et les seules initiales du prénom : c'est le
 * patronyme qui déclenche la reconnaissance chez un tiers, et jamais les deux
 * en entier. Le prénom complet ne quitte pas la base — la vue SQL ne le
 * sélectionne pas. Les coordonnées sont arrondies à l'échelle du quartier.
 */
export interface PieceTrouveePublique {
  id: string;
  typePiece: TypePiece;
  /** Nom de famille, en capitales : « N'GUESSAN », « TIÉ BI ». */
  nom: string;
  /** Initiales du prénom avec leur point : « A. », « S-Y. », « M.A. » — ou null. */
  prenomInitiales: string | null;
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
  nom: string;
  prenom_initiales: string | null;
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
  /**
   * Pourquoi la déclaration part sans photo — une valeur de la liste fermée,
   * jamais de texte libre. L'API l'efface dès qu'une photo floutée accompagne
   * la déclaration, et ne la renvoie nulle part : elle ne sert qu'à la mesure.
   */
  photoAbsenteRaison?: RaisonPhotoAbsente;
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
  /**
   * Prénom tel que le voit la partie qui consulte : en entier pour le
   * trouveur, qui l'a lui-même déclaré ; réduit aux initiales pour le
   * demandeur, qui doit le connaître sans qu'on le lui montre.
   */
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
  /** Pour le trouveur seulement ; null pour le demandeur (voir l'API). */
  score: number | null;
  niveauConfiance: NiveauConfiance | null;
  statut: StatutCorrespondance;
  dateCalcul: string;
  pieceTrouvee: CorrespondancePiece;
  alertePerte: CorrespondanceAlerte;
  confirmeParMoi: boolean;
  confirmeParAutre: boolean;
  /**
   * Vrai quand le demandeur doit d'abord répondre au défi des prénoms avant
   * de pouvoir confirmer. Toujours faux pour le trouveur.
   */
  defiRequis?: boolean;
}

/** Coordonnées de l'autre partie, révélées une fois la correspondance confirmée. */
export interface ContactInfo {
  prenom: string;
  nom: string;
  telephone: string;
  email: string | null;
}

/**
 * Convertit la forme snake_case du serveur vers celle utilisée par les apps.
 *
 * Défensive sur le nom : le service worker peut servir, hors ligne, une
 * réponse mise en cache avant le changement de la vue publique. Mieux vaut un
 * nom vide qu'« undefined » dans un message partagé.
 */
export function depuisPieceBrute(p: PieceTrouveePubliqueBrute): PieceTrouveePublique {
  return {
    id: p.id,
    typePiece: p.type_piece,
    nom: typeof p.nom === 'string' ? p.nom : '',
    prenomInitiales: typeof p.prenom_initiales === 'string' ? p.prenom_initiales : null,
    commune: p.commune,
    quartier: p.quartier,
    dateTrouvaille: p.date_trouvaille,
    photoFlouteeUrl: p.photo_floutee_url,
    depotNom: p.depot_nom,
    lat: p.lat,
    lng: p.lng,
  };
}

/**
 * Un lieu nommé proche d'une position, proposé au déclarant.
 *
 * Jumeau de `Repere` dans `api/src/reperes/photon.ts` : l'API se compile seule,
 * sans alias vers `shared/`, la forme est donc écrite des deux côtés.
 */
export interface RepereApi {
  /** Ce qui s'affiche, et ce qui part dans le champ : « Carrefour Timotel ». */
  nom: string;
  /** Mètres, arrondis. Sert à ordonner, et à dire « à 80 m ». */
  distance: number;
}

/** Réponse de `GET /reperes?lat=&lng=`. */
export interface ReperesAutour {
  reperes: RepereApi[];
  /** Le quartier, quand la carte le connaît : « Niangon Sud ». */
  quartier: string | null;
}
