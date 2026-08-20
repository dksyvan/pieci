import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Bouton, Erreur, Texte } from './primitives';
import { Selecteur } from './Formulaire';
import { IconeValide } from './Icones';
import { COMMUNES, type LatLng } from '../data/communes';
import { haversine } from '../lib/matching';
import { couleurs, espace } from '../design/theme';

interface Props {
  commune: string;
  setCommune: (v: string) => void;
  setCoords: (c: LatLng | null) => void;
}

type Etat = 'repos' | 'chargement' | 'ok' | 'refuse' | 'erreur';

const NOMS = Object.keys(COMMUNES);

/** Sélection de la commune, avec relevé optionnel de la position réelle. */
export function ChampCommune({ commune, setCommune, setCoords }: Props) {
  const [etat, setEtat] = useState<Etat>('repos');

  const localiser = async () => {
    setEtat('chargement');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setEtat('refuse');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;

      let plusProche: string | null = null;
      let distanceMin = Infinity;
      for (const [nom, [lat, lng]] of Object.entries(COMMUNES)) {
        const d = haversine(latitude, longitude, lat, lng);
        if (d < distanceMin) {
          distanceMin = d;
          plusProche = nom;
        }
      }

      setCoords([latitude, longitude]);
      if (plusProche) setCommune(plusProche);
      setEtat('ok');
    } catch {
      setEtat('erreur');
    }
  };

  return (
    <View>
      <Selecteur
        label="Commune ou ville"
        valeur={commune}
        options={NOMS}
        onChange={(v) => {
          setCommune(v);
          setCoords(COMMUNES[v] ?? null);
          setEtat('repos');
        }}
      />

      <Bouton
        titre={etat === 'chargement' ? 'Localisation…' : 'Utiliser ma position'}
        variante="contour"
        onPress={() => void localiser()}
        enCours={etat === 'chargement'}
        pleineLargeur
        style={{ marginTop: -espace[2], marginBottom: espace[3] }}
      />

      {etat === 'ok' && commune && (
        <View style={styles.constat}>
          <IconeValide taille={14} couleur={couleurs.officiel} />
          <Texte variante="fine" style={{ color: couleurs.officiel, flex: 1 }}>
            Position relevée — commune la plus proche : {commune}
          </Texte>
        </View>
      )}
      {etat === 'refuse' && (
        <Erreur>
          Tu as refusé l’accès à la position. Choisis ta commune dans la liste, le résultat sera le
          même.
        </Erreur>
      )}
      {etat === 'erreur' && (
        <Erreur>Position indisponible. Choisis ta commune dans la liste, ça marche pareil.</Erreur>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  constat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace[2],
    borderLeftWidth: 2,
    borderLeftColor: couleurs.officiel,
    paddingLeft: espace[2],
    paddingVertical: espace[2],
    marginBottom: espace[3],
  },
});
