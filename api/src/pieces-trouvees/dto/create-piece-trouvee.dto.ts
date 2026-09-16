import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
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
import { SansBalise } from '../../common/texte';
import {
  MESSAGE_RAISON_PHOTO_ABSENTE,
  RAISONS_PHOTO_ABSENTE,
  RaisonPhotoAbsente,
} from '../raisons-photo';

export class CreatePieceTrouveeDto {
  @ValidateNested()
  @Type(() => FindOrCreateUtilisateurDto)
  declarant: FindOrCreateUtilisateurDto;

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

  @IsString()
  @Length(1, 100)
  @SansBalise()
  commune: string;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  @SansBalise()
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
  @SansBalise()
  pointDepotAutre?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  photoOriginaleUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  photoFlouteeUrl?: string;

  /**
   * Pourquoi la déclaration part sans photo (voir `raisons-photo.ts`).
   *
   * Facultative : la saisie en série et les clients antérieurs à cette version
   * ne l'envoient pas. Une valeur hors liste est refusée plutôt que rangée
   * ailleurs — c'est notre propre formulaire qui l'envoie, et une valeur
   * inconnue trahit un bug qu'il vaut mieux voir. Ignorée par le service dès
   * qu'une photo floutée accompagne la déclaration.
   */
  @IsOptional()
  @IsIn(RAISONS_PHOTO_ABSENTE, { message: MESSAGE_RAISON_PHOTO_ABSENTE })
  photoAbsenteRaison?: RaisonPhotoAbsente;
}
