/**
 * Préparation de la photo d'une pièce, avant lecture et avant envoi.
 *
 * Une photo sort d'ici sous deux formes, et sous deux formes seulement :
 *
 * - `envoi` : JPEG 0,85, côté long ramené à 1600 px. C'est ce qui partira au
 *   serveur si la lecture ne découvre pas le dos d'une carte. 12 Mpx en JPEG
 *   pèsent 1,6 à 3,4 Mo ; réduits ainsi, 100 à 300 Ko (mesures de l'enquête et
 *   du banc) : à 1 Mbit/s, 1 à 2,5 s d'envoi au lieu de 21 s. Le serveur réduit
 *   de toute façon à 1600 px de large avant de flouter : rien n'est perdu ;
 * - `lecture` : la même image en niveaux de gris, redressée, contraste étiré,
 *   légèrement accentuée — les réglages qui ont donné 78 % de paires nom +
 *   prénoms utilisables et 0 % de valeurs fausses sur 90 rectos fictifs
 *   (enquête rectos-sans-mrz, où le redressement fait passer les photos
 *   penchées de 6° de 13 % à 100 %).
 *
 * Tout tient en mémoire, le temps de l'appel : aucune toile ne survit (Safari
 * plafonne la mémoire cumulée des toiles, on rend la sienne tout de suite),
 * aucune URL d'objet ne reste ouverte, rien n'est écrit nulle part.
 *
 * Fil principal. Ce travail tourne sur le fil de la page (le moteur, lui, a
 * son propre Worker : voir moteur.ts). Les boucles sur les pixels avancent
 * donc par tranches d'environ 400 000 pixels, en rendant la main entre deux
 * (`ceder`) : sur un téléphone lent, l'écran d'attente reste vivant. Mesuré
 * dans Chrome, fil principal ralenti 6 fois : la rotation en JavaScript d'une
 * image de 1600 px prenait 270 à 310 ms d'un bloc, l'accentuation 130 à
 * 170 ms ; par tranches, aucune ne dépasse une centaine de millisecondes.
 *
 * Pré-rendu : rien ne touche `document`, une toile ou `createImageBitmap` au
 * chargement du module, seulement à l'appel. Les calculs sur les pixels sont
 * des fonctions pures, testées en environnement node.
 *
 * Tout échec de décodage rend `null` (HEIC d'une galerie Android, fichier
 * abîmé, image démesurée) : la personne saisit à la main, sans qu'on compte un
 * échec de lecture — reprendre la même image n'y changerait rien.
 */

/** Image en niveaux de gris : une valeur par pixel, 0 noir, 255 blanc, ligne par ligne. */
export interface ImageGrise {
  readonly largeur: number;
  readonly hauteur: number;
  readonly pixels: Uint8Array;
}

export interface ImagePreparee {
  /** JPEG 0,85, côté long ≤ 1600 px, orientation EXIF appliquée. */
  readonly envoi: Blob;
  /** Image à lire : grise, redressée, contraste étiré, accentuée. */
  readonly lecture: ImageGrise;
  /** Inclinaison corrigée, en degrés (positive : lignes qui descendent vers la droite). */
  readonly angle: number;
}

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------

/** Côté long de l'image envoyée et lue. */
export const COTE_MAX = 1600;
/** Qualité JPEG de l'image envoyée. */
export const QUALITE_ENVOI = 0.85;

/**
 * Au-delà, ce n'est pas une photo de téléphone qu'on sait traiter ici : le
 * décodage seul demanderait des centaines de Mo sur un appareil qui en a peu.
 * Un capteur de 200 Mpx en JPEG pèse environ 25 à 40 Mo.
 */
const OCTETS_MAX = 40 * 1024 * 1024;
/** Plus grand côté décodé accepté (même raison). */
const COTE_DECODE_MAX = 16_384;

/**
 * L'inclinaison s'estime sur une copie réduite à ~800 px de large : c'est la
 * taille du prototype mesuré (81 estimations sur 90 au degré près), et le
 * calcul ne gagne rien à plus de pixels.
 */
const LARGEUR_ANGLE = 800;
/** Plage explorée et pas, en degrés. Au-delà de 12°, le cadre de visée a été ignoré : on lit tel quel. */
const ANGLE_MAX = 12;
export const PAS_ANGLE = 0.5;
/**
 * Borne du coût : au plus ce nombre de points de contour sont projetés, pour
 * chacun des 49 angles. Au-delà, on en prend un sur n, régulièrement.
 */
const POINTS_MAX = 60_000;
/** Pixel de contour : fort gradient (somme des écarts horizontal et vertical) sur un pixel sombre. */
const SEUIL_GRADIENT = 90;
const SEUIL_SOMBRE = 110;

/** Taille d'une tranche de calcul entre deux retours au navigateur. */
const PIXELS_PAR_TRANCHE = 400_000;

// ---------------------------------------------------------------------------
// Fonctions pures (testées sans navigateur)
// ---------------------------------------------------------------------------

/** Dimensions après réduction : côté long ≤ `max`, proportions gardées, jamais d'agrandissement. */
export function dimensionsReduites(largeur: number, hauteur: number, max = COTE_MAX): { largeur: number; hauteur: number } {
  const k = Math.min(1, max / Math.max(largeur, hauteur));
  return { largeur: Math.max(1, Math.round(largeur * k)), hauteur: Math.max(1, Math.round(hauteur * k)) };
}

/**
 * Traitement ligne à ligne d'une image : `traiter(y0, y1)` remplit les lignes
 * [y0, y1[ de `sortie`. La même opération s'exécute d'un bloc (fonctions
 * exportées, tests) ou par tranches (`preparerImage`).
 */
interface Operation {
  readonly sortie: ImageGrise;
  traiter(y0: number, y1: number): void;
}

const executer = (operation: Operation): ImageGrise => {
  operation.traiter(0, operation.sortie.hauteur);
  return operation.sortie;
};

/**
 * `signal` : levé, le traitement s'arrête entre deux tranches et la promesse
 * échoue avec une `DOMException` « AbortError », comme la lecture.
 */
async function executerParTranches(operation: Operation, signal?: AbortSignal): Promise<ImageGrise> {
  const { largeur, hauteur } = operation.sortie;
  const pas = Math.max(1, Math.floor(PIXELS_PAR_TRANCHE / Math.max(1, largeur)));
  for (let y = 0; y < hauteur; y += pas) {
    if (signal?.aborted) throw new DOMException('Lecture annulée', 'AbortError');
    operation.traiter(y, Math.min(hauteur, y + pas));
    if (y + pas < hauteur) await ceder();
  }
  return operation.sortie;
}

/** RGBA → gris (luminance BT.601 en entiers : 0,299 R + 0,587 G + 0,114 B). La transparence compte pour du blanc. */
function operationGris(rgba: Uint8ClampedArray | Uint8Array, largeur: number, hauteur: number): Operation {
  const pixels = new Uint8Array(largeur * hauteur);
  return {
    sortie: { largeur, hauteur, pixels },
    traiter(y0, y1) {
      for (let i = y0 * largeur, j = i * 4, fin = y1 * largeur; i < fin; i++, j += 4) {
        const y = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
        const a = rgba[j + 3];
        pixels[i] = a === 255 ? y : (y * a + 255 * (255 - a)) >> 8;
      }
    },
  };
}

export function versGris(rgba: Uint8ClampedArray | Uint8Array, largeur: number, hauteur: number): ImageGrise {
  return executer(operationGris(rgba, largeur, hauteur));
}

/** Copie réduite d'un facteur entier, par moyenne des blocs (le prototype réduisait à 800 px avant d'estimer l'angle). */
function reduireParBlocs(image: ImageGrise, facteur: number): ImageGrise {
  if (facteur <= 1) return image;
  const largeur = Math.floor(image.largeur / facteur);
  const hauteur = Math.floor(image.hauteur / facteur);
  const pixels = new Uint8Array(largeur * hauteur);
  const aire = facteur * facteur;
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      let somme = 0;
      for (let dy = 0; dy < facteur; dy++) {
        const base = (y * facteur + dy) * image.largeur + x * facteur;
        for (let dx = 0; dx < facteur; dx++) somme += image.pixels[base + dx];
      }
      pixels[y * largeur + x] = (somme / aire) | 0;
    }
  }
  return { largeur, hauteur, pixels };
}

/**
 * Inclinaison des lignes de texte, en degrés, par profil de projection (port
 * de l'enquête rectos-sans-mrz, redressement.mjs).
 *
 * On relève les pixels de contour sombres (le tracé des lettres), puis, pour
 * chaque angle candidat, on les projette sur l'axe vertical tourné de cet
 * angle. Quand l'angle est le bon, les lettres d'une même ligne tombent dans
 * les mêmes cases : l'histogramme est fait de pics hauts séparés de creux, et
 * sa variance est maximale.
 *
 * Positive : les lignes descendent vers la droite. 0 si l'image n'a pas assez
 * de contours pour trancher (page blanche, photo floue).
 *
 * Coût borné quelle que soit l'image : copie de ~800 px de large, au plus
 * `POINTS_MAX` points, 49 angles. Mesuré : 13 à 29 ms dans Chrome sur PC,
 * ~100 ms fil principal ralenti 6 fois.
 */
export function estimerAngle(image: ImageGrise): number {
  const petite = reduireParBlocs(image, Math.max(1, Math.round(image.largeur / LARGEUR_ANGLE)));
  const { largeur: W, hauteur: H, pixels: p } = petite;
  if (W < 3 || H < 3) return 0;

  let xs: number[] = [];
  let ys: number[] = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (p[i] >= SEUIL_SOMBRE) continue;
      const g = Math.abs(p[i + 1] - p[i - 1]) + Math.abs(p[i + W] - p[i - W]);
      if (g > SEUIL_GRADIENT) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  if (xs.length < 50) return 0;
  if (xs.length > POINTS_MAX) {
    const pas = Math.ceil(xs.length / POINTS_MAX);
    xs = xs.filter((_, k) => k % pas === 0);
    ys = ys.filter((_, k) => k % pas === 0);
  }

  const cases = H * 2 + 2;
  const histogramme = new Float64Array(cases);
  let meilleur = 0;
  let meilleureVariance = -1;
  for (let pas = -ANGLE_MAX / PAS_ANGLE; pas <= ANGLE_MAX / PAS_ANGLE; pas++) {
    const r = (pas * PAS_ANGLE * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    histogramme.fill(0);
    for (let k = 0; k < xs.length; k++) {
      const yp = Math.round(ys[k] * c - xs[k] * s) + H;
      if (yp >= 0 && yp < cases) histogramme[yp]++;
    }
    let somme = 0;
    let somme2 = 0;
    for (let k = 0; k < cases; k++) {
      somme += histogramme[k];
      somme2 += histogramme[k] * histogramme[k];
    }
    const variance = somme2 / cases - (somme / cases) ** 2;
    // Supérieur strict : à variance égale, l'angle le plus proche de -12° gagne,
    // comme dans le prototype mesuré.
    if (variance > meilleureVariance) {
      meilleureVariance = variance;
      meilleur = pas * PAS_ANGLE;
    }
  }
  return meilleur + 0; // pas de « -0 »
}

/**
 * Rotation qui ramène à l'horizontale des lignes inclinées de `angle` degrés
 * (celui d'`estimerAngle`). Le cadre s'agrandit pour ne rien couper — un coin
 * de carte rogné peut emporter le début d'un nom — et ce qui est découvert est
 * blanc, comme le fond que Tesseract attend. Interpolation bilinéaire.
 */
function operationRedressement(image: ImageGrise, angle: number): Operation {
  const r = (angle * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const { largeur: W, hauteur: H, pixels: source } = image;
  const largeur = Math.ceil(Math.abs(W * c) + Math.abs(H * s));
  const hauteur = Math.ceil(Math.abs(W * s) + Math.abs(H * c));
  const pixels = new Uint8Array(largeur * hauteur);
  const cxS = (W - 1) / 2;
  const cyS = (H - 1) / 2;
  const cxD = (largeur - 1) / 2;
  const cyD = (hauteur - 1) / 2;
  return {
    sortie: { largeur, hauteur, pixels },
    traiter(y0, y1) {
      for (let y = y0; y < y1; y++) {
        const dy = y - cyD;
        for (let x = 0; x < largeur; x++) {
          const dx = x - cxD;
          // Correspondance inverse : le point de la source qui arrive en (x, y).
          const sx = c * dx - s * dy + cxS;
          const sy = s * dx + c * dy + cyS;
          const x0 = Math.floor(sx);
          const y0s = Math.floor(sy);
          if (x0 < 0 || y0s < 0 || x0 >= W - 1 || y0s >= H - 1) {
            pixels[y * largeur + x] = 255;
            continue;
          }
          const fx = sx - x0;
          const fy = sy - y0s;
          const i = y0s * W + x0;
          const haut = source[i] + (source[i + 1] - source[i]) * fx;
          const bas = source[i + W] + (source[i + W + 1] - source[i + W]) * fx;
          pixels[y * largeur + x] = (haut + (bas - haut) * fy + 0.5) | 0;
        }
      }
    },
  };
}

export function redresser(image: ImageGrise, angle: number): ImageGrise {
  return angle ? executer(operationRedressement(image, angle)) : image;
}

/**
 * Étire le contraste : le 1er centile devient noir, le 99e blanc (comme
 * `normalise()` de sharp, utilisé dans la mesure). Une photo terne ou
 * sous-exposée garde ainsi des lettres franches. En place. Une image presque
 * uniforme est laissée telle quelle : l'étirer n'amplifierait que du bruit.
 */
export function etirerContraste(image: ImageGrise): void {
  const { pixels } = image;
  const n = pixels.length;
  if (!n) return;
  const histogramme = new Uint32Array(256);
  for (let i = 0; i < n; i++) histogramme[pixels[i]]++;
  const seuilBas = n * 0.01;
  const seuilHaut = n * 0.99;
  let cumul = 0;
  let bas = 0;
  let haut = 255;
  let basTrouve = false;
  for (let v = 0; v < 256; v++) {
    cumul += histogramme[v];
    if (!basTrouve && cumul > seuilBas) {
      bas = v;
      basTrouve = true;
    }
    if (cumul >= seuilHaut) {
      haut = v;
      break;
    }
  }
  if (haut - bas < 16) return;
  const table = new Uint8Array(256);
  for (let v = 0; v < 256; v++) table[v] = Math.max(0, Math.min(255, Math.round(((v - bas) * 255) / (haut - bas))));
  for (let i = 0; i < n; i++) pixels[i] = table[pixels[i]];
}

/**
 * Accentuation légère : noyau 3 × 3 de `sharpen()` sans paramètre de sharp
 * (centre 32, voisins -1, divisé par 24), celui de la mesure. Rend une copie ;
 * les bords sont recopiés.
 */
function operationAccentuation(image: ImageGrise): Operation {
  const { largeur: W, hauteur: H, pixels: p } = image;
  const pixels = new Uint8Array(p);
  return {
    sortie: { largeur: W, hauteur: H, pixels },
    traiter(y0, y1) {
      for (let y = Math.max(1, y0); y < Math.min(H - 1, y1); y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          const voisins = p[i - W - 1] + p[i - W] + p[i - W + 1] + p[i - 1] + p[i + 1] + p[i + W - 1] + p[i + W] + p[i + W + 1];
          const v = (32 * p[i] - voisins) / 24;
          pixels[i] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
      }
    },
  };
}

export function accentuer(image: ImageGrise): ImageGrise {
  return executer(operationAccentuation(image));
}

/** Bande horizontale [haut, bas[ de l'image, bornée à l'image. */
export function recadrer(image: ImageGrise, haut: number, bas: number): ImageGrise {
  const h0 = Math.max(0, Math.min(image.hauteur - 1, Math.floor(haut)));
  const h1 = Math.max(h0 + 1, Math.min(image.hauteur, Math.ceil(bas)));
  return {
    largeur: image.largeur,
    hauteur: h1 - h0,
    pixels: image.pixels.slice(h0 * image.largeur, h1 * image.largeur),
  };
}

/**
 * Part basse de l'image où chercher la bande à chevrons quand la lecture du
 * recto n'a pas su la situer. Le cadre de visée cale la pièce sur l'image
 * (camera.ts, marge de 8 %) : la bande d'un passeport occupe le cinquième du
 * bas de la page. Les 40 % du bas la contiennent avec du jeu pour une main qui
 * tremble, sans relire tout le recto.
 */
export const PART_BANDE_BASSE = 0.4;

export function bandeBasse(image: ImageGrise): ImageGrise {
  return recadrer(image, image.hauteur * (1 - PART_BANDE_BASSE), image.hauteur);
}

/**
 * Part haute de l'image lue par la passe d'en-tête (voir `executerLecture`,
 * moteur.ts) : le tiers haut, avec du jeu. Le cadre de visée cale la pièce à
 * 8 % du bord, mais une photo de galerie ou prise de loin met le bandeau plus
 * bas : sur les photos fictives du banc où la carte n'occupe que la moitié de
 * l'image, le bas du bandeau tombe à 34 % de la hauteur.
 */
export const PART_EN_TETE = 0.4;

/**
 * Agrandissement de l'en-tête, et largeur au-delà de laquelle on n'agrandit
 * plus : 1,5 fois une photo de 1600 px, 2400 px. Mesuré sur 48 photos
 * fictives : ×2 ne lit pas mieux et coûte 40 % de plus.
 */
const AGRANDISSEMENT_EN_TETE = 1.5;
const LARGEUR_MAX_EN_TETE = 2400;

/**
 * Seuillage local de Sauvola : un pixel est de l'encre s'il est plus sombre
 * que m × (1 + k × (s / R − 1)), m et s étant la moyenne et l'écart-type des
 * pixels voisins (carré de 31 px de côté). Une zone unie (bandeau, fond) a un
 * écart-type faible : son seuil tombe sous sa propre teinte, elle devient
 * blanche. En dessous de `ECART_MIN`, rien n'est de l'encre : le grain d'une
 * photo sombre ne doit pas se changer en poivre.
 */
const DEMI_FENETRE = 15;
/**
 * Cadre blanc autour de l'en-tête préparé, en pixels. Sans lui, une tache
 * d'encre qui touche le bord (la photo d'identité coupée par le bas de
 * l'en-tête, seuillée en inversé) fait écrire à Leptonica « Error in
 * pixScanForForeground: invalid box » dans la console de la page. Mesuré sur un
 * recto fictif : deux messages sans cadre, aucun avec, et le même type lu sur
 * 64 photos.
 */
export const MARGE_EN_TETE = 20;
const SAUVOLA_K = 0.2;
const SAUVOLA_R = 128;
const ECART_MIN = 8;

export function enTete(image: ImageGrise): ImageGrise {
  return recadrer(image, 0, image.hauteur * PART_EN_TETE);
}

/**
 * En-tête préparé pour la lecture : agrandi (bilinéaire), puis seuillé en noir
 * et blanc par Sauvola. Avec `inverse`, c'est le texte CLAIR qui devient noir.
 *
 * Pourquoi. Le bandeau d'une carte est souvent de couleur, avec la mention
 * écrite en blanc ou en clair. Dans l'image grise, ce texte blanc sur un
 * orange moyen ne se détache pas assez : Tesseract classe le bandeau comme une
 * illustration et l'écarte, et avec lui le premier champ écrit juste dessous
 * (mesuré sur des cartes fictives à bandeau orange : mention et nom perdus sur
 * toutes les photos, prénoms lus). Inverser l'image grise n'y change rien
 * (texte identique à l'octet près : Tesseract seuille de la même façon) ; la
 * seuiller localement, si : le bandeau devient blanc, le texte clair noir.
 *
 * Les moyennes locales se prennent sur l'image d'origine (sommes cumulées :
 * coût constant par pixel), le seuil sur l'image agrandie.
 */
function operationSeuillageLocal(source: ImageGrise, inverse: boolean): Operation {
  const { largeur: W, hauteur: H, pixels: p } = source;
  const facteur = Math.max(1, Math.min(AGRANDISSEMENT_EN_TETE, LARGEUR_MAX_EN_TETE / Math.max(1, W)));
  const largeur = Math.max(1, Math.round(W * facteur));
  const hauteur = Math.max(1, Math.round(H * facteur));
  const LS = largeur + 2 * MARGE_EN_TETE;
  const HS = hauteur + 2 * MARGE_EN_TETE;
  const pixels = new Uint8Array(LS * HS).fill(255);

  // Sommes cumulées des valeurs (entiers : au plus 2 400 × 1 000 × 255) et de
  // leurs carrés (flottants : dépassent 2³²). Valeurs inversées d'emblée.
  const L = W + 1;
  const somme = new Uint32Array(L * (H + 1));
  const carres = new Float64Array(L * (H + 1));
  for (let y = 0; y < H; y++) {
    let ligne = 0;
    let ligne2 = 0;
    for (let x = 0; x < W; x++) {
      const v = inverse ? 255 - p[y * W + x] : p[y * W + x];
      ligne += v;
      ligne2 += v * v;
      somme[(y + 1) * L + x + 1] = somme[y * L + x + 1] + ligne;
      carres[(y + 1) * L + x + 1] = carres[y * L + x + 1] + ligne2;
    }
  }

  return {
    sortie: { largeur: LS, hauteur: HS, pixels },
    traiter(y0, y1) {
      if (W < 2 || H < 2) return;
      // Lignes de sortie [y0, y1[ : celles du cadre blanc restent blanches.
      for (let y = Math.max(0, y0 - MARGE_EN_TETE); y < Math.min(hauteur, y1 - MARGE_EN_TETE); y++) {
        const debutLigne = (y + MARGE_EN_TETE) * LS + MARGE_EN_TETE;
        const sy = Math.min(H - 1.001, Math.max(0, (y + 0.5) / facteur - 0.5));
        const ys = Math.floor(sy);
        const fy = sy - ys;
        const cy = Math.min(H - 1, Math.floor(y / facteur));
        const haut = Math.max(0, cy - DEMI_FENETRE);
        const bas = Math.min(H, cy + DEMI_FENETRE + 1);
        for (let x = 0; x < largeur; x++) {
          const sx = Math.min(W - 1.001, Math.max(0, (x + 0.5) / facteur - 0.5));
          const xs = Math.floor(sx);
          const fx = sx - xs;
          const i = ys * W + xs;
          const dessus = p[i] + (p[i + 1] - p[i]) * fx;
          const dessous = p[i + W] + (p[i + W + 1] - p[i + W]) * fx;
          const brut = dessus + (dessous - dessus) * fy;
          const v = inverse ? 255 - brut : brut;

          const cx = Math.min(W - 1, Math.floor(x / facteur));
          const gauche = Math.max(0, cx - DEMI_FENETRE);
          const droite = Math.min(W, cx + DEMI_FENETRE + 1);
          const n = (bas - haut) * (droite - gauche);
          const a = bas * L + droite;
          const b = haut * L + droite;
          const c = bas * L + gauche;
          const d = haut * L + gauche;
          const m = (somme[a] - somme[b] - somme[c] + somme[d]) / n;
          const variance = (carres[a] - carres[b] - carres[c] + carres[d]) / n - m * m;
          const s = variance > 0 ? Math.sqrt(variance) : 0;
          pixels[debutLigne + x] = s >= ECART_MIN && v < m * (1 + SAUVOLA_K * (s / SAUVOLA_R - 1)) ? 0 : 255;
        }
      }
    },
  };
}

/**
 * Écart de teinte, en niveaux de gris, entre une ligne du bandeau et le fond
 * clair de la carte ; et part de l'image au-delà de laquelle on cesse de
 * chercher le bas du bandeau.
 */
const ECART_BANDEAU = 25;
const PART_MAX_BANDEAU = 0.4;

/**
 * L'image sous la ligne `haut` (le bas du titre de la pièce), privée du reste
 * du bandeau de couleur qui descend souvent plus bas que le titre.
 *
 * Le bandeau se reconnaît ligne par ligne : la moyenne des pixels du milieu de
 * la ligne (60 % central, loin des bords de la photo) est nettement plus sombre
 * que le fond de la carte, pris comme le 80e centile de ces moyennes. On saute
 * ces lignes-là. Sans bandeau, rien n'est sauté.
 *
 * Pourquoi : laisser ne serait-ce qu'une vingtaine de pixels de bandeau en haut
 * de l'image suffit à ce que la mise en page de Tesseract écarte encore le nom,
 * juste dessous (mesuré sur une photo fictive, coupe 7 px plus haut ou plus bas
 * selon l'agrandissement de l'en-tête : nom lu ou perdu).
 */
export function sousLeBandeau(image: ImageGrise, haut: number): ImageGrise {
  const sous = recadrer(image, haut, image.hauteur);
  const { largeur: W, hauteur: H, pixels } = sous;
  const x0 = Math.floor(W * 0.2);
  const x1 = Math.max(x0 + 1, Math.floor(W * 0.8));
  const moyennes = new Float64Array(H);
  for (let y = 0; y < H; y++) {
    let somme = 0;
    for (let x = x0; x < x1; x++) somme += pixels[y * W + x];
    moyennes[y] = somme / (x1 - x0);
  }
  const fond = Float64Array.from(moyennes).sort()[Math.floor(H * 0.8)] ?? 255;
  let y = 0;
  while (y < H * PART_MAX_BANDEAU && moyennes[y] < fond - ECART_BANDEAU) y++;
  return y ? recadrer(sous, y, H) : sous;
}

/**
 * Une image seuillée porte-t-elle assez d'encre pour mériter une lecture ?
 * Sous un pixel noir sur mille, il n'y a rien à lire, et Tesseract n'y
 * gagnerait que des erreurs de Leptonica recopiées dans la console de la page
 * (« Error in pixScanForForeground: invalid box » : mesuré sur un recto propre
 * à fond blanc, dont l'en-tête inversé est tout blanc).
 */
export const ENCRE_MIN = 0.001;

export function aDeLEncre(image: ImageGrise): boolean {
  const { pixels } = image;
  const seuil = Math.max(1, pixels.length * ENCRE_MIN);
  let noirs = 0;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] === 0 && ++noirs >= seuil) return true;
  }
  return false;
}

/** Version d'un bloc, pour les tests. */
export function seuillerEnTete(image: ImageGrise, inverse: boolean): ImageGrise {
  return executer(operationSeuillageLocal(image, inverse));
}

/** Version par tranches, pour la lecture (fil principal) ; s'arrête entre deux tranches si `signal` est levé. */
export function preparerEnTete(image: ImageGrise, inverse: boolean, signal?: AbortSignal): Promise<ImageGrise> {
  return executerParTranches(operationSeuillageLocal(image, inverse), signal);
}

/**
 * L'image tournée d'un demi-tour : les pixels dans l'ordre inverse. Sert à
 * relire une photo prise tête en bas (voir `executerLecture`, moteur.ts). Un
 * quart de tour n'est pas utile ici : sur une image couchée, Tesseract (psm 3)
 * repère lui-même les lignes verticales et les remet à l'horizontale — mais
 * une fois sur deux à l'envers, d'où ce demi-tour qui couvre les deux cas.
 */
export function tourner180(image: ImageGrise): ImageGrise {
  return { largeur: image.largeur, hauteur: image.hauteur, pixels: image.pixels.slice().reverse() };
}

/**
 * Encode l'image au format PGM binaire (Netpbm « P5 »), que Leptonica lit
 * nativement dans le cœur de Tesseract : un en-tête de quelques octets et les
 * pixels bruts. Rien à compresser (un PNG coûterait ~100 ms de plus sur un
 * petit téléphone), et pas de BMP : tesseract.js le fait passer par un
 * convertisseur JavaScript très lent sur 1600 px.
 */
export function enPgm(image: ImageGrise): Uint8Array {
  const entete = new TextEncoder().encode(`P5\n${image.largeur} ${image.hauteur}\n255\n`);
  const sortie = new Uint8Array(entete.length + image.pixels.length);
  sortie.set(entete, 0);
  sortie.set(image.pixels, entete.length);
  return sortie;
}

/**
 * Rend la main au navigateur entre deux calculs lourds : sur un petit
 * téléphone, chaque étape dure quelques centaines de millisecondes ; enchaînées
 * d'un bloc, elles figeraient l'écran d'attente.
 */
export function ceder(): Promise<void> {
  const planificateur = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof planificateur?.yield === 'function') return planificateur.yield();
  return new Promise((resoudre) => setTimeout(resoudre, 0));
}

// ---------------------------------------------------------------------------
// Navigateur : décodage, toile, encodage
// ---------------------------------------------------------------------------

interface ImageDecodee {
  readonly source: CanvasImageSource;
  readonly largeur: number;
  readonly hauteur: number;
  liberer(): void;
}

/**
 * Décode le fichier, orientation EXIF appliquée : une photo prise téléphone en
 * main arrive souvent « couchée » avec une étiquette qui dit de la redresser.
 *
 * `createImageBitmap` d'abord : le décodage se fait hors du fil principal.
 * Repli sur un élément `<img>`, qui dessine ensuite dans la toile — pour les
 * navigateurs qui n'ont pas `createImageBitmap` (Safari avant 15) ou qui le
 * refusent pour ce format alors que `<img>` l'accepte. Si les deux échouent,
 * c'est un format que ce navigateur ne sait pas lire (HEIC hors Safari) :
 * `null`.
 */
async function decoder(fichier: Blob): Promise<ImageDecodee | null> {
  if (!(fichier instanceof Blob) || fichier.size === 0 || fichier.size > OCTETS_MAX) return null;

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
      return { source: bitmap, largeur: bitmap.width, hauteur: bitmap.height, liberer: () => bitmap.close() };
    } catch {
      // Format refusé ici : on tente l'élément <img>.
    }
  }

  if (typeof Image !== 'function' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  const url = URL.createObjectURL(fichier);
  const liberer = () => URL.revokeObjectURL(url);
  try {
    const element = new Image();
    element.decoding = 'async';
    element.src = url;
    await element.decode();
    if (!element.naturalWidth || !element.naturalHeight) {
      liberer();
      return null;
    }
    return {
      source: element,
      largeur: element.naturalWidth,
      hauteur: element.naturalHeight,
      liberer: () => {
        element.removeAttribute('src');
        liberer();
      },
    };
  } catch {
    liberer();
    return null;
  }
}

type Toile = HTMLCanvasElement | OffscreenCanvas;
type Contexte = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Une toile de la taille voulue. Élément `<canvas>` sur la page (encodage
 * JPEG partout) ; `OffscreenCanvas` hors page, si ce code tourne un jour dans
 * un Worker. `willReadFrequently` : on relit les pixels, autant que la toile
 * reste en mémoire vive plutôt que sur la carte graphique.
 */
function creerToile(largeur: number, hauteur: number): { toile: Toile; contexte: Contexte } | null {
  let toile: Toile;
  if (typeof document !== 'undefined') {
    toile = document.createElement('canvas');
  } else if (typeof OffscreenCanvas === 'function') {
    toile = new OffscreenCanvas(largeur, hauteur);
  } else {
    return null;
  }
  toile.width = largeur;
  toile.height = hauteur;
  const contexte = toile.getContext('2d', { willReadFrequently: true }) as Contexte | null;
  return contexte ? { toile, contexte } : null;
}

/** Rend la mémoire de la toile tout de suite (Safari la plafonne, toutes toiles confondues). */
function viderToile(toile: Toile): void {
  toile.width = 0;
  toile.height = 0;
}

function encoderJpeg(toile: Toile): Promise<Blob | null> {
  if ('convertToBlob' in toile) {
    return toile.convertToBlob({ type: 'image/jpeg', quality: QUALITE_ENVOI }).catch(() => null);
  }
  return new Promise((resoudre) => {
    try {
      toile.toBlob((blob) => resoudre(blob && blob.size > 0 ? blob : null), 'image/jpeg', QUALITE_ENVOI);
    } catch {
      resoudre(null);
    }
  });
}

/**
 * Étapes de réduction : largeurs × hauteurs successives, chacune au plus deux
 * fois plus petite que la précédente, la dernière aux dimensions voulues.
 * Vide si l'image est déjà assez petite.
 */
export function etapesReduction(largeur: number, hauteur: number, max = COTE_MAX): { largeur: number; hauteur: number }[] {
  const cible = dimensionsReduites(largeur, hauteur, max);
  const etapes: { largeur: number; hauteur: number }[] = [];
  let l = largeur;
  let h = hauteur;
  while (l / cible.largeur > 2) {
    l = Math.round(l / 2);
    h = Math.round(h / 2);
    etapes.push({ largeur: l, hauteur: h });
  }
  if (l !== cible.largeur || h !== cible.hauteur) etapes.push(cible);
  return etapes;
}

/**
 * Décode et réduit l'image dans une toile ; `null` si c'est impossible.
 *
 * Réduction bilinéaire (`imageSmoothingQuality: 'low'`) par moitiés
 * successives. Pourquoi pas 'high' : le navigateur fait ce rééchantillonnage
 * sur le fil de la page, d'un bloc, au moment où l'on relit les pixels.
 * Mesuré dans Chrome, fil principal ralenti 6 fois, photo de 2400 px :
 * 580 à 670 ms bloqués en 'high' ou 'medium', 150 ms en 'low'. Le bilinéaire
 * ne crénelle pas tant que chaque étape divise par deux au plus : d'où les
 * moitiés successives pour une photo de 4000 px. Résultats de lecture
 * identiques sur les images du banc.
 */
async function dessinerReduite(fichier: Blob): Promise<{ toile: Toile; contexte: Contexte; largeur: number; hauteur: number } | null> {
  const image = await decoder(fichier);
  if (!image) return null;
  const toiles: Toile[] = [];
  try {
    if (image.largeur > COTE_DECODE_MAX || image.hauteur > COTE_DECODE_MAX) return null;
    const etapes = etapesReduction(image.largeur, image.hauteur);
    const cible = etapes.at(-1) ?? { largeur: image.largeur, hauteur: image.hauteur };
    let source: CanvasImageSource = image.source;
    for (const etape of etapes.slice(0, -1)) {
      const intermediaire = creerToile(etape.largeur, etape.hauteur);
      if (!intermediaire) return null;
      toiles.push(intermediaire.toile);
      intermediaire.contexte.imageSmoothingEnabled = true;
      intermediaire.contexte.imageSmoothingQuality = 'low';
      intermediaire.contexte.drawImage(source, 0, 0, etape.largeur, etape.hauteur);
      source = intermediaire.toile;
    }
    const finale = creerToile(cible.largeur, cible.hauteur);
    if (!finale) return null;
    finale.contexte.imageSmoothingEnabled = true;
    finale.contexte.imageSmoothingQuality = 'low';
    // Fond blanc : une image à transparence (PNG) ne doit pas devenir noire en JPEG.
    finale.contexte.fillStyle = '#fff';
    finale.contexte.fillRect(0, 0, cible.largeur, cible.hauteur);
    finale.contexte.drawImage(source, 0, 0, cible.largeur, cible.hauteur);
    // La toile finale est relue : on force le dessin maintenant, tant que les
    // intermédiaires existent encore.
    finale.contexte.getImageData(0, 0, 1, 1);
    return { ...finale, ...cible };
  } catch {
    return null;
  } finally {
    for (const toile of toiles) viderToile(toile);
    image.liberer();
  }
}

/**
 * Prépare la photo : image à envoyer et image à lire. `null` si elle ne se
 * décode pas.
 */
export async function preparerImage(fichier: Blob): Promise<ImagePreparee | null> {
  const dessin = await dessinerReduite(fichier);
  if (!dessin) return null;
  let rgba: Uint8ClampedArray;
  let encodage: Promise<Blob | null>;
  try {
    // Lancé avant la relecture des pixels : l'encodage JPEG d'une toile se
    // fait hors du fil principal dans les navigateurs courants.
    encodage = encoderJpeg(dessin.toile);
    rgba = dessin.contexte.getImageData(0, 0, dessin.largeur, dessin.hauteur).data;
  } catch {
    viderToile(dessin.toile);
    return null;
  }
  const envoi = await encodage;
  viderToile(dessin.toile);
  if (!envoi) return null;

  await ceder();
  const gris = await executerParTranches(operationGris(rgba, dessin.largeur, dessin.hauteur));
  await ceder();
  const angle = estimerAngle(gris);
  await ceder();
  const droite = Math.abs(angle) >= PAS_ANGLE ? await executerParTranches(operationRedressement(gris, angle)) : gris;
  etirerContraste(droite);
  await ceder();
  const lecture = await executerParTranches(operationAccentuation(droite));
  return { envoi, lecture, angle };
}
