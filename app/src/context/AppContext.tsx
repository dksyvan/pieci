import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  creerPieceTrouvee,
  getPiecesTrouvees,
  getPointsDepot,
  type NouvellePieceTrouvee,
  type PieceTrouveePublique,
  type PointDepotApi,
} from '../lib/api';

interface AppContextValue {
  /** Pièces trouvées publiées (les plus récentes en premier). */
  piecesTrouvees: PieceTrouveePublique[];
  /** Points de dépôt sécurisés actifs. */
  pointsDepot: PointDepotApi[];
  /** `true` tant que le chargement initial depuis l'API est en cours. */
  chargement: boolean;
  /** Message à afficher dans le toast, ou `null` si aucun. */
  toast: string | null;
  /** Affiche un message dans le toast pendant quelques secondes. */
  afficherToast: (message: string) => void;
  /** Publie une nouvelle déclaration de pièce trouvée et rafraîchit la liste. */
  publier: (donnees: NouvellePieceTrouvee) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [piecesTrouvees, setPiecesTrouvees] = useState<PieceTrouveePublique[]>([]);
  const [pointsDepot, setPointsDepot] = useState<PointDepotApi[]>([]);
  const [chargement, setChargement] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const afficherToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3400);
  }, []);

  useEffect(() => {
    Promise.all([getPiecesTrouvees(), getPointsDepot()])
      .then(([pieces, depots]) => {
        setPiecesTrouvees(pieces);
        setPointsDepot(depots);
      })
      .catch(() => afficherToast('⚠️ Impossible de joindre le serveur Pièci. Réessaie plus tard.'))
      .finally(() => setChargement(false));
  }, [afficherToast]);

  const publier = useCallback(
    async (donnees: NouvellePieceTrouvee) => {
      await creerPieceTrouvee(donnees);
      setPiecesTrouvees(await getPiecesTrouvees());
      afficherToast("✅ Déclaration publiée, Anitché ! Je vais brobro le propriétaire…");
    },
    [afficherToast],
  );

  return (
    <AppContext.Provider value={{ piecesTrouvees, pointsDepot, chargement, toast, afficherToast, publier }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé à l\'intérieur de <AppProvider>');
  return ctx;
}
