import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lien, Texte } from '../../src/composants/primitives';
import { useApp } from '../../src/contexte/AppContext';
import { relDate } from '../../src/lib/format';
import { couleurs, espace, marge } from '../../src/design/theme';

/** Abidjan : le centre par défaut, la majorité des déclarations y sont. */
const REGION_INITIALE = {
  latitude: 5.345,
  longitude: -4.0,
  latitudeDelta: 0.34,
  longitudeDelta: 0.34,
};

export default function Carte() {
  const { piecesTrouvees, pointsDepot } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.papier }}>
      <View style={{ paddingHorizontal: marge, paddingTop: insets.top + espace[3] }}>
        <Texte variante="cote" style={{ marginTop: espace[3] }}>
          Le registre sur la carte
        </Texte>
        <View style={styles.entete}>
          <Texte variante="sous" accessibilityRole="header">
            Carte des trouvailles
          </Texte>
          <Lien titre="Revenir à la liste" onPress={() => router.push('/registre')} />
        </View>
        <Texte variante="fine" style={{ marginTop: espace[2], marginBottom: espace[3] }}>
          Les repères montrent la commune de la trouvaille, jamais l’adresse exacte de quelqu’un.
        </Texte>
      </View>

      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={REGION_INITIALE}
        accessibilityLabel="Carte des pièces déclarées"
      >
        {piecesTrouvees.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={`${p.prenom} ${p.nomInitiale}.`}
            description={`${p.typePiece} · ${p.commune} · déclarée ${relDate(p.dateTrouvaille)}`}
            pinColor={couleurs.cachet}
          />
        ))}
        {pointsDepot.map((d) => (
          <Marker
            key={d.id}
            coordinate={{ latitude: d.lat, longitude: d.lng }}
            title={d.nom}
            description={`Point de dépôt · ${d.commune}`}
            pinColor={couleurs.officiel}
          />
        ))}
      </MapView>

      <View style={[styles.legende, { paddingBottom: espace[3] }]}>
        <View style={styles.item}>
          <View style={[styles.repere, { backgroundColor: couleurs.cachet }]} />
          <Texte variante="fine">Pièce déclarée ({piecesTrouvees.length})</Texte>
        </View>
        <View style={styles.item}>
          <View style={[styles.repere, { backgroundColor: couleurs.officiel }]} />
          <Texte variante="fine">Point de dépôt sûr ({pointsDepot.length})</Texte>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: espace[3],
    marginTop: espace[1],
  },
  legende: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espace[4],
    paddingHorizontal: marge,
    paddingTop: espace[3],
    borderTopWidth: 1,
    borderTopColor: couleurs.encre,
    backgroundColor: couleurs.papier,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: espace[2] },
  repere: { width: 9, height: 9, borderWidth: 1, borderColor: couleurs.encre },
});
