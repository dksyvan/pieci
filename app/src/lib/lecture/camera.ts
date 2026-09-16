import { estNavigateurIntegre } from '../plateforme';

/**
 * Caméra de la déclaration : le viseur dans la page, sans rien lire.
 *
 * Ce module ouvre la caméra arrière, vérifie que son image est assez fine pour
 * qu'on y lise un nom, découpe l'image autour du cadre de visée et la rend sous
 * forme de fichier. Il ne regarde jamais ce que contient l'image : la lecture
 * vit à côté, dans ce dossier, et c'est elle qui décide de ce qu'on en garde.
 *
 * Pourquoi un viseur plutôt que l'appareil photo du système
 * (`<input capture>`) : seul un viseur dans la page peut dessiner un cadre, et
 * sur un Android d'entrée de gamme le navigateur est souvent tué pendant que
 * l'appareil photo du système est au premier plan — la page se recharge, la
 * photo est perdue. L'input reste le repli, et il n'est jamais retiré (voir
 * `CapturePiece`).
 *
 * Pré-rendu : rien ici ne touche `navigator`, `document`, `window` ni une toile
 * au chargement du module, seulement à l'appel des fonctions — depuis un effet
 * ou un geste. `/declarer` est rendu en Node au build, où ces objets
 * n'existent pas.
 *
 * Confidentialité : aucun journal, aucune persistance. Les erreurs des API du
 * navigateur sont avalées sans être relayées ; l'image ne vit dans une toile
 * que le temps d'être encodée, puis la toile est vidée.
 */

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------

/**
 * Côté court minimal du flux, en pixels. En dessous, l'appareil photo du
 * système — qui prend des photos pleine résolution — fait mieux que nous.
 *
 * Calcul (enquête OCR, parcours-ux) : en portrait, une carte de 85,6 mm tenue
 * à 86 % de la largeur d'un flux 1080 p couvre environ 930 px, soit ~276 dpi ;
 * en 720 p, ~184 dpi, trop peu pour les petits caractères. Le côté court est
 * insensible à l'orientation : 1080 × 1920 en portrait, 1920 × 1080 couché.
 */
export const COTE_COURT_MIN = 1080;

/**
 * Ce qu'on demande à la caméra. `ideal` et jamais `min` : une caméra qui
 * plafonne à 1080 p répond quand même, au lieu d'échouer.
 *
 * On vise jusqu'à la 4K parce que la bande du bas d'un passeport (111,8 mm,
 * 44 caractères) veut 1 400 à 1 800 px de large pour être lue (rapport
 * norme-mrz), quand un flux 1080 p en portrait n'en donne qu'environ 830. Les
 * téléphones qui ne savent pas faire mieux que 1080 p restent au-dessus du
 * seuil, et lisent très bien le recto d'une carte.
 */
const CONTRAINTES: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 3840 },
    height: { ideal: 2160 },
  },
};

/**
 * Au-delà, on renonce au viseur. Le temps de l'invite d'autorisation compte
 * dedans : quinze secondes laissent le temps de lire la question, et libèrent
 * la personne si une vue web intégrée ne répond jamais (supposé, non mesuré).
 */
export const DELAI_OUVERTURE_MS = 15_000;

/** Flux obtenu mais aucune image au bout de ce délai : repli (seuil de l'enquête, supposé). */
export const DELAI_PREMIERE_IMAGE_MS = 3_000;

/**
 * Marge gardée autour du cadre de visée, en fraction de la largeur du cadre,
 * de chaque côté.
 *
 * Le cadre a le format d'une carte (85,6 × 54 mm). La page d'un passeport
 * (125 × 88 mm) est plus haute : calée sur la largeur du cadre, elle en déborde
 * de 5,8 % de la hauteur, de chaque côté. 8 % de la largeur, c'est 12,7 % de
 * la hauteur : la page tient, avec du jeu pour une main qui tremble.
 */
export const MARGE_CADRE = 0.08;

/**
 * L'image est réencodée ensuite (réduction pour l'envoi, niveaux de gris pour
 * la lecture) : 0,92 évite une double perte visible sans payer le poids d'un
 * PNG, lent à encoder sur un petit téléphone.
 */
const QUALITE_JPEG = 0.92;

/** Zone plus petite que ça : mise en page en cours, cadre hors champ. L'image entière vaut mieux. */
const ZONE_MIN_PX = 64;

// ---------------------------------------------------------------------------
// Géométrie (fonctions pures)
// ---------------------------------------------------------------------------

export interface Taille {
  largeur: number;
  hauteur: number;
}

export interface Rectangle extends Taille {
  x: number;
  y: number;
}

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Zone de l'image source qui correspond au cadre de visée affiché, marge
 * comprise, en pixels entiers de la source.
 *
 * La vidéo est affichée en `object-fit: cover`, centrée (`object-position` par
 * défaut) : elle est agrandie jusqu'à couvrir sa boîte, et ce qui dépasse est
 * rogné à parts égales. On inverse cette transformation pour ramener le cadre,
 * mesuré à l'écran, dans les pixels de la caméra. `boite` et `cadre` doivent
 * être mesurés dans le même repère (`getBoundingClientRect`) : le défilement
 * de la page s'annule alors de lui-même.
 *
 * Toute mesure absurde (taille nulle, cadre hors de l'image) rend l'image
 * entière : mieux vaut une photo trop large qu'une carte coupée.
 */
export function zoneSource(source: Taille, boite: Rectangle, cadre: Rectangle, marge = MARGE_CADRE): Rectangle {
  const entiere: Rectangle = { x: 0, y: 0, largeur: source.largeur, hauteur: source.hauteur };
  const positifs = [source.largeur, source.hauteur, boite.largeur, boite.hauteur, cadre.largeur, cadre.hauteur];
  if (!positifs.every((v) => Number.isFinite(v) && v > 0) || !Number.isFinite(cadre.x + cadre.y + boite.x + boite.y)) {
    return entiere;
  }

  const echelle = Math.max(boite.largeur / source.largeur, boite.hauteur / source.hauteur);
  const decalageX = (boite.largeur - source.largeur * echelle) / 2;
  const decalageY = (boite.hauteur - source.hauteur * echelle) / 2;
  const m = cadre.largeur * marge;

  const x0 = borner((cadre.x - m - boite.x - decalageX) / echelle, 0, source.largeur);
  const y0 = borner((cadre.y - m - boite.y - decalageY) / echelle, 0, source.hauteur);
  const x1 = borner((cadre.x + cadre.largeur + m - boite.x - decalageX) / echelle, 0, source.largeur);
  const y1 = borner((cadre.y + cadre.hauteur + m - boite.y - decalageY) / echelle, 0, source.hauteur);

  const x = Math.floor(x0);
  const y = Math.floor(y0);
  const zone = { x, y, largeur: Math.ceil(x1) - x, hauteur: Math.ceil(y1) - y };
  return zone.largeur < ZONE_MIN_PX || zone.hauteur < ZONE_MIN_PX ? entiere : zone;
}

// ---------------------------------------------------------------------------
// Fichiers (fonction pure)
// ---------------------------------------------------------------------------

/** Extensions de photo reconnues quand le navigateur ne donne pas de type. */
const EXTENSIONS_PHOTO = /\.(jpe?g|png|webp|gif|bmp|hei[cf]|avif)$/i;

/**
 * Le fichier choisi est-il une photo ?
 *
 * Certains sélecteurs Android (fichiers d'un nuage, gestionnaires tiers)
 * rendent un type vide ou générique : on regarde alors l'extension. Le SVG est
 * refusé — ce n'est pas une photo. Le HEIC passe : s'il ne se décode pas, la
 * lecture le dira et l'on bascule sur la saisie, sans compter d'échec.
 */
export function estPhoto(type: string, nom: string): boolean {
  if (type === 'image/svg+xml') return false;
  if (type.startsWith('image/')) return true;
  return (type === '' || type === 'application/octet-stream') && EXTENSIONS_PHOTO.test(nom);
}

// ---------------------------------------------------------------------------
// Navigateur
// ---------------------------------------------------------------------------

/**
 * Vues web intégrées où la caméra dans la page est refusée ou incertaine.
 * `viseurPossible` les écarte en plus de celles que reconnaît déjà
 * `estNavigateurIntegre` (LinkedIn, Line, WeChat, appli Google, vues iOS sans
 * « Safari/ ») ; Facebook et Instagram sont répétés ici pour que la liste
 * se suffise à elle-même :
 *
 * - `FB_IAB`, `FBAN`, `FBAV`, `Instagram` : Facebook, Messenger, Instagram ;
 * - `musical_ly`, `Bytedance`, `TikTok`, `trill_` : TikTok (international et
 *   asiatique) ;
 * - `WhatsApp`, `Snapchat`, `Twitter` : leurs navigateurs intégrés ;
 * - `; wv)` : toute vue web Android. `getUserMedia` n'y marche que si l'appli
 *   hôte relaie la permission, ce que presque aucune ne fait.
 *
 * Là, on n'essaie même pas le viseur : l'invite n'apparaîtrait pas, ou le flux
 * resterait noir. L'input fichier, lui, a une chance.
 */
const JETONS_VUES_INTEGREES = /FB_IAB|FBAN|FBAV|Instagram|musical_ly|Bytedance|TikTok|trill_|WhatsApp|Snapchat|Twitter|; wv\)/;

export function vueWebSansCamera(ua: string): boolean {
  return JETONS_VUES_INTEGREES.test(ua);
}

/**
 * Le viseur dans la page vaut-il d'être proposé ici ?
 *
 * Pointeur grossier seulement : sur ordinateur, une webcam photographie mal
 * une carte, et « Choisir une image » passe en premier. Contexte sécurisé
 * obligatoire (`getUserMedia` n'existe pas en HTTP).
 */
export function viseurPossible(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!window.isSecureContext) return false;
  if (typeof navigator.mediaDevices?.getUserMedia !== 'function') return false;
  if (window.matchMedia?.('(pointer: coarse)').matches !== true) return false;
  return !estNavigateurIntegre() && !vueWebSansCamera(navigator.userAgent);
}

export type PermissionCamera = 'accordee' | 'refusee' | 'a-demander';

/**
 * État de l'autorisation, sans jamais la demander.
 *
 * `accordee` : le viseur peut s'ouvrir tout seul. `refusee` : inutile
 * d'insister, l'appareil photo du système prend le relais. `a-demander` : on
 * demandera au toucher de « Prendre en photo », pour que l'invite arrive au
 * moment où elle a un sens. Firefox ne connaît pas le nom `camera` et lève :
 * c'est `a-demander`.
 */
export async function permissionCamera(): Promise<PermissionCamera> {
  try {
    const statut = await navigator.permissions?.query({ name: 'camera' as PermissionName });
    if (statut?.state === 'granted') return 'accordee';
    if (statut?.state === 'denied') return 'refusee';
  } catch {
    // Nom de permission inconnu de ce navigateur : on demandera au toucher.
  }
  return 'a-demander';
}

// ---------------------------------------------------------------------------
// Flux
// ---------------------------------------------------------------------------

/**
 * - `indisponible` : refus, pas de caméra arrière, caméra occupée, délai
 *   dépassé, aucune image ;
 * - `pauvre` : le flux marche, mais trop peu fin (voir `COTE_COURT_MIN`) ;
 * - `annule` : fermeture demandée pendant l'ouverture (onglet masqué,
 *   démontage, photo choisie ailleurs). Rien à dire à la personne.
 */
export type EchecOuverture = 'indisponible' | 'pauvre' | 'annule';

export type ResultatOuverture = { flux: MediaStream } | { echec: EchecOuverture };

/** Coupe toutes les pistes : le voyant de la caméra s'éteint, la lampe aussi. */
export function fermerFlux(flux: MediaStream, video: HTMLVideoElement | null): void {
  for (const piste of flux.getTracks()) piste.stop();
  if (video && video.srcObject === flux) video.srcObject = null;
}

/**
 * Attend une promesse au plus `ms`, ou jusqu'à l'abandon du signal. Si elle
 * arrive trop tard, sa valeur est remise à `liberer` : un flux obtenu après
 * coup ne doit pas laisser la caméra allumée.
 */
function avecDelai<T>(promesse: Promise<T>, ms: number, signal: AbortSignal, liberer: (valeur: T) => void): Promise<T> {
  return new Promise<T>((resoudre, rejeter) => {
    let fini = false;
    const conclure = (suite: () => void) => {
      if (fini) return false;
      fini = true;
      clearTimeout(minuteur);
      signal.removeEventListener('abort', surAbandon);
      suite();
      return true;
    };
    // Erreurs sans message : rien de ce qu'elles portent n'est affiché ni gardé.
    const surAbandon = () => conclure(() => rejeter(new Error()));
    const minuteur = setTimeout(() => conclure(() => rejeter(new Error())), ms);
    if (signal.aborted) {
      surAbandon();
    } else {
      signal.addEventListener('abort', surAbandon, { once: true });
    }
    promesse.then(
      (valeur) => {
        if (!conclure(() => resoudre(valeur))) liberer(valeur);
      },
      () => conclure(() => rejeter(new Error())),
    );
  });
}

/** Vrai dès que la vidéo a une image à montrer ; faux au délai ou à l'abandon. */
function premiereImage(video: HTMLVideoElement, ms: number, signal: AbortSignal): Promise<boolean> {
  const prete = () => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  return new Promise<boolean>((resoudre) => {
    if (prete()) {
      resoudre(true);
      return;
    }
    const evenements = ['loadeddata', 'playing', 'resize'] as const;
    let fini = false;
    const conclure = (valeur: boolean) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteur);
      for (const nom of evenements) video.removeEventListener(nom, surImage);
      signal.removeEventListener('abort', surAbandon);
      resoudre(valeur);
    };
    const surImage = () => {
      if (prete()) conclure(true);
    };
    const surAbandon = () => conclure(false);
    const minuteur = setTimeout(() => conclure(prete()), ms);
    for (const nom of evenements) video.addEventListener(nom, surImage);
    signal.addEventListener('abort', surAbandon, { once: true });
  });
}

/**
 * Ouvre la caméra arrière dans `video` et vérifie qu'elle est exploitable.
 *
 * Ne rend un flux que s'il est prêt à photographier : caméra arrière, au moins
 * une image reçue, côté court d'au moins `COTE_COURT_MIN`. Dans tous les
 * autres cas, les pistes sont déjà coupées au retour. `signal` interrompt
 * l'ouverture à tout moment.
 */
export async function ouvrirFlux(video: HTMLVideoElement, signal: AbortSignal): Promise<ResultatOuverture> {
  const appareils = navigator.mediaDevices;
  if (typeof appareils?.getUserMedia !== 'function') return { echec: 'indisponible' };

  let flux: MediaStream;
  try {
    flux = await avecDelai(appareils.getUserMedia(CONTRAINTES), DELAI_OUVERTURE_MS, signal, (tardif) =>
      fermerFlux(tardif, null),
    );
  } catch {
    return { echec: signal.aborted ? 'annule' : 'indisponible' };
  }

  const echouer = (echec: EchecOuverture): ResultatOuverture => {
    fermerFlux(flux, video);
    return { echec: signal.aborted ? 'annule' : echec };
  };

  const piste = flux.getVideoTracks()[0];
  if (!piste || signal.aborted) return echouer('indisponible');
  // Seule une caméra avant a répondu (certaines tablettes) : image en miroir,
  // carte à retourner vers soi. L'appareil photo du système fera mieux.
  if (piste.getSettings?.().facingMode === 'user') return echouer('indisponible');

  // `muted` et `playsinline` sont posés en propriétés : React n'écrit pas
  // l'attribut `muted`, et iOS ne lit sans geste qu'une vidéo muette, et en
  // plein écran natif si `playsinline` manque.
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.srcObject = flux;
  // Le refus éventuel de `play()` se voit par l'absence d'image, attendue juste après.
  video.play().catch(() => undefined);

  if (!(await premiereImage(video, DELAI_PREMIERE_IMAGE_MS, signal))) return echouer('indisponible');
  if (Math.min(video.videoWidth, video.videoHeight) < COTE_COURT_MIN) return echouer('pauvre');
  return { flux };
}

// ---------------------------------------------------------------------------
// Lampe
// ---------------------------------------------------------------------------

/** La piste sait-elle allumer la lampe ? (Chrome Android surtout ; jamais iOS à ce jour.) */
export function lampeDisponible(flux: MediaStream): boolean {
  const piste = flux.getVideoTracks()[0];
  if (typeof piste?.getCapabilities !== 'function') return false;
  const capacites = piste.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
  return capacites.torch === true;
}

/** Allume ou éteint la lampe. Faux si l'appareil refuse : le bouton disparaît alors. */
export async function reglerLampe(flux: MediaStream, allumee: boolean): Promise<boolean> {
  const piste = flux.getVideoTracks()[0];
  if (!piste) return false;
  try {
    await piste.applyConstraints({ advanced: [{ torch: allumee } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Prise de vue
// ---------------------------------------------------------------------------

const rectangle = (r: DOMRect): Rectangle => ({ x: r.left, y: r.top, largeur: r.width, hauteur: r.height });

/**
 * Photographie ce que montre le viseur, recadré autour du cadre de visée.
 *
 * C'est l'image même que la personne voyait, pas une photo prise à part :
 * `ImageCapture.takePhoto` donnerait plus de pixels, mais avec un champ et des
 * proportions qui ne correspondent pas à l'aperçu — le recadrage deviendrait
 * une supposition, et une carte coupée ne se lit plus. Il est aussi lent (une à
 * plusieurs secondes) et capricieux sur les Android d'entrée de gamme. La
 * finesse est garantie autrement : flux jusqu'à la 4K, jamais sous 1080 p.
 *
 * Recadrer sert deux fois : la carte garde tous ses pixels quand la lecture
 * réduit l'image, et la photo publiée (floutée) ne montre ni la pièce autour,
 * ni la main, ni le visage de qui la tient.
 *
 * Rend `null` si la vidéo n'a pas d'image ou si l'encodage échoue.
 */
export async function photographierCadre(video: HTMLVideoElement, cadre: Element | null): Promise<File | null> {
  const source: Taille = { largeur: video.videoWidth, hauteur: video.videoHeight };
  if (!source.largeur || !source.hauteur) return null;

  const zone = cadre
    ? zoneSource(source, rectangle(video.getBoundingClientRect()), rectangle(cadre.getBoundingClientRect()))
    : { x: 0, y: 0, ...source };

  const toile = document.createElement('canvas');
  try {
    toile.width = zone.largeur;
    toile.height = zone.hauteur;
    const contexte = toile.getContext('2d');
    if (!contexte) return null;
    contexte.drawImage(video, zone.x, zone.y, zone.largeur, zone.hauteur, 0, 0, zone.largeur, zone.hauteur);
    const image = await new Promise<Blob | null>((resoudre) => toile.toBlob(resoudre, 'image/jpeg', QUALITE_JPEG));
    if (!image) return null;
    return new File([image], 'piece.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return null;
  } finally {
    // Safari plafonne la mémoire cumulée des toiles : on rend la sienne tout
    // de suite, sans attendre le ramasse-miettes.
    toile.width = 0;
    toile.height = 0;
  }
}
