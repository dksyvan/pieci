import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { TypePiece } from '../../common/enums';
import { FindOrCreateUtilisateurDto } from '../../utilisateurs/dto/find-or-create-utilisateur.dto';

export class CreatePieceTrouveeDto {
  @ValidateNested()
  @Type(() => FindOrCreateUtilisateurDto)
  declarant: FindOrCreateUtilisateurDto;

  @IsEnum(TypePiece)
  typePiece: TypePiece;

  @IsString()
  @Length(1, 100)
  prenom: string;

  @IsString()
  @Length(1, 100)
  nom: string;

  @IsString()
  @Length(1, 100)
  commune: string;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  quartier?: string;

  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  @IsOptional()
  @IsUUID()
  pointDepotId?: string;

  /** Point de dépôt hors liste (texte libre), mutuellement exclusif avec `pointDepotId`. */
  @IsOptional()
  @IsString()
  @Length(1, 200)
  pointDepotAutre?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  photoOriginaleUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  photoFlouteeUrl?: string;
}
