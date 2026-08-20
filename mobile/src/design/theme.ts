/**
 * Pièci — direction « pièce administrative ».
 *
 * Portage des tokens de app/src/index.css. Toute valeur consommée par un écran
 * vient d'ici : aucun composant n'invente de couleur, d'espacement ni de rayon.
 *
 * Différences assumées avec le web :
 * — pas de grain ni de filigrane de grille (coûteux à l'affichage sur les
 *   Android d'entrée de gamme visés) ;
 * — l'échelle typographique est légèrement resserrée, un écran de téléphone
 *   n'ayant pas la largeur d'une page.
 */

export const couleurs = {
  /** Encres — le bleu-noir des tampons de l'administration */
  encre: '#14202E',
  encre2: '#33404F',
  sourdine: '#5B564C',
  /** Gris de saisie : placeholders et mentions secondaires (5,0:1 sur papier) */
  indice: '#6E6758',

  /** Papiers — papier sécurité non blanchi, et son verso plus sourd */
  papier: '#F4F2EC',
  papier2: '#E9E5D9',
  carte: '#FBFAF5',

  /** Filets — décoratifs, jamais utilisés comme couleur de texte */
  filet: '#CFC8B7',
  filet2: '#A9A294',

  /** Signaux — un seul accent : le rouge du cachet « CERTIFIÉ » */
  cachet: '#B03A22',
  officiel: '#1B6B4A',
  ambre: '#8A5D0C',
} as const;

/** Familles chargées par expo-font dans app/_layout.tsx. */
export const polices = {
  display: 'Archivo_700Bold',
  displayMoyen: 'Archivo_600SemiBold',
  corps: 'Archivo_400Regular',
  /** Capitales espacées : labels, onglets, boutons */
  util: 'ArchivoNarrow_600SemiBold',
  /** Toute donnée : numéros, dates, montants */
  mono: 'IBMPlexMono_400Regular',
  monoGras: 'IBMPlexMono_600SemiBold',
} as const;

/** Échelle non linéaire : l'écart raconte la hiérarchie. */
export const corps = {
  micro: 11,
  mono: 12,
  fine: 13,
  texte: 15,
  lead: 18,
  sous: 22,
  titre: 30,
  hero: 40,
} as const;

/** Hauteurs de ligne, variables selon le corps. */
export const interligne = {
  hero: 40,
  titre: 33,
  lead: 25,
  texte: 23,
  dense: 19,
} as const;

/** Espacement à sauts assumés — pas de progression régulière. */
export const espace = {
  1: 4,
  2: 8,
  3: 14,
  4: 22,
  5: 36,
  6: 56,
  8: 96,
} as const;

/** Rayons par rôle. Un rayon unique partout est la signature d'une UI non dessinée. */
export const rayon = {
  champ: 2,
  bloc: 0,
  pastille: 999,
} as const;

/** Interlettrage : négatif sur les grands corps, franchement positif sur les capitales. */
export const lettrage = {
  hero: -1.6,
  titre: -1,
  sous: -0.6,
  texte: 0,
  label: 1.9,
  onglet: 1.2,
  donnee: 0.2,
} as const;

/** Marge extérieure des écrans. */
export const marge = 20;

/** Durées : micro-interaction courte, apparition plus longue. */
export const duree = {
  micro: 150,
  entree: 320,
} as const;
