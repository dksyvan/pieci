interface CartePieceProps {
  /** Nom affiché sur la pièce — prénom + initiale, comme dans le registre public. */
  nom?: string;
  /** Type de pièce inscrit en haut à gauche. */
  type?: string;
  /** Légère rotation, en degrés. Une pièce posée n'est jamais parfaitement droite. */
  inclinaison?: number;
  /**
   * Mention du cachet. « RETROUVÉE » raconte la promesse du produit ;
   * « DÉCLARÉE » dit l'état réel d'une pièce qu'on vient d'enregistrer.
   */
  cachet?: string;
}

/**
 * L'objet du sujet : une pièce d'identité retrouvée, frappée du cachet Pièci.
 *
 * Volontairement générique — aucun emblème d'État, aucune mention de la
 * République : Pièci est une initiative citoyenne et ne doit jamais se faire
 * passer pour un service officiel.
 *
 * Les données sont des barres pleines, jamais du texte lisible : c'est la même
 * promesse que le floutage serveur, tenue jusque dans l'illustration.
 */
export function CartePiece({
  nom = 'KOUASSI A.',
  type = 'Carte nationale d’identité',
  inclinaison = -1.4,
  cachet = 'RETROUVÉE',
}: CartePieceProps) {
  return (
    <svg
      viewBox="0 0 340 214"
      className="carte-piece"
      style={{ transform: `rotate(${inclinaison}deg)` }}
      role="img"
      aria-label={`Illustration d’une pièce d’identité au nom de ${nom}, marquée du cachet Pièci`}
    >
      <defs>
        {/* Guilloché : la trame ondulée des documents sécurisés */}
        <pattern id="guilloche" width="26" height="13" patternUnits="userSpaceOnUse">
          <path
            d="M0 6.5q6.5-6.5 13 0t13 0"
            fill="none"
            stroke="var(--color-filet-2)"
            strokeWidth="0.5"
            opacity="0.5"
          />
          <path
            d="M0 10q6.5-6.5 13 0t13 0"
            fill="none"
            stroke="var(--color-filet-2)"
            strokeWidth="0.35"
            opacity="0.32"
          />
        </pattern>

        <clipPath id="bordsCarte">
          <rect x="1" y="1" width="338" height="212" rx="5" />
        </clipPath>
      </defs>

      <g clipPath="url(#bordsCarte)">
        <rect x="0" y="0" width="340" height="214" fill="var(--color-carte)" />
        <rect x="0" y="0" width="340" height="214" fill="url(#guilloche)" />

        {/* Bandeau d'en-tête */}
        <rect x="0" y="0" width="340" height="34" fill="var(--color-encre)" />
        <text
          x="18"
          y="22"
          fill="var(--color-papier)"
          fontFamily="var(--font-util)"
          fontSize="10.5"
          letterSpacing="2.4"
        >
          {type.toUpperCase()}
        </text>

        {/* Portrait — une silhouette, jamais un visage */}
        <rect x="18" y="52" width="76" height="94" fill="var(--color-papier-2)" />
        <circle cx="56" cy="88" r="19" fill="var(--color-filet-2)" />
        <path d="M27 146c3.5-19 14-29 29-29s25.5 10 29 29Z" fill="var(--color-filet-2)" />

        {/* Champs : le nom est lisible, tout le reste est caviardé */}
        <text
          x="112"
          y="66"
          fill="var(--color-sourdine)"
          fontFamily="var(--font-util)"
          fontSize="8"
          letterSpacing="1.6"
        >
          NOM
        </text>
        <text
          x="112"
          y="84"
          fill="var(--color-encre)"
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="19"
          letterSpacing="-0.4"
        >
          {nom}
        </text>

        <text
          x="112"
          y="106"
          fill="var(--color-sourdine)"
          fontFamily="var(--font-util)"
          fontSize="8"
          letterSpacing="1.6"
        >
          NUMÉRO
        </text>
        <rect x="112" y="112" width="118" height="9" fill="var(--color-filet)" />

        <text
          x="112"
          y="138"
          fill="var(--color-sourdine)"
          fontFamily="var(--font-util)"
          fontSize="8"
          letterSpacing="1.6"
        >
          NAISSANCE
        </text>
        <rect x="112" y="144" width="74" height="9" fill="var(--color-filet)" />

        {/* Signature caviardée */}
        <rect x="200" y="144" width="54" height="9" fill="var(--color-filet)" />

        {/* Pied de carte : bandes de données, illisibles par construction */}
        <rect x="0" y="168" width="340" height="46" fill="var(--color-papier-2)" />
        <rect x="18" y="180" width="196" height="7" fill="var(--color-filet)" />
        <rect x="18" y="193" width="148" height="7" fill="var(--color-filet)" />

        {/* Le cachet, seul aplat de couleur — posé de travers, comme un vrai tampon */}
        <g transform="translate(268 150) rotate(-13)">
          <circle r="42" fill="var(--color-cachet)" opacity="0.1" />
          <circle r="42" fill="none" stroke="var(--color-cachet)" strokeWidth="2.4" opacity="0.85" />
          <circle r="35" fill="none" stroke="var(--color-cachet)" strokeWidth="0.8" opacity="0.6" />
          <text
            textAnchor="middle"
            y="-12"
            fill="var(--color-cachet)"
            fontFamily="var(--font-util)"
            fontSize="10"
            letterSpacing="2.8"
            opacity="0.95"
          >
            PIÈCI
          </text>
          <path
            d="m-15 4 10 11 21-24"
            fill="none"
            stroke="var(--color-cachet)"
            strokeWidth="4.5"
            strokeLinecap="square"
            opacity="0.95"
          />
          <text
            textAnchor="middle"
            y="30"
            fill="var(--color-cachet)"
            fontFamily="var(--font-util)"
            fontSize="8"
            letterSpacing="1.8"
            opacity="0.9"
          >
            {cachet}
          </text>
        </g>
      </g>

      {/* Le bord de la carte, tracé par-dessus la découpe */}
      <rect
        x="1"
        y="1"
        width="338"
        height="212"
        rx="5"
        fill="none"
        stroke="var(--color-encre)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
