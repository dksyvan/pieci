import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect, type SvgProps } from 'react-native-svg';
import { couleurs } from '../design/theme';

/**
 * Jeu de pictogrammes tracés — une seule grille (24), une seule épaisseur
 * (1,4), des extrémités carrées. Portage de app/src/components/Icones.tsx.
 *
 * `couleur` accepte un ColorValue : c'est ce que la barre d'onglets transmet
 * à `tabBarIcon`, et non une simple chaîne.
 */
interface IconeProps {
  taille?: number;
  couleur?: ColorValue;
}

function commun({ taille = 20, couleur = couleurs.encre }: IconeProps): SvgProps {
  return {
    width: taille,
    height: taille,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: couleur,
    strokeWidth: 1.4,
    strokeLinecap: 'square',
    strokeLinejoin: 'miter',
  };
}

export function IconeAccueil(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Path d="M4 10.5 12 4l8 6.5" />
      <Path d="M6 10v10h12V10" />
    </Svg>
  );
}

/** Registre : une pièce d'identité posée à plat. */
export function IconeRegistre(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Rect x="3" y="5.5" width="18" height="13" />
      <Circle cx="8.5" cy="11" r="2" />
      <Path d="M6 16c.6-1.6 1.5-2.4 2.5-2.4s1.9.8 2.5 2.4" />
      <Path d="M14 10h4M14 13.5h3" />
    </Svg>
  );
}

export function IconeCarte(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Path d="M12 21s6.5-6.1 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 14.9 12 21 12 21Z" />
      <Circle cx="12" cy="10.3" r="2.3" />
    </Svg>
  );
}

export function IconeDeclarer(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Rect x="3" y="4" width="18" height="11" />
      <Path d="M3 19.5h18" />
      <Path d="M7 8.5h4M7 11.5h7" />
    </Svg>
  );
}

export function IconeRecherche(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Circle cx="10.5" cy="10.5" r="6.5" />
      <Path d="m15.5 15.5 4.5 4.5" />
    </Svg>
  );
}

export function IconeSuivi(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
      <Path d="M10 18.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}

/** Soutien : une main qui donne. */
export function IconeSoutien(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Path d="M3 12.5h3l3.5 3h4l-2-2" />
      <Path d="M6 15.5h3l4.5 4 7-6.5-4.5-4H12l-3 2.5" />
      <Circle cx="16.5" cy="5.5" r="2" />
    </Svg>
  );
}

export function IconeCopier(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Rect x="8" y="8" width="12" height="12" />
      <Path d="M16 5H4v12" />
    </Svg>
  );
}

export function IconeValide(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Path d="m4.5 12.5 5 5 10-11" />
    </Svg>
  );
}

export function IconeFleche(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Path d="M4 12h15" />
      <Path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function IconeAppareilPhoto(p: IconeProps) {
  return (
    <Svg {...commun(p)}>
      <Path d="M3 7.5h4l1.5-2.5h7L17 7.5h4v12H3Z" />
      <Circle cx="12" cy="13" r="3.6" />
    </Svg>
  );
}

/** Marque : une pièce d'identité frappée d'un cachet. */
export function Marque({ taille = 30 }: { taille?: number }) {
  return (
    <Svg width={taille * 1.25} height={taille} viewBox="0 0 40 32">
      <Rect x="0.5" y="0.5" width="31" height="23" fill="none" stroke={couleurs.encre} strokeWidth={1} />
      <Circle cx="9.5" cy="9" r="3.2" fill={couleurs.encre} />
      <Path d="M5.4 16.5c.5-2.2 2.1-3.4 4.1-3.4s3.6 1.2 4.1 3.4Z" fill={couleurs.encre} />
      <Rect x="17" y="7" width="11" height="1.8" fill={couleurs.encre} />
      <Rect x="17" y="11.5" width="8" height="1.6" fill={couleurs.encre} opacity={0.42} />
      <Rect x="17" y="15.5" width="10" height="1.6" fill={couleurs.encre} opacity={0.42} />
      <Circle cx="29" cy="22" r="9" fill={couleurs.papier} />
      <Circle cx="29" cy="22" r="7.6" fill={couleurs.cachet} />
      <Path
        d="m25.4 22.2 2.6 2.7 5-5.6"
        fill="none"
        stroke={couleurs.papier}
        strokeWidth={2}
        strokeLinecap="square"
      />
    </Svg>
  );
}
