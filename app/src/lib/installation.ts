import { useSyncExternalStore } from 'react';
import { estInstallee, estIOS, estNavigateurIntegre } from './plateforme';

/**
 * Installation de l'application depuis le navigateur.
 *
 * Aujourd'hui, installer Pièci dépend du menu du navigateur — trois tapotements
 * que personne ne connaît, et qui rendent une démonstration laborieuse. Un
 * bouton visible règle ça, là où c'est possible, et seulement là : un bouton
 * qui ne fait rien est pire que pas de bouton.
 */

/**
 * L'invite d'installation de Chrome, que les types DOM standard ne décrivent
 * pas : l'API n'est pas normalisée, Firefox et Safari ne l'implémentent pas.
 */
export interface InviteInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    /** Déposé par le script en tête de index.html — voir la note là-bas. */
    __PIECI_INSTALL__?: InviteInstallation | null;
  }
}

/**
 * - `inconnu` : pré-rendu et premier rendu client, avant que le navigateur ait
 *   été interrogé. Rien ne s'affiche, donc rien ne diverge à l'hydratation.
 * - `invite` : Chrome ou Edge ont proposé l'installation, un clic suffit.
 * - `ios` : iPhone ou iPad non installé. Aucun navigateur n'y expose d'API
 *   d'installation, pas même Chrome, qui tourne sur WebKit : on explique le
 *   geste à faire.
 * - `installee` : l'application tourne déjà depuis l'écran d'accueil.
 * - `indisponible` : navigateur sans invite (Firefox, Safari sur ordinateur),
 *   navigateur intégré à une application, ou invite déjà utilisée.
 */
export type ModeInstallation = 'inconnu' | 'invite' | 'ios' | 'installee' | 'indisponible';

export interface EtatNavigateur {
  installee: boolean;
  /** Navigateur intégré à une application (Facebook, Instagram…), où rien ne s'installe. */
  integre: boolean;
  ios: boolean;
  inviteDisponible: boolean;
}

/**
 * Décide ce que le bouton doit proposer. Fonction pure, à part pour être
 * éprouvée sans navigateur.
 *
 * L'ordre compte : une application déjà installée ne se réinstalle pas, même
 * si le navigateur propose encore l'invite ; un navigateur intégré ne peut
 * rien installer, quoi qu'il annonce ; et une invite disponible passe avant
 * les instructions iPhone, qui ne servent qu'à défaut.
 */
export function resoudreMode(etat: EtatNavigateur): ModeInstallation {
  if (etat.installee) return 'installee';
  if (etat.integre) return 'indisponible';
  if (etat.inviteDisponible) return 'invite';
  if (etat.ios) return 'ios';
  return 'indisponible';
}

function lireMode(): ModeInstallation {
  return resoudreMode({
    installee: estInstallee(),
    integre: estNavigateurIntegre(),
    ios: estIOS(),
    inviteDisponible: Boolean(window.__PIECI_INSTALL__),
  });
}

/** Tout ce qui peut changer le mode : invite reçue, installation, bascule d'affichage. */
function abonner(rappel: () => void): () => void {
  const autonome = window.matchMedia?.('(display-mode: standalone)');
  window.addEventListener('pieci:installable', rappel);
  window.addEventListener('pieci:installee', rappel);
  autonome?.addEventListener?.('change', rappel);

  return () => {
    window.removeEventListener('pieci:installable', rappel);
    window.removeEventListener('pieci:installee', rappel);
    autonome?.removeEventListener?.('change', rappel);
  };
}

/** Côté serveur, et pendant l'hydratation : on ne sait rien, on n'affiche rien. */
const modeServeur = (): ModeInstallation => 'inconnu';

/**
 * Mode d'installation courant, et le geste qui va avec.
 *
 * `useSyncExternalStore` plutôt qu'un état posé dans un effet : React rend
 * d'abord la valeur « serveur » pendant l'hydratation — identique au HTML
 * pré-rendu — puis relit le navigateur et rend à nouveau si elle diffère.
 * Aucun écart d'hydratation, et aucun `setState` synchrone dans un effet.
 */
export function useInstallation(): { mode: ModeInstallation; installer: () => Promise<void> } {
  const mode = useSyncExternalStore(abonner, lireMode, modeServeur);

  const installer = async () => {
    const invite = window.__PIECI_INSTALL__;
    if (!invite) return;

    try {
      await invite.prompt();
      await invite.userChoice;
    } catch {
      // Chrome rejette l'invite si elle a déjà servi, ou hors d'un geste de
      // l'utilisateur. Rien à signaler : on retombe dans le cas ordinaire.
    } finally {
      // L'invite ne sert qu'une fois, qu'elle ait abouti ou échoué. On
      // l'oublie dans tous les cas, et le bouton disparaît au lieu de rester
      // là sans rien faire.
      window.__PIECI_INSTALL__ = null;
      window.dispatchEvent(new Event('pieci:installable'));
    }
  };

  return { mode, installer };
}
