import { TypeLieuDepot } from '../../common/enums';

export interface PointDepotDto {
  id: string;
  nom: string;
  typeLieu: TypeLieuDepot;
  commune: string;
  adresse: string | null;
  telephone: string | null;
  horaires: string | null;
  lat: number;
  lng: number;
}
