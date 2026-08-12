/**
 * Génère public/og-image.png — la vignette affichée quand le lien Pièci est
 * partagé (WhatsApp, Facebook, X, LinkedIn).
 *
 * Le rendu se fait par librsvg via sharp, qui ne connaît que les polices
 * installées sur la machine : Archivo n'y est pas, on utilise donc Arial Black
 * (même famille de grotesques grasses) pour le titre et Segoe UI pour le reste.
 * L'image est committée dans public/ — ce script n'a besoin d'être relancé que
 * si le message change.
 *
 *   node scripts/og-image.mjs
 */
import sharp from 'sharp';

const L = 1200;
const H = 630;
const MARGE = 76;

const PAPIER = '#F4F2EC';
const ENCRE = '#14202E';
const CACHET = '#B03A22';
const FILET = '#CFC8B7';
const SOURDINE = '#5B564C';

const DISPLAY = 'Arial Black, Arial, sans-serif';
const UTIL = 'Segoe UI, Arial, sans-serif';

/** Filets verticaux de la grille 12 colonnes, comme le filigrane du site. */
const colonnes = Array.from({ length: 11 }, (_, i) => {
  const x = MARGE + ((L - MARGE * 2) / 12) * (i + 1);
  return `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${FILET}" stroke-width="1" opacity="0.5"/>`;
}).join('');

/** La marque : une pièce d'identité frappée d'un cachet. */
const logo = `
<g transform="translate(${MARGE}, ${MARGE}) scale(1.5)">
  <rect x="0.5" y="0.5" width="31" height="23" fill="none" stroke="${ENCRE}"/>
  <circle cx="9.5" cy="9" r="3.2" fill="${ENCRE}"/>
  <path d="M5.4 16.5c.5-2.2 2.1-3.4 4.1-3.4s3.6 1.2 4.1 3.4Z" fill="${ENCRE}"/>
  <rect x="17" y="7" width="11" height="1.8" fill="${ENCRE}"/>
  <rect x="17" y="11.5" width="8" height="1.6" fill="${ENCRE}" opacity="0.42"/>
  <rect x="17" y="15.5" width="10" height="1.6" fill="${ENCRE}" opacity="0.42"/>
  <circle cx="29" cy="22" r="9" fill="${PAPIER}"/>
  <circle cx="29" cy="22" r="7.6" fill="${CACHET}"/>
  <path d="m25.4 22.2 2.6 2.7 5-5.6" fill="none" stroke="${PAPIER}" stroke-width="2" stroke-linecap="square"/>
</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">
  <rect width="${L}" height="${H}" fill="${PAPIER}"/>
  ${colonnes}

  ${logo}
  <text x="${MARGE + 62}" y="${MARGE + 33}" font-family="${DISPLAY}" font-size="34"
        letter-spacing="-1.4" fill="${ENCRE}">Piè<tspan fill="${CACHET}">ci</tspan></text>

  <text x="${MARGE}" y="285" font-family="${DISPLAY}" font-size="80" letter-spacing="-3.4" fill="${ENCRE}">Ta pièce égarée</text>
  <text x="${MARGE}" y="373" font-family="${DISPLAY}" font-size="80" letter-spacing="-3.4" fill="${ENCRE}">a une <tspan fill="${CACHET}">deuxième chance</tspan>.</text>

  <text x="${MARGE}" y="446" font-family="${UTIL}" font-size="25" fill="${SOURDINE}">
    Trouvée par quelqu’un, déclarée ici, et tu es prévenu automatiquement.
  </text>

  <line x1="${MARGE}" y1="${H - 122}" x2="${L - MARGE}" y2="${H - 122}" stroke="${ENCRE}" stroke-width="1"/>
  <line x1="${MARGE}" y1="${H - 116}" x2="${L - MARGE}" y2="${H - 116}" stroke="${ENCRE}" stroke-width="1"/>

  <text x="${MARGE}" y="${H - 74}" font-family="${UTIL}" font-size="18" font-weight="600"
        letter-spacing="4.2" fill="${SOURDINE}">REGISTRE CITOYEN · CÔTE D’IVOIRE</text>
  <text x="${L - MARGE}" y="${H - 74}" text-anchor="end" font-family="${UTIL}" font-size="18" font-weight="600"
        letter-spacing="4.2" fill="${CACHET}">GRATUIT</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og-image.png');
console.log(`écrit : public/og-image.png (${L}×${H})`);
