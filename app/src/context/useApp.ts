import { createContext, useContext } from 'react';
import type { NouvellePieceTrouvee, PieceTrouveePublique, PointDepotApi } from '../lib/api';

/**
 * Le contexte et son crochet vivent ici, séparés du fournisseur.
 *
 * La séparation n'est pas décorative : le Fast Refresh de Vite ne remplace un
 * module à chaud, état préservé, que s'il n'exporte que des composants. Tant
 * que `useApp` cohabitait avec `AppProvider`, toute retouche du fournisseur
 * rechargeait la page entière — formulaire en cours compris.
 */

export interface AppContextValue {
  /** Pièces trouvées publiées (les plus récentes en premier). */
  piecesTrouvees: PieceTrouveePublique[];
  /** Points de dépôt sécurisés actifs. */
  pointsDepot: PointDepotApi[];
  /** `true` tant que le chargement initial depuis l'API est en cours. */
  chargement: boolean;
  /**
   * `true` si le dernier chargement du registre a échoué. La distinction avec
   * « registre vide » n'est pas cosmétique : une liste vide parce que personne
   * n'a déclaré et une liste vide parce que le réseau est tombé appellent deux
   * messages opposés — et confondre les deux fait passer le site pour mort.
   */
  erreurChargement: boolean;
  /** Relance le chargement du registre — l'issue de secours de l'état d'erreur. */
  recharger: () => void;
  /** Message à afficher dans le toast, ou `null` si aucun. */
  toast: string | null;
  /** Affiche un message dans le toast pendant quelques secondes. */
  afficherToast: (message: string) => void;
  /** Publie une nouvelle déclaration de pièce trouvée et rafraîchit la liste. */
  publier: (donnees: NouvellePieceTrouvee) => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être utilisé à l'intérieur de <AppProvider>");
  return ctx;
}
