import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { Filet, Texte } from './primitives';
import { IconeFleche, IconeValide } from './Icones';
import { corps, couleurs, espace, marge, polices, rayon } from '../design/theme';

/* ------------------------------------------------------------------ Champ */

interface ChampProps {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  aide?: string;
  clavier?: KeyboardTypeOptions;
  autoComplete?: 'tel' | 'name-given' | 'name-family' | 'off';
}

export function Champ({
  label,
  valeur,
  onChange,
  placeholder,
  aide,
  clavier,
  autoComplete = 'off',
}: ChampProps) {
  const [focus, setFocus] = useState(false);

  return (
    <View style={{ marginBottom: espace[3] }}>
      <Texte variante="label" style={{ marginBottom: 5 }}>
        {label}
      </Texte>
      <TextInput
        style={[styles.saisie, focus && styles.saisieFocus]}
        value={valeur}
        onChangeText={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        placeholderTextColor={couleurs.indice}
        keyboardType={clavier}
        autoComplete={autoComplete}
        accessibilityLabel={label}
      />
      {aide && (
        <Texte variante="fine" style={{ marginTop: 5 }}>
          {aide}
        </Texte>
      )}
    </View>
  );
}

/* -------------------------------------------------------------- Sélecteur */

interface SelecteurProps {
  label: string;
  valeur: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
  aide?: string;
}

/**
 * Liste déroulante en feuille modale. Le `<select>` natif n'existe pas en RN,
 * et un Picker plateforme donnerait deux apparences différentes — ici la même
 * partout, dans la grammaire du registre.
 */
export function Selecteur({
  label,
  valeur,
  options,
  onChange,
  placeholder = '— Choisir —',
  aide,
}: SelecteurProps) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <View style={{ marginBottom: espace[3] }}>
      <Texte variante="label" style={{ marginBottom: 5 }}>
        {label}
      </Texte>
      <Pressable
        onPress={() => setOuvert(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${valeur || placeholder}`}
        style={({ pressed }) => [styles.saisie, styles.selecteur, pressed && { opacity: 0.8 }]}
      >
        <Texte style={{ color: valeur ? couleurs.encre : couleurs.indice, flex: 1 }}>
          {valeur || placeholder}
        </Texte>
        <IconeFleche taille={16} couleur={couleurs.sourdine} />
      </Pressable>
      {aide && (
        <Texte variante="fine" style={{ marginTop: 5 }}>
          {aide}
        </Texte>
      )}

      <Modal visible={ouvert} animationType="slide" transparent onRequestClose={() => setOuvert(false)}>
        <Pressable style={styles.voile} onPress={() => setOuvert(false)} accessibilityLabel="Fermer" />
        <View style={styles.feuille}>
          <View style={styles.feuilleTete}>
            <Texte variante="label">{label}</Texte>
            <Pressable onPress={() => setOuvert(false)} hitSlop={12} accessibilityRole="button">
              <Texte variante="label" style={{ color: couleurs.cachet }}>
                Fermer
              </Texte>
            </Pressable>
          </View>
          <Filet fort />
          <ScrollView>
            {options.map((o) => {
              const choisi = o === valeur;
              return (
                <Pressable
                  key={o}
                  onPress={() => {
                    onChange(o);
                    setOuvert(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: choisi }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: couleurs.papier2 }]}
                >
                  <Texte style={{ flex: 1, color: couleurs.encre }}>{o}</Texte>
                  {choisi && <IconeValide taille={16} couleur={couleurs.cachet} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  saisie: {
    borderWidth: 1,
    borderColor: couleurs.filet2,
    borderRadius: rayon.champ,
    backgroundColor: couleurs.papier,
    paddingHorizontal: 11,
    paddingVertical: 11,
    minHeight: 46,
    fontFamily: polices.corps,
    fontSize: corps.texte,
    color: couleurs.encre,
  },
  saisieFocus: { borderColor: couleurs.encre, backgroundColor: couleurs.carte },
  selecteur: { flexDirection: 'row', alignItems: 'center', gap: espace[2] },
  voile: { flex: 1, backgroundColor: 'rgba(20,32,46,0.45)' },
  feuille: {
    maxHeight: '65%',
    backgroundColor: couleurs.carte,
    borderTopWidth: 1,
    borderTopColor: couleurs.encre,
    paddingBottom: espace[5],
  },
  feuilleTete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: marge,
    paddingVertical: espace[3],
    backgroundColor: couleurs.papier2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: marge,
    paddingVertical: espace[3],
    borderBottomWidth: 1,
    borderBottomColor: couleurs.filet,
    minHeight: 48,
  },
});
