import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  creerPieceTrouvee,
  getPiecesTrouvees,
  getPointsDepot,
  type NouvellePieceTrouvee,
  type PieceTrouveePublique,
  type PointDepotApi,
} from '../lib/api';
import { AppContext } from './useApp';

/**
 * Seul export de ce fichier : un composant. Le contexte et le crochet `useApp`
 * vivent dans ./useApp.ts — voir le commentaire là-bas pour la raison.
 */
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
