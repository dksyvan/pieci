import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lien, Texte, Vide } from '../../src/composants/primitives';
import { CartePiece, VignettePiece } from '../../src/composants/CartePiece';
import { Marque } from '../../src/composants/Icones';
import { useApp } from '../../src/contexte/AppContext';
import { COMMUNES } from '@partage/communes';
import { compteurValorisant } from '@partage/vitrine';
import { relDate } from '@partage/format';
import { corps, couleurs, espace, lettrage, marge, polices } from '../../src/design/theme';

/** Les trois temps de la procédure — une séquence réelle, d'où la numérotation. */
const ETAPES = [
  {
    cote: '01',
    titre: 'Tu trouves',
    texte:
      'Tu prends la photo, tu dis le type de pièce et le quartier. Le numéro et la signature sont floutés par le serveur avant même que ça s’affiche.',
  },
  {
    cote: '02',
    titre: 'On rapproche',
    texte:
      'L’algorithme de DIBY Yvan compare avec les pièces recherchées et prévient le bon propriétaire. « Nguessan » et « N’Guessan », c’est pareil pour lui.',
  },
  {
    cote: '03',
    titre: 'On restitue',
    texte:
      'Vous confirmez tous les deux, et là seulement les numéros s’échangent. Rendez-vous dans un point de dépôt sûr — mairie, commissariat.',
  },
];

export default function Accueil() {
  const { piecesTrouvees, chargement, panne, rafraichir } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const nbCommunes = Object.keys(COMMUNES).length;
  const montrerCompteur = compteurValorisant(piecesTrouvees.length);
  const largeurCarte = Math.min(width - marge * 2, 360);

  return (
    <ScrollView
      style={{ backgroundColor: couleurs.papier }}
      contentContainerStyle={{ paddingBottom: espace[6] }}
      refreshControl={
        <RefreshControl refreshing={chargement} onRefresh={rafraichir} tintColor={couleurs.encre} />
      }
    >
      {/* Le bandeau se détache par son fond, pas par un trait de fermeture. */}
      <View style={[styles.bandeau, { paddingTop: insets.top + espace[3] }]}>
        <Marque taille={26} />

        <View style={styles.timbre}>
          <Texte variante="label" style={{ color: couleurs.cachet }}>
            Fait avec fierté en Côte d’Ivoire
          </Texte>
        </View>

        <Texte variante="hero" style={{ marginTop: espace[3] }} accessibilityRole="header">
          Ta pièce égarée{'\n'}a une{' '}
          <Texte variante="hero" style={{ color: couleurs.cachet }}>
            deuxième chance
          </Texte>
          .
        </Texte>

        <Texte variante="texte" style={{ marginTop: espace[3], color: couleurs.sourdine }}>
          Fini les statuts WhatsApp qui se perdent. Celui qui trouve une pièce la déclare, et celui
          qui l’a perdue est prévenu{' '}
          <Texte variante="texte" style={{ color: couleurs.cachet }}>
            automatiquement
          </Texte>
          .
        </Texte>

        <View style={{ alignItems: 'center', marginTop: espace[5] }}>
          <CartePiece largeur={largeurCarte} />
        </View>

        {/* Deux actions, et deux seulement. */}
        <View style={{ marginTop: espace[5], gap: espace[3] }}>
          <ActionCle
            titre="J’ai trouvé une pièce hein"
            note="45 secondes, une photo. Le bienfait n’est jamais perdu."
            onPress={() => router.push('/declarer')}
          />
          <ActionCle
            titre="J’ai perdu ma pièce oh"
            note="On compare tout de suite, et on te prévient pour les prochaines."
            onPress={() => router.push('/perdu')}
          />
        </View>

        <View style={styles.bilan}>
          <View style={styles.chiffre}>
            <Texte style={styles.valeur}>{nbCommunes}</Texte>
            <Texte variante="label">communes couvertes</Texte>
          </View>
          {montrerCompteur && (
            <View style={styles.chiffre}>
              <Texte style={styles.valeur}>{piecesTrouvees.length}</Texte>
              <Texte variante="label">pièces déclarées</Texte>
            </View>
          )}
        </View>
        <Texte variante="fine" style={{ marginTop: espace[2] }}>
          C’est gratuit et ça le sera toujours.
        </Texte>
      </View>

      {panne && (
        <View style={styles.section}>
          <Vide titre="Le registre est injoignable." texte={panne}>
            <Lien titre="Réessayer" onPress={rafraichir} />
          </Vide>
        </View>
      )}

      <View style={styles.section}>
        <Texte variante="cote">La marche à suivre</Texte>
        <Texte variante="titre" style={{ marginTop: espace[1] }} accessibilityRole="header">
          Comment ça marche
        </Texte>
        <Texte variante="fine" style={{ marginTop: espace[2] }}>
          Trois étapes, moins d’une minute. La solidarité ivoirienne, rendue efficace.
        </Texte>

        <View style={{ marginTop: espace[4] }}>
          {ETAPES.map(({ cote, titre, texte }, index) => (
            <View key={cote} style={[styles.etape, index > 0 && styles.etapeSuivante]}>
              <Texte variante="cote" style={{ width: 30 }}>
                {cote}
              </Texte>
              <View style={{ flex: 1 }}>
                <Texte style={styles.etapeTitre}>{titre}</Texte>
                <Texte variante="fine" style={{ marginTop: 3 }}>
                  {texte}
                </Texte>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Texte variante="cote">Fraîchement déclarées</Texte>
        <Texte variante="sous" style={{ marginTop: espace[1] }} accessibilityRole="header">
          Les dernières
        </Texte>

        {!chargement && piecesTrouvees.length === 0 && !panne && (
          <View style={{ marginTop: espace[3] }}>
            <Vide
              titre="Tu as trouvé une pièce ?"
              texte="Déclare-la en 45 secondes, c’est gratuit. C’est toi qui ouvres le registre — et quelqu’un, quelque part, arrêtera de chercher."
            >
              <Lien titre="Déclarer une pièce" onPress={() => router.push('/declarer')} />
            </Vide>
          </View>
        )}

        {piecesTrouvees.length > 0 && (
          <View style={{ marginTop: espace[3] }}>
            {piecesTrouvees.slice(0, 4).map((p, index) => (
              <View key={p.id} style={[styles.entree, index > 0 && styles.entreeSuivante]}>
                <VignettePiece taille={44} />
                <View style={{ flex: 1 }}>
                  <Texte style={styles.entreeNom}>
                    {p.prenom} {p.nomInitiale}.
                  </Texte>
                  <Texte variante="donnee" style={{ marginTop: 3, color: couleurs.sourdine }}>
                    {p.typePiece.toUpperCase()} · {p.commune}
                  </Texte>
                </View>
                <Texte variante="donnee" style={{ color: couleurs.sourdine }}>
                  {relDate(p.dateTrouvaille)}
                </Texte>
              </View>
            ))}
            <Lien
              titre="Voir tout le registre"
              onPress={() => router.push('/registre')}
              style={{ marginTop: espace[3] }}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ActionCle({ titre, note, onPress }: { titre: string; note: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && styles.actionPressee]}
    >
      <Texte style={styles.actionTitre}>{titre}</Texte>
      <Texte variante="fine" style={{ marginTop: espace[1] }}>
        {note}
      </Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bandeau: {
    backgroundColor: couleurs.papier2,
    paddingHorizontal: marge,
    paddingBottom: espace[5],
  },
  timbre: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: couleurs.cachet,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: espace[4],
  },
  action: {
    borderWidth: 1,
    borderColor: couleurs.encre,
    backgroundColor: couleurs.carte,
    padding: espace[4],
  },
  actionPressee: { backgroundColor: couleurs.encre },
  actionTitre: {
    fontFamily: polices.display,
    fontSize: 19,
    letterSpacing: lettrage.sous,
    color: couleurs.encre,
    lineHeight: 23,
  },
  bilan: { flexDirection: 'row', flexWrap: 'wrap', gap: espace[4], marginTop: espace[5] },
  chiffre: { flexDirection: 'row', alignItems: 'baseline', gap: espace[2] },
  valeur: { fontFamily: polices.monoGras, fontSize: 19, color: couleurs.encre },

  section: { paddingHorizontal: marge, paddingTop: espace[6] },

  etape: { flexDirection: 'row', gap: espace[3], paddingVertical: espace[3] },
  etapeSuivante: { borderTopWidth: 1, borderTopColor: couleurs.filet },
  etapeTitre: {
    fontFamily: polices.displayMoyen,
    fontSize: corps.texte + 1,
    letterSpacing: lettrage.sous,
    color: couleurs.encre,
  },

  entree: { flexDirection: 'row', alignItems: 'center', gap: espace[3], paddingVertical: espace[3] },
  entreeSuivante: { borderTopWidth: 1, borderTopColor: couleurs.filet },
  entreeNom: {
    fontFamily: polices.displayMoyen,
    fontSize: corps.texte,
    letterSpacing: lettrage.sous,
    color: couleurs.encre,
  },
});
