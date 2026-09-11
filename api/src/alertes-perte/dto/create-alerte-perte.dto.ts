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
import { SansBalise } from '../../common/texte';

export class CreateAlertePerteDto {
  @ValidateNested()
  @Type(() => FindOrCreateUtilisateurDto)
  utilisateur: FindOrCreateUtilisateurDto;

  @IsEnum(TypePiece)
  typePiece: TypePiece;

  @IsString()
  @Length(1, 100)
  @SansBalise()
  prenom: string;

  @IsString()
  @Length(1, 100)
  @SansBalise()
  nom: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @SansBalise()
  commune?: string;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  @SansBalise()
  quartier?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}
