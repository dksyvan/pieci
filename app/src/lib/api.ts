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
 * Client HTTP du web. Les *formes* échangées vivent dans `shared/api-types.ts`
 * et sont communes au mobile ; le client, lui, reste propre à la plateforme :
 * l'URL de base se lit dans `import.meta.env`, et l'envoi de photo passe un
 * `File` que React Native ne connaît pas.
 */
/**
 * Base de l'API vue du navigateur.
 *
 * `/api` par défaut, et non une URL d'hébergeur : l'API est servie depuis
 * notre propre domaine, relayée par le Worker (`app/worker/index.js`). Ce
 * n'est pas une préférence de déploiement mais une condition de
 * fonctionnement — les bloqueurs de traqueurs coupent les domaines
 * d'hébergeurs mutualisés, et le registre restait alors vide sans qu'aucune
 * erreur ne remonte. En faire la valeur par défaut plutôt qu'une variable à
 * renseigner évite qu'un environnement oublié reparte vers l'appel tiers.
 *
 * `VITE_API_BASE` reste là pour viser une autre API — une préproduction, par
 * exemple. Le serveur de développement relaie `/api` comme le fait le Worker
 * (voir `server.proxy` dans vite.config.ts), si bien que le même chemin est
 * emprunté partout.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

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
