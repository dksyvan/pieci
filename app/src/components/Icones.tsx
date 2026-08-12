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
