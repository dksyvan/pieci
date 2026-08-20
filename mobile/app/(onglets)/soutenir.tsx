import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lien, Texte, Vide } from '../../src/composants/primitives';
import { PanneauDon } from '../../src/composants/PanneauDon';
import { useApp } from '../../src/contexte/AppContext';
import { couleurs, espace, marge } from '../../src/design/theme';

/** Ce que le don finance, sans chiffrer : les montants réels ne sont pas arrêtés. */
const POSTES = [
  { cote: '01', poste: 'L’hébergement du serveur', detail: 'L’API, la base de données et les photos' },
  { cote: '02', poste: 'Le nom de domaine', detail: 'Renouvelé chaque année' },
  { cote: '03', poste: 'L’envoi des notifications', detail: 'Les alertes de correspondance' },
];

export default function Soutenir() {
  const { piecesTrouvees } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const nb = piecesTrouvees.length;

  return (
    <ScrollView
      style={{ backgroundColor: couleurs.papier }}
      contentContainerStyle={{
        paddingHorizontal: marge,
        paddingTop: insets.top + espace[3],
        paddingBottom: espace[6],
      }}
    >
      <Texte variante="cote" style={{ marginTop: espace[3] }}>
        Participation libre
      </Texte>
      <Texte variante="titre" style={{ marginTop: espace[1] }} accessibilityRole="header">
        Si Pièci t’a dépanné
      </Texte>
      <Texte variante="fine" style={{ marginTop: espace[2] }}>
        Retrouver sa pièce, ça évite les files d’attente et les frais de refabrication. Si ça t’est
        arrivé grâce au registre, tu peux participer aux frais — ou ne rien donner du tout, y’a pas
        drap : le service ne change pas.
      </Texte>

      <View style={{ marginTop: espace[4] }}>
        <PanneauDon />
      </View>

      <View style={{ marginTop: espace[5] }}>
        <Texte variante="cote" style={{ marginTop: espace[3], marginBottom: espace[3] }}>
          À quoi ça sert
        </Texte>
        {POSTES.map(({ cote, poste, detail }) => (
          <View key={cote} style={{ flexDirection: 'row', gap: espace[3], paddingVertical: espace[3], borderBottomWidth: 1, borderBottomColor: couleurs.filet }}>
            <Texte variante="cote" style={{ width: 26 }}>
              {cote}
            </Texte>
            <View style={{ flex: 1 }}>
              <Texte>{poste}</Texte>
              <Texte variante="fine" style={{ marginTop: 2 }}>
                {detail}
              </Texte>
            </View>
          </View>
        ))}
        <Texte variante="fine" style={{ marginTop: espace[3] }}>
          S’il reste quelque chose, ça ira à publier l’application sur les stores, puis à rembourser
          le transport de ceux qui déposent une pièce en mairie.
        </Texte>
      </View>

      <View style={{ marginTop: espace[5] }}>
        <Vide
          titre="Aider sans payer"
          texte={`Parle du registre autour de toi. ${
            nb > 0
              ? `${nb} pièce${nb > 1 ? 's' : ''} y ${nb > 1 ? 'sont' : 'est'} déjà déclarée${nb > 1 ? 's' : ''}`
              : 'Il n’attend que sa première déclaration'
          } — plus on est nombreux, plus les pièces retrouvent leur propriétaire. On est ensemble.`}
        >
          <Lien titre="Voir le registre" onPress={() => router.push('/registre')} />
        </Vide>
      </View>
    </ScrollView>
  );
}
