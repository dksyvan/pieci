import type { LectureFusionnee } from '@partage/fusion-lecture';
import { lireMrz } from '@partage/mrz';
import { lireRecto } from '@partage/recto';
import type { Decoupage } from '@partage/recto';
import type { TypePiece } from '@partage/types';
import type { LecturePiece } from './index';
import type { Moteur, Passe, TexteLu } from './moteur';

/**
 * Mode diagnostic de la lecture — VERSION D'ESSAI SEULEMENT.
 *
 * Sert à comprendre, sur une vraie pièce et un vrai téléphone, pourquoi un
 * champ ne se remplit pas : on affiche, sous le formulaire, les lignes que
 * chaque passe a lues, sa durée, et ce que l'extracteur en a tiré.
 *
 * Présence dans le code livré : ce module n'est importé que derrière la
 * constante de build `__DIAGNOSTIC_LECTURE__` (vite.config.ts), qui ne vaut
 * `true` que si `VITE_DIAGNOSTIC_LECTURE=1` est dans l'environnement du build
 * (jamais lu dans un fichier .env), et ce build-là s'écrit dans `dist-essai.local/`,
 * pas dans le `dist/` que publie wrangler. Dans un build normal, la branche est
 * supprimée et ce fichier n'est pas empaqueté (vérifié par une recherche dans
 * dist/). Même dans la version d'essai, rien ne se passe sans `?diagnostic`
 * dans l'adresse de la page.
 *
 * Confidentialité, même en essai :
 *
 * - tout MOT qui contient un chiffre est remplacé en entier par des « • »
 *   avant que la ligne quitte ce module, et les lignes de la bande à chevrons
 *   le sont en entier (sauf les chevrons) : ni numéro, ni date ne s'affichent,
 *   même quand l'OCR a lu une partie des chiffres comme des lettres (O pour 0,
 *   I pour 1, S pour 5 : shared/mrz.ts sait les retraduire) ;
 * - le rapport va à un seul écouteur, le composant DiagnosticLecture, qui le
 *   garde dans son état React : rien vers le réseau, rien dans un stockage,
 *   rien dans l'état du parcours (machine.ts), aucune console. S'il n'y a pas
 *   d'écouteur, le rapport est jeté. Ce module ne garde que la fonction de
 *   l'écouteur et le rang de la dernière lecture, jamais de texte ;
 * - le texte brut n'est gardé que le temps de le masquer et de le passer aux
 *   lecteurs de shared/, comme dans moteur.ts.
 */

/** Ce que l'extracteur a tiré d'une passe : les champs du formulaire, rien d'autre. */
export interface ExtractionDiagnostic {
  readonly typePiece?: TypePiece;
  readonly nom?: string;
  readonly prenom?: string;
  readonly decoupage?: Decoupage;
}

export interface PasseDiagnostic {
  readonly etiquette: string;
  /** Lignes non vides, masquées (voir `masquerLigne`). */
  readonly lignes: readonly string[];
  readonly extraction: ExtractionDiagnostic | null;
  /** Durée de la passe, en millisecondes : un nombre, rien de lu. */
  readonly dureeMs: number;
  /** La passe n'a rendu aucun texte : annulée (plafond de la page, nouvelle photo) ou en panne. */
  readonly interrompue?: true;
  /** La passe n'a pas été lancée : elle risquait de faire dépasser le plafond de la page (moteur.ts, `BUDGET_LECTURE_MS`). */
  readonly sautee?: true;
}

export interface RapportDiagnostic {
  readonly passes: readonly PasseDiagnostic[];
  /**
   * Résultat final rendu au formulaire ; `null` si rien ; `'impossible'` si la
   * lecture a échoué ; `'annulee'` si elle a été coupée (plafond de durée de la
   * page) : les passes déjà faites sont montrées quand même.
   */
  readonly resultat: LectureFusionnee | null | 'impossible' | 'annulee';
  readonly estDosDeCarte: boolean;
  /** Durée totale de la lecture, en millisecondes. */
  readonly dureeMs: number;
}

/** Bornes d'affichage : une lecture de pièce tient très en dessous. */
const LIGNES_MAX = 120;
const CARACTERES_PAR_LIGNE = 200;
const PASSES_MAX = 20;

let ecouteur: ((rapport: RapportDiagnostic) => void) | null = null;
/** Rang de la dernière lecture lancée : une lecture remplacée par une nouvelle photo ne rapporte rien. */
let derniereLecture = 0;

/** Le composant s'abonne au montage ; la fonction rendue le désabonne. */
export function ecouterDiagnostic(fonction: (rapport: RapportDiagnostic) => void): () => void {
  ecouteur = fonction;
  return () => {
    if (ecouteur === fonction) ecouteur = null;
  };
}

/** `?diagnostic` dans l'adresse de la page. */
export function diagnosticDemande(): boolean {
  try {
    return typeof location !== 'undefined' && new URLSearchParams(location.search).has('diagnostic');
  } catch {
    return false;
  }
}

/** Trois groupes de lettres qui imitent des chiffres, séparés par « / », « . » ou « - » : une date lue en lettres. */
const DATE_EN_LETTRES = /^[OoQDIl|SZGB]{1,4}(?:[./-][OoQDIl|SZGB]{1,4}){2}$/;

/**
 * Remplace EN ENTIER, par autant de « • », tout mot qui contient un chiffre (de
 * n'importe quelle écriture, exposants compris) : « O1/O7/199O » ne laisse plus
 * voir ses O, que l'OCR a lus pour des 0. De même pour une date lue tout en
 * lettres (« OI/OI/IOOO »). Relevé en revue : masquer chiffre par chiffre
 * laissait lisibles les lettres de confusion, que shared/mrz.ts retraduit.
 */
export function masquerChiffres(texte: string): string {
  return texte.replace(/\S+/gu, (mot) => (/\p{N}/u.test(mot) || DATE_EN_LETTRES.test(mot) ? '•'.repeat([...mot].length) : mot));
}

/**
 * Une ligne de bande à chevrons reconnue à sa forme : au moins 15 caractères
 * (espaces retirés), presque tous de l'alphabet de la bande, et un chevron.
 * Elle porte numéro, dates et nom, et ses chiffres lus en lettres se
 * retraduisent : tout y est masqué, sauf les chevrons.
 */
function ligneDeBande(ligne: string): boolean {
  const s = ligne.replace(/\s/g, '').toUpperCase().replace(/[«‹]/g, '<');
  return s.length >= 15 && s.includes('<') && (s.match(/[A-Z0-9<]/g)?.length ?? 0) / s.length >= 0.9;
}

/** Ligne masquée pour l'affichage. `bande` : lue par la passe « mrz », masquée en entier (sauf chevrons). */
export function masquerLigne(ligne: string, bande = false): string {
  if (bande || ligneDeBande(ligne)) return ligne.replace(/[^<«‹\s]/gu, '•');
  return masquerChiffres(ligne);
}

/** Lignes non vides, masquées et bornées. */
export function lignesMasquees(texte: string, bande = false): string[] {
  if (typeof texte !== 'string') return [];
  const lignes: string[] = [];
  for (const brute of texte.split(/\r?\n/)) {
    const ligne = brute.trim();
    if (!ligne) continue;
    lignes.push(masquerLigne(ligne.slice(0, CARACTERES_PAR_LIGNE), bande));
    if (lignes.length >= LIGNES_MAX) break;
  }
  return lignes;
}

/** Champs autorisés seulement, recopiés un à un ; rien qui contienne un chiffre. */
export function extraction(lecture: unknown): ExtractionDiagnostic | null {
  if (!lecture || typeof lecture !== 'object') return null;
  const l = lecture as Record<string, unknown>;
  const texte = (v: unknown) => (typeof v === 'string' && v.trim() && !/\p{N}/u.test(v) ? v.trim() : undefined);
  const sortie: { -readonly [K in keyof ExtractionDiagnostic]: ExtractionDiagnostic[K] } = {};
  if (typeof l.typePiece === 'string') sortie.typePiece = l.typePiece as TypePiece;
  const nom = texte(l.nom);
  const prenom = texte(l.prenom);
  if (nom) sortie.nom = nom;
  if (prenom) sortie.prenom = prenom;
  if ((nom || prenom) && typeof l.decoupage === 'string') sortie.decoupage = l.decoupage as Decoupage;
  return sortie.typePiece || sortie.nom || sortie.prenom ? sortie : null;
}

type ModuleMoteur = typeof import('./moteur');

/** Nom lisible d'une passe, d'après son réglage et son rang parmi les passes du même réglage. */
function etiquette(module: ModuleMoteur, passe: Passe, rang: number): string {
  const { PASSES } = module;
  const suite = rang > 1 ? ` — contre-vérification ${rang - 1}` : '';
  if (passe === PASSES.recto) return rang > 1 ? 'Image retournée (psm 3)' : 'Recto, découpage automatique (psm 3)';
  if (passe === PASSES.epars) return 'Recto, texte épars (psm 11)';
  if (passe === PASSES.enTeteInverse) return 'En-tête : haut de l’image agrandi, contrasté, inversé (psm 3)';
  if (passe === PASSES.enTete) return 'En-tête : haut de l’image agrandi, contrasté (psm 3)';
  if (passe === PASSES.sousTitre) return 'Sous le titre de la pièce (psm 3)';
  if (passe === PASSES.bande) return `Bande à chevrons (modèle mrz)${suite}`;
  return `Passe ${passe.modele} psm ${passe.psm}`;
}

const maintenant = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Enveloppe le moteur : chaque texte lu est masqué et noté avec la durée de la
 * passe, puis rendu tel quel à la lecture. Une passe qui échoue (annulée, en
 * panne) est notée « interrompue », avec sa durée et sans rien de lu.
 */
function moteurNotant(module: ModuleMoteur, moteur: Moteur, passes: PasseDiagnostic[]): Moteur {
  const rangs = new Map<Passe, number>();
  return {
    async lire(image, passe, signal) {
      const rang = (rangs.get(passe) ?? 0) + 1;
      rangs.set(passe, rang);
      const debut = maintenant();
      let lu: TexteLu;
      try {
        lu = await moteur.lire(image, passe, signal);
      } catch (erreur) {
        if (passes.length < PASSES_MAX) {
          const dureeMs = Math.round(maintenant() - debut);
          passes.push({ etiquette: etiquette(module, passe, rang), lignes: [], extraction: null, dureeMs, interrompue: true });
        }
        throw erreur;
      }
      if (passes.length < PASSES_MAX) {
        const dureeMs = Math.round(maintenant() - debut);
        const bande = passe.modele === 'mrz';
        const lecture = bande ? lireMrz(lu.texte.split(/\r?\n/, 300)) : lireRecto(lu.texte);
        passes.push({
          etiquette: etiquette(module, passe, rang),
          lignes: lignesMasquees(lu.texte, bande),
          extraction: extraction(lecture),
          dureeMs,
        });
      }
      return lu;
    },
    arreter() {
      moteur.arreter();
    },
  };
}

/**
 * La lecture de `executerLecture`, à l'identique, avec un moteur qui note ce
 * qu'il lit. Le rapport part à l'écouteur à la fin : succès, échec, ou
 * annulation. Une lecture coupée par le plafond de durée de la page
 * (Declarer.tsx) est justement celle qu'il faut comprendre sur un téléphone
 * lent : son rapport partiel (`'annulee'`) part avec les passes déjà faites et
 * leurs durées. Rien ne part si une nouvelle lecture a commencé depuis (photo
 * remplacée) ou si l'écouteur a changé.
 */
export async function lireAvecDiagnostic(module: ModuleMoteur, fichier: Blob, signal?: AbortSignal): Promise<LecturePiece> {
  const rang = ++derniereLecture;
  const destinataire = ecouteur;
  const debut = maintenant();
  const passes: PasseDiagnostic[] = [];
  const dependances = {
    preparer: module.DEPENDANCES.preparer,
    moteur: async (s: AbortSignal) => moteurNotant(module, await module.DEPENDANCES.moteur(s), passes),
    // Passe sautée faute de temps : notée à sa place, sans durée ni rien de lu.
    passeSautee: (passe: Passe) => {
      if (passes.length < PASSES_MAX) passes.push({ etiquette: etiquette(module, passe, 1), lignes: [], extraction: null, dureeMs: 0, sautee: true });
    },
  };
  const envoyer = (resultat: RapportDiagnostic['resultat'], estDosDeCarte: boolean) => {
    if (rang !== derniereLecture || ecouteur !== destinataire) return;
    // Copie : une passe annulée peut encore se terminer (et se noter) après l'envoi.
    ecouteur?.({ passes: [...passes], resultat, estDosDeCarte, dureeMs: Math.round(maintenant() - debut) });
  };
  try {
    const lecture = await module.executerLecture(fichier, signal, dependances);
    envoyer(lecture.resultat, lecture.estDosDeCarte);
    return lecture;
  } catch (erreur) {
    envoyer(signal?.aborted ? 'annulee' : 'impossible', false);
    throw erreur;
  }
}
