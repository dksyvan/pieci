import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Bouton, Erreur, Lien, Panneau, TetePanneau, Texte } from '../../src/composants/primitives';
import { Champ, Selecteur } from '../../src/composants/Formulaire';
import { ChampCommune } from '../../src/composants/ChampCommune';
import { BandeauPush } from '../../src/composants/BandeauPush';
import { CartePiece } from '../../src/composants/CartePiece';
import { IconeAppareilPhoto, IconeValide } from '../../src/composants/Icones';
import { useApp } from '../../src/contexte/AppContext';
import { ApiError, ReseauError, uploaderPhotoPiece } from '../../src/lib/api';
import { TYPES_PIECE, type TypePiece } from '@partage/types';
import { COMMUNES, type LatLng } from '@partage/communes';
import { couleurs, espace, marge } from '../../src/design/theme';

const GARANTIES = [
  {
    cote: '01',
    texte:
      'En public, on n’affiche que le prénom et l’initiale du nom. Le nom complet, c’est seulement le propriétaire qui le voit, après confirmation.',
  },
  {
    cote: '02',
    texte:
      'La photo est floutée par le serveur : le numéro, la date de naissance et la signature deviennent illisibles.',
  },
  {
    cote: '03',
    texte:
      'Ton numéro n’est jamais publié. Il ne part chez le propriétaire que si vous confirmez tous les deux.',
  },
  {
    cote: '04',
    texte:
      'La remise se fait dans un point de dépôt sûr — mairie, commissariat, pharmacie. C’est mieux non ?',
  },
];

export default function Declarer() {
  const { pointsDepot, publier, afficherAvis } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [typePiece, setTypePiece] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [depot, setDepot] = useState('');

  const [monPrenom, setMonPrenom] = useState('');
  const [monNom, setMonNom] = useState('');
  const [monTel, setMonTel] = useState('');

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [publiee, setPubliee] = useState(false);
  const [pushEcarte, setPushEcarte] = useState(false);
  const [echecPhoto, setEchecPhoto] = useState<string | null>(null);

  const valide = Boolean(
    typePiece && prenom.trim() && nom.trim() && commune && monPrenom.trim() && monNom.trim() && monTel.trim(),
  );

  const nomsDepots = ['Je la garde — à convenir', ...pointsDepot.map((d) => `${d.nom} (${d.commune})`)];

  const choisirSource = () => {
    setEchecPhoto(null);
    Alert.alert('Photo de la pièce', 'Le floutage est appliqué à l’envoi.', [
      { text: 'Prendre une photo', onPress: () => void capturer('camera') },
      { text: 'Choisir dans la galerie', onPress: () => void capturer('galerie') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const capturer = async (source: 'camera' | 'galerie') => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setEchecPhoto(
          source === 'camera'
            ? 'Accès à l’appareil photo refusé. Tu peux l’autoriser dans les réglages, ou choisir une image dans la galerie.'
            : 'Accès à la galerie refusé. Tu peux l’autoriser dans les réglages du téléphone.',
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      };

      const resultat =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!resultat.canceled && resultat.assets[0]) setPhotoUri(resultat.assets[0].uri);
    } catch {
      setEchecPhoto('La prise de photo a échoué. Tu peux déclarer sans photo, ça marche aussi.');
    }
  };

  const soumettre = async () => {
    if (!valide || enCours) return;
    const [lat, lng] = coords ?? COMMUNES[commune] ?? [0, 0];
    const indexDepot = nomsDepots.indexOf(depot);

    setEnCours(true);
    try {
      const urls = photoUri ? await uploaderPhotoPiece(photoUri) : null;

      await publier({
        declarant: { telephone: monTel, prenom: monPrenom, nom: monNom },
        typePiece: typePiece as TypePiece,
        prenom,
        nom,
        commune,
        quartier: quartier.trim() || undefined,
        lat,
        lng,
        pointDepotId: indexDepot > 0 ? pointsDepot[indexDepot - 1]?.id : undefined,
        photoOriginaleUrl: urls?.photoOriginaleUrl,
        photoFlouteeUrl: urls?.photoFlouteeUrl,
      });
      setPubliee(true);
    } catch (err) {
      afficherAvis(
        err instanceof ReseauError || err instanceof ApiError
          ? err.message
          : 'Une erreur est survenue, réessaie.',
      );
    } finally {
      setEnCours(false);
    }
  };

  if (publiee) {
    return (
      <ScrollView
        style={{ backgroundColor: couleurs.papier }}
        contentContainerStyle={{ paddingHorizontal: marge, paddingTop: insets.top + espace[5] }}
      >
        <View style={styles.timbre}>
          <IconeValide taille={14} couleur={couleurs.cachet} />
          <Texte variante="label" style={{ color: couleurs.cachet }}>
            Entrée enregistrée
          </Texte>
        </View>
        <Texte variante="titre" style={{ marginTop: espace[3] }} accessibilityRole="header">
          C’est fait, la pièce de {prenom} {nom.charAt(0).toUpperCase()}. est au registre.
        </Texte>
        <Texte variante="fine" style={{ marginTop: espace[2] }}>
          Merci pour ton geste. L’algorithme compare déjà avec les alertes en cours — si quelqu’un
          cherche cette pièce, on te le signale, et c’est lui qui te contactera.
        </Texte>

        <View style={{ alignItems: 'center', marginTop: espace[5] }}>
          <CartePiece
            nom={`${prenom} ${nom.charAt(0).toUpperCase()}.`}
            type={typePiece || 'Pièce d’identité'}
            cachet="DÉCLARÉE"
            largeur={300}
          />
        </View>

        {!pushEcarte && (
          <View style={{ marginTop: espace[5] }}>
            <BandeauPush telephone={monTel} onTermine={() => setPushEcarte(true)} />
          </View>
        )}

        <Bouton
          titre="Voir le registre"
          variante="contour"
          onPress={() => router.push('/registre')}
          pleineLargeur
          style={{ marginTop: espace[4], marginBottom: espace[6] }}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: couleurs.papier }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: marge,
          paddingTop: insets.top + espace[3],
          paddingBottom: espace[6],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Texte variante="cote" style={{ marginTop: espace[3] }}>
          Déclarer une pièce trouvée
        </Texte>
        <Texte variante="titre" style={{ marginTop: espace[1] }} accessibilityRole="header">
          J’ai trouvé une pièce hein
        </Texte>
        <Texte variante="fine" style={{ marginTop: espace[2] }}>
          Merci pour ton geste — le bienfait n’est jamais perdu. Renseigne juste le minimum : ça sert
          uniquement à retrouver le propriétaire.
        </Texte>

        <Panneau style={{ marginTop: espace[4] }}>
          <TetePanneau titre="La pièce" note="Partie 1 / 2" />

          <Selecteur label="Type de pièce" valeur={typePiece} options={TYPES_PIECE} onChange={setTypePiece} />
          <Champ label="Prénom inscrit" valeur={prenom} onChange={setPrenom} placeholder="Adjoua" />
          <Champ label="Nom inscrit" valeur={nom} onChange={setNom} placeholder="N’Guessan" />

          <ChampCommune commune={commune} setCommune={setCommune} setCoords={setCoords} />

          <Champ
            label="Quartier (facultatif)"
            valeur={quartier}
            onChange={setQuartier}
            placeholder="Niangon Sud à Gauche"
            aide="Plus c’est précis, plus vite le propriétaire se repère."
          />

          <Selecteur
            label="Où la pièce se trouve-t-elle ?"
            valeur={depot}
            options={nomsDepots}
            onChange={setDepot}
            placeholder="Je la garde — à convenir"
          />

          <Texte variante="label" style={{ marginBottom: 5 }}>
            Photo de la pièce (facultatif)
          </Texte>
          {photoUri ? (
            <View style={styles.apercu}>
              <Image source={{ uri: photoUri }} style={styles.vignette} accessibilityIgnoresInvertColors />
              <View style={{ flex: 1 }}>
                <Texte variante="fine" style={{ color: couleurs.encre }}>
                  Photo prête
                </Texte>
                <Texte variante="fine">Le floutage est appliqué à l’envoi.</Texte>
              </View>
              <Lien titre="Retirer" onPress={() => setPhotoUri(null)} />
            </View>
          ) : (
            <Pressable
              onPress={choisirSource}
              accessibilityRole="button"
              style={({ pressed }) => [styles.depot, pressed && { backgroundColor: couleurs.papier2 }]}
            >
              <IconeAppareilPhoto taille={22} couleur={couleurs.sourdine} />
              <View style={{ flex: 1 }}>
                <Texte style={{ color: couleurs.encre }}>Mets une photo du recto</Texte>
                <Texte variante="fine" style={{ marginTop: 2 }}>
                  Le numéro et les données sensibles seront floutés automatiquement.
                </Texte>
              </View>
            </Pressable>
          )}
          {echecPhoto && <Erreur>{echecPhoto}</Erreur>}

          <View style={{ marginTop: espace[5] }}>
            <TetePanneau titre="Toi" note="Partie 2 / 2" />
          </View>
          <Texte variante="fine" style={{ marginBottom: espace[3] }}>
            Pour qu’on puisse te recontacter si on identifie le propriétaire. Ça ne sera jamais
            affiché publiquement.
          </Texte>

          <Champ label="Ton prénom" valeur={monPrenom} onChange={setMonPrenom} placeholder="Justine" />
          <Champ label="Ton nom" valeur={monNom} onChange={setMonNom} placeholder="Diby" />
          <Champ
            label="Ton numéro de téléphone"
            valeur={monTel}
            onChange={setMonTel}
            placeholder="07 00 00 00 00"
            clavier="phone-pad"
            autoComplete="tel"
          />

          <Bouton
            titre={enCours ? 'Publication…' : 'Publier la déclaration'}
            onPress={() => void soumettre()}
            enCours={enCours}
            desactive={!valide}
            pleineLargeur
            style={{ marginTop: espace[2] }}
          />
        </Panneau>

        <View style={{ marginTop: espace[5] }}>
          <Texte variante="cote" style={{ marginTop: espace[3], marginBottom: espace[3] }}>
            Ce qui est publié, ce qui ne l’est pas
          </Texte>
          {GARANTIES.map(({ cote, texte }) => (
            <View key={cote} style={styles.garantie}>
              <Texte variante="cote" style={{ width: 26 }}>
                {cote}
              </Texte>
              <Texte variante="fine" style={{ flex: 1 }}>
                {texte}
              </Texte>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  timbre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: couleurs.cachet,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  depot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: couleurs.filet2,
    padding: espace[3],
  },
  apercu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[3],
    borderWidth: 1,
    borderColor: couleurs.filet2,
    padding: espace[2],
  },
  vignette: { width: 64, height: 44, borderWidth: 1, borderColor: couleurs.filet2 },
  garantie: {
    flexDirection: 'row',
    gap: espace[3],
    paddingVertical: espace[3],
    borderBottomWidth: 1,
    borderBottomColor: couleurs.filet,
  },
});
