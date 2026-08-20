import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lien, Pastille, Texte, Vide } from '../../src/composants/primitives';
import { VignettePiece } from '../../src/composants/CartePiece';
import { IconeRecherche } from '../../src/composants/Icones';
import { useApp } from '../../src/contexte/AppContext';
import { normaliser } from '../../src/lib/matching';
import { relDate, cadrer } from '../../src/lib/format';
import { TYPES_PIECE, type TypePiece } from '../../src/lib/types';
import { corps, couleurs, espace, lettrage, marge, polices, rayon } from '../../src/design/theme';

const FILTRES: Array<'Tous' | TypePiece> = ['Tous', ...TYPES_PIECE];

export default function Registre() {
  const { piecesTrouvees, chargement, panne, rafraichir } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [recherche, setRecherche] = useState('');
  const [type, setType] = useState<'Tous' | TypePiece>('Tous');

  const liste = useMemo(
    () =>
      piecesTrouvees.filter((p) => {
        const okType = type === 'Tous' || p.typePiece === type;
        const okRecherche =
          !recherche ||
          normaliser(`${p.prenom} ${p.nomInitiale} ${p.commune} ${p.quartier ?? ''} ${p.typePiece}`).includes(
            normaliser(recherche),
          );
        return okType && okRecherche;
      }),
    [piecesTrouvees, recherche, type],
  );

  const filtre = type !== 'Tous' || recherche !== '';

  return (
    <FlatList
      style={{ backgroundColor: couleurs.papier }}
      contentContainerStyle={{ paddingHorizontal: marge, paddingBottom: espace[6] }}
      data={liste}
      keyExtractor={(p) => p.id}
      refreshControl={
        <RefreshControl refreshing={chargement} onRefresh={rafraichir} tintColor={couleurs.encre} />
      }
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + espace[4] }}>
          <Texte variante="cote">Le registre</Texte>
          <View style={styles.entete}>
            <Texte variante="titre" accessibilityRole="header">
              Pièces trouvées
            </Texte>
            <Lien titre="Sur la carte" onPress={() => router.push('/carte')} />
          </View>
          <Texte variante="fine" style={{ marginTop: espace[2] }}>
            Les données sensibles restent floutées — elles ne se révèlent qu’à toi, après
            vérification. Ta pièce est peut-être déjà là dedans.
          </Texte>

          <View style={styles.recherche}>
            <IconeRecherche taille={17} couleur={couleurs.sourdine} />
            <TextInput
              style={styles.saisie}
              placeholder="Nom, commune, quartier…"
              placeholderTextColor={couleurs.indice}
              value={recherche}
              onChangeText={setRecherche}
              accessibilityLabel="Rechercher dans le registre"
              returnKeyType="search"
            />
          </View>

          <View style={styles.jetons}>
            {FILTRES.map((t) => {
              const actif = type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: actif }}
                  style={[styles.jeton, actif && styles.jetonActif]}
                >
                  <Texte
                    variante="label"
                    style={[styles.jetonTexte, actif && { color: couleurs.papier }]}
                  >
                    {t === 'Tous' ? 'Tous types' : t}
                  </Texte>
                </Pressable>
              );
            })}
          </View>

          <Texte variante="donnee" style={{ marginTop: espace[3], color: couleurs.sourdine }}>
            {cadrer(liste.length)} / {cadrer(piecesTrouvees.length)} entrées
          </Texte>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.ligne}>
          <VignettePiece taille={52} />
          <View style={{ flex: 1 }}>
            <Texte style={styles.nom}>
              {item.prenom} {item.nomInitiale}.
            </Texte>
            <Texte variante="donnee" style={{ marginTop: 3, color: couleurs.sourdine }}>
              {item.typePiece.toUpperCase()}
            </Texte>
            <Texte variante="fine" style={{ marginTop: 2 }}>
              {item.quartier ? `${item.commune}, ${item.quartier}` : item.commune}
            </Texte>
            {item.depotNom && (
              <View style={{ marginTop: espace[2] }}>
                <Pastille titre={`Déposée · ${item.depotNom}`} ton="officiel" />
              </View>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: espace[2] }}>
            <Texte variante="donnee" style={{ color: couleurs.sourdine }}>
              {relDate(item.dateTrouvaille)}
            </Texte>
            <Lien titre="C’est la mienne" onPress={() => router.push('/perdu')} />
          </View>
        </View>
      )}
      ListEmptyComponent={
        chargement ? null : (
          <View style={{ marginTop: espace[4] }}>
            <Vide
              titre={
                panne
                  ? 'Le registre est injoignable.'
                  : filtre
                    ? 'Aucune pièce ne correspond.'
                    : 'Le registre est encore vide.'
              }
              texte={
                panne ??
                (filtre
                  ? 'Essaie un autre filtre, ou crée ton alerte : dès qu’une pièce à ce nom est déclarée, on te prévient direct.'
                  : 'Personne n’a encore déclaré de pièce. Si tu en as ramassé une aujourd’hui, c’est toi qui ouvres le registre.')
              }
            >
              {panne ? (
                <Lien titre="Réessayer" onPress={rafraichir} />
              ) : filtre ? (
                <Lien
                  titre="Effacer les filtres"
                  onPress={() => {
                    setType('Tous');
                    setRecherche('');
                  }}
                />
              ) : (
                <Lien titre="Déclarer une pièce" onPress={() => router.push('/declarer')} />
              )}
            </Vide>
          </View>
        )
      }
    />
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
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    borderWidth: 1,
    borderColor: couleurs.encre,
    backgroundColor: couleurs.carte,
    paddingHorizontal: espace[3],
    marginTop: espace[4],
    minHeight: 46,
  },
  saisie: {
    flex: 1,
    fontFamily: polices.corps,
    fontSize: corps.texte,
    color: couleurs.encre,
    paddingVertical: 10,
  },
  jetons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: espace[3] },
  jeton: {
    borderWidth: 1,
    borderColor: couleurs.filet2,
    borderRadius: rayon.pastille,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 30,
    justifyContent: 'center',
  },
  jetonActif: { backgroundColor: couleurs.encre, borderColor: couleurs.encre },
  jetonTexte: { letterSpacing: 1 },
  ligne: {
    flexDirection: 'row',
    gap: espace[3],
    paddingVertical: espace[3],
    borderBottomWidth: 1,
    borderBottomColor: couleurs.filet,
  },
  nom: {
    fontFamily: polices.displayMoyen,
    fontSize: corps.texte + 2,
    letterSpacing: lettrage.sous,
    color: couleurs.encre,
  },
});
