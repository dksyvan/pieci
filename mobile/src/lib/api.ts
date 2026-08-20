import {
  depuisPieceBrute,
  type ContactInfo,
  type Correspondance,
  type NouvelleAlertePerte,
  type NouvellePieceTrouvee,
  type PhotoUploadee,
  type PieceTrouveePublique,
  type PieceTrouveePubliqueBrute,
  type PointDepotApi,
} from '@partage/api-types';

/**
 * Client HTTP du mobile. Les *formes* echangees vivent dans
 * `shared/api-types.ts` et sont communes au web ; le client, lui, reste propre
 * a la plateforme : l'URL de base se lit dans `process.env`, l'envoi de photo
 * passe un `{ uri, name, type }` que le navigateur ne connait pas, et le
 * reseau mobile impose un delai d'attente explicite.
 *
 * Sans EXPO_PUBLIC_API_URL on retombe sur la production : une app installee
 * qui pointe vers localhost ne sert a personne.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://pieci.onrender.com';

/** Render endort les instances gratuites : le premier appel peut etre long. */
const DELAI_MS = 60_000;

export type {
  ContactInfo,
  Correspondance,
  NouvelleAlertePerte,
  NouvellePieceTrouvee,
  PhotoUploadee,
  PieceTrouveePublique,
  PointDepotApi,
};

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
