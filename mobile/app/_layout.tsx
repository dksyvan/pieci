import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_700Bold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { ArchivoNarrow_600SemiBold } from '@expo-google-fonts/archivo-narrow';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import { FournisseurApp, useApp } from '../src/contexte/AppContext';
import { Texte } from '../src/composants/primitives';
import { couleurs, espace, marge } from '../src/design/theme';

void SplashScreen.preventAutoHideAsync();

/**
 * Une correspondance trouvée mérite d'interrompre : bannière et son, même si
 * l'app est au premier plan. Le badge reste à zéro — le compteur d'icône
 * n'apporte rien tant qu'il n'y a pas de file de messages à traiter.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Bandeau d'avis — remplace le toast du web. */
function Avis() {
  const { avis } = useApp();
  if (!avis) return null;

  return (
    <View style={styles.avis} accessibilityLiveRegion="polite">
      <Texte variante="fine" style={{ color: couleurs.papier }}>
        {avis}
      </Texte>
    </View>
  );
}

/**
 * Un tap sur une notification ouvre le suivi. Le serveur envoie `{ route }`
 * dans les données du message — on ne suit que les routes internes connues.
 */
function useOuvertureParNotification() {
  const router = useRouter();

  useEffect(() => {
    const abonnement = Notifications.addNotificationResponseReceivedListener((reponse) => {
      const donnees = reponse.notification.request.content.data as { route?: unknown };
      if (typeof donnees?.route === 'string' && donnees.route.startsWith('/')) {
        router.push(donnees.route as '/suivi');
      } else {
        router.push('/suivi');
      }
    });
    return () => abonnement.remove();
  }, [router]);
}

export default function RacineLayout() {
  useOuvertureParNotification();

  const [policesChargees, erreurPolices] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    ArchivoNarrow_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    // On masque le splash dès que les polices sont prêtes — ou si elles ont
    // échoué : mieux vaut la police système qu'un écran bloqué.
    if (policesChargees || erreurPolices) void SplashScreen.hideAsync();
  }, [policesChargees, erreurPolices]);

  if (!policesChargees && !erreurPolices) return null;

  return (
    <SafeAreaProvider>
      <FournisseurApp>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: couleurs.papier },
          }}
        >
          <Stack.Screen name="(onglets)" />
        </Stack>
        <Avis />
      </FournisseurApp>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  avis: {
    position: 'absolute',
    left: marge,
    right: marge,
    bottom: 92,
    backgroundColor: couleurs.encre,
    paddingVertical: espace[3],
    paddingHorizontal: espace[3],
  },
});
