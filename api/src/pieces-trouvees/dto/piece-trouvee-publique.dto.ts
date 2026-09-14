import { TypePiece } from '../../common/enums';

/**
 * Forme exacte des lignes de `v_pieces_trouvees_publiques` (cf. migration
 * InitSchema) : aucune donnée d'identification complète ni de contact, voir
 * CLAUDE.md section 2.
 */
export interface PieceTrouveePubliqueDto {
  id: string;
  type_piece: TypePiece;
  /** Nom de famille en capitales. */
  nom: string;
  /** Initiales du prénom avec leur point (« A. », « S-Y. »), ou null. Jamais le prénom entier. */
  prenom_initiales: string | null;
  commune: string;
  quartier: string | null;
  date_trouvaille: Date;
  photo_floutee_url: string | null;
  depot_nom: string | null;
  lat: number;
  lng: number;
}
