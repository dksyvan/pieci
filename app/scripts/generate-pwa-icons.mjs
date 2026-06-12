import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Version carrée du glyphe de favicon.svg (carte d'identité + check),
// fond plein pour couvrir toute la zone (compatible icônes "maskable").
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F77F2E"/>
  <rect x="106" y="170" width="300" height="200" rx="28" fill="#F7F5F0"/>
  <circle cx="180" cy="240" r="34" fill="#0F2A43"/>
  <path d="M146 308a34 34 0 0 1 68 0Z" fill="#0F2A43"/>
  <rect x="240" y="215" width="140" height="20" rx="10" fill="#0F2A43"/>
  <rect x="240" y="257" width="115" height="17" rx="8.5" fill="#9FB3C8"/>
  <circle cx="375" cy="345" r="50" fill="#13A05C" stroke="#F7F5F0" stroke-width="14"/>
  <path d="M353 345l15 17 32-37" fill="none" stroke="#F7F5F0" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

// Variante pour iOS : fond plein, sans transparence, sans coins arrondis
// (iOS applique lui-même le masque "squircle").
const APPLE_ICON_SVG = ICON_SVG;

const targets = [
  { file: 'pwa-192x192.png', size: 192, svg: ICON_SVG },
  { file: 'pwa-512x512.png', size: 512, svg: ICON_SVG },
  { file: 'maskable-icon-512x512.png', size: 512, svg: ICON_SVG },
  { file: 'apple-touch-icon.png', size: 180, svg: APPLE_ICON_SVG },
];

await mkdir(publicDir, { recursive: true });

for (const { file, size, svg } of targets) {
  const out = join(publicDir, file);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`✓ ${file} (${size}x${size})`);
}
