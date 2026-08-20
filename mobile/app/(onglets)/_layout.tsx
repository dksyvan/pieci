import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import {
  IconeAccueil,
  IconeDeclarer,
  IconeRecherche,
  IconeRegistre,
  IconeSuivi,
} from '../../src/composants/Icones';
import { couleurs, lettrage, polices } from '../../src/design/theme';

/**
 * Cinq onglets, pas davantage : au-delà, les libellés se tronquent sur les
 * écrans étroits. La carte et le soutien s'atteignent depuis les écrans.
 */
export default function OngletsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: couleurs.encre,
        tabBarInactiveTintColor: couleurs.sourdine,
        tabBarStyle: styles.barre,
        tabBarLabelStyle: styles.libelle,
        tabBarItemStyle: styles.element,
        // Le filet supérieur porte l'onglet actif : pas d'ombre, pas de pilule.
        tabBarActiveBackgroundColor: 'transparent',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <IconeAccueil taille={19} couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="registre"
        options={{
          title: 'Registre',
          tabBarIcon: ({ color }) => <IconeRegistre taille={19} couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="declarer"
        options={{
          title: "J'ai trouvé",
          tabBarIcon: ({ color }) => <IconeDeclarer taille={19} couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="perdu"
        options={{
          title: "J'ai perdu",
          tabBarIcon: ({ color }) => <IconeRecherche taille={19} couleur={color} />,
        }}
      />
      <Tabs.Screen
        name="suivi"
        options={{
          title: 'Suivi',
          tabBarIcon: ({ color }) => <IconeSuivi taille={19} couleur={color} />,
        }}
      />

      {/* Atteignables par navigation, absents de la barre */}
      <Tabs.Screen name="carte" options={{ href: null }} />
      <Tabs.Screen name="soutenir" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barre: {
    backgroundColor: couleurs.papier,
    borderTopWidth: 1,
    borderTopColor: couleurs.encre,
    height: 62,
    paddingTop: 6,
    paddingBottom: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  libelle: {
    fontFamily: polices.util,
    fontSize: 10,
    letterSpacing: lettrage.onglet,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  element: { paddingVertical: 2 },
});
