/**
 * Détection de plateforme, au service d'un seul message : expliquer à
 * l'utilisateur d'iPhone pourquoi les notifications ne s'activent pas, et quoi
 * faire.
 *
 * iOS n'expose l'API Push que dans une PWA installée sur l'écran d'accueil,
 * depuis iOS 16.4. Dans un onglet Safari ordinaire, `PushManager` n'existe
 * pas — ce n'est pas un défaut du site, c'est une décision d'Apple.
 */

/** iPhone ou iPad. Les iPad récents s'annoncent comme des Mac tactiles. */
export function estIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document)
  );
}

/**
 * Navigateur intégré à une application : Facebook, Instagram, LinkedIn,
 * Google, WeChat…
 *
 * C'est par là qu'arrive une bonne part des visiteurs — un lien touché dans un
 * groupe — et on ne peut rien y installer : ces navigateurs n'ont ni l'invite
 * de Chrome ni le « Sur l'écran d'accueil » de Safari. Sur iPhone, les
 * reconnaître compte doublement : leur user-agent contient « iPhone », si
 * bien que sans ce test on y montrait les étapes Safari, impossibles à suivre.
 *
 * Deux signes : un jeton d'application connu, ou, sur iOS, l'absence du jeton
 * « Safari/ » — Safari et Chrome iOS le portent tous deux, les vues web
 * intégrées non.
 */
export function estNavigateurIntegre(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/FBAN|FBAV|FBIOS|Instagram|LinkedInApp|Line[/]|MicroMessenger|GSA[/]/.test(ua)) return true;
  return estIOS() && !/Safari[/]/.test(ua);
}

/** La page tourne-t-elle en application installée, et non dans un onglet ? */
export function estInstallee(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Le navigateur sait-il recevoir des notifications push ? */
export function pushDisponible(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window
  );
}

export type RaisonIndisponible = 'ios-onglet' | 'navigateur';

/**
 * Pourquoi le push est indisponible, ou `null` s'il est disponible.
 * `ios-onglet` se corrige en installant l'app ; `navigateur` non.
 */
export function raisonPushIndisponible(): RaisonIndisponible | null {
  if (pushDisponible()) return null;
  return estIOS() && !estInstallee() ? 'ios-onglet' : 'navigateur';
}