import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { TypePiece } from '../../common/enums';
import { FindOrCreateUtilisateurDto } from '../../utilisateurs/dto/find-or-create-utilisateur.dto';

export class CreateAlertePerteDto {
  @ValidateNested()
  @Type(() => FindOrCreateUtilisateurDto)
  utilisateur: FindOrCreateUtilisateurDto;

  @IsEnum(TypePiece)
  typePiece: TypePiece;

  @IsString()
  @Length(1, 100)
  prenom: string;

  @IsString()
  @Length(1, 100)
  nom: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  commune?: string;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  quartier?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}
