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
  const [erreurChargement, setErreurChargement] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const afficherToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3400);
  }, []);

  /**
   * L'échec ne passe pas par le toast : trois secondes de bandeau, puis un
   * état vide qui affirme « personne n'a rien déclaré » — c'était un mensonge
   * par omission. `erreurChargement` reste levé tant qu'un rechargement n'a
   * pas abouti, et les pages affichent la vérité : le réseau, pas le vide.
   */
  const charger = useCallback(async () => {
    try {
      const [pieces, depots] = await Promise.all([getPiecesTrouvees(), getPointsDepot()]);
      setPiecesTrouvees(pieces);
      setPointsDepot(depots);
      setErreurChargement(false);
    } catch {
      setErreurChargement(true);
    } finally {
      setChargement(false);
    }
  }, []);

  /** Relance à la demande — depuis un bouton, jamais depuis un effet. */
  const recharger = useCallback(() => {
    setChargement(true);
    setErreurChargement(false);
    void charger();
  }, [charger]);

  useEffect(() => {
    // `charger` n'écrit l'état qu'après la réponse réseau, jamais de façon
    // synchrone — la règle ne peut pas le vérifier à travers le useCallback,
    // et `chargement` vaut déjà `true` au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void charger();
  }, [charger]);

  const publier = useCallback(
    async (donnees: NouvellePieceTrouvee) => {
      const { id } = await creerPieceTrouvee(donnees);
      setPiecesTrouvees(await getPiecesTrouvees());
      afficherToast("✅ Déclaration publiée, Anitché ! Je vais brobro le propriétaire…");
      return id;
    },
    [afficherToast],
  );

  return (
    <AppContext.Provider
      value={{
        piecesTrouvees,
        pointsDepot,
        chargement,
        erreurChargement,
        recharger,
        toast,
        afficherToast,
        publier,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
