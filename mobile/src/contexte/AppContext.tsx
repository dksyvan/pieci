import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiError,
  creerPieceTrouvee,
  getPiecesTrouvees,
  getPointsDepot,
  ReseauError,
  type NouvellePieceTrouvee,
  type PieceTrouveePublique,
  type PointDepotApi,
} from '../lib/api';

interface ValeurApp {
  piecesTrouvees: PieceTrouveePublique[];
  pointsDepot: PointDepotApi[];
  chargement: boolean;
  /** Message d'échec du dernier chargement, `null` si tout va bien. */
  panne: string | null;
  rafraichir: () => Promise<void>;
  publier: (donnees: NouvellePieceTrouvee) => Promise<void>;
  avis: string | null;
  afficherAvis: (message: string) => void;
}

const Contexte = createContext<ValeurApp | null>(null);

export function FournisseurApp({ children }: { children: ReactNode }) {
  const [piecesTrouvees, setPieces] = useState<PieceTrouveePublique[]>([]);
  const [pointsDepot, setDepots] = useState<PointDepotApi[]>([]);
  const [chargement, setChargement] = useState(true);
  const [panne, setPanne] = useState<string | null>(null);
  const [avis, setAvis] = useState<string | null>(null);

  const afficherAvis = useCallback((message: string) => {
    setAvis(message);
  }, []);

  useEffect(() => {
    if (!avis) return;
    const minuteur = setTimeout(() => setAvis(null), 4000);
    return () => clearTimeout(minuteur);
  }, [avis]);

  const rafraichir = useCallback(async () => {
    setChargement(true);
    setPanne(null);
    try {
      const [pieces, depots] = await Promise.all([getPiecesTrouvees(), getPointsDepot()]);
      setPieces(pieces);
      setDepots(depots);
    } catch (err) {
      setPanne(
        err instanceof ReseauError
          ? err.message
          : err instanceof ApiError
            ? err.message
            : 'Le registre est injoignable pour le moment.',
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  const publier = useCallback(
    async (donnees: NouvellePieceTrouvee) => {
      await creerPieceTrouvee(donnees);
      await rafraichir();
    },
    [rafraichir],
  );

  const valeur = useMemo<ValeurApp>(
    () => ({ piecesTrouvees, pointsDepot, chargement, panne, rafraichir, publier, avis, afficherAvis }),
    [piecesTrouvees, pointsDepot, chargement, panne, rafraichir, publier, avis, afficherAvis],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useApp(): ValeurApp {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error('useApp doit être appelé dans un FournisseurApp');
  return valeur;
}
