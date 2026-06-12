import { NiveauConfiance, StatutCorrespondance, TypePiece } from '../../common/enums';

/**
 * Vue d'une correspondance pour l'une des deux parties : aucune donnée de
 * contact (téléphone/email) tant que `statut !== 'confirmee'`, conformément
 * à CLAUDE.md section 2. Les champs `prenom`/`nom` ici sont l'identité
 * imprimée sur le document (déjà partiellement visible côté listing public),
 * pas l'identité du compte de l'autre utilisateur.
 */
export interface CorrespondanceResumeDto {
  id: string;
  score: number;
  niveauConfiance: NiveauConfiance;
  statut: StatutCorrespondance;
  dateCalcul: Date;
  pieceTrouvee: {
    id: string;
    typePiece: TypePiece;
    prenom: string;
    nom: string;
    commune: string;
    quartier: string | null;
    dateTrouvaille: Date;
    photoFlouteeUrl: string | null;
  };
  alertePerte: {
    id: string;
    typePiece: TypePiece;
    prenom: string;
    nom: string;
    commune: string | null;
    quartier: string | null;
  };
  /** true si l'utilisateur courant a déjà confirmé cette correspondance. */
  confirmeParMoi: boolean;
  /** true si l'autre partie a déjà confirmé cette correspondance. */
  confirmeParAutre: boolean;
}
