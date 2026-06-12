import { TypePiece } from '../../common/enums';

/**
 * Forme exacte des lignes de `v_pieces_trouvees_publiques` (cf. migration
 * InitSchema) : aucune donnée d'identification complète ni de contact, voir
 * CLAUDE.md section 2.
 */
export interface PieceTrouveePubliqueDto {
  id: string;
  type_piece: TypePiece;
  prenom: string;
  nom_initiale: string;
  commune: string;
  quartier: string | null;
  date_trouvaille: Date;
  photo_floutee_url: string | null;
  depot_nom: string | null;
  lat: number;
  lng: number;
}
