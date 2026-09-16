import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import {
  estPhoto,
  fermerFlux,
  lampeDisponible,
  ouvrirFlux,
  permissionCamera,
  photographierCadre,
  reglerLampe,
  viseurPossible,
} from '../lib/lecture/camera';

/**
 * Écran d'ouverture de la déclaration : « Prends la pièce en photo »
 * (brief § 2.1).
 *
 * Composant de PRÉSENTATION. Il ne lit rien et ne décide rien : il obtient UNE
 * image — le côté avec la photo d'identité, pour toutes les pièces — et la
 * remet au parent par `onPhoto`. Ensuite il affiche l'état que le parent lui
 * donne. C'est le parent qui lit l'image, qui sait si c'était le dos d'une
 * carte, et qui décide si on peut la montrer.
 *
 * Trois façons d'obtenir l'image, toujours dans cet ordre de préférence :
 *
 * 1. le viseur dans la page (`getUserMedia`, caméra arrière), sur téléphone
 *    seulement, une fois la page hydratée. Il dessine un cadre au format
 *    carte et recadre la photo autour ;
 * 2. l'appareil photo du système (`<input capture="environment">`) : c'est ce
 *    que montre le HTML pré-rendu, qui marche avant même que le JavaScript
 *    soit chargé, et le repli quand le viseur est refusé, absent, trop peu
 *    fin, ou dans une vue web intégrée (WhatsApp, Facebook, Instagram,
 *    TikTok…) ;
 * 3. « Choisir une image » (galerie), toujours visible, et seul bouton
 *    d'image sur ordinateur, avec le glisser-déposer.
 *
 * Règles tenues ici :
 *
 * - AUCUN aperçu d'une image tant que le parent n'a pas dit que ce n'était pas
 *   le dos d'une carte : l'écran de lecture ne montre qu'un gabarit, et
 *   `apercu` n'est affiché qu'à l'écran `reprise`. Le dos d'une carte n'est
 *   jamais gardé ici — il part au parent, qui le lâche.
 * - La caméra s'éteint dès qu'elle ne sert plus : photo prise, image choisie,
 *   galerie ouverte, lecture en cours, onglet masqué, page quittée, démontage.
 * - Rien n'est écrit dans la console du navigateur, rien n'est persisté (ni
 *   stockage, ni IndexedDB) : les
 *   images ne vivent qu'en mémoire, le temps d'être remises.
 * - Pré-rendu : rien ne touche `navigator`, `window`, une toile ou la caméra
 *   pendant le rendu ; tout passe par des effets et des gestes. Le premier
 *   rendu côté client est identique au HTML pré-rendu (boutons natifs) ; le
 *   viseur ne s'installe qu'après.
 *
 * Accessibilité : une seule région d'annonces polie, présente dès le HTML
 * pré-rendu ; le titre reçoit le focus à chaque changement d'écran (jamais un
 * champ : sur téléphone, le clavier cacherait ce qu'il faut lire) ; la vidéo
 * est cachée des lecteurs d'écran, le déclencheur et la lampe sont de vrais
 * boutons.
 *
 * ---------------------------------------------------------------------------
 * Pour l'intégrateur — branchement sur `lib/lecture/machine.ts`
 * ---------------------------------------------------------------------------
 *
 *   {(etat.etape === 'photo' || etat.etape === 'lecture') && (
 *     <CapturePiece
 *       etat={etat.etape === 'lecture'
 *         ? (etat.lecture?.lente ? 'lecture-lente' : 'lecture')
 *         : etat.ecranPhoto}
 *       onPhoto={(image) => envoyer({ type: 'PHOTO_PRISE', image })}
 *       onSaisieMain={() => envoyer({ type: 'SAISIR_MAIN' })}
 *       onSansPhoto={() => envoyer({ type: 'SANS_PHOTO' })}
 *       onContinuerSansPhoto={() => envoyer({ type: 'CONTINUER_SANS_PHOTO' })}
 *       onPreparer={() => prechargerLecture()}
 *       apercu={photoAffichable(etat)}
 *       retour={<Link to="/" className="lien">Retour</Link>}
 *     />
 *   )}
 *
 * - Garder le composant MONTÉ entre `photo` et `lecture` (même place, pas de
 *   `key` qui change) : il se souvient que la caméra est autorisée et rouvre
 *   le viseur tout seul à l'écran `reprise` ou `devant`.
 * - L'état initial du parent doit rendre ce composant, pour que `/declarer`
 *   pré-rendu montre des boutons qui marchent avant l'hydratation.
 * - Sur téléphone (≤ 720 px), l'écran recouvre tout, en-tête, barre du bas et
 *   avis (`.avis`, z 90) compris : une erreur à dire pendant qu'il est affiché
 *   passe par `messages.erreur`, pas par un avis. `retour` est la seule sortie
 *   vers le reste du site — indispensable dans l'appli installée sur iPhone,
 *   qui n'a pas de bouton retour.
 * - « Saisir à la main » et les autres liens sont des boutons React : ils
 *   n'agissent qu'après l'hydratation. Les deux boutons d'image, eux, marchent
 *   dès le HTML ; une image choisie avant l'hydratation est récupérée au
 *   montage et remise par `onPhoto`.
 */

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Ce que l'écran doit dire. Les trois premiers valent `EtatParcours.ecranPhoto`
 * de la machine ; les deux derniers, l'étape `lecture`.
 *
 * - `ouverture` : écran d'ouverture, « Prends la pièce en photo ».
 * - `reprise` : la lecture n'a rien donné, on propose de reprendre la photo ;
 *   seul écran où `apercu` s'affiche.
 * - `devant` : la photo était le dos d'une carte. On demande le côté avec la
 *   photo d'identité, avec « Continuer sans photo ».
 * - `lecture` : image remise, lecture en cours. Ni viseur, ni aperçu.
 * - `lecture-lente` : la même, passé le délai d'indice (5 s dans la machine).
 */
export type EtatCapture = 'ouverture' | 'reprise' | 'devant' | 'lecture' | 'lecture-lente';

/** D'où vient l'image remise : utile pour mesurer, sans rien dire de son contenu. */
export type SourcePhoto = 'viseur' | 'appareil' | 'galerie';

/**
 * Textes fournis par le parent. Chacun remplace le texte par défaut de l'écran
 * courant ; `undefined` garde le texte par défaut. Aucun ne doit contenir ce
 * qui a été lu sur la pièce.
 */
export interface MessagesCapture {
  /** Remplace le titre de l'écran. */
  titre?: string;
  /** Remplace le paragraphe d'aide sous le titre. */
  aide?: string;
  /** Indice sous le gabarit de lecture ; par défaut, seulement en `lecture-lente`. */
  indice?: string;
  /** Erreur à afficher (en rouge) et à annoncer : envoi impossible, hors ligne… */
  erreur?: string;
  /** Phrase à annoncer aux lecteurs d'écran seulement, à chaque changement. */
  annonce?: string;
}

export interface CapturePieceProps {
  /** Écran à afficher. Voir `EtatCapture`. */
  etat: EtatCapture;
  /**
   * Une image vient d'être obtenue. `fichier` est :
   * - viseur : un JPEG recadré autour du cadre de visée, marge comprise ;
   * - appareil ou galerie : le fichier tel que le téléphone l'a donné, déjà
   *   vérifié comme photo (type `image/*` hors SVG, ou extension de photo). Un
   *   HEIC peut passer : au parent de le traiter comme indécodable.
   * La caméra est déjà éteinte. Le parent passe normalement à `lecture`.
   */
  onPhoto: (fichier: File, source: SourcePhoto) => void;
  /** « Saisir à la main » : visible sur tous les écrans. */
  onSaisieMain: () => void;
  /** « Je ne peux pas prendre de photo » : écrans `ouverture` et `reprise`. */
  onSansPhoto: () => void;
  /** « Continuer sans photo » : écran `devant` seulement. */
  onContinuerSansPhoto: () => void;
  /**
   * La personne s'apprête à photographier : viseur qui s'ouvre (au toucher, ou
   * tout seul si la caméra est déjà autorisée), appareil photo du système ou
   * galerie touchés. Le parent peut démarrer le moteur de lecture d'avance,
   * pendant le cadrage. Jamais appelé au rendu ; peut l'être plusieurs fois.
   */
  onPreparer?: () => void;
  /** Textes à la place des textes par défaut. */
  messages?: MessagesCapture;
  /**
   * Photo précédente, affichée en vignette à l'écran `reprise` SEULEMENT (pour
   * voir ce qui n'allait pas : flou, reflet). Ignorée partout ailleurs. Passer
   * uniquement une image dont on sait que ce n'est pas un dos de carte
   * (`photoAffichable` de la machine). Son adresse `blob:` est révoquée dès
   * qu'elle change ou disparaît.
   */
  apercu?: Blob | null;
  /** Lien de sortie affiché en tête, en plein écran seulement (ex. `<Link className="lien">`). */
  retour?: ReactNode;
}

// ---------------------------------------------------------------------------
// Textes
// ---------------------------------------------------------------------------

type Ecran = 'ouverture' | 'reprise' | 'devant' | 'lecture';

const TEXTES: Record<Ecran, { titre: string; aide: string }> = {
  ouverture: {
    titre: 'Prends la pièce en photo',
    aide: 'Le numéro et les données sensibles sont floutés automatiquement. Personne ne pourra rien y lire.',
  },
  reprise: {
    titre: 'On n’a pas bien lu le nom',
    aide: 'Essaie encore une fois : près de la lumière, sans reflet, la pièce bien droite dans le cadre.',
  },
  devant: {
    titre: 'Ça, c’est le dos de la carte hein',
    aide: 'Retourne-la et prends le côté avec la photo d’identité : c’est celui-là qu’on floute et qu’on publie. L’image du dos reste sur ton téléphone.',
  },
  lecture: {
    titre: 'On lit la pièce…',
    aide: 'Quelques secondes seulement. Ensuite, tu n’as plus qu’à vérifier.',
  },
};

/** Tient sur une ligne à 320 px de large (Archivo Narrow, 11 px, capitales espacées). */
const CONSIGNE = 'Côté photo, en entier dans le cadre';
const INDICE_LENT = 'Ça prend un peu plus de temps que d’habitude. Patiente un instant…';
const ERREUR_FICHIER = 'Ce fichier n’est pas une photo. Choisis une image de la pièce.';

/** Guillemets français, collés à leur texte par des espaces insécables. */
const INSECABLE = String.fromCharCode(0xa0);
const cite = (texte: string) => `«${INSECABLE}${texte}${INSECABLE}»`;

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

/** Où en est la caméra dans la page. */
type Phase = 'repos' | 'demarrage' | 'viseur';

/**
 * Ce que montre la zone photo :
 * - `natif` : bouton de l'appareil photo du système (HTML pré-rendu, ordinateur,
 *   vue web intégrée, caméra refusée ou trop peu fine) ;
 * - `a-ouvrir` : le viseur est possible, il s'ouvrira au toucher (ou tout seul
 *   si la caméra est déjà autorisée) ;
 * - `demarrage` : caméra demandée, pas encore d'image ;
 * - `viseur` : image en direct, prête à photographier.
 */
type Mode = 'natif' | 'a-ouvrir' | Exclude<Phase, 'repos'>;

export function CapturePiece({
  etat,
  onPhoto,
  onSaisieMain,
  onSansPhoto,
  onContinuerSansPhoto,
  onPreparer,
  messages,
  apercu,
  retour,
}: CapturePieceProps) {
  const ecran: Ecran = etat === 'lecture-lente' ? 'lecture' : etat;
  const enLecture = ecran === 'lecture';

  const id = useId();
  const idTitre = `${id}-titre`;
  const idAppareil = `${id}-appareil`;
  const idGalerie = `${id}-galerie`;

  /** Viseur envisageable ici (téléphone, contexte sûr, caméra non refusée). */
  const [possible, setPossible] = useState(false);
  /** Ouvrir le viseur sans attendre un toucher : caméra autorisée, ou déjà ouverte une fois. */
  const [souhait, setSouhait] = useState(false);
  const [phase, setPhase] = useState<Phase>('repos');
  /** Le viseur a échoué : l'appareil photo du système prend le relais jusqu'au bout. */
  const [echec, setEchec] = useState<'indisponible' | 'pauvre' | null>(null);
  const [visible, setVisible] = useState(true);
  /** Galerie ouverte : on ne rallume pas la caméra derrière le sélecteur. */
  const [pause, setPause] = useState(false);
  /** Image remise sur cet écran : on attend le parent, sans rallumer la caméra. */
  const [photoRemise, setPhotoRemise] = useState(false);
  /** `null` : pas de lampe ; sinon, allumée ou non. */
  const [lampe, setLampe] = useState<boolean | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [glisse, setGlisse] = useState(false);

  // Changement d'écran : ce qui valait pour l'écran d'avant est oublié. Ajusté
  // pendant le rendu plutôt que dans un effet, pour ne pas afficher une image
  // d'état périmée entre les deux.
  const [ecranVu, setEcranVu] = useState(ecran);
  if (ecranVu !== ecran) {
    setEcranVu(ecran);
    setPhotoRemise(false);
    setErreurFichier(null);
    if (ecran === 'lecture') {
      setPhase('repos');
      setLampe(null);
    }
  }

  const titre = useRef<HTMLHeadingElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const cadre = useRef<HTMLSpanElement>(null);
  const appareil = useRef<HTMLInputElement>(null);
  const galerie = useRef<HTMLInputElement | null>(null);
  const flux = useRef<MediaStream | null>(null);
  const ouverture = useRef<AbortController | null>(null);
  const prise = useRef(false);
  const focaliserAppareil = useRef(false);
  const premierEcran = useRef(true);

  const mode: Mode = !possible || echec !== null ? 'natif' : phase === 'repos' ? 'a-ouvrir' : phase;

  /** Éteint la caméra et abandonne une ouverture en cours. Ne touche pas à l'état React. */
  const fermer = useCallback(() => {
    ouverture.current?.abort();
    ouverture.current = null;
    if (flux.current) {
      fermerFlux(flux.current, video.current);
      flux.current = null;
    }
  }, []);

  const ouvrir = useCallback(async () => {
    const element = video.current;
    if (!element || ouverture.current || flux.current) return;
    const controle = new AbortController();
    ouverture.current = controle;
    setPhase('demarrage');

    const resultat = await ouvrirFlux(element, controle.signal);

    if (ouverture.current !== controle) {
      // Fermée entre-temps (onglet masqué, image choisie, démontage).
      if ('flux' in resultat) fermerFlux(resultat.flux, element);
      if (ouverture.current === null) setPhase('repos');
      return;
    }
    ouverture.current = null;

    if ('echec' in resultat) {
      setPhase('repos');
      if (resultat.echec !== 'annule') {
        setEchec(resultat.echec);
        focaliserAppareil.current = true;
      }
      return;
    }

    const ouvert = resultat.flux;
    flux.current = ouvert;
    // Caméra reprise par une autre appli, autorisation retirée : on s'arrête,
    // et l'on attend un toucher plutôt que de boucler sur une réouverture.
    ouvert.getVideoTracks()[0]?.addEventListener(
      'ended',
      () => {
        if (flux.current !== ouvert) return;
        fermer();
        setPhase('repos');
        setLampe(null);
        setSouhait(false);
      },
      { once: true },
    );
    setSouhait(true);
    setLampe(lampeDisponible(ouvert) ? false : null);
    setPhase('viseur');
  }, [fermer]);

  // Montage : le viseur est-il envisageable, et déjà autorisé ?
  useEffect(() => {
    if (!viseurPossible()) return;
    let actif = true;
    void permissionCamera().then((permission) => {
      if (!actif || permission === 'refusee') return;
      setPossible(true);
      if (permission === 'accordee') setSouhait(true);
    });
    return () => {
      actif = false;
    };
  }, []);

  // Ouverture automatique : seulement quand rien ne s'y oppose.
  const doitOuvrir =
    possible && echec === null && souhait && phase === 'repos' && !enLecture && visible && !pause && !photoRemise;
  // Le moteur de lecture n'est PAS préparé ici : l'ouverture automatique n'est
  // le geste de personne, et le préparer téléchargerait ~2 Mo sur le forfait de
  // quiconque ouvre la page avec une caméra déjà autorisée. Il se prépare au
  // premier geste (voir `ouvrirAuToucher`, `avantGalerie`), ou à la photo.
  useEffect(() => {
    if (!doitOuvrir) return;
    void ouvrir();
  }, [doitOuvrir, ouvrir]);

  // Pendant la lecture, la caméra est éteinte : elle garderait des dizaines de
  // mégaoctets et du processeur dont la lecture a besoin sur un petit téléphone.
  useEffect(() => {
    if (enLecture) fermer();
  }, [enLecture, fermer]);

  // Onglet masqué, page quittée, démontage : caméra éteinte. Elle se rallume au
  // retour si elle était souhaitée (voir `doitOuvrir`).
  useEffect(() => {
    const surVisibilite = () => {
      const estVisible = document.visibilityState === 'visible';
      if (!estVisible && (flux.current || ouverture.current)) {
        fermer();
        setPhase('repos');
        setLampe(null);
      }
      setVisible(estVisible);
    };
    const surDepart = () => {
      fermer();
      setPhase('repos');
      setLampe(null);
      setVisible(false);
    };
    const surRetour = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', surVisibilite);
    window.addEventListener('pagehide', surDepart);
    window.addEventListener('pageshow', surRetour);
    return () => {
      document.removeEventListener('visibilitychange', surVisibilite);
      window.removeEventListener('pagehide', surDepart);
      window.removeEventListener('pageshow', surRetour);
      fermer();
    };
  }, [fermer]);

  // Focus sur le titre à chaque écran. Au premier affichage, seulement si le
  // focus n'est nulle part (arrivée sur la page) : on ne le vole à personne.
  useEffect(() => {
    const initial = premierEcran.current;
    premierEcran.current = false;
    if (initial && document.activeElement && document.activeElement !== document.body) return;
    titre.current?.focus({ preventScroll: true });
  }, [ecran]);

  // Le viseur vient d'échouer : le bouton touché a disparu avec lui. Le focus
  // passe au bouton de l'appareil photo du système, qui prend sa place.
  useEffect(() => {
    if (mode !== 'natif' || !focaliserAppareil.current) return;
    focaliserAppareil.current = false;
    if (!document.activeElement || document.activeElement === document.body) {
      appareil.current?.focus({ preventScroll: true });
    }
  }, [mode]);

  /** Remet une image au parent, caméra éteinte. */
  const remettre = (fichier: File, source: SourcePhoto) => {
    fermer();
    setPhase('repos');
    setLampe(null);
    setPause(false);
    setErreurFichier(null);
    setPhotoRemise(true);
    onPhoto(fichier, source);
  };

  const recevoir = (fichier: File | undefined, source: 'appareil' | 'galerie') => {
    if (!fichier) return;
    if (!estPhoto(fichier.type, fichier.name)) {
      setErreurFichier(ERREUR_FICHIER);
      return;
    }
    remettre(fichier, source);
  };

  // Image choisie AVANT l'hydratation : les boutons natifs du HTML pré-rendu
  // marchent sans JavaScript, mais leur événement `change` est parti dans le
  // vide. Le fichier, lui, est encore dans l'input : on le reprend au montage.
  const reprendreChoixAnticipe = useEffectEvent(() => {
    const champs = [
      [appareil.current, 'appareil'],
      [galerie.current, 'galerie'],
    ] as const;
    for (const [champ, source] of champs) {
      const fichier = champ?.files?.[0];
      if (champ && fichier) {
        champ.value = '';
        recevoir(fichier, source);
        return;
      }
    }
  });
  useEffect(() => {
    reprendreChoixAnticipe();
  }, []);

  // Toucher explicite : la personne veut le viseur. S'il est interrompu (onglet
  // masqué par un dialogue système d'autorisation, par exemple), il se
  // rallumera seul au retour.
  const ouvrirAuToucher = () => {
    onPreparer?.();
    setSouhait(true);
    setPause(false);
    setPhotoRemise(false);
    void ouvrir();
  };

  const declencher = async () => {
    const element = video.current;
    if (mode !== 'viseur' || !element || prise.current) return;
    prise.current = true;
    try {
      // Image figée : ce qui reste à l'écran est exactement la photo prise.
      element.pause();
      const fichier = await photographierCadre(element, cadre.current);
      if (fichier) {
        remettre(fichier, 'viseur');
        return;
      }
      fermer();
      setPhase('repos');
      setLampe(null);
      setEchec('indisponible');
      focaliserAppareil.current = true;
    } finally {
      prise.current = false;
    }
  };

  const basculerLampe = async () => {
    const ouvert = flux.current;
    if (!ouvert || lampe === null) return;
    const voulue = !lampe;
    setLampe(voulue);
    if (!(await reglerLampe(ouvert, voulue)) && flux.current === ouvert) setLampe(null);
  };

  const surChoix = (source: 'appareil' | 'galerie') => (e: ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    // Vidé tout de suite : choisir deux fois la même image doit redéclencher
    // `change`, et le fichier ne traîne pas dans le formulaire.
    e.target.value = '';
    setPause(false);
    recevoir(fichier, source);
  };

  // Galerie : la caméra s'éteint avant que le sélecteur ne la recouvre.
  // Refermé sans choix (`cancel`), le viseur se rallume tout seul. Branché
  // sur l'input et non sur son libellé : un clic sur le libellé arrive aussi à
  // l'input, et le clavier (Espace, Entrée) n'active que l'input.
  const avantGalerie = () => {
    onPreparer?.();
    if (flux.current || ouverture.current) {
      fermer();
      setPhase('repos');
      setLampe(null);
    }
    setPause(true);
  };
  const brancherGalerie = useCallback((champ: HTMLInputElement | null) => {
    galerie.current = champ;
    if (!champ) return;
    const reprendre = () => setPause(false);
    champ.addEventListener('cancel', reprendre);
    return () => {
      champ.removeEventListener('cancel', reprendre);
      galerie.current = null;
    };
  }, []);

  const surViseur = () => {
    if (mode === 'natif') appareil.current?.click();
    else if (mode === 'a-ouvrir') ouvrirAuToucher();
  };

  // Glisser-déposer, pour l'ordinateur.
  const avecFichiers = (e: DragEvent<HTMLElement>) => Array.from(e.dataTransfer.types).includes('Files');
  const surSurvol = (e: DragEvent<HTMLElement>) => {
    if (enLecture || !avecFichiers(e)) return;
    e.preventDefault();
    setGlisse(true);
  };
  const surSortie = (e: DragEvent<HTMLElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    setGlisse(false);
  };
  const surDepot = (e: DragEvent<HTMLElement>) => {
    if (enLecture || !avecFichiers(e)) return;
    e.preventDefault();
    setGlisse(false);
    recevoir(e.dataTransfer.files?.[0], 'galerie');
  };

  const quitter = (rappel: () => void) => () => {
    fermer();
    setPhase('repos');
    rappel();
  };

  // --- Textes de l'écran courant --------------------------------------------

  const titreEcran = messages?.titre ?? TEXTES[ecran].titre;
  const aideEcran = messages?.aide ?? TEXTES[ecran].aide;
  const indice = messages?.indice ?? (etat === 'lecture-lente' ? INDICE_LENT : undefined);
  const erreur = messages?.erreur ?? erreurFichier;

  const libelleAppareil = ecran === 'reprise' ? 'Reprendre la photo' : 'Prendre en photo';
  const libelleDeclencheur = ecran === 'reprise' ? 'Reprendre la photo' : 'Prendre la photo';

  const aideCamera =
    enLecture || echec === null
      ? null
      : echec === 'pauvre'
        ? `L’appareil photo de ton téléphone fera une photo plus nette. Appuie sur ${cite(libelleAppareil)} pour l’ouvrir.`
        : `L’appareil photo ne s’ouvre pas dans la page. Appuie sur ${cite(libelleAppareil)} : ton téléphone va l’ouvrir.`;

  const annonceViseur =
    mode === 'viseur' && !enLecture
      ? `Appareil photo ouvert. Mets toute la pièce dans le cadre, côté photo, puis appuie sur ${cite(libelleDeclencheur)}.`
      : '';

  return (
    <section
      className="capture"
      aria-labelledby={idTitre}
      data-glisse={glisse || undefined}
      onDragOver={surSurvol}
      onDragLeave={surSortie}
      onDrop={surDepot}
    >
      <div className="capture-tete">
        {retour}
        <span className="cote">Déclarer une pièce trouvée</span>
      </div>

      <h2 id={idTitre} ref={titre} tabIndex={-1} className="capture-titre">
        {titreEcran}
      </h2>
      <p className="aide capture-aide">{aideEcran}</p>

      {enLecture ? (
        <>
          {/* Un gabarit, jamais l'image : on ne sait pas encore si c'est le dos
              d'une carte. */}
          <div className="capture-lecture" aria-hidden="true">
            <span className="squelette" />
            <span className="squelette" />
            <span className="squelette" />
          </div>
          {indice && <p className="aide">{indice}</p>}
        </>
      ) : (
        <>
          {ecran === 'reprise' && apercu ? <ApercuPhoto image={apercu} /> : null}

          {/* Le viseur. Au repos, c'est une silhouette de carte qui ouvre la
              caméra au toucher ; les vrais contrôles sont les boutons dessous,
              d'où l'absence de rôle et de focus ici. */}
          <div
            className={mode === 'demarrage' || mode === 'viseur' ? 'viseur viseur-actif' : 'viseur viseur-repos'}
            onClick={surViseur}
          >
            {mode !== 'natif' && <video ref={video} className="viseur-video" playsInline muted aria-hidden="true" />}
            <span ref={cadre} className="cadre" aria-hidden="true" />
            <span className="viseur-consigne" aria-hidden="true">
              {mode === 'demarrage' ? 'Ouverture de l’appareil photo…' : CONSIGNE}
            </span>
          </div>

          <div className="capture-actions">
            <div className="capture-appareil">
              <input
                ref={appareil}
                id={idAppareil}
                className="sr-only capture-fichier"
                type="file"
                accept="image/*"
                capture="environment"
                disabled={mode !== 'natif'}
                onClick={onPreparer}
                onChange={surChoix('appareil')}
              />
              {mode === 'natif' ? (
                <label htmlFor={idAppareil} className="btn btn-plein btn-large">
                  {libelleAppareil}
                </label>
              ) : (
                <button
                  type="button"
                  className="btn btn-plein btn-large"
                  aria-disabled={mode === 'demarrage' || undefined}
                  onClick={mode === 'viseur' ? () => void declencher() : mode === 'a-ouvrir' ? ouvrirAuToucher : undefined}
                >
                  {mode === 'a-ouvrir' ? libelleAppareil : libelleDeclencheur}
                </button>
              )}
              {/* La lampe se range à côté du déclencheur, sous le pouce, et non
                  dans le viseur : sur un écran de 568 px de haut, elle y
                  masquait un coin du cadre, ou forçait à le rétrécir — donc à
                  tenir le téléphone plus loin et à perdre des pixels sur la
                  carte, précisément sur les petits téléphones. */}
              {mode === 'viseur' && lampe !== null && (
                <button
                  type="button"
                  className="btn capture-lampe"
                  aria-pressed={lampe}
                  onClick={() => void basculerLampe()}
                >
                  Lampe
                </button>
              )}
            </div>

            <div className="capture-galerie">
              <input
                ref={brancherGalerie}
                id={idGalerie}
                className="sr-only capture-fichier"
                type="file"
                accept="image/*"
                onClick={avantGalerie}
                onChange={surChoix('galerie')}
              />
              <label htmlFor={idGalerie} className="btn btn-large">
                Choisir une image
              </label>
              <span className="capture-glisser" aria-hidden="true">
                ou glisse l’image ici
              </span>
            </div>
          </div>

          {aideCamera && <p className="aide">{aideCamera}</p>}
        </>
      )}

      {erreur && <p className="erreur">{erreur}</p>}

      <p className="capture-sorties">
        <button type="button" className="lien" onClick={quitter(onSaisieMain)}>
          Saisir à la main
        </button>
        {!enLecture &&
          (ecran === 'devant' ? (
            <button type="button" className="lien" onClick={quitter(onContinuerSansPhoto)}>
              Continuer sans photo
            </button>
          ) : (
            <button type="button" className="lien" onClick={quitter(onSansPhoto)}>
              Je ne peux pas prendre de photo
            </button>
          ))}
      </p>

      {/* Seule région d'annonces, présente dès le HTML pré-rendu : une région
          insérée au moment d'annoncer n'est pas toujours lue. Chaque morceau
          est annoncé quand son texte change. */}
      <p className="sr-only" role="status" aria-live="polite">
        <span>{annonceViseur}</span> <span>{aideCamera ?? ''}</span> <span>{erreur ?? ''}</span>{' '}
        <span>{enLecture ? (indice ?? '') : ''}</span> <span>{messages?.annonce ?? ''}</span>
      </p>
    </section>
  );
}

/**
 * Vignette de la photo précédente, à l'écran `reprise`.
 *
 * L'adresse `blob:` est posée et révoquée dans un effet, sans passer par l'état
 * React : elle ne survit ni à un changement d'image ni au démontage.
 */
function ApercuPhoto({ image }: { image: Blob }) {
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const element = img.current;
    if (!element) return;
    const adresse = URL.createObjectURL(image);
    element.src = adresse;
    return () => {
      element.removeAttribute('src');
      URL.revokeObjectURL(adresse);
    };
  }, [image]);
  return (
    <figure className="capture-prise">
      <img ref={img} alt="" className="capture-apercu" />
      <figcaption className="ligne-meta">Ta photo précédente</figcaption>
    </figure>
  );
}
