import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bouton, Panneau, TetePanneau, Texte, Vide } from '../../src/composants/primitives';
import { Champ, Selecteur } from '../../src/composants/Formulaire';
import { ChampCommune } from '../../src/composants/ChampCommune';
import { ListeCorrespondances } from '../../src/composants/ListeCorrespondances';
import { BandeauPush } from '../../src/composants/BandeauPush';
import { useApp } from '../../src/contexte/AppContext';
import {
  ApiError,
  creerAlertePerte,
  getCorrespondances,
  ReseauError,
  type Correspondance,
} from '../../src/lib/api';
import { TYPES_PIECE, type TypePiece } from '../../src/lib/types';
import type { LatLng } from '../../src/data/communes';
import { couleurs, espace, marge } from '../../src/design/theme';

export default function Perdu() {
  const { afficherAvis } = useApp();
  const insets = useSafeAreaInsets();

  const [typePiece, setTypePiece] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const [resultats, setResultats] = useState<Correspondance[] | null>(null);
  const [telRecherche, setTelRecherche] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [pushEcarte, setPushEcarte] = useState(false);

  const valide = Boolean(typePiece && prenom.trim() && nom.trim() && telephone.trim());

  const rechercher = async () => {
    if (!valide || enCours) return;
    setEnCours(true);
    try {
      await creerAlertePerte({
        utilisateur: { telephone, prenom, nom },
        typePiece: typePiece as TypePiece,
        prenom,
        nom,
        ...(commune && coords ? { commune, lat: coords[0], lng: coords[1] } : {}),
        ...(quartier.trim() ? { quartier: quartier.trim() } : {}),
      });
      setResultats(await getCorrespondances(telephone));
      setTelRecherche(telephone);
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

  const remplacer = (maj: Correspondance) =>
    setResultats((prev) => prev?.map((r) => (r.id === maj.id ? maj : r)) ?? null);

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
          Déclarer une perte
        </Texte>
        <Texte variante="titre" style={{ marginTop: espace[1] }} accessibilityRole="header">
          J’ai perdu ma pièce oh
        </Texte>
        <Texte variante="fine" style={{ marginTop: espace[2] }}>
          Crée ton alerte. On la compare tout de suite aux pièces déjà déclarées — et si rien ne sort
          aujourd’hui, pas de drap : l’alerte reste active et on te prévient pour les prochaines.
        </Texte>

        <Panneau style={{ marginTop: espace[4] }}>
          <TetePanneau titre="Renseignements" note="4 champs requis" />

          <Selecteur
            label="Type de pièce perdue"
            valeur={typePiece}
            options={TYPES_PIECE}
            onChange={setTypePiece}
          />
          <Champ label="Prénom sur la pièce" valeur={prenom} onChange={setPrenom} placeholder="Adjoua" />
          <Champ
            label="Nom sur la pièce"
            valeur={nom}
            onChange={setNom}
            placeholder="N’Guessan"
            aide="Écris comme tu prononces, ne fatigue pas. L’algorithme tolère les variantes — « Nguessan » ou « N’Guessan », c’est pareil."
          />
          <Champ
            label="Ton numéro de téléphone"
            valeur={telephone}
            onChange={setTelephone}
            placeholder="07 00 00 00 00"
            clavier="phone-pad"
            autoComplete="tel"
            aide="C’est pour te montrer tes correspondances et te recontacter. Jamais affiché publiquement, promis."
          />

          <ChampCommune commune={commune} setCommune={setCommune} setCoords={setCoords} />

          <Champ
            label="Quartier (facultatif)"
            valeur={quartier}
            onChange={setQuartier}
            placeholder="Niangon Sud à Gauche"
          />

          <Bouton
            titre={enCours ? 'Recherche…' : 'Lancer la recherche'}
            onPress={() => void rechercher()}
            enCours={enCours}
            desactive={!valide}
            pleineLargeur
            style={{ marginTop: espace[2] }}
          />
        </Panneau>

        <View style={{ marginTop: espace[5] }}>
          {resultats === null ? (
            <Vide
              titre="On n’a pas encore cherché."
              texte="Remplis les quatre champs au-dessus et lance la recherche. Les correspondances s’affichent ici, de la plus sûre à la moins sûre."
            />
          ) : (
            telRecherche && (
              <>
                {!pushEcarte && (
                  <View style={{ marginBottom: espace[4] }}>
                    <BandeauPush telephone={telRecherche} onTermine={() => setPushEcarte(true)} />
                  </View>
                )}
                <ListeCorrespondances
                  resultats={resultats}
                  telephone={telRecherche}
                  onChange={remplacer}
                  messageVide={{
                    titre: 'Rien à ce nom pour l’instant.',
                    texte:
                      'Ton alerte est bien enregistrée, ça va aller. Dès qu’une pièce à ce nom est déclarée, tu la vois ici.',
                  }}
                />
              </>
            )
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
