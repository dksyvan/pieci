import { pushDisponible } from './plateforme';

/**
 * Cet appareil reçoit-il déjà les notifications ?
 *
 * La question se pose côté navigateur et non côté serveur : un abonnement est
 * lié à un appareil, pas à un compte. La même personne peut être abonnée sur
 * son téléphone et pas sur l'ordinateur du cybercafé — et c'est bien ainsi.
 *
 * Sert à ne pas reproposer l'activation à quelqu'un qui l'a déjà faite. Toute
 * erreur répond « non » : reproposer à tort est un désagrément, se taire à
 * tort laisse quelqu'un sans nouvelles de sa pièce.
 */
export async function abonnementLocal(): Promise<boolean> {
  if (!pushDisponible()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const registre = await navigator.serviceWorker.ready;
    return (await registre.pushManager.getSubscription()) !== null;
  } catch {
    return false;
  }
}
