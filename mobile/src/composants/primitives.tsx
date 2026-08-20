import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { corps, couleurs, espace, interligne, lettrage, polices, rayon } from '../design/theme';

/* ------------------------------------------------------------------ Texte */

type VarianteTexte = 'hero' | 'titre' | 'sous' | 'lead' | 'texte' | 'fine' | 'label' | 'cote' | 'donnee';

const stylesTexte = StyleSheet.create({
  hero: {
    fontFamily: polices.display,
    fontSize: corps.hero,
    lineHeight: interligne.hero,
    letterSpacing: lettrage.hero,
    color: couleurs.encre,
  },
  titre: {
    fontFamily: polices.display,
    fontSize: corps.titre,
    lineHeight: interligne.titre,
    letterSpacing: lettrage.titre,
    color: couleurs.encre,
  },
  sous: {
    fontFamily: polices.display,
    fontSize: corps.sous,
    lineHeight: 27,
    letterSpacing: lettrage.sous,
    color: couleurs.encre,
  },
  lead: {
    fontFamily: polices.corps,
    fontSize: corps.lead,
    lineHeight: interligne.lead,
    color: couleurs.encre,
  },
  texte: {
    fontFamily: polices.corps,
    fontSize: corps.texte,
    lineHeight: interligne.texte,
    color: couleurs.encre,
  },
  fine: {
    fontFamily: polices.corps,
    fontSize: corps.fine,
    lineHeight: interligne.dense,
    color: couleurs.sourdine,
  },
  /** Capitales espacées — jamais dans la famille display. */
  label: {
    fontFamily: polices.util,
    fontSize: corps.micro,
    letterSpacing: lettrage.label,
    textTransform: 'uppercase',
    color: couleurs.sourdine,
  },
  /** Le numéro en marge, en mono. */
  cote: {
    fontFamily: polices.mono,
    fontSize: corps.micro,
    letterSpacing: lettrage.onglet,
    textTransform: 'uppercase',
    color: couleurs.sourdine,
  },
  /** Toute donnée chiffrée. */
  donnee: {
    fontFamily: polices.mono,
    fontSize: corps.mono,
    letterSpacing: lettrage.donnee,
    color: couleurs.encre,
  },
});

interface TexteProps {
  variante?: VarianteTexte;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text';
}

export function Texte({ variante = 'texte', children, style, numberOfLines, accessibilityRole }: TexteProps) {
  return (
    <Text
      style={[stylesTexte[variante], style]}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </Text>
  );
}

/* ----------------------------------------------------------------- Bouton */

type VarianteBouton = 'plein' | 'contour' | 'cachet';

interface BoutonProps {
  titre: string;
  onPress: () => void;
  variante?: VarianteBouton;
  /** Désactive et affiche un indicateur : une action en cours n'est pas rejouable. */
  enCours?: boolean;
  desactive?: boolean;
  pleineLargeur?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Bouton({
  titre,
  onPress,
  variante = 'plein',
  enCours = false,
  desactive = false,
  pleineLargeur = false,
  style,
}: BoutonProps) {
  const inactif = desactive || enCours;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactif}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif, busy: enCours }}
      style={({ pressed }) => [
        stylesBouton.base,
        stylesBouton[variante],
        pleineLargeur && stylesBouton.large,
        pressed && !inactif && stylesBouton.presse,
        inactif && stylesBouton.inactif,
        style,
      ]}
    >
      {enCours && (
        <ActivityIndicator
          size="small"
          color={variante === 'contour' ? couleurs.encre : couleurs.papier}
          style={{ marginRight: espace[2] }}
        />
      )}
      <Text style={[stylesBouton.texte, variante === 'contour' && stylesBouton.texteContour]}>
        {titre}
      </Text>
    </Pressable>
  );
}

const stylesBouton = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: rayon.bloc,
    paddingVertical: 13,
    paddingHorizontal: 18,
    minHeight: 46,
  },
  plein: { backgroundColor: couleurs.encre, borderColor: couleurs.encre },
  cachet: { backgroundColor: couleurs.cachet, borderColor: couleurs.cachet },
  contour: { backgroundColor: 'transparent', borderColor: couleurs.encre },
  large: { alignSelf: 'stretch' },
  presse: { opacity: 0.82, transform: [{ translateY: 1 }] },
  inactif: { opacity: 0.4 },
  texte: {
    fontFamily: polices.util,
    fontSize: corps.micro,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: couleurs.papier,
  },
  texteContour: { color: couleurs.encre },
});

/* ------------------------------------------------------------------- Lien */

interface LienProps {
  titre: string;
  onPress: () => void;
  desactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Action secondaire : un lien souligné n'a jamais le poids d'un bouton. */
export function Lien({ titre, onPress, desactive = false, style }: LienProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="link"
      accessibilityState={{ disabled: desactive }}
      hitSlop={8}
      style={({ pressed }) => [stylesLien.base, desactive && { opacity: 0.4 }, pressed && { opacity: 0.6 }, style]}
    >
      <Text style={stylesLien.texte}>{titre}</Text>
    </Pressable>
  );
}

const stylesLien = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: couleurs.cachet,
    paddingTop: 3,
    paddingBottom: 2,
    minHeight: 24,
  },
  texte: {
    fontFamily: polices.util,
    fontSize: corps.fine,
    letterSpacing: 0.4,
    color: couleurs.encre,
  },
});

/* --------------------------------------------------------------- Pastille */

type TonPastille = 'cachet' | 'officiel' | 'ambre' | 'encre';

const TONS: Record<TonPastille, string> = {
  cachet: couleurs.cachet,
  officiel: couleurs.officiel,
  ambre: couleurs.ambre,
  encre: couleurs.encre2,
};

export function Pastille({ titre, ton = 'encre' }: { titre: string; ton?: TonPastille }) {
  return (
    <View style={[stylesPastille.base, { borderColor: TONS[ton] }]}>
      <Text style={[stylesPastille.texte, { color: TONS[ton] }]}>{titre}</Text>
    </View>
  );
}

const stylesPastille = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: rayon.pastille,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  texte: {
    fontFamily: polices.util,
    fontSize: corps.micro,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});

/* ------------------------------------------------------- Blocs de registre */

/** Filet de séparation — l'élévation se fait au trait, jamais à l'ombre. */
export function Filet({ fort = false, style }: { fort?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { height: fort ? 2 : 1, backgroundColor: fort ? couleurs.encre : couleurs.filet },
        style,
      ]}
    />
  );
}

/** En-tête de section : un libellé en marge, un titre, une intro facultative. */
export function TeteSection({
  cote,
  titre,
  intro,
}: {
  cote: string;
  titre: string;
  intro?: string;
}) {
  return (
    <View style={{ marginBottom: espace[4] }}>
      <Filet fort />
      <View style={{ paddingTop: espace[3] }}>
        <Texte variante="cote">{cote}</Texte>
        <Texte variante="titre" style={{ marginTop: espace[1] }} accessibilityRole="header">
          {titre}
        </Texte>
        {intro && (
          <Texte variante="texte" style={{ marginTop: espace[2], color: couleurs.sourdine, maxWidth: 460 }}>
            {intro}
          </Texte>
        )}
      </View>
    </View>
  );
}

/** Panneau de formulaire : fond légèrement décalé, cerné d'un filet. */
export function Panneau({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[stylesBloc.panneau, style]}>{children}</View>;
}

export function TetePanneau({ titre, note }: { titre: string; note?: string }) {
  return (
    <View style={stylesBloc.tetePanneau}>
      <Texte variante="label">{titre}</Texte>
      {note && <Texte variante="cote">{note}</Texte>}
    </View>
  );
}

/** État vide : une invitation à agir, jamais un message d'excuse. */
export function Vide({
  titre,
  texte,
  children,
}: {
  titre: string;
  texte: string;
  children?: ReactNode;
}) {
  return (
    <View style={stylesBloc.vide}>
      <Texte variante="sous">{titre}</Texte>
      <Texte variante="fine" style={{ marginTop: espace[2], maxWidth: 420 }}>
        {texte}
      </Texte>
      {children && <View style={{ marginTop: espace[3] }}>{children}</View>}
    </View>
  );
}

/** Message d'erreur : ce qui s'est passé, et quoi faire. */
export function Erreur({ children }: { children: ReactNode }) {
  return (
    <View style={stylesBloc.erreur} accessibilityRole="alert">
      <Texte variante="fine" style={{ color: couleurs.cachet }}>
        {children}
      </Texte>
    </View>
  );
}

const stylesBloc = StyleSheet.create({
  panneau: {
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.encre,
    borderRadius: rayon.bloc,
    padding: espace[4],
  },
  tetePanneau: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: espace[3],
    backgroundColor: couleurs.papier2,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.encre,
    marginHorizontal: -espace[4],
    marginTop: -espace[4],
    marginBottom: espace[4],
    paddingHorizontal: espace[4],
    paddingVertical: espace[3],
  },
  vide: {
    borderWidth: 1,
    borderColor: couleurs.filet2,
    borderStyle: 'dashed',
    paddingVertical: espace[5],
    paddingHorizontal: espace[4],
  },
  erreur: {
    borderLeftWidth: 2,
    borderLeftColor: couleurs.cachet,
    paddingLeft: espace[2],
    marginTop: espace[2],
  },
});
