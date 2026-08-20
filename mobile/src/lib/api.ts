import type { TypePiece } from './types';

/**
 * Client HTTP typé pour l'API Pièci. Miroir de app/src/lib/api.ts — les deux
 * doivent rester alignés : toute route ajoutée côté NestJS se déclare ici et là.
 *
 * L'URL vient de EXPO_PUBLIC_API_URL (fichier .env, lu au build par Expo).
 * Sans variable, on retombe sur la production : une app installée qui pointe
 * vers localhost ne sert à personne.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://pieci.onrender.com';

/** Render endort les instances gratuites : le premier appel peut être long. */
const DELAI_MS = 60_000;

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
interface PieceTrouveePubliqueBrute {
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

export class ApiError extends Error {}

/** Réseau coupé ou serveur injoignable — distinct d'une erreur métier. */
export class ReseauError extends Error {
  constructor(message = 'Pas de connexion. Vérifie ton réseau et réessaie.') {
    super(message);
  }
}

async function verifierReponse(reponse: Response): Promise<void> {
  if (reponse.ok) return;
  const corps = await reponse.json().catch(() => null);
  const message = (corps as { message?: string | string[] } | null)?.message;
  throw new ApiError(
    Array.isArray(message) ? message.join(', ') : (message ?? `Erreur ${reponse.status}`),
  );
}

async function requete<T>(chemin: string, options?: RequestInit): Promise<T> {
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MS);

  let reponse: Response;
  try {
    reponse = await fetch(`${BASE_URL}${chemin}`, {
      ...options,
      signal: controleur.signal,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new ReseauError();
  } finally {
    clearTimeout(minuteur);
  }

  await verifierReponse(reponse);

  if (reponse.status === 204) return undefined as T;
  return (await reponse.json()) as T;
}

/** Préfixe une URL relative avec l'origine de l'API ; laisse les URLs absolues intactes. */
export function urlMedia(chemin: string): string {
  return chemin.startsWith('http') ? chemin : `${BASE_URL}${chemin}`;
}

function depuisPieceBrute(p: PieceTrouveePubliqueBrute): PieceTrouveePublique {
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

export function getPointsDepot(): Promise<PointDepotApi[]> {
  return requete('/points-depot');
}

export async function getPiecesTrouvees(): Promise<PieceTrouveePublique[]> {
  const brutes = await requete<PieceTrouveePubliqueBrute[]>('/pieces-trouvees');
  return brutes.map(depuisPieceBrute);
}

export function creerPieceTrouvee(donnees: NouvellePieceTrouvee): Promise<{ id: string }> {
  return requete('/pieces-trouvees', { method: 'POST', body: JSON.stringify(donnees) });
}

/**
 * Téléverse la photo d'une pièce ; le serveur génère aussi la version floutée.
 * `uri` est le chemin local renvoyé par expo-image-picker.
 */
export async function uploaderPhotoPiece(uri: string): Promise<PhotoUploadee> {
  const nom = uri.split('/').pop() ?? 'piece.jpg';
  const extension = /\.(\w+)$/.exec(nom)?.[1]?.toLowerCase() ?? 'jpg';

  const formData = new FormData();
  // React Native attend cette forme d'objet, pas un Blob.
  formData.append('photo', {
    uri,
    name: nom,
    type: extension === 'png' ? 'image/png' : 'image/jpeg',
  } as unknown as Blob);

  let reponse: Response;
  try {
    reponse = await fetch(`${BASE_URL}/pieces-trouvees/photo`, { method: 'POST', body: formData });
  } catch {
    throw new ReseauError("L'envoi de la photo a échoué. Vérifie ton réseau.");
  }

  await verifierReponse(reponse);
  return (await reponse.json()) as PhotoUploadee;
}

export function creerAlertePerte(donnees: NouvelleAlertePerte): Promise<{ id: string }> {
  return requete('/alertes-perte', { method: 'POST', body: JSON.stringify(donnees) });
}

export function getCorrespondances(telephone: string): Promise<Correspondance[]> {
  return requete(`/correspondances?telephone=${encodeURIComponent(telephone)}`);
}

export function confirmerCorrespondance(id: string, telephone: string): Promise<Correspondance> {
  return requete(`/correspondances/${id}/confirmer`, {
    method: 'POST',
    body: JSON.stringify({ telephone }),
  });
}

export function rejeterCorrespondance(id: string, telephone: string): Promise<Correspondance> {
  return requete(`/correspondances/${id}/rejeter`, {
    method: 'POST',
    body: JSON.stringify({ telephone }),
  });
}

export function obtenirContact(id: string, telephone: string): Promise<ContactInfo> {
  return requete(`/correspondances/${id}/contact`, {
    method: 'POST',
    body: JSON.stringify({ telephone }),
  });
}

/**
 * Enregistre le jeton de notification Expo.
 *
 * ⚠ Cette route n'existe pas encore côté NestJS. `/push/subscribe` ne convient
 * pas : son DTO exige les clés Web Push `p256dh` et `auth`, que le natif n'a
 * pas. Le travail backend restant est décrit dans mobile/NOTES-BACKEND.md.
 *
 * En attendant, l'appel échoue en 404 — l'appelant traite le push comme une
 * commodité, jamais comme une étape bloquante.
 */
export function enregistrerJetonPush(telephone: string, jeton: string): Promise<void> {
  return requete('/push/expo', {
    method: 'POST',
    body: JSON.stringify({ telephone, jeton }),
  });
}
