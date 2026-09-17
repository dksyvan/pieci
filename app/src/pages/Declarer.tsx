import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TYPES_PIECE, type TypePiece } from '@partage/types';
import { COMMUNES, type LatLng } from '@partage/communes';
import { MESSAGE_TELEPHONE, normaliserTelephone, telephoneValide } from '@partage/telephone';
import { initialesPrenom, nomAffiche } from '@partage/partage';
import { CapturePiece, type EtatCapture } from '../components/CapturePiece';
import { DiagnosticLecture } from '../components/DiagnosticLecture';
import { LieuField } from '../components/LieuField';
import { BandeauPush } from '../components/BandeauPush';
import { CartePiece } from '../components/CartePiece';
import { PartagePiece } from '../components/PartagePiece';
import { IconeValide } from '../components/Icones';
import { useApp } from '../context/useApp';
import { ApiError, uploaderPhotoPiece } from '../lib/api';
import { montrerPremierChamp, type ErreursChamps } from '../lib/formulaire';
import {
  DELAI_ABANDON_MS,
  DELAIS_LECTURE,
  RAISONS_PROPOSEES,
  demanderDevant,
  doitDemanderType,
  inviteCoupure,
  inviteDecoupage,
  lectureEnFond,
  photoAEnvoyer,
  photoAffichable,
  raisonPhotoAbsente,
  type RaisonProposee,
} from '../lib/lecture/machine';
import {
  decisionEnvoi,
  etatDeclarationInitial,
  identiteLue,
  reduireDeclaration,
  type Verdict,
} from '../lib/lecture/declaration';

/**
 * Déclaration d'une pièce trouvée, « la photo d'abord » (brief § 2.1 et § 2.4) :
 * photo → lecture → vérification des champs pré-remplis → lieu → contact →
 * publication.
 *
 * Qui fait quoi :
 *
 * - `lib/lecture/machine.ts` décide de TOUT le parcours (étapes, champs lus,
 *   photo retenue, dos de carte, raison de l'absence de photo), et
 *   `lib/lecture/declaration.ts` y ajoute ce que la page apprend des lectures
 *   qu'aucune étape n'attend plus. Cette page ne fait que leur envoyer des
 *   événements et afficher ce qu'ils rendent.
 * - `components/CapturePiece.tsx` obtient l'image (viseur, appareil photo du
 *   système, galerie) et affiche les écrans photo et lecture.
 * - `lib/lecture` (index.ts) lit l'image dans le navigateur. Chargé par import
 *   dynamique au premier geste vers l'appareil photo : le pré-rendu de
 *   `/declarer` n'exécute rien qui touche un Worker, du WebAssembly, la caméra
 *   ou une toile, et le moteur (~2 Mo) ne se télécharge que pour qui photographie.
 * - Ici : les minuteurs des délais, le lancement et l'annulation des lectures,
 *   la vérification de l'image avant envoi, la publication. Règle de l'envoi :
 *   une image ne part que si une lecture a dit « pas un dos de carte », et
 *   seulement dans la version réduite que cette lecture a produite.
 *
 * Ce qui ne passe JAMAIS par cette page : le texte lu sur la pièce. `lirePiece`
 * ne rend que `{ typePiece?, nom?, prenom?, peutEtreCoupe?, decoupage? }`, et le
 * réducteur recopie encore ces clés une à une. Rien n'est persisté : l'état vit
 * en mémoire et disparaît avec la page ; les champs nom et prénoms portent
 * `autoComplete="off"` pour que le navigateur ne range pas dans son historique
 * de saisie le nom d'un inconnu.
 */

const AUTRE_DEPOT = '__autre__';

/**
 * Remplacé au build par vite.config.ts : `true` seulement pour la version
 * d'essai (`VITE_DIAGNOSTIC_LECTURE=1`). Dans un build normal, le mode
 * diagnostic et son composant disparaissent du code livré.
 */
declare const __DIAGNOSTIC_LECTURE__: boolean;

/**
 * Garanties de confidentialité, dans l'ordre du formulaire : photo, nom et
 * prénoms, point de dépôt, ton contact. Les textes sont ceux d'avant le
 * parcours « la photo d'abord » ; la reformulation de la garantie sur la photo
 * prévue au plan attend la validation du porteur du projet.
 */
const GARANTIES = [
  {
    cote: '01',
    texte:
      'La photo est floutée par le serveur : le numéro, la date de naissance et la signature deviennent illisibles. Impossible d’y lire quoi que ce soit.',
  },
  {
    cote: '02',
    texte:
      'En public, on n’affiche que le nom de famille et les initiales du prénom. Pour réclamer la pièce, il faut écrire les prénoms en entier : c’est ce qui prouve qu’elle est à soi.',
  },
  {
    cote: '03',
    texte:
      'La remise se fait dans un point de dépôt sûr — mairie, commissariat, pharmacie. Pas de rencontre privée risquée. C’est mieux non ?',
  },
  {
    cote: '04',
    texte:
      'Ton numéro n’est jamais publié. Il ne part chez le propriétaire que si vous confirmez tous les deux.',
  },
];

/**
 * Raisons proposées à « Je ne peux pas prendre de photo ». Un objet indexé par
 * la liste fermée plutôt qu'un tableau de textes : si une raison s'ajoute à
 * `RAISONS_PHOTO_ABSENTE`, la compilation casse ici au lieu d'afficher un
 * bouton sans texte.
 */
const LIBELLES_RAISON: Record<RaisonProposee, string> = {
  plus_en_main: 'Je n’ai plus la pièce avec moi',
  appareil: 'Mon téléphone ne veut pas (appareil photo, mémoire pleine)',
  photo_ratee: 'La photo ne sort pas bien (trop sombre, pièce abîmée)',
  prefere_pas: 'Je préfère ne pas la prendre en photo',
  autre: 'Autre raison',
};

const INVITE_VERIFIER = 'Vérifie que c’est bien ce qui est écrit sur la pièce.';
const INVITE_ACCENTS = 'Remets les accents, l’apostrophe et le tiret si la pièce en a.';
const INVITE_COUPURE = 'Les prénoms sont peut-être coupés : écris-les en entier, comme sur la pièce.';
const INVITE_DECOUPAGE =
  'Vérifie aussi où s’arrête le nom et où commencent les prénoms : si un mot est dans la mauvaise case, déplace-le.';
const LECTURE_EN_FOND =
  'On lit encore la photo… Si tu vois déjà le nom, écris-le : on ne touchera pas à ce que tu as mis.';
const PHOTO_NON_VERIFIEE =
  'On n’a pas réussi à vérifier ta photo sur ce téléphone, alors elle n’est pas partie. Réessaie de publier dans un instant, reprends la photo, ou continue sans photo.';
const DOS_NOM_LU =
  'On a lu le nom. Retourne-la et prends le côté avec la photo d’identité : c’est celui-là qu’on floute et qu’on publie. L’image du dos reste sur ton téléphone.';

/** Libellé d'une valeur qui n'est pas un contrôle (type lu) : même dessin que `.champ > label`. */
const LIBELLE: CSSProperties = {
  display: 'block',
  flex: '0 1 auto',
  fontFamily: 'var(--font-util)',
  fontWeight: 600,
  fontSize: 'var(--t-micro)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-sourdine)',
  marginBottom: 5,
};

/** Teinte et filet « à relire » des champs lus (voir `.champ.lu` dans index.css, plafond 8 %). */
const TEINTE_LU = 'color-mix(in srgb, var(--color-ambre) 8%, var(--color-papier))';

/** Valeur lue affichée sans question : le dessin d'un champ lu, sans en être un. */
const VALEUR_LUE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 'var(--s-2) var(--s-3)',
  border: '1px solid var(--color-filet-2)',
  borderLeft: '2px solid var(--color-ambre)',
  borderRadius: 'var(--r-champ)',
  background: TEINTE_LU,
  padding: '10px 11px 10px 10px',
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--t-body)',
};

/** Encadré du formulaire qui attend un geste (dos de carte) : même grammaire, filet et teinte. */
const ENCADRE: CSSProperties = {
  borderLeft: '2px solid var(--color-ambre)',
  background: TEINTE_LU,
  padding: 'var(--s-3)',
  marginBottom: 'var(--s-3)',
};

/** Une raison est une phrase qu'on reconnaît, pas un ordre : ni capitales ni espacement de bouton. */
const CHOIX: CSSProperties = {
  justifyContent: 'flex-start',
  textAlign: 'left',
  textTransform: 'none',
  letterSpacing: 0,
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--t-fine)',
  fontWeight: 500,
};

// ---------------------------------------------------------------------------
// Chargement de la lecture
// ---------------------------------------------------------------------------

type ModuleLecture = typeof import('../lib/lecture');

/**
 * Module de lecture, chargé au premier geste vers l'appareil photo et partagé
 * par toutes les lectures de la session. Oublié s'il échoue (hors ligne), pour
 * réessayer au geste suivant. `lectureChargee` permet de libérer le moteur sans
 * rien télécharger quand personne n'a photographié.
 */
let chargementLecture: Promise<ModuleLecture> | null = null;
let lectureChargee: ModuleLecture | null = null;

function chargerLecture(): Promise<ModuleLecture> {
  chargementLecture ??= import('../lib/lecture').then(
    (module) => {
      lectureChargee = module;
      return module;
    },
    (erreur: unknown) => {
      chargementLecture = null;
      throw erreur;
    },
  );
  return chargementLecture;
}

/**
 * La lecture en cours : une à la fois. `fin` se résout toujours, jamais en
 * échec, une fois ce qu'elle a appris rangé (`verdicts`, `illisibles`).
 */
interface LectureEnVol {
  readonly image: Blob;
  readonly controleur: AbortController;
  readonly fin: Promise<void>;
}

/**
 * Ce qui part à la publication, figé au moment de l'appui : l'écran de fin et
 * le partage montrent exactement ce qui a été enregistré.
 */
interface Envoyee {
  readonly typePiece: TypePiece;
  readonly nom: string;
  readonly prenom: string;
  readonly commune: string;
  readonly quartier: string | null;
}

type Vue = 'capture' | 'raison' | 'formulaire';

/** Liste d'identifiants pour `aria-describedby`, sans les absents. */
const decrit = (...ids: (string | false)[]) => ids.filter(Boolean).join(' ') || undefined;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Declarer() {
  const { pointsDepot, publier, afficherToast } = useApp();
  const navigate = useNavigate();

  const [etat, envoyer] = useReducer(reduireDeclaration, undefined, etatDeclarationInitial);
  const parcours = etat.parcours;
  const { typePiece: champType, nom: champNom, prenom: champPrenom } = parcours.champs;
  const typePiece = champType.valeur;
  const nom = champNom.valeur;
  const prenom = champPrenom.valeur;

  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [pointDepotId, setPointDepotId] = useState('');
  const [depotAutre, setDepotAutre] = useState('');

  const [monPrenom, setMonPrenom] = useState('');
  const [monNom, setMonNom] = useState('');
  const [monTelephone, setMonTelephone] = useState('');

  /** Publication en cours : le formulaire est gelé, rien ne change entre l'appui et l'enregistrement. */
  const [enCours, setEnCours] = useState(false);
  /** Publication demandée pendant qu'une lecture tourne : on attend son verdict avant d'envoyer l'image. */
  const [attenteLecture, setAttenteLecture] = useState(false);
  /**
   * Photo qu'aucune lecture n'a pu vérifier au moment de publier (moteur
   * injoignable, Worker tombé, délai dépassé) : elle n'est pas partie, et le
   * formulaire le dit tant que c'est encore la photo retenue.
   */
  const [photoNonVerifiee, setPhotoNonVerifiee] = useState<Blob | null>(null);
  /** Ce qui a été enregistré (voir `Envoyee`). */
  const [envoyee, setEnvoyee] = useState<Envoyee | null>(null);
  /** Type lu, mais la personne veut le changer : la question s'affiche. */
  const [typeOuvert, setTypeOuvert] = useState(false);
  /** Incrémenté quand la publication s'arrête sur un dos de carte : amène la demande du devant à l'écran. */
  const [devantAMontrer, setDevantAMontrer] = useState(0);
  /**
   * Numéro sous lequel la déclaration a été enregistrée — sa forme canonique.
   * C'est lui, et pas la saisie brute, que l'abonnement aux notifications doit
   * utiliser : s'abonner sous « 07 00 00 00 00 » quand le compte s'appelle
   * « 0700000000 » enverrait les alertes dans le vide.
   */
  const [publiee, setPubliee] = useState<string | null>(null);
  /**
   * Identifiant de la pièce publiée : c'est lui qui donne au déclarant le lien
   * à faire circuler. Le partage est l'unique moment où le trouveur peut
   * encore agir — après, la pièce dort au registre en attendant qu'on la
   * cherche.
   */
  const [fiche, setFiche] = useState<string | null>(null);

  /**
   * Erreurs de champs, indexées par id du DOM. Le bouton d'envoi reste
   * cliquable en permanence — un bouton grisé ne dit jamais ce qui manque —
   * et c'est l'appui qui déclenche la validation, message par message.
   */
  const [erreurs, setErreurs] = useState<ErreursChamps>({});

  const colonne = useRef<HTMLDivElement>(null);
  const blocDevant = useRef<HTMLDivElement>(null);
  const selectType = useRef<HTMLSelectElement>(null);
  const lectureEnVol = useRef<LectureEnVol | null>(null);
  const verdicts = useRef(new WeakMap<Blob, Verdict>());
  /** Images que le navigateur n'a pas su ouvrir, quel que soit le numéro de leur lecture. */
  const illisibles = useRef(new WeakSet<Blob>());
  /** Dernier état rendu, pour ce que la publication doit revérifier après une attente. */
  const parcoursCourant = useRef(parcours);
  const monte = useRef(false);

  const effacerErreur = (champ: string) =>
    setErreurs((prev) =>
      champ in prev
        ? Object.fromEntries(Object.entries(prev).filter(([cle]) => cle !== champ))
        : prev,
    );

  useEffect(() => {
    parcoursCourant.current = parcours;
  }, [parcours]);

  // --- Lectures ------------------------------------------------------------

  /**
   * Lance la lecture d'une image. Une seule à la fois : une nouvelle photo
   * arrête la précédente.
   *
   * La lecture n'est PAS arrêtée quand la machine cesse de l'attendre
   * (« Saisir à la main », formulaire ouvert à 8 s) : son verdict dit encore si
   * la photo retenue est le dos d'une carte, et un dos ne doit jamais partir
   * (voir `verdictDeLecture`, declaration.ts). Elle s'arrête quand son image ne sert plus
   * (retour vers l'appareil photo, autre photo), au bout de 25 s comme la
   * machine, ou quand on quitte la page.
   *
   * `numero` : celui de la machine, ou `null` pour une lecture relancée au
   * moment de publier, qu'aucune étape n'attend.
   */
  // Fonction stable plutôt qu'Effect Event : elle est aussi appelée depuis la
  // publication, un gestionnaire d'événement. Elle ne lit que des refs, `envoyer`
  // (le dispatch de useReducer) et `chargerLecture`, tous stables.
  const demarrerLecture = useCallback((image: Blob, numero: number | null) => {
    const precedente = lectureEnVol.current;
    // StrictMode rejoue les effets au montage : la même image n'est pas relue.
    if (precedente?.image === image) return;
    precedente?.controleur.abort();

    const controleur = new AbortController();
    const plafond = setTimeout(() => controleur.abort(), DELAI_ABANDON_MS);
    const fin = chargerLecture()
      .then(
        (module) =>
          module.lirePiece(image, { signal: controleur.signal }).then(
            ({ resultat, imageAEnvoyer, estDosDeCarte }) => {
              verdicts.current.set(image, { estDosDeCarte, imageAEnvoyer });
              envoyer({ type: 'LECTURE_FINIE', numero, image, lecture: resultat, estDosDeCarte, imageAEnvoyer });
            },
            (erreur: unknown) => {
              // Annulée : c'est nous qui l'avons voulu, la machine le sait déjà.
              if (module.estAnnulation(erreur)) return;
              if (erreur instanceof module.LectureImpossible && erreur.cause === 'image_illisible') {
                // Rangée par image, pas par numéro : après « Saisir à la main »,
                // la machine n'attend plus cette lecture, mais l'image est la photo.
                illisibles.current.add(image);
                envoyer({ type: 'LECTURE_ILLISIBLE', numero, image });
                return;
              }
              if (numero !== null) envoyer({ type: 'LECTURE_IMPOSSIBLE', numero, cause: 'moteur_indisponible' });
            },
          ),
        // Module injoignable (hors ligne, nouvelle version déployée entre-temps).
        () => {
          if (!controleur.signal.aborted && numero !== null) {
            envoyer({ type: 'LECTURE_IMPOSSIBLE', numero, cause: 'moteur_indisponible' });
          }
        },
      )
      .finally(() => {
        clearTimeout(plafond);
        if (lectureEnVol.current?.controleur === controleur) lectureEnVol.current = null;
      });
    lectureEnVol.current = { image, controleur, fin };
  }, []);

  const numeroLecture = parcours.lecture?.numero ?? null;
  const imageEnLecture = parcours.imageEnLecture;
  const photoRetenue = parcours.photo;

  // Chaque nouvelle lecture de la machine : on lit l'image et on arme les trois
  // délais. Un minuteur qui tombe trop tard est ignoré par la machine (numéro).
  useEffect(() => {
    if (numeroLecture === null || !imageEnLecture) return;
    demarrerLecture(imageEnLecture, numeroLecture);
    const minuteurs = DELAIS_LECTURE.map(({ apresMs, type }) =>
      setTimeout(() => envoyer({ type, numero: numeroLecture }), apresMs),
    );
    return () => minuteurs.forEach(clearTimeout);
  }, [numeroLecture, imageEnLecture, demarrerLecture]);

  // Image lâchée par la machine (retour vers l'appareil photo, photo remplacée) :
  // sa lecture ne sert plus à rien.
  useEffect(() => {
    const enVol = lectureEnVol.current;
    if (enVol && enVol.image !== imageEnLecture && enVol.image !== photoRetenue) {
      enVol.controleur.abort();
      lectureEnVol.current = null;
    }
  }, [imageEnLecture, photoRetenue]);

  // Départ de la page : lecture arrêtée, moteur préchauffé libéré.
  useEffect(() => {
    monte.current = true;
    const enVol = lectureEnVol;
    return () => {
      monte.current = false;
      enVol.current?.controleur.abort();
      enVol.current = null;
      lectureChargee?.libererLecture();
    };
  }, []);

  /** Au geste vers l'appareil photo : le moteur démarre pendant le cadrage. */
  const preparerLecture = () => {
    void chargerLecture().then(
      (module) => module.prechargerLecture(),
      () => {},
    );
  };

  // --- Étapes et focus -----------------------------------------------------

  const vue: Vue =
    parcours.etape === 'photo' || parcours.etape === 'lecture'
      ? 'capture'
      : parcours.etape === 'raison'
        ? 'raison'
        : 'formulaire';

  /**
   * Focus sur le titre à chaque changement d'étape — jamais sur un champ : sur
   * téléphone, le clavier cacherait ce qu'il faut relire. Pas à l'arrivée sur
   * la page (on ne vole le focus à personne ; CapturePiece s'en occupe), ni
   * entre relecture et saisie, qui sont le même formulaire : un résultat tardif
   * ne doit pas arracher le focus du champ où l'on écrit.
   *
   * Les trois titres portent `.capture-titre` et un seul est affiché à la fois
   * dans la colonne (le formulaire, caché, vient après dans le document).
   */
  const vuePrecedente = useRef<Vue | null>(null);
  useEffect(() => {
    const avant = vuePrecedente.current;
    vuePrecedente.current = vue;
    if (avant === null || avant === vue) return;
    // Photo abandonnée avant d'avoir servi : le moteur préchauffé s'arrête.
    if (vue !== 'capture' && !lectureEnVol.current) lectureChargee?.libererLecture();
    colonne.current?.querySelector<HTMLElement>('.capture-titre')?.focus({ preventScroll: vue !== 'formulaire' });
  }, [vue]);

  useEffect(() => {
    if (typeOuvert) selectType.current?.focus();
  }, [typeOuvert]);

  useEffect(() => {
    const bloc = blocDevant.current;
    if (devantAMontrer === 0 || !bloc) return;
    bloc.scrollIntoView({ behavior: 'smooth', block: 'center' });
    bloc.focus({ preventScroll: true });
  }, [devantAMontrer]);

  const retourPhoto = () => envoyer({ type: 'RETOUR_PHOTO' });

  // --- Publication ---------------------------------------------------------

  const soumettre = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enCours) return;
    setPhotoNonVerifiee(null);

    // Dans l'ordre du formulaire : le premier manquant est amené à l'écran.
    const manquants: ErreursChamps = {};
    if (!nom.trim()) manquants.nom = 'Écris le nom inscrit sur la pièce.';
    if (!prenom.trim()) manquants.prenom = 'Écris les prénoms inscrits sur la pièce.';
    if (!typePiece) manquants.type = 'Choisis le type de pièce trouvée.';
    if (!quartier.trim()) manquants.lieu = 'Écris où tu as trouvé la pièce — le quartier suffit.';
    else if (!commune) manquants.lieu = 'Choisis la commune dans la liste, juste en dessous.';
    if (!monPrenom.trim()) manquants.monPrenom = 'Ton prénom, pour te recontacter.';
    if (!monNom.trim()) manquants.monNom = 'Ton nom, pour te recontacter.';
    if (!monTelephone.trim()) manquants.monTel = 'Ton numéro, sinon on ne peut pas te joindre.';
    else if (!telephoneValide(monTelephone)) manquants.monTel = MESSAGE_TELEPHONE;

    setErreurs(manquants);
    if (Object.keys(manquants).length > 0 || !typePiece) {
      montrerPremierChamp(manquants);
      return;
    }
    const [lat, lng] = coords ?? COMMUNES[commune];
    // Forme canonique : le numéro est la clé du compte (voir shared/telephone.ts).
    const numero = normaliserTelephone(monTelephone);
    // Figé ici : le formulaire est gelé pendant la publication, et c'est ceci,
    // et rien d'autre, qui part puis s'affiche sur l'écran de fin.
    const saisie: Envoyee = { typePiece, nom, prenom, commune, quartier: quartier.trim() || null };
    const declarant = { telephone: numero, prenom: monPrenom, nom: monNom };
    const pointDepot = {
      pointDepotId: pointDepotId && pointDepotId !== AUTRE_DEPOT ? pointDepotId : undefined,
      pointDepotAutre: pointDepotId === AUTRE_DEPOT && depotAutre.trim() ? depotAutre.trim() : undefined,
    };

    setEnCours(true);
    try {
      /**
       * L'image à envoyer, vérifiée d'abord : elle ne part que si une lecture a
       * dit « pas un dos de carte », dans la version réduite que cette lecture
       * a produite (voir `decisionEnvoi`, declaration.ts).
       *
       * - Lecture encore en cours sur elle (formulaire ouvert à 8 s, « Saisir à
       *   la main ») : attendue, 25 s au plus, son plafond.
       * - Aucune lecture n'a abouti (moteur injoignable au premier passage,
       *   Worker tombé, lecture coupée) : relancée maintenant, le moteur est
       *   peut-être revenu. Si elle échoue encore, rien ne part et le
       *   formulaire le dit : réessayer, reprendre la photo ou continuer sans.
       * - Un dos s'arrête ici, jamais sur le réseau, et la page demande le devant.
       */
      const image = photoAEnvoyer(parcours);
      let envoi: Blob | null = null;
      if (image) {
        if (!verdicts.current.has(image) && !illisibles.current.has(image)) {
          if (lectureEnVol.current?.image !== image) demarrerLecture(image, null);
          const enVol = lectureEnVol.current;
          if (enVol?.image === image) {
            setAttenteLecture(true);
            try {
              await enVol.fin;
            } finally {
              setAttenteLecture(false);
            }
          }
        }
        if (!monte.current) return;
        const decision = decisionEnvoi(verdicts.current.get(image), illisibles.current.has(image));
        if (decision.type === 'dos') {
          // Déjà appliqué si la machine attendait ce verdict ; sinon, rejoué ici.
          envoyer({ type: 'LECTURE_FINIE', numero: null, image, lecture: null, estDosDeCarte: true, imageAEnvoyer: null });
          setDevantAMontrer((n) => n + 1);
          return;
        }
        // Image illisible : écartée par la lecture elle-même, et le formulaire le dit.
        if (decision.type === 'illisible') return;
        // Pendant l'attente, la personne a pu reprendre la photo ou en ajouter
        // une autre : cette publication-là n'a plus lieu d'être.
        const courant = parcoursCourant.current;
        if ((courant.etape !== 'verification' && courant.etape !== 'saisie') || photoAEnvoyer(courant) !== image) return;
        if (decision.type === 'non-verifiee') {
          setPhotoNonVerifiee(image);
          return;
        }
        envoi = decision.image;
      }

      const urls = envoi ? await uploaderPhotoPiece(envoi) : null;

      const idPiece = await publier({
        declarant,
        typePiece: saisie.typePiece,
        prenom: saisie.prenom,
        nom: saisie.nom,
        commune: saisie.commune,
        quartier: saisie.quartier ?? undefined,
        lat,
        lng,
        ...pointDepot,
        photoOriginaleUrl: urls?.photoOriginaleUrl,
        photoFlouteeUrl: urls?.photoFlouteeUrl,
        // Sans photo, toujours une raison — au pire `non_precisee` : c'est ce
        // qui distingue cette page de la saisie en série dans la mesure.
        photoAbsenteRaison: urls ? undefined : raisonPhotoAbsente(parcours),
      });
      setEnvoyee(saisie);
      setFiche(idPiece);
      setPubliee(numero);
    } catch (err) {
      afficherToast(err instanceof ApiError ? err.message : 'Une erreur est survenue, réessaie.');
    } finally {
      setEnCours(false);
    }
  };

  if (publiee !== null && envoyee) {
    return (
      <section className="section wrap">
        <div className="grille">
          <div className="col-a">
            <span className="timbre">
              <IconeValide taille={14} />
              Entrée enregistrée
            </span>
            <h2 style={{ fontSize: 'var(--t-title)', letterSpacing: '-0.038em', marginTop: 'var(--s-3)', lineHeight: 'var(--lh-title)' }}>
              C’est fait, la pièce de {nomAffiche(envoyee.nom, envoyee.prenom)} est au registre.
            </h2>
            <p style={{ color: 'var(--color-sourdine)', maxWidth: '52ch', marginTop: 'var(--s-2)', lineHeight: 'var(--lh-lead)' }}>
              Merci pour ton geste. L’algorithme compare déjà avec les alertes en cours — si quelqu’un
              cherche cette pièce, on te le signale, et c’est lui qui te contactera.
            </p>

            {/* Le partage vient avant les notifications, et ce n'est pas un
                détail d'ordre : c'est le seul geste qui augmente les chances
                de cette pièce-là. Passé cet écran, le trouveur n'a plus rien
                à faire — la pièce attend qu'on vienne la chercher. */}
            {fiche && (
              <div style={{ marginTop: 'var(--s-5)' }}>
                <PartagePiece
                  piece={{
                    id: fiche,
                    typePiece: envoyee.typePiece,
                    // Même forme que la vue publique : NOM en capitales et
                    // initiales du prénom. Le prénom entier ne part jamais
                    // dans un message partagé.
                    nom: envoyee.nom.trim().toUpperCase(),
                    prenomInitiales: initialesPrenom(envoyee.prenom),
                    commune: envoyee.commune,
                    quartier: envoyee.quartier,
                  }}
                  titre="Maintenant, fais-la circuler"
                  intro="Le registre attend qu’on vienne le consulter ; un message, lui, arrive chez les gens. Envoie la fiche dans ton groupe de quartier ou dans un groupe d’objets trouvés — c’est ce qui fait la différence entre une pièce déclarée et une pièce rendue."
                />
              </div>
            )}

            <div style={{ marginTop: 'var(--s-5)' }}>
              <BandeauPush telephone={publiee} onTermine={() => navigate('/trouvees')} />
            </div>
          </div>

          <div className="col-b" style={{ alignSelf: 'center' }}>
            <CartePiece
              nom={nomAffiche(envoyee.nom, envoyee.prenom)}
              type={envoyee.typePiece}
              cachet="DÉCLARÉE"
              inclinaison={1.8}
            />
          </div>
        </div>
      </section>
    );
  }

  // --- Ce que l'état dit d'afficher -----------------------------------------

  const ecranCapture: EtatCapture =
    parcours.etape === 'lecture' ? (parcours.lecture?.lente ? 'lecture-lente' : 'lecture') : parcours.ecranPhoto;
  const photoVue = photoAffichable(parcours);
  /** Aperçu seulement d'une image que la lecture a vue et qui n'est pas un dos (voir `verifiee`). */
  const apercu = photoVue && photoVue === etat.verifiee?.image ? (etat.verifiee.reduite ?? photoVue) : null;
  const nomLu = champNom.origine === 'lecture';
  const prenomLu = champPrenom.origine === 'lecture';
  const typeLu = champType.origine === 'lecture';
  /** Une lecture a rempli le nom ou les prénoms : reste vrai quand la personne les corrige (voir `lus`). */
  const accents = identiteLue(etat);
  const coupure = inviteCoupure(parcours);
  const decoupage = inviteDecoupage(parcours);
  const devant = demanderDevant(parcours);
  const enFond = lectureEnFond(parcours);
  const questionType = doitDemanderType(parcours) || typeOuvert;
  /** Photo gardée mais pas partie, faute d'avoir pu la vérifier (voir `photoNonVerifiee`). */
  const nonVerifiee = photoVue !== null && photoVue === photoNonVerifiee;
  // Erreurs « champ vide » : effacées aussi quand une lecture tardive remplit le champ.
  const erreurNom = nom.trim() ? undefined : erreurs.nom;
  const erreurPrenom = prenom.trim() ? undefined : erreurs.prenom;
  const erreurType = typePiece ? undefined : erreurs.type;

  /**
   * Seule sortie de l'écran photo en plein écran (appli installée sur iPhone :
   * pas de bouton retour). Vers l'accueil tant que rien n'est écrit ; une fois
   * le formulaire ouvert, vers le formulaire — quitter la page perdrait tout ce
   * qui y est écrit, qui ne vit qu'en mémoire.
   */
  const retour = etat.formulaireVu ? (
    <button type="button" className="lien" onClick={() => envoyer({ type: 'SAISIR_MAIN' })}>
      Retour au formulaire
    </button>
  ) : (
    <Link to="/" className="lien">
      Retour
    </Link>
  );

  /** Annonce du formulaire : ce qui change pendant qu'on écrit, sans déplacer le focus. */
  const annonceFormulaire = enFond
    ? LECTURE_EN_FOND
    : devant
      ? 'C’était le dos de la carte. Prends le côté avec la photo d’identité, ou continue sans photo.'
      : nonVerifiee
        ? PHOTO_NON_VERIFIEE
        : etat.lus.nom && etat.lus.prenom
          ? 'Nom et prénoms lus sur la photo. Vérifie-les.'
          : etat.lus.nom
            ? 'Nom lu sur la photo. Vérifie-le.'
            : etat.lus.prenom
              ? 'Prénoms lus sur la photo. Vérifie-les.'
              : '';

  return (
    <section className="section wrap">
      <div className="section-tete">
        <span className="cote">Déclarer une pièce trouvée</span>
        <h2 style={{ marginTop: 6 }}>J’ai trouvé une pièce hein</h2>
        <p>
          Merci pour ton geste — le bienfait n’est jamais perdu. Renseigne juste le minimum : ce que tu
          écris ici sert uniquement à retrouver le propriétaire, et les données restent protégées.
        </p>
      </div>

      <div className="dossier">
        <div ref={colonne}>
          {/* Écrans photo et lecture : le même composant reste monté de l'un à
              l'autre, pour qu'il rouvre le viseur tout seul à la reprise. C'est
              aussi l'état initial, donc le HTML pré-rendu de /declarer : ses
              deux boutons d'image marchent avant le JavaScript. */}
          {vue === 'capture' && (
            <CapturePiece
              etat={ecranCapture}
              onPhoto={(image) => envoyer({ type: 'PHOTO_PRISE', image })}
              onSaisieMain={() => envoyer({ type: 'SAISIR_MAIN' })}
              onSansPhoto={() => envoyer({ type: 'SANS_PHOTO' })}
              onContinuerSansPhoto={() => envoyer({ type: 'CONTINUER_SANS_PHOTO' })}
              onPreparer={preparerLecture}
              messages={parcours.etape === 'photo' && parcours.ecranPhoto === 'devant' && accents ? { aide: DOS_NOM_LU } : undefined}
              apercu={apercu}
              retour={retour}
            />
          )}

          {vue === 'raison' && (
            <section className="capture" aria-labelledby="raison-titre">
              <div className="capture-tete">
                {retour}
                <span className="cote">Déclarer une pièce trouvée</span>
              </div>
              <h2 id="raison-titre" tabIndex={-1} className="capture-titre">
                Pas de souci. Qu’est-ce qui bloque&nbsp;?
              </h2>
              <p className="aide capture-aide">
                Choisis ce qui te correspond, ensuite tu remplis à la main. Ça nous aide à rendre le site plus
                simple.
              </p>
              <div className="capture-actions" role="group" aria-labelledby="raison-titre">
                {RAISONS_PROPOSEES.map((raison) => (
                  <button
                    key={raison}
                    type="button"
                    className="btn btn-large"
                    style={CHOIX}
                    onClick={() => envoyer({ type: 'RAISON_CHOISIE', raison })}
                  >
                    {LIBELLES_RAISON[raison]}
                  </button>
                ))}
              </div>
              <p className="capture-sorties">
                <button type="button" className="lien" onClick={retourPhoto}>
                  Retour à la photo
                </button>
              </p>
            </section>
          )}

          {/* Le formulaire reste monté pendant les allers-retours vers la photo :
              le lieu garde sa commune localisée ou corrigée à la main, qui vit
              dans LieuField et se perdrait à un nouveau montage. */}
          <form className="panneau" onSubmit={soumettre} noValidate hidden={vue !== 'formulaire'}>
            {/* Gelé pendant la publication (attente de la lecture comprise) : ce
                qu'on modifierait ne partirait pas, et « Reprendre » lancerait une
                nouvelle photo pendant que l'ancienne part. */}
            <fieldset disabled={enCours} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div className="panneau-tete">
                <span className="label">La pièce</span>
                <span className="cote">Partie 1 / 2</span>
              </div>

              <h3 tabIndex={-1} className="capture-titre">
                {accents ? 'On a lu la pièce' : 'Écris ce qui est sur la pièce'}
              </h3>
              <p className="aide" style={{ marginTop: 6, marginBottom: 'var(--s-3)' }}>
                {accents
                  ? INVITE_VERIFIER
                  : photoVue
                    ? 'Écris le nom et les prénoms toi-même, ça va vite. Ta photo est gardée, elle sera floutée.'
                    : 'Écris le nom et les prénoms comme sur la pièce, ça va vite.'}
              </p>
              <p className="sr-only" role="status" aria-live="polite">
                {annonceFormulaire}
              </p>

              {enFond && (
                <p className="aide" style={{ marginTop: 0, marginBottom: 'var(--s-3)' }}>
                  {LECTURE_EN_FOND}
                </p>
              )}

              {/* Dos de carte reconnu formulaire ouvert, ou à la publication : la
                  photo n'est plus là, on demande le devant sans rien bloquer. */}
              {devant && (
                <div ref={blocDevant} tabIndex={-1} style={ENCADRE}>
                  <p style={{ fontWeight: 600 }}>Ça, c’était le dos de la carte.</p>
                  <p className="aide">
                    {accents ? 'On a lu le nom. ' : ''}Pour la photo publiée, prends le côté avec la photo
                    d’identité : c’est celui-là qu’on floute. L’image du dos reste sur ton téléphone.
                  </p>
                  <p
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 'var(--s-2) var(--s-4)',
                      marginTop: 'var(--s-3)',
                    }}
                  >
                    <button type="button" className="btn" onClick={retourPhoto}>
                      Prendre le devant en photo
                    </button>
                    <button type="button" className="lien" onClick={() => envoyer({ type: 'CONTINUER_SANS_PHOTO' })}>
                      Continuer sans photo
                    </button>
                  </p>
                </div>
              )}

              {/* Image que le navigateur ne sait pas ouvrir (HEIC d'une galerie…) :
                  la machine l'a lâchée sans un mot, on le dit. */}
              {etat.imageIllisible && !enFond && (
                <p className="erreur" style={{ marginTop: 0, marginBottom: 'var(--s-3)' }}>
                  Cette image ne s’ouvre pas chez nous.{' '}
                  <button type="button" className="lien" onClick={retourPhoto}>
                    Reprends la photo
                  </button>{' '}
                  ou choisis-en une autre.
                </p>
              )}

              {/* Photo qu'aucune lecture n'a pu vérifier au moment de publier : elle
                  n'est pas partie. Publier de nouveau retente la lecture ;
                  « Reprendre » est sur la ligne de la photo, juste en dessous. */}
              {nonVerifiee && !enFond && !devant && (
                <div style={ENCADRE}>
                  <p className="aide" style={{ marginTop: 0 }}>
                    {PHOTO_NON_VERIFIEE}
                  </p>
                  <p style={{ marginTop: 'var(--s-2)' }}>
                    <button
                      type="button"
                      className="lien"
                      onClick={() => photoVue && envoyer({ type: 'PHOTO_ECARTEE', image: photoVue, raison: 'appareil' })}
                    >
                      Continuer sans photo
                    </button>
                  </p>
                </div>
              )}

              {!enFond && !devant && (photoVue || !etat.imageIllisible) && (
                <div className="champ">
                  {photoVue ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--s-3)',
                        border: '1px solid var(--color-filet-2)',
                        padding: 'var(--s-2)',
                      }}
                    >
                      {apercu ? (
                        <VignettePhoto image={apercu} />
                      ) : (
                        // Photo gardée sans verdict de lecture : pas d'aperçu, la place reste.
                        <span className="capture-apercu" aria-hidden="true" style={{ width: 64, height: 44 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--t-fine)', fontWeight: 600 }}>Photo prise</div>
                        <div className="ligne-meta">Le floutage est appliqué à l’envoi.</div>
                      </div>
                      <button type="button" className="lien" onClick={retourPhoto}>
                        Reprendre
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={LIBELLE}>Photo de la pièce (facultatif)</span>
                      <button type="button" className="depot" style={{ display: 'block', width: '100%' }} onClick={retourPhoto}>
                        <b style={{ color: 'var(--color-encre)' }}>Mets une photo du recto</b>
                        <br />
                        Le numéro et les données sensibles seront floutés automatiquement. Personne ne pourra
                        rien y lire.
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Nom puis prénoms, dans l'ordre de la pièce : c'est ce qu'on relit
                  les yeux sur la carte. Un champ lu porte la marque « Lu sur la
                  photo » jusqu'à la première modification (origine `main`). */}
              <div className="duo">
                <div className={nomLu ? 'champ lu' : 'champ'}>
                  <label htmlFor="nom">Nom (qui est sur la pièce)</label>
                  {nomLu && (
                    <span className="lu-marque" id="nom-lu">
                      Lu sur la photo
                    </span>
                  )}
                  <input
                    id="nom"
                    value={nom}
                    autoComplete="off"
                    aria-invalid={erreurNom ? true : undefined}
                    aria-describedby={decrit(
                      nomLu && 'nom-lu',
                      etat.lus.nom && accents && 'invite-accents',
                      nomLu && decoupage && 'invite-decoupage',
                      !!erreurNom && 'nom-erreur',
                    )}
                    onChange={(e) => {
                      envoyer({ type: 'CHAMP_MODIFIE', champ: 'nom', valeur: e.target.value });
                      effacerErreur('nom');
                    }}
                    placeholder="N’Guessan"
                  />
                  {erreurNom && (
                    <p className="erreur" id="nom-erreur">
                      {erreurNom}
                    </p>
                  )}
                </div>
                <div className={prenomLu ? 'champ lu' : 'champ'}>
                  <label htmlFor="prenom">Prénoms (tous, comme sur la pièce)</label>
                  {prenomLu && (
                    <span className="lu-marque" id="prenom-lu">
                      Lu sur la photo
                    </span>
                  )}
                  <input
                    id="prenom"
                    value={prenom}
                    autoComplete="off"
                    aria-invalid={erreurPrenom ? true : undefined}
                    aria-describedby={decrit(
                      prenomLu && 'prenom-lu',
                      coupure && 'invite-coupure',
                      etat.lus.prenom && accents && 'invite-accents',
                      prenomLu && decoupage && 'invite-decoupage',
                      !!erreurPrenom && 'prenom-erreur',
                    )}
                    onChange={(e) => {
                      envoyer({ type: 'CHAMP_MODIFIE', champ: 'prenom', valeur: e.target.value });
                      effacerErreur('prenom');
                    }}
                    placeholder="Adjoua"
                  />
                  {/* Nom trop long pour la bande du bas : l'émetteur a pu couper
                      les prénoms, et le défi de propriété les compare en entier. */}
                  {coupure && (
                    <p className="aide" id="invite-coupure">
                      {INVITE_COUPURE}
                    </p>
                  )}
                  {erreurPrenom && (
                    <p className="erreur" id="prenom-erreur">
                      {erreurPrenom}
                    </p>
                  )}
                </div>
              </div>
              {(accents || decoupage) && (
                <div style={{ marginTop: 'calc(5px - var(--s-3))', marginBottom: 'var(--s-3)' }}>
                  {accents && (
                    <p className="aide" id="invite-accents" style={{ marginTop: 0 }}>
                      {INVITE_ACCENTS}
                    </p>
                  )}
                  {decoupage && (
                    <p className="aide" id="invite-decoupage" style={accents ? undefined : { marginTop: 0 }}>
                      {INVITE_DECOUPAGE}
                    </p>
                  )}
                </div>
              )}

              {/* Le type ne se demande que si la lecture ne l'a pas donné. Lu, il
                  s'affiche comme une valeur à relire, avec de quoi le changer. */}
              {questionType ? (
                <div className={typeLu ? 'champ lu' : 'champ'}>
                  <label htmlFor="type">Type de pièce</label>
                  {typeLu && (
                    <span className="lu-marque" id="type-lu">
                      Lu sur la photo
                    </span>
                  )}
                  <select
                    id="type"
                    ref={selectType}
                    value={typePiece}
                    aria-invalid={erreurType ? true : undefined}
                    aria-describedby={decrit(typeLu && 'type-lu', !!erreurType && 'type-erreur')}
                    onChange={(e) => {
                      envoyer({ type: 'TYPE_CHOISI', typePiece: e.target.value as TypePiece | '' });
                      effacerErreur('type');
                    }}
                  >
                    <option value="">— Choisir —</option>
                    {TYPES_PIECE.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  {erreurType && (
                    <p className="erreur" id="type-erreur">
                      {erreurType}
                    </p>
                  )}
                </div>
              ) : (
                <div className="champ lu">
                  <span style={LIBELLE} id="type-libelle">
                    Type de pièce
                  </span>
                  <span className="lu-marque" id="type-lu">
                    Lu sur la photo
                  </span>
                  <p style={VALEUR_LUE}>
                    <span id="type-valeur">{typePiece}</span>
                    <button
                      type="button"
                      className="lien"
                      aria-describedby="type-libelle type-valeur type-lu"
                      onClick={() => setTypeOuvert(true)}
                    >
                      Changer
                    </button>
                  </p>
                </div>
              )}

              <LieuField
                label="Où as-tu trouvé la pièce ?"
                aide="Le quartier, le carrefour, le marché — écris comme tu le dirais. C’est ce détail qui fait qu’on se reconnaît."
                lieu={quartier}
                setLieu={(valeur) => {
                  setQuartier(valeur);
                  effacerErreur('lieu');
                }}
                commune={commune}
                setCommune={setCommune}
                setCoords={setCoords}
                erreur={erreurs.lieu}
              />

              <div className="champ">
                <label htmlFor="depot">Où la pièce se trouve-t-elle maintenant&nbsp;?</label>
                <select
                  id="depot"
                  value={pointDepotId}
                  onChange={(e) => {
                    setPointDepotId(e.target.value);
                    if (e.target.value !== AUTRE_DEPOT) setDepotAutre('');
                  }}
                >
                  <option value="">Je la garde — à convenir avec le propriétaire</option>
                  {pointsDepot.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom} ({d.commune})
                    </option>
                  ))}
                  <option value={AUTRE_DEPOT}>Autre lieu — préciser</option>
                </select>
                {pointDepotId === AUTRE_DEPOT && (
                  <input
                    style={{ marginTop: 8 }}
                    value={depotAutre}
                    onChange={(e) => setDepotAutre(e.target.value)}
                    placeholder="Pharmacie du Carrefour, Cocody Angré 8e Tranche"
                    aria-label="Préciser le lieu de dépôt"
                  />
                )}
              </div>

              <div className="panneau-tete" style={{ marginTop: 'var(--s-5)' }}>
                <span className="label">Toi</span>
                <span className="cote">Partie 2 / 2</span>
              </div>

              <p className="aide" style={{ marginTop: 0, marginBottom: 'var(--s-3)' }}>
                Pour qu’on puisse te recontacter si on identifie le propriétaire. Ça ne sera jamais
                affiché publiquement.
              </p>

              <div className="duo">
                <div className="champ">
                  <label htmlFor="monPrenom">Ton prénom</label>
                  <input
                    id="monPrenom"
                    value={monPrenom}
                    aria-invalid={erreurs.monPrenom ? true : undefined}
                    aria-describedby={erreurs.monPrenom ? 'monPrenom-erreur' : undefined}
                    onChange={(e) => {
                      setMonPrenom(e.target.value);
                      effacerErreur('monPrenom');
                    }}
                    placeholder="Justine"
                  />
                  {erreurs.monPrenom && (
                    <p className="erreur" id="monPrenom-erreur">
                      {erreurs.monPrenom}
                    </p>
                  )}
                </div>
                <div className="champ">
                  <label htmlFor="monNom">Ton nom</label>
                  <input
                    id="monNom"
                    value={monNom}
                    aria-invalid={erreurs.monNom ? true : undefined}
                    aria-describedby={erreurs.monNom ? 'monNom-erreur' : undefined}
                    onChange={(e) => {
                      setMonNom(e.target.value);
                      effacerErreur('monNom');
                    }}
                    placeholder="Diby"
                  />
                  {erreurs.monNom && (
                    <p className="erreur" id="monNom-erreur">
                      {erreurs.monNom}
                    </p>
                  )}
                </div>
              </div>

              <div className="champ">
                <label htmlFor="monTel">Ton numéro de téléphone</label>
                <input
                  id="monTel"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={monTelephone}
                  aria-invalid={erreurs.monTel ? true : undefined}
                  aria-describedby={erreurs.monTel ? 'monTel-erreur' : undefined}
                  onChange={(e) => {
                    setMonTelephone(e.target.value);
                    effacerErreur('monTel');
                  }}
                  placeholder="07 00 00 00 00"
                />
                {erreurs.monTel && (
                  <p className="erreur" id="monTel-erreur">
                    {erreurs.monTel}
                  </p>
                )}
              </div>

              <button className="btn btn-plein btn-large" disabled={enCours}>
                {attenteLecture ? 'On finit de lire la photo…' : enCours ? 'Publication…' : 'Publier la déclaration'}
              </button>
            </fieldset>
          </form>

          {/* Version d'essai seulement, et avec ?diagnostic dans l'adresse. */}
          {__DIAGNOSTIC_LECTURE__ && <DiagnosticLecture />}
        </div>

        <aside>
          <div className="section-tete">
            <span className="cote">Ce qui est publié, ce qui ne l’est pas</span>
          </div>
          <dl className="lignes">
            {GARANTIES.map(({ cote, texte }) => (
              <div
                key={cote}
                className="ligne"
                style={{ gridTemplateColumns: '30px 1fr' }}
              >
                <dt className="cote" style={{ paddingTop: 3 }}>
                  {cote}
                </dt>
                <dd style={{ fontSize: 'var(--t-fine)', lineHeight: 'var(--lh-lead)' }}>{texte}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}

/**
 * Vignette de la photo retenue, dans le formulaire. Jamais une image en cours de
 * lecture ni un dos de carte : elle ne reçoit que `photoAffichable`. L'adresse
 * `blob:` est posée et révoquée dans un effet, hors de l'état React : elle ne
 * survit ni à un changement de photo ni au démontage.
 */
function VignettePhoto({ image }: { image: Blob }) {
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
  return <img ref={img} alt="Aperçu avant floutage" className="capture-apercu" style={{ width: 64, height: 44 }} />;
}
