import { fusionner, LONGUEUR_MAX_CHAMP, type LectureFusionnee } from '@partage/fusion-lecture';
import { lireMrz, type LectureMrz } from '@partage/mrz';
import { familleMrz, lireRecto, type Decoupage, type LectureRecto } from '@partage/recto';
import { TYPES_PIECE, type TypePiece } from '@partage/types';
import { bandeBasse, ceder, enPgm, preparerImage, recadrer, tourner180, type ImageGrise, type ImagePreparee } from './image';
import { LectureImpossible, type LecturePiece } from './index';

/**
 * Moteur de lecture de la pièce : tesseract.js, dans le navigateur, avec des
 * fichiers servis par pieci.ci.
 *
 * Une photo, le recto, pour toutes les pièces. Le déroulé :
 *
 * 1. l'image est réduite, mise en gris et redressée (image.ts) ;
 * 2. le recto est lu avec le modèle « fra », découpage de page automatique
 *    (psm 3), et passé à `lireRecto` ;
 * 3. la bande à chevrons n'est lue que si ce premier texte la laisse attendre
 *    (voir `doitLireBande`) : type « Passeport » reconnu, ou lignes qui en ont
 *    la forme. Elle est alors recadrée — là où la première lecture l'a vue, ou
 *    dans le bas de l'image — et lue avec le modèle « mrz » (liste
 *    A-Z 0-9 <, bloc unique, redressement fin par Tesseract), puis passée à
 *    `lireMrz`. Le modèle « mrz » (1,3 Mo) n'est téléchargé qu'à ce moment ;
 * 4. sans bande lue et sans nom ET prénoms, seconde lecture du recto en texte
 *    épars (psm 11), champ par champ : c'est la stratégie qui a donné 78 % de
 *    paires utilisables et 0 % de valeurs fausses sur 90 rectos fictifs ;
 * 5. toujours rien de sûr : contre-vérification qu'il ne s'agit pas d'un dos
 *    de carte mal cadré ou tête en bas (bas de l'image, image retournée) ;
 * 6. `fusionner` réunit bande et recto.
 *
 * Le dos d'une carte : si une bande de carte (format TD1, trois lignes) est
 * lue ou même seulement reconnue, même écourtée, `estDosDeCarte` est vrai,
 * l'image à envoyer est `null` et le résultat ne vient que de la bande. Cette
 * image porte en clair le numéro et la date de naissance : elle ne quitte
 * jamais le téléphone. Une panne pendant la contre-vérification rend
 * `moteur_indisponible` : sans réponse, pas de verdict « pas un dos ».
 *
 * Confidentialité — ce qui ne sort pas d'ici :
 *
 * - le texte lu (texte du recto, lignes de la bande, TSV de mise en page) vit
 *   dans des variables locales de `executerLecture`, le temps d'être passé
 *   aux lecteurs de shared/. Il n'est ni renvoyé, ni stocké dans une variable
 *   de module, ni mis dans une erreur ;
 * - la sortie est recopiée clé par clé (`assainirSortie`) : type, nom,
 *   prénoms, `peutEtreCoupe`, `decoupage`, et un nom qui contiendrait un
 *   chiffre est écarté — ceinture et bretelles derrière les lecteurs, qui le
 *   garantissent déjà ;
 * - aucun journal : ni `console`, ni `logger` de tesseract.js (son rapport de
 *   progression resterait vide de texte, mais un rapport de moins est un
 *   risque de moins). `errorHandler` est fourni pour que tesseract.js ne lève
 *   pas d'exception non rattrapée, et n'écrit rien ;
 * - les erreurs qui sortent sont `LectureImpossible` (une cause, un message
 *   fixe) ou une annulation, jamais l'erreur du moteur ;
 * - `cacheMethod: 'none'` : tesseract.js ne recopie pas les modèles dans
 *   IndexedDB. Seul le service worker les garde, comme des fichiers du site
 *   (ils ne contiennent rien de personnel) ;
 * - le moteur est arrêté à la fin de chaque lecture : la mémoire WebAssembly,
 *   où traînent la dernière image et le dernier texte, part avec lui.
 *
 * Pourquoi le fil principal, et pas un Web Worker à nous qui lancerait celui
 * de tesseract.js. Mesuré dans Chrome 153 (banc sur images fictives) :
 *
 * - la reconnaissance ne touche pas le fil de la page : fil principal ralenti
 *   6 fois, la lecture d'un recto passe de 517 à 579 ms, celle de la bande de
 *   297 à 340 ms. Un Worker à nous n'y gagnerait rien ;
 * - ce qui reste ici, c'est la préparation de l'image (image.ts), découpée en
 *   tranches : plus longue tâche 0 ms à vitesse normale sur PC, 120 à 153 ms
 *   ralenti 6 fois pour une photo de 1600 à 2400 px, 323 ms pour 12 Mpx ;
 * - un Worker à nous demanderait le Worker imbriqué et OffscreenCanvas, tous
 *   deux arrivés dans Safari iOS en 16.4 seulement (données MDN 8.1.1) : il
 *   faudrait garder ce chemin-ci en repli pour les iPhone restés plus bas.
 *
 * Si des mesures sur un vrai téléphone montraient un écran figé, c'est la
 * préparation de l'image seule qu'il faudrait déplacer dans un Worker (sans
 * Worker imbriqué), pas le moteur.
 *
 * Pré-rendu : `tesseract.js` est importé dynamiquement, à l'appel ; ce module
 * ne touche ni Worker, ni WebAssembly, ni toile à son chargement.
 */

// ---------------------------------------------------------------------------
// Fichiers et réglages
// ---------------------------------------------------------------------------

/** Remplacé au build par vite.config.ts (nom du dossier produit par scripts/copier-ocr.mjs). */
declare const __OCR_DOSSIER__: string;

/**
 * Dossier des fichiers du moteur, sur notre origine. Versionné : c'est aussi la
 * clé du cache du service worker (src/sw.js).
 */
export const CHEMIN_OCR = `/ocr/${typeof __OCR_DOSSIER__ === 'string' ? __OCR_DOSSIER__ : 'tesseract'}/`;

/** Alphabet de la bande à chevrons (ICAO 9303) : rien d'autre ne peut y être écrit. */
const ALPHABET_BANDE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';

/** Moteur LSTM seul : les cœurs « -lstm » n'embarquent pas l'ancien moteur. */
const OEM_LSTM = 1;

/**
 * Filet de sécurité : au-delà, la lecture est déclarée impossible quoi qu'il
 * arrive. Le parcours abandonne bien avant (25 s, machine.ts) ; ce délai-ci
 * garantit seulement que la promesse finit par tomber si l'appelant n'a pas
 * passé de signal — tesseract.js laisse une promesse pendante pour toujours
 * quand son Worker meurt ou qu'un modèle est illisible.
 */
export const DELAI_SECURITE_MS = 90_000;

/**
 * Moteur préchauffé et jamais utilisé : arrêté au bout de ce délai, pour ne pas
 * garder 40 à 100 Mo de WebAssembly sur un téléphone qui en a peu.
 */
const DELAI_PRECHAUFFE_MS = 3 * 60_000;

// ---------------------------------------------------------------------------
// Décisions (fonctions pures, testées sans navigateur)
// ---------------------------------------------------------------------------

/** Au-delà, ce n'est pas le texte d'une pièce (mêmes bornes que shared/recto.ts). */
const CARACTERES_MAX = 8_000;
const LIGNES_MAX = 300;
/** TSV d'un recto : ~70 octets par mot, quelques centaines de mots au plus. */
const TSV_MAX = 200_000;

/**
 * Une ligne lue par le modèle « fra » ressemble-t-elle à une ligne de bande à
 * chevrons ? « fra » ne connaît pas cette police : il rend le chevron `<`,
 * `«`, `‹` ou « K ». On demande une ligne longue (une ligne de bande fait 30
 * ou 44 caractères, l'OCR en perd ou en ajoute), faite presque seulement de
 * capitales, de chiffres et de chevrons, avec des chevrons : trois, ou deux
 * côte à côte (le séparateur nom / prénoms), ou une suite de « K » (le
 * remplissage mal lu). Un libellé de recto a des accents, des minuscules, des
 * signes : il ne passe pas.
 *
 * Se tromper dans ce sens coûte une lecture de la bande pour rien (1,3 Mo la
 * première fois, une demi-seconde sur PC) ; dans l'autre, une bande non lue.
 */
export function ligneBandeProbable(ligne: string): boolean {
  if (typeof ligne !== 'string' || ligne.length > 160) return false;
  const compacte = ligne.replace(/\s+/g, '').toUpperCase();
  if (compacte.length < 20 || compacte.length > 60) return false;
  let dansAlphabet = 0;
  let chevrons = 0;
  for (const car of compacte) {
    if (car === '<' || car === '«' || car === '‹') {
      chevrons++;
      dansAlphabet++;
    } else if ((car >= 'A' && car <= 'Z') || (car >= '0' && car <= '9')) {
      dansAlphabet++;
    }
  }
  if (dansAlphabet / compacte.length < 0.85) return false;
  return chevrons >= 3 || /[<«‹]{2}/.test(compacte) || /K{4,}/.test(compacte);
}

/**
 * Faut-il lire la bande à chevrons ? Heuristique économe : seulement si la
 * lecture du recto l'annonce — type « Passeport » reconnu (la bande est sur la
 * page des données), famille de bande repérée par shared/recto.ts, ou au moins
 * une ligne qui en a la forme. Un permis, une carte étudiante, une carte
 * consulaire ou le recto d'une CNI n'en déclenchent pas : pas de modèle « mrz »
 * téléchargé pour eux.
 */
export function doitLireBande(texte: string, recto: LectureRecto | null): boolean {
  if (recto?.typePiece === 'Passeport') return true;
  if (typeof texte !== 'string' || !texte || texte.length > CARACTERES_MAX) return false;
  if (familleMrz(texte) !== undefined) return true;
  return texte.split(/\r?\n/, LIGNES_MAX).some(ligneBandeProbable);
}

/**
 * Situe la bande à chevrons dans l'image lue, d'après la sortie TSV de la
 * lecture du recto (une ligne par mot, avec sa boîte). On regroupe les mots
 * par ligne, on garde les lignes qui ont la forme d'une ligne de bande, et on
 * rend la tranche horizontale qui les couvre, élargie : de peu si les trois
 * lignes d'une carte sont vues, davantage si l'OCR n'en a reconnu qu'une ou
 * deux (les autres sont juste au-dessus ou au-dessous). Toute la largeur est
 * gardée : couper à gauche ou à droite emporterait des caractères.
 *
 * `null` si aucune ligne ne ressemble à la bande : on lira alors le bas de
 * l'image (`bandeBasse`).
 */
export function zoneBande(tsv: string, hauteurImage: number): { haut: number; bas: number } | null {
  if (typeof tsv !== 'string' || !tsv || tsv.length > TSV_MAX || !(hauteurImage > 0)) return null;
  const lignes = new Map<string, { haut: number; bas: number; texte: string }>();
  for (const rangee of tsv.split('\n')) {
    // niveau, page, bloc, paragraphe, ligne, mot, gauche, haut, largeur, hauteur, confiance, texte
    const colonnes = rangee.split('\t');
    if (colonnes.length < 12 || colonnes[0] !== '5') continue;
    const haut = Number(colonnes[7]);
    const hauteur = Number(colonnes[9]);
    if (!Number.isFinite(haut) || !Number.isFinite(hauteur) || hauteur <= 0) continue;
    const cle = `${colonnes[2]}.${colonnes[3]}.${colonnes[4]}`;
    const mot = colonnes.slice(11).join(' ');
    const ligne = lignes.get(cle);
    if (ligne) {
      ligne.haut = Math.min(ligne.haut, haut);
      ligne.bas = Math.max(ligne.bas, haut + hauteur);
      ligne.texte += ` ${mot}`;
    } else {
      lignes.set(cle, { haut, bas: haut + hauteur, texte: mot });
    }
  }
  const bande = [...lignes.values()].filter((ligne) => ligneBandeProbable(ligne.texte));
  if (!bande.length) return null;

  const hauteurs = bande.map((ligne) => ligne.bas - ligne.haut).sort((a, b) => a - b);
  const hauteurLigne = hauteurs[Math.floor(hauteurs.length / 2)];
  const marge = hauteurLigne * (bande.length >= 3 ? 1 : bande.length === 2 ? 1.8 : 2.8);
  const haut = Math.max(0, Math.min(...bande.map((ligne) => ligne.haut)) - marge);
  const bas = Math.min(hauteurImage, Math.max(...bande.map((ligne) => ligne.bas)) + marge);
  return bas - haut >= 8 ? { haut: Math.floor(haut), bas: Math.ceil(bas) } : null;
}

/** Du plus sûr au moins sûr : un découpage mêlé de deux lectures vaut le moins sûr des deux. */
const RANG_DECOUPAGE: Readonly<Record<Decoupage, number>> = {
  libelles: 0,
  colonnes: 0,
  numerotation: 0,
  position: 1,
  devine: 2,
};

/**
 * Réunit deux lectures du même recto (psm 3, puis psm 11), champ par champ :
 * la première l'emporte, la seconde comble ses trous. Si nom et prénoms
 * viennent de lectures différentes, `decoupage` prend la valeur la moins sûre
 * des deux, pour que l'interface fasse vérifier la séparation au moindre doute.
 */
export function combinerLectures(premiere: LectureRecto | null, seconde: LectureRecto | null): LectureRecto | null {
  if (!premiere) return seconde;
  if (!seconde) return premiere;
  const sortie: LectureRecto = {};
  const typePiece = premiere.typePiece ?? seconde.typePiece;
  if (typePiece) sortie.typePiece = typePiece;
  const sourceNom = premiere.nom ? premiere : seconde.nom ? seconde : null;
  const sourcePrenom = premiere.prenom ? premiere : seconde.prenom ? seconde : null;
  if (sourceNom?.nom) sortie.nom = sourceNom.nom;
  if (sourcePrenom?.prenom) sortie.prenom = sourcePrenom.prenom;
  const decoupages = [sourceNom?.decoupage, sourcePrenom?.decoupage].filter((d): d is Decoupage => d !== undefined);
  if (decoupages.length) {
    sortie.decoupage = decoupages.reduce((a, b) => (RANG_DECOUPAGE[b] > RANG_DECOUPAGE[a] ? b : a));
  }
  return sortie.typePiece || sortie.nom || sortie.prenom ? sortie : null;
}

const paireComplete = (lecture: LectureRecto | null) => Boolean(lecture?.nom && lecture.prenom);

const DECOUPAGES = Object.keys(RANG_DECOUPAGE) as Decoupage[];

/** Nom ou prénoms acceptables en sortie : du texte, borné, sans chiffre. */
function champSur(valeur: unknown): string | undefined {
  if (typeof valeur !== 'string') return undefined;
  const v = valeur.trim();
  return v && v.length <= LONGUEUR_MAX_CHAMP && !/\d/.test(v) ? v : undefined;
}

/**
 * Seule forme sous laquelle une lecture sort du module : les clés connues,
 * recopiées une à une et vérifiées. Rien d'autre ne peut passer, quoi que
 * portent les objets rendus par les lecteurs. `null` si rien d'utile.
 */
export function assainirSortie(lecture: unknown): LectureFusionnee | null {
  if (!lecture || typeof lecture !== 'object') return null;
  const l = lecture as Record<string, unknown>;
  const sortie: LectureFusionnee = {};
  if (TYPES_PIECE.includes(l.typePiece as TypePiece)) sortie.typePiece = l.typePiece as TypePiece;
  const nom = champSur(l.nom);
  const prenom = champSur(l.prenom);
  if (nom) sortie.nom = nom;
  if (prenom) sortie.prenom = prenom;
  if (!sortie.typePiece && !nom && !prenom) return null;
  if ((nom || prenom) && typeof l.peutEtreCoupe === 'boolean') sortie.peutEtreCoupe = l.peutEtreCoupe;
  if ((nom || prenom) && DECOUPAGES.includes(l.decoupage as Decoupage)) sortie.decoupage = l.decoupage as Decoupage;
  return sortie;
}

// ---------------------------------------------------------------------------
// Le moteur tesseract.js
// ---------------------------------------------------------------------------

/** Réglage d'une passe de lecture. */
export interface Passe {
  readonly modele: 'fra' | 'mrz';
  /** Mode de découpage de la page : 3 automatique, 6 bloc unique, 11 texte épars. */
  readonly psm: '3' | '6' | '11';
  /** Seuls caractères admis. */
  readonly alphabet?: string;
  /** Redressement fin par Tesseract (utile sur la bande seulement : 20 à 40 % plus lent sur un recto). */
  readonly redresser?: boolean;
  /** Demander aussi la mise en page (TSV), pour situer la bande. */
  readonly miseEnPage?: boolean;
}

/** Ce que rend une passe. Ne sort jamais de ce module. */
export interface TexteLu {
  readonly texte: string;
  readonly tsv: string;
}

/** Interface interne du moteur ; remplaçable en test par un moteur factice. */
export interface Moteur {
  lire(image: ImageGrise, passe: Passe, signal: AbortSignal): Promise<TexteLu>;
  arreter(): void;
}

/** Ce que l'on utilise de tesseract.js — ses types publiés ne décrivent ni `worker` ni les paramètres par lecture. */
export interface TravailleurTesseract {
  readonly worker?: Worker;
  recognize(
    image: Uint8Array,
    options: Record<string, unknown>,
    sortie: { text: boolean; tsv: boolean },
  ): Promise<{ data: { text?: unknown; tsv?: unknown } }>;
  reinitialize(langue: string): Promise<unknown>;
  terminate(): Promise<unknown>;
}
export type CreerTravailleur = (langue: string, oem: number, options: Record<string, unknown>) => Promise<TravailleurTesseract>;

const annulation = () => new DOMException('Lecture annulée', 'AbortError');

/** Promesse qui échoue dès que le signal est levé ; ne se résout jamais sinon. */
function surAnnulation(signal: AbortSignal): { promesse: Promise<never>; retirer: () => void } {
  let retirer = () => {};
  const promesse = new Promise<never>((_, rejeter) => {
    if (signal.aborted) return rejeter(annulation());
    const surAbort = () => rejeter(annulation());
    signal.addEventListener('abort', surAbort, { once: true });
    retirer = () => signal.removeEventListener('abort', surAbort);
  });
  promesse.catch(() => {});
  return { promesse, retirer };
}

/** `promesse`, sauf si le signal est levé ou si l'une des `pannes` tombe avant. */
async function sousGarde<T>(promesse: Promise<T>, signal: AbortSignal, ...pannes: Promise<never>[]): Promise<T> {
  const abandon = surAnnulation(signal);
  try {
    return await Promise.race([promesse, abandon.promesse, ...pannes]);
  } finally {
    abandon.retirer();
  }
}

/**
 * Appelle `createWorker` en captant le Worker qu'il construit.
 *
 * tesseract.js ne rend son Worker qu'une fois les modèles chargés, et ne le
 * rend JAMAIS si un modèle est illisible : il avale l'échec (createWorker.js),
 * et le Worker — 40 à 100 Mo de WebAssembly — resterait en vie jusqu'à la
 * fermeture de la page, un de plus à chaque nouvelle photo. Mesuré dans le
 * banc : modèle remplacé par une page HTML (repli « single-page application »
 * d'un fichier absent du déploiement), Worker toujours là après l'échec.
 *
 * `createWorker` construit ce Worker de façon synchrone, avant sa première
 * attente. On remplace donc le constructeur global le temps de cet appel
 * synchrone — aucun autre code ne peut s'exécuter pendant ce temps — et on le
 * rétablit aussitôt. Si une version future construisait le Worker plus tard,
 * `capte` resterait `null` et l'on perdrait seulement cet arrêt anticipé.
 */
export function creerEnCaptant(
  creer: CreerTravailleur,
  ...parametres: Parameters<CreerTravailleur>
): { creation: Promise<TravailleurTesseract>; capte: Worker | null } {
  const portee = globalThis as { Worker?: typeof Worker };
  const Original = portee.Worker;
  const construits: Worker[] = [];
  if (typeof Original === 'function') {
    portee.Worker = class extends Original {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        construits.push(this);
      }
    };
  }
  let creation: Promise<TravailleurTesseract>;
  try {
    creation = creer(...parametres);
  } finally {
    portee.Worker = Original;
  }
  return { creation, capte: construits[0] ?? null };
}

/** Import dynamique de tesseract.js : module CommonJS, sa fonction peut arriver sous `default`. */
async function chargerTesseract(): Promise<CreerTravailleur> {
  const module = (await import('tesseract.js')) as unknown as { createWorker?: unknown; default?: { createWorker?: unknown } };
  const creer = module.createWorker ?? module.default?.createWorker;
  if (typeof creer !== 'function') throw new Error('tesseract.js');
  return creer as CreerTravailleur;
}

/**
 * Démarre tesseract.js sur nos fichiers, modèle « fra » chargé.
 *
 * - `workerPath`, `corePath`, `langPath` sur notre origine, `workerBlobURL:
 *   false` : aucune requête vers jsDelivr, aucun Worker créé depuis une URL
 *   `blob:` (qu'une future politique de sécurité du contenu refuserait) ;
 * - `corePath` est un dossier : tesseract.js y choisit la variante « -lstm »
 *   que le processeur sait exécuter ;
 * - `errorHandler` : sans lui, un rejet du Worker devient une exception non
 *   rattrapée (mesuré en Node : le processus tombe). Il sert aussi de signal de
 *   panne : tesseract.js AVALE les échecs de chargement de modèle pendant sa
 *   création et ne résout alors jamais sa promesse (createWorker.js) ;
 * - pas de `logger`.
 */
async function demarrerTesseract(signal: AbortSignal): Promise<Moteur> {
  const creer = await sousGarde(chargerTesseract(), signal);
  const base = new URL(CHEMIN_OCR, globalThis.location?.href).href;

  let signalerPanne: () => void = () => {};
  const panne = new Promise<never>((_, rejeter) => {
    signalerPanne = () => rejeter(new Error('panne'));
  });
  panne.catch(() => {});

  const { creation, capte } = creerEnCaptant(creer, 'fra', OEM_LSTM, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    langPath: base.replace(/\/$/, ''),
    workerBlobURL: false,
    cacheMethod: 'none',
    gzip: true,
    errorHandler: () => signalerPanne(),
  });
  creation.catch(() => {});

  let travailleur: TravailleurTesseract;
  try {
    travailleur = await sousGarde(creation, signal, panne);
  } catch (erreur) {
    // Annulation, panne ou création jamais aboutie : le Worker est arrêté ici,
    // et de nouveau s'il finit par aboutir.
    capte?.terminate();
    creation.then((tardif) => void tardif.terminate().catch(() => {}), () => {});
    throw erreur;
  }
  const worker = capte ?? travailleur.worker ?? null;

  // Worker mort en cours de route (mémoire, cœur WebAssembly interrompu) :
  // tesseract.js ne rejette alors rien, on le détecte nous-mêmes. `preventDefault`
  // évite que le navigateur recopie l'erreur dans la console de la page.
  const surErreur = (evenement: Event) => {
    evenement.preventDefault();
    signalerPanne();
  };
  worker?.addEventListener('error', surErreur);
  worker?.addEventListener('messageerror', surErreur);

  let modele: Passe['modele'] = 'fra';
  let arrete = false;

  return {
    async lire(image, passe, signalLecture) {
      if (arrete) throw new Error('arrêté');
      if (passe.modele !== modele) {
        await sousGarde(travailleur.reinitialize(passe.modele), signalLecture, panne);
        modele = passe.modele;
      }
      const options: Record<string, unknown> = {
        tessedit_pageseg_mode: passe.psm,
        // Le cœur écrit ses diagnostics (« Estimating resolution as 353 »…) sur
        // la sortie d'erreur, que le navigateur affiche dans la console de la
        // page, à chaque lecture. Envoyés vers /dev/null : mesuré dans le banc,
        // texte reconnu identique à l'octet près sur 6 images, et plus aucune
        // ligne affichée.
        debug_file: '/dev/null',
      };
      if (passe.alphabet) options.tessedit_char_whitelist = passe.alphabet;
      if (passe.redresser) options.rotateAuto = true;
      const { data } = await sousGarde(
        travailleur.recognize(enPgm(image), options, { text: true, tsv: passe.miseEnPage === true }),
        signalLecture,
        panne,
      );
      return {
        texte: typeof data?.text === 'string' ? data.text : '',
        tsv: typeof data?.tsv === 'string' ? data.tsv : '',
      };
    },
    arreter() {
      if (arrete) return;
      arrete = true;
      worker?.removeEventListener('error', surErreur);
      worker?.removeEventListener('messageerror', surErreur);
      void travailleur.terminate().catch(() => {});
      worker?.terminate();
    },
  };
}

// ---------------------------------------------------------------------------
// Préchauffage
// ---------------------------------------------------------------------------

/**
 * Moteur démarré d'avance, au toucher de « Prendre la photo » : le
 * téléchargement (~2 Mo la première fois) et la compilation du cœur se font
 * pendant que la personne cadre la pièce, pas après. Il ne contient rien de
 * personnel tant qu'aucune lecture ne l'a pris. Une seule lecture le prend ;
 * elle l'arrête en finissant.
 */
let prechauffe: { moteur: Promise<Moteur>; controleur: AbortController; minuteur: ReturnType<typeof setTimeout> } | null = null;

export function prechauffer(): void {
  if (prechauffe) return;
  const controleur = new AbortController();
  const moteur = demarrerTesseract(controleur.signal);
  moteur.catch(() => {});
  const minuteur = setTimeout(liberer, DELAI_PRECHAUFFE_MS);
  prechauffe = { moteur, controleur, minuteur };
}

/** Arrête le moteur préchauffé s'il n'a pas servi (la page de déclaration se ferme). */
export function liberer(): void {
  const courant = prechauffe;
  if (!courant) return;
  prechauffe = null;
  clearTimeout(courant.minuteur);
  courant.controleur.abort();
  courant.moteur.then((moteur) => moteur.arreter(), () => {});
}

/**
 * Moteur pour une lecture : le préchauffé s'il existe et démarre bien, sinon un
 * neuf. Un préchauffage raté (réseau revenu depuis, par exemple) ne condamne
 * pas la lecture.
 */
async function obtenirMoteur(signal: AbortSignal): Promise<Moteur> {
  const courant = prechauffe;
  if (courant) {
    prechauffe = null;
    clearTimeout(courant.minuteur);
    try {
      const moteur = await sousGarde(courant.moteur, signal);
      return moteur;
    } catch (erreur) {
      if (signal.aborted) {
        courant.controleur.abort();
        courant.moteur.then((moteur) => moteur.arreter(), () => {});
        throw erreur;
      }
    }
  }
  return demarrerTesseract(signal);
}

// ---------------------------------------------------------------------------
// La lecture
// ---------------------------------------------------------------------------

export interface Dependances {
  preparer(fichier: Blob): Promise<ImagePreparee | null>;
  moteur(signal: AbortSignal): Promise<Moteur>;
}

const DEPENDANCES: Dependances = { preparer: preparerImage, moteur: obtenirMoteur };

/** Durées dans la chronologie de performance du navigateur (outils de développement) : des temps, aucun contenu. */
function mesurer(etape: string, debut: number): void {
  try {
    performance.measure(`lecture-piece:${etape}`, { start: debut, end: performance.now() });
  } catch {
    // Chronologie absente ou pleine : sans importance.
  }
}

const maintenant = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const PASSE_RECTO: Passe = { modele: 'fra', psm: '3', miseEnPage: true };
const PASSE_RECTO_EPARS: Passe = { modele: 'fra', psm: '11' };
const PASSE_BANDE: Passe = { modele: 'mrz', psm: '6', alphabet: ALPHABET_BANDE, redresser: true };

/**
 * Ligne 1 d'une bande de carte (TD1) écourtée : code, État (1 et 0 pris pour
 * I et O tolérés, comme dans `familleMrz`), puis le numéro.
 */
const DEBUT_LIGNE_1_CARTE = /^[IAC][A-Z<][A-Z01<]{3}[A-Z0-9<]{9,33}$/;
/**
 * Ligne 2 d'une bande de carte (TD1) écourtée : naissance et son chiffre de
 * contrôle, sexe, expiration et son chiffre, nationalité, EN TÊTE de ligne.
 * Sur un passeport (TD3), ces champs viennent après le numéro et la
 * nationalité, et l'expiration est suivie du numéro personnel (souvent des
 * chevrons) : une ligne de passeport coupée juste avant la naissance ne passe
 * que si ce numéro commence par trois lettres.
 */
const DEBUT_LIGNE_2_CARTE = /^\d{7}[MF<]\d{7}[A-Z]{3}/;
/**
 * Ligne 2 d'une carte coupée à GAUCHE : sexe, expiration et son chiffre, puis
 * la nationalité (trois lettres), les données facultatives et le chiffre de
 * contrôle final. Sur un passeport, l'expiration est suivie du numéro
 * personnel (souvent vide, donc des chevrons) et de DEUX chiffres ; une ligne
 * de passeport ne passe que si ce numéro commence par trois lettres ET qu'on
 * en a perdu au moins un tiers : d'où la longueur bornée à celle d'une ligne
 * de carte.
 */
const FIN_LIGNE_2_CARTE = /[MF<]\d{7}[A-Z]{3}[A-Z0-9<]{8,14}\d$/;
const LONGUEUR_LIGNE_CARTE = 31;

/**
 * Famille de bande de CARTE reconnue dans un texte, sans rien en lire : c'est
 * ce qui trahit un dos de carte quand les chiffres de contrôle, eux, ne
 * passent pas (photo floue, reflet, bande coupée par le cadrage).
 *
 * `familleMrz` (shared/recto.ts) d'abord. Elle demande des lignes d'au moins
 * 25 caractères, et une ligne 1 qui commence par le code du document : une
 * carte coupée sur le côté y échappe, alors que le numéro et la date de
 * naissance restent lisibles dans l'image (mesuré dans le banc : dos coupé au
 * quart droit, lignes de 27 caractères, lu « pas un dos » ; coupé à gauche,
 * lignes sans leur début). On accepte donc aussi, ligne par ligne, un début de
 * ligne 1, un début ou une fin de ligne 2 de carte, d'au moins 15 caractères,
 * faite presque seulement de l'alphabet de la bande. Rien de cela si `familleMrz` voit une bande de passeport : c'est
 * alors la page des données, qui se publie.
 *
 * Se tromper dans ce sens coûte une photo du devant ; dans l'autre, l'envoi
 * d'un numéro et d'une date de naissance lisibles.
 */
export function familleCarte(texte: string): 'carte-civ' | 'carte-autre' | undefined {
  if (typeof texte !== 'string' || texte.length > CARACTERES_MAX) return undefined;
  const famille = familleMrz(texte);
  if (famille === 'passeport') return undefined;
  if (famille) return famille;
  let trouvee: 'carte-civ' | 'carte-autre' | undefined;
  for (const brute of texte.split(/\r?\n/, LIGNES_MAX)) {
    if (brute.length > 160) continue;
    const s = brute.replace(/\s/g, '').toUpperCase().replace(/[«‹]/g, '<');
    if (s.length < 15 || s.length > 38) continue;
    if ((s.match(/[A-Z0-9<]/g)?.length ?? 0) / s.length < 0.9) continue;
    // Les lignes d'un passeport ne passent pas ces deux formes : la ligne 1 n'a
    // pas de chiffres (le nom), la ligne 2 commence par le numéro et son
    // chiffre de contrôle, jamais par sept chiffres suivis du sexe.
    if (DEBUT_LIGNE_1_CARTE.test(s) && s.includes('<') && /\d/.test(s.slice(5))) {
      // Même tolérance que `familleMrz` : une lettre de l'État mal lue.
      const etat = s.slice(2, 5).replace(/1/g, 'I').replace(/0/g, 'O');
      const ecarts = [...'CIV'].filter((lettre, i) => etat[i] !== lettre).length;
      trouvee = s[0] === 'I' && etat[0] === 'C' && ecarts <= 1 ? 'carte-civ' : (trouvee ?? 'carte-autre');
    } else if (DEBUT_LIGNE_2_CARTE.test(s) || (s.length <= LONGUEUR_LIGNE_CARTE && FIN_LIGNE_2_CARTE.test(s))) {
      trouvee ??= 'carte-autre';
    }
  }
  return trouvee;
}

/**
 * Lit une photo de pièce. Voir `lirePiece` (index.ts) pour le contrat.
 *
 * Toute panne du moteur AVANT la première lecture du recto rend
 * `LectureImpossible('moteur_indisponible')`. Après, une panne (modèle « mrz »
 * injoignable, Worker tombé) n'efface pas ce qui a déjà été lu : on rend ce
 * qu'on a.
 */
export async function executerLecture(
  fichier: Blob,
  signalAppelant?: AbortSignal,
  dependances: Dependances = DEPENDANCES,
): Promise<LecturePiece> {
  if (signalAppelant?.aborted) throw annulation();
  const debut = maintenant();
  // Un seul signal pour tout le déroulé : celui de l'appelant, ou le filet de sécurité.
  const controleur = new AbortController();
  const relayer = () => controleur.abort();
  signalAppelant?.addEventListener('abort', relayer, { once: true });
  const minuteur = setTimeout(relayer, DELAI_SECURITE_MS);
  const signal = controleur.signal;
  let moteur: Moteur | null = null;

  try {
    const image = await sousGarde(dependances.preparer(fichier), signal);
    if (!image) throw new LectureImpossible('image_illisible');
    mesurer('image', debut);

    const debutMoteur = maintenant();
    moteur = await sousGarde(dependances.moteur(signal), signal);
    mesurer('moteur', debutMoteur);

    let debutPasse = maintenant();
    const recto = await sousGarde(moteur.lire(image.lecture, PASSE_RECTO, signal), signal);
    mesurer('recto', debutPasse);
    let lectureRecto = lireRecto(recto.texte);
    await ceder();

    let mrz: LectureMrz | null = null;
    let carte = familleCarte(recto.texte);
    let bandeLue = false;
    try {
      if (doitLireBande(recto.texte, lectureRecto)) {
        debutPasse = maintenant();
        const zone = zoneBande(recto.tsv, image.lecture.hauteur);
        const bande = zone ? recadrer(image.lecture, zone.haut, zone.bas) : bandeBasse(image.lecture);
        const lue = await sousGarde(moteur.lire(bande, PASSE_BANDE, signal), signal);
        bandeLue = true;
        mrz = lireMrz(lue.texte.split(/\r?\n/, LIGNES_MAX));
        carte ??= familleCarte(lue.texte);
        mesurer('bande', debutPasse);
      }
    } catch (erreur) {
      if (signal.aborted) throw erreur;
      // Panne après la première lecture (modèle « mrz » injoignable, Worker
      // tombé) : on garde ce qui a été lu.
    }

    // Une bande lue tranche (TD1 : carte ; TD3 : passeport). Sinon, une bande de
    // carte seulement reconnue suffit à garder l'image sur le téléphone : se
    // tromper coûte une photo du devant ; l'inverse enverrait un numéro et une
    // date de naissance lisibles.
    const estDos = () => (mrz ? mrz.typePiece !== 'Passeport' : carte !== undefined);

    if (!mrz && !estDos() && !paireComplete(lectureRecto)) {
      try {
        debutPasse = maintenant();
        const epars = await sousGarde(moteur.lire(image.lecture, PASSE_RECTO_EPARS, signal), signal);
        lectureRecto = combinerLectures(lectureRecto, lireRecto(epars.texte));
        mesurer('recto-epars', debutPasse);
      } catch (erreur) {
        if (signal.aborted) throw erreur;
      }
    }

    /**
     * Contre-vérification : n'est-ce pas un dos de carte que la première
     * lecture n'a pas su voir ? Mesuré dans le banc : un dos pris tête en bas,
     * ou couché dans le mauvais sens, est lu par « fra » comme un fouillis
     * sans bande ; un dos coupé sur le côté donne un texte vide. Dans les deux
     * cas la bande, entière ou presque, reste lisible dans l'image, et l'image
     * partait.
     *
     * Seulement quand rien de sûr n'a été lu (ni bande, ni nom ET prénoms), et
     * pas sur une page de passeport reconnue : un recto bien lu ne paie rien,
     * et ne télécharge toujours pas le modèle « mrz ». Chaque passe n'a lieu
     * que si les précédentes n'ont rien trouvé :
     *
     * 1. le bas de l'image, avec le modèle « mrz », s'il n'a pas déjà été lu
     *    (dos coupé sur le côté : « fra » n'y lit rien du tout) ;
     * 2. le bas de l'image retournée d'un demi-tour, de même (dos tête en bas,
     *    même coupé) ;
     * 3. l'image retournée, avec « fra » comme un recto, puis sa bande si ce
     *    texte l'annonce. Sur une photo couchée, Tesseract remet lui-même les
     *    lignes à l'horizontale, à l'endroit ou à l'envers : le demi-tour
     *    couvre l'autre sens.
     *
     * Mesuré dans le banc (PC, Chrome) : 27 dos tournés, penchés, coupés tous
     * reconnus ; 0 recto sur 106 pris pour un dos ; 0,2 à 1,2 s de plus sur les
     * photos sans résultat (19 rectos sur 90 passent par là).
     *
     * Une panne ici laisse la question sans réponse : pas de verdict
     * (`moteur_indisponible`), et la page ne l'enverra pas.
     */
    if (!mrz && !estDos() && !paireComplete(lectureRecto) && lectureRecto?.typePiece !== 'Passeport') {
      try {
        debutPasse = maintenant();
        if (!bandeLue) {
          const lue = await sousGarde(moteur.lire(bandeBasse(image.lecture), PASSE_BANDE, signal), signal);
          mrz = lireMrz(lue.texte.split(/\r?\n/, LIGNES_MAX));
          carte ??= familleCarte(lue.texte);
        }
        const retournee = !mrz && !estDos() ? tourner180(image.lecture) : null;
        if (retournee) {
          await ceder();
          const lue = await sousGarde(moteur.lire(bandeBasse(retournee), PASSE_BANDE, signal), signal);
          mrz = lireMrz(lue.texte.split(/\r?\n/, LIGNES_MAX));
          carte ??= familleCarte(lue.texte);
        }
        if (retournee && !mrz && !estDos()) {
          const envers = await sousGarde(moteur.lire(retournee, PASSE_RECTO, signal), signal);
          carte ??= familleCarte(envers.texte);
          if (!estDos() && doitLireBande(envers.texte, lireRecto(envers.texte))) {
            const zone = zoneBande(envers.tsv, retournee.hauteur);
            const bande = zone ? recadrer(retournee, zone.haut, zone.bas) : bandeBasse(retournee);
            const lue = await sousGarde(moteur.lire(bande, PASSE_BANDE, signal), signal);
            mrz = lireMrz(lue.texte.split(/\r?\n/, LIGNES_MAX));
            carte ??= familleCarte(lue.texte);
          }
        }
        mesurer('contre-verification', debutPasse);
      } catch (erreur) {
        if (signal.aborted) throw erreur;
        throw new LectureImpossible('moteur_indisponible');
      }
    }

    const dosDeCarte = estDos();

    // Dos de carte : rien du verso n'est un recto, seule la bande compte. Faute
    // de bande lisible, on garde au moins le type quand la carte est ivoirienne.
    const lecture = dosDeCarte
      ? mrz
        ? fusionner(mrz, null)
        : carte === 'carte-civ'
          ? { typePiece: 'CNI' }
          : null
      : fusionner(mrz, lectureRecto);
    mesurer('totale', debut);
    return {
      resultat: assainirSortie(lecture),
      imageAEnvoyer: dosDeCarte ? null : image.envoi,
      estDosDeCarte: dosDeCarte,
    };
  } catch (erreur) {
    if (signalAppelant?.aborted) throw annulation();
    if (erreur instanceof LectureImpossible) throw erreur;
    // Délai de sécurité, panne du moteur, fichiers injoignables : même cause,
    // et jamais l'erreur d'origine, qui pourrait porter une URL ou un message du moteur.
    throw new LectureImpossible('moteur_indisponible');
  } finally {
    clearTimeout(minuteur);
    signalAppelant?.removeEventListener('abort', relayer);
    moteur?.arreter();
  }
}
