import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Pattern,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { couleurs, polices } from '../design/theme';

interface CartePieceProps {
  /** Nom porté par la pièce — prénom + initiale, comme dans le registre public. */
  nom?: string;
  /** Type de pièce inscrit dans le bandeau. */
  type?: string;
  /**
   * Mention du cachet. « RETROUVÉE » raconte la promesse du produit ;
   * « DÉCLARÉE » dit l'état réel d'une pièce qu'on vient d'enregistrer.
   */
  cachet?: string;
  /** Largeur souhaitée ; la hauteur suit le rapport d'une carte d'identité. */
  largeur?: number;
}

/**
 * L'objet du sujet : une pièce d'identité, frappée du cachet Pièci.
 * Portage de app/src/components/CartePiece.tsx.
 *
 * Volontairement générique — aucun emblème d'État : Pièci est une initiative
 * citoyenne et ne doit jamais se faire passer pour un service officiel.
 * Les données sont des barres pleines, jamais du texte lisible.
 */
export function CartePiece({
  nom = 'KOUASSI A.',
  type = 'Carte nationale d’identité',
  cachet = 'RETROUVÉE',
  largeur = 320,
}: CartePieceProps) {
  const hauteur = Math.round((largeur * 214) / 340);

  return (
    <Svg
      width={largeur}
      height={hauteur}
      viewBox="0 0 340 214"
      accessibilityLabel={`Illustration d’une pièce d’identité au nom de ${nom}, marquée du cachet Pièci`}
    >
      <Defs>
        {/* Guilloché : la trame ondulée des documents sécurisés */}
        <Pattern id="guilloche" width="26" height="13" patternUnits="userSpaceOnUse">
          <Path
            d="M0 6.5q6.5-6.5 13 0t13 0"
            fill="none"
            stroke={couleurs.filet2}
            strokeWidth={0.5}
            opacity={0.5}
          />
          <Path
            d="M0 10q6.5-6.5 13 0t13 0"
            fill="none"
            stroke={couleurs.filet2}
            strokeWidth={0.35}
            opacity={0.32}
          />
        </Pattern>
        <ClipPath id="bords">
          <Rect x="1" y="1" width="338" height="212" rx="5" />
        </ClipPath>
      </Defs>

      <G clipPath="url(#bords)">
        <Rect width="340" height="214" fill={couleurs.carte} />
        <Rect width="340" height="214" fill="url(#guilloche)" />

        <Rect width="340" height="34" fill={couleurs.encre} />
        <SvgText
          x="18"
          y="22"
          fill={couleurs.papier}
          fontFamily={polices.util}
          fontSize="10.5"
          letterSpacing="2.4"
        >
          {type.toUpperCase()}
        </SvgText>

        {/* Portrait — une silhouette, jamais un visage */}
        <Rect x="18" y="52" width="76" height="94" fill={couleurs.papier2} />
        <Circle cx="56" cy="88" r="19" fill={couleurs.filet2} />
        <Path d="M27 146c3.5-19 14-29 29-29s25.5 10 29 29Z" fill={couleurs.filet2} />

        {/* Le nom est lisible, tout le reste est caviardé */}
        <SvgText x="112" y="66" fill={couleurs.sourdine} fontFamily={polices.util} fontSize="8" letterSpacing="1.6">
          NOM
        </SvgText>
        <SvgText x="112" y="84" fill={couleurs.encre} fontFamily={polices.display} fontSize="19">
          {nom}
        </SvgText>

        <SvgText x="112" y="106" fill={couleurs.sourdine} fontFamily={polices.util} fontSize="8" letterSpacing="1.6">
          NUMÉRO
        </SvgText>
        <Rect x="112" y="112" width="118" height="9" fill={couleurs.filet} />

        <SvgText x="112" y="138" fill={couleurs.sourdine} fontFamily={polices.util} fontSize="8" letterSpacing="1.6">
          NAISSANCE
        </SvgText>
        <Rect x="112" y="144" width="74" height="9" fill={couleurs.filet} />
        <Rect x="200" y="144" width="54" height="9" fill={couleurs.filet} />

        <Rect y="168" width="340" height="46" fill={couleurs.papier2} />
        <Rect x="18" y="180" width="196" height="7" fill={couleurs.filet} />
        <Rect x="18" y="193" width="148" height="7" fill={couleurs.filet} />

        {/* Le cachet, posé de travers comme un vrai tampon */}
        <G transform="translate(268 150) rotate(-13)">
          <Circle r="42" fill={couleurs.cachet} opacity={0.1} />
          <Circle r="42" fill="none" stroke={couleurs.cachet} strokeWidth={2.4} opacity={0.85} />
          <Circle r="35" fill="none" stroke={couleurs.cachet} strokeWidth={0.8} opacity={0.6} />
          <SvgText
            textAnchor="middle"
            y="-12"
            fill={couleurs.cachet}
            fontFamily={polices.util}
            fontSize="10"
            letterSpacing="2.8"
          >
            PIÈCI
          </SvgText>
          <Path
            d="m-15 4 10 11 21-24"
            fill="none"
            stroke={couleurs.cachet}
            strokeWidth={4.5}
            strokeLinecap="square"
          />
          <SvgText
            textAnchor="middle"
            y="30"
            fill={couleurs.cachet}
            fontFamily={polices.util}
            fontSize="8"
            letterSpacing="1.8"
          >
            {cachet}
          </SvgText>
        </G>
      </G>

      <Rect
        x="1"
        y="1"
        width="338"
        height="212"
        rx="5"
        fill="none"
        stroke={couleurs.encre}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

/**
 * La même pièce, réduite à ce qui reste lisible dans une ligne de registre :
 * bandeau, portrait, champs caviardés, cachet.
 */
export function VignettePiece({ taille = 56 }: { taille?: number }) {
  const hauteur = Math.round((taille * 38) / 56);

  return (
    <Svg width={taille} height={hauteur} viewBox="0 0 56 38">
      <Rect width="56" height="38" fill={couleurs.carte} />
      <Rect width="56" height="8" fill={couleurs.encre} />

      <Rect x="5" y="13" width="14" height="18" fill={couleurs.papier2} />
      <Circle cx="12" cy="19.5" r="3.6" fill={couleurs.filet2} />
      <Path d="M6.6 31c.6-3.6 2.6-5.5 5.4-5.5s4.8 1.9 5.4 5.5Z" fill={couleurs.filet2} />

      <Rect x="23" y="14" width="26" height="3.2" fill={couleurs.filet} />
      <Rect x="23" y="20" width="20" height="2.6" fill={couleurs.filet} />
      <Rect x="23" y="25" width="24" height="2.6" fill={couleurs.filet} />

      <G transform="translate(45 30)">
        <Circle r="7" fill={couleurs.carte} />
        <Circle r="6.2" fill="none" stroke={couleurs.cachet} strokeWidth={1.1} />
        <Path
          d="m-2.6 0 1.8 2 3.6-4"
          fill="none"
          stroke={couleurs.cachet}
          strokeWidth={1.5}
          strokeLinecap="square"
        />
      </G>

      <Rect x="0.5" y="0.5" width="55" height="37" fill="none" stroke={couleurs.filet2} strokeWidth={1} />
    </Svg>
  );
}
