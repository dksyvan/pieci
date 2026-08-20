import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { enregistrerJetonPush } from './api';
import { couleurs } from '../design/theme';

/**
 * Abonnement aux notifications natives.
 *
 * Deux limites du terrain, traitées explicitement plutôt que subies :
 *
 * 1. Depuis le SDK 53, le push distant ne fonctionne pas dans Expo Go sur
 *    Android. Il faut une build de développement (`eas build --profile
 *    development`). On le détecte pour afficher un message honnête au lieu
 *    d'une erreur opaque.
 *
 * 2. `getExpoPushTokenAsync` exige un identifiant de projet EAS, créé par
 *    `eas init`. Tant qu'il n'existe pas, l'abonnement est impossible.
 */

export type ResultatPush =
  | { ok: true; jeton: string }
  | { ok: false; raison: 'expo-go' | 'simulateur' | 'refuse' | 'sans-projet' | 'reseau' | 'erreur'; message: string };

const MESSAGES: Record<Exclude<ResultatPush & { ok: false }, { ok: true }>['raison'], string> = {
  'expo-go':
    'Les notifications ne marchent pas dans Expo Go sur Android. Il faut installer l’application compilée — le reste de l’app fonctionne normalement.',
  simulateur: 'Les notifications demandent un vrai téléphone, pas un émulateur.',
  refuse:
    'Permission refusée. Tu peux la réactiver dans les réglages de notifications de ton téléphone.',
  'sans-projet':
    'L’application n’est pas encore reliée à un projet Expo. Lance `eas init` avant de compiler.',
  reseau: 'Pas de connexion. Ton alerte reste enregistrée, réessaie plus tard.',
  erreur: 'L’activation a échoué. Tu peux vérifier tes correspondances depuis l’onglet Suivi.',
};

function echec(raison: Exclude<ResultatPush & { ok: false }, { ok: true }>['raison']): ResultatPush {
  return { ok: false, raison, message: MESSAGES[raison] };
}

/** Identifiant de projet EAS, renseigné par `eas init` puis par EAS Build. */
function identifiantProjet(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/**
 * Canal Android. Sans canal déclaré, la demande de permission n'apparaît pas
 * et les notifications arrivent sans son ni vibration.
 */
export async function preparerCanalAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('correspondances', {
    name: 'Correspondances trouvées',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: couleurs.cachet,
  });
}

/** Demande la permission, récupère le jeton, l'envoie au serveur. */
export async function activerNotifications(telephone: string): Promise<ResultatPush> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Platform.OS === 'android') {
    return echec('expo-go');
  }
  if (!Device.isDevice) return echec('simulateur');

  const projectId = identifiantProjet();
  if (!projectId) return echec('sans-projet');

  try {
    await preparerCanalAndroid();

    const actuelle = await Notifications.getPermissionsAsync();
    let accorde = actuelle.granted;

    if (!accorde) {
      const demande = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      accorde = demande.granted;
    }
    if (!accorde) return echec('refuse');

    const { data: jeton } = await Notifications.getExpoPushTokenAsync({ projectId });

    try {
      await enregistrerJetonPush(telephone, jeton);
    } catch {
      // Le jeton est valide mais le serveur ne l'a pas reçu : on le dit sans
      // prétendre que les notifications sont actives.
      return echec('reseau');
    }

    return { ok: true, jeton };
  } catch {
    return echec('erreur');
  }
}
