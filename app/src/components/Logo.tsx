interface LogoProps {
  /** Masque le mot-symbole : utilisé quand le nom est déjà écrit à côté. */
  seul?: boolean;
}

/**
 * Marque Pièci — une pièce d'identité frappée d'un cachet.
 * Angles vifs, filets 1px, un seul aplat rouge : la même grammaire que le reste
 * du registre.
 */
export function Logo({ seul }: LogoProps) {
  return (
    <span className="marque">
      <svg width="30" height="24" viewBox="0 0 40 32" aria-hidden="true" focusable="false">
        {/* la pièce */}
        <rect x="0.5" y="0.5" width="31" height="23" fill="none" stroke="currentColor" />
        {/* le portrait */}
        <circle cx="9.5" cy="9" r="3.2" fill="currentColor" />
        <path d="M5.4 16.5c.5-2.2 2.1-3.4 4.1-3.4s3.6 1.2 4.1 3.4Z" fill="currentColor" />
        {/* les champs */}
        <rect x="17" y="7" width="11" height="1.8" fill="currentColor" />
        <rect x="17" y="11.5" width="8" height="1.6" fill="currentColor" opacity="0.42" />
        <rect x="17" y="15.5" width="10" height="1.6" fill="currentColor" opacity="0.42" />
        {/* le cachet, seul aplat de couleur */}
        <circle cx="29" cy="22" r="9" fill="var(--color-papier)" />
        <circle cx="29" cy="22" r="7.6" fill="var(--color-cachet)" />
        <path
          d="m25.4 22.2 2.6 2.7 5-5.6"
          fill="none"
          stroke="var(--color-papier)"
          strokeWidth="2"
          strokeLinecap="square"
        />
      </svg>
      {!seul && (
        <span>
          Piè<span className="ci">ci</span>
        </span>
      )}
    </span>
  );
}
