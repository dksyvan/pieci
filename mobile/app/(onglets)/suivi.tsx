import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bouton, Panneau, TetePanneau, Texte, Vide } from '../../src/composants/primitives';
import { Champ } from '../../src/composants/Formulaire';
import { ListeCorrespondances } from '../../src/composants/ListeCorrespondances';
import { useApp } from '../../src/contexte/AppContext';
import { ApiError, getCorrespondances, ReseauError, type Correspondance } from '../../src/lib/api';
import { couleurs, espace, marge } from '../../src/design/theme';

export default function Suivi() {
  const { afficherAvis } = useApp();
  const insets = useSafeAreaInsets();

  const [telephone, setTelephone] = useState('');
  const [resultats, setResultats] = useState<Correspondance[] | null>(null);
  const [telRecherche, setTelRecherche] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const consulter = async () => {
    if (!telephone.trim() || enCours) return;
    setEnCours(true);
    try {
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
          Où ça en est
        </Texte>
        <Texte variante="titre" style={{ marginTop: espace[1] }} accessibilityRole="header">
          Suivre mes correspondances
        </Texte>
        <Texte variante="fine" style={{ marginTop: espace[2] }}>
          Que tu aies déclaré une pièce trouvée ou une perte, entre ton numéro pour voir où ça en est
          — y compris les correspondances trouvées après ta déclaration.
        </Texte>

        <Panneau style={{ marginTop: espace[4] }}>
          <TetePanneau titre="Identification" note="1 champ" />
          <Champ
            label="Ton numéro de téléphone"
            valeur={telephone}
            onChange={setTelephone}
            placeholder="07 00 00 00 00"
            clavier="phone-pad"
            autoComplete="tel"
            aide="Le même que celui utilisé lors de ta déclaration."
          />
          <Bouton
            titre={enCours ? 'Consultation…' : 'Consulter mon dossier'}
            onPress={() => void consulter()}
            enCours={enCours}
            desactive={!telephone.trim()}
            pleineLargeur
          />
        </Panneau>

        <View style={{ marginTop: espace[5] }}>
          {resultats === null ? (
            <Vide
              titre="Entre ton numéro pour voir."
              texte="Le même que celui de ta déclaration. S’il y a des correspondances, elles s’affichent ici avec leur niveau de confiance."
            />
          ) : (
            telRecherche && (
              <ListeCorrespondances
                resultats={resultats}
                telephone={telRecherche}
                onChange={remplacer}
                messageVide={{
                  titre: 'Rien pour ce numéro.',
                  texte:
                    'Soit on n’a pas encore trouvé de correspondance, soit la déclaration a été faite avec un autre numéro. Vérifie les chiffres et réessaie doucement.',
                }}
              />
            )
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
