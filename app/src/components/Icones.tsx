/**
 * Jeu de pictogrammes tracés — une seule grille (24), une seule épaisseur (1.4),
 * des extrémités carrées. Les emojis sont rendus par la police système : ils
 * apportent un style qu'on n'a pas choisi et qui change d'un OS à l'autre.
 */
interface IconeProps {
  taille?: number;
  className?: string;
}

function base({ taille = 18, className }: IconeProps) {
  return {
    width: taille,
    height: taille,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
    'aria-hidden': true,
    focusable: false,
    className,
  };
}

export function IconeAccueil(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

/** Registre : une pièce d'identité posée à plat. */
export function IconeRegistre(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="5.5" width="18" height="13" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M6 16c.6-1.6 1.5-2.4 2.5-2.4s1.9.8 2.5 2.4" />
      <path d="M14 10h4M14 13.5h3" />
    </svg>
  );
}

export function IconeCarte(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 21s6.5-6.1 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="10.3" r="2.3" />
    </svg>
  );
}

/** Déclarer une trouvaille : une pièce que l'on tend. */
export function IconeDeclarer(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="4" width="18" height="11" />
      <path d="M3 19.5h18" />
      <path d="M7 8.5h4M7 11.5h7" />
    </svg>
  );
}

export function IconeRecherche(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </svg>
  );
}

export function IconeSuivi(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

/** Soutien : une main qui donne. */
export function IconeSoutien(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 12.5h3l3.5 3h4l-2-2" />
      <path d="M6 15.5h3l4.5 4 7-6.5-4.5-4H12l-3 2.5" />
      <circle cx="16.5" cy="5.5" r="2" />
    </svg>
  );
}

export function IconeCopier(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <rect x="8" y="8" width="12" height="12" />
      <path d="M16 5H4v12" />
    </svg>
  );
}

export function IconeValide(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function IconeFleche(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function IconeSceau(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <rect x="5" y="10.5" width="14" height="9" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 1 1 7 0v3" />
    </svg>
  );
}

export function IconeGuide(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 4.5h9a2.5 2.5 0 0 1 2.5 2.5v12.5H7.5A2.5 2.5 0 0 1 5 17z" />
      <path d="M8.5 9h5" />
      <path d="M8.5 12.5h5" />
    </svg>
  );
}

export function IconePartage(p: IconeProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 15V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M5 13v6.5h14V13" />
    </svg>
  );
}

/**
 * WhatsApp — le seul pictogramme de marque du jeu, et donc le seul rempli.
 * Un combiné générique ne serait pas reconnu : ce qui décide quelqu'un à
 * appuyer, c'est de voir l'application qu'il utilise tous les jours.
 */
export function IconeWhatsApp({ taille = 18, className }: IconeProps) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable={false}
      className={className}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m5.8 14.16c-.25.69-1.43 1.32-1.99 1.4-.51.08-1.15.11-1.86-.12-.43-.14-.98-.32-1.68-.62-2.96-1.28-4.9-4.26-5.04-4.46-.15-.2-1.21-1.61-1.21-3.07s.77-2.18 1.04-2.48c.27-.3.59-.37.79-.37s.39 0 .57.01c.18.01.42-.07.66.5.25.6.84 2.06.91 2.21.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.3.15.47.12.65-.07.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.02.96.3.15.5.22.57.35.07.12.07.72-.18 1.41" />
    </svg>
  );
}

export function IconeFacebook({ taille = 18, className }: IconeProps) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable={false}
      className={className}
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94" />
    </svg>
  );
}
