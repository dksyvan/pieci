import type { TypePiece } from '../types';

/**
 * Client HTTP typé pour l'API Pièci (cf. api/src/**\/*.controller.ts).
 *
 * Aucune donnée d'identification complète ni de contact n'est exposée par les
 * endpoints publics — voir CLAUDE.md section 2.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

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

/** URLs des deux versions d'une photo téléversée (cf. POST /pieces-trouvees/photo). */
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
 * contact tant que `statut !== 'confirmee'` 
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

export class ApiError extends Error {}

async function verifierReponse(reponse: Response): Promise<void> {
  if (reponse.ok) return;
  const corps = await reponse.json().catch(() => null);
  const message = (corps as { message?: string | string[] } | null)?.message;
  throw new ApiError(
    Array.isArray(message) ? message.join(', ') : (message ?? `Erreur ${reponse.status}`),
  );
}

async function requete<T>(chemin: string, options?: RequestInit): Promise<T> {
  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  await verifierReponse(reponse);

  if (reponse.status === 204) return undefined as T;
  return (await reponse.json()) as T;
}

/** Préfixe une URL relative (ex. `/uploads/floutees/xxx.webp`) avec l'origine de l'API ; laisse les URLs absolues (Supabase Storage) inchangées. */
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

/** Téléverse la photo d'une pièce trouvée ; le serveur génère aussi la version floutée. */
export async function uploaderPhotoPiece(fichier: File): Promise<PhotoUploadee> {
  const formData = new FormData();
  formData.append('photo', fichier);

  const reponse = await fetch(`${BASE_URL}/pieces-trouvees/photo`, { method: 'POST', body: formData });
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

export function getVapidPublicKey(): Promise<{ key: string }> {
  return requete('/push/vapid-public-key');
}

export function enregistrerAbonnementPush(
  telephone: string,
  sub: PushSubscriptionJSON,
): Promise<void> {
  return requete('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      telephone,
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
    }),
  });
}
