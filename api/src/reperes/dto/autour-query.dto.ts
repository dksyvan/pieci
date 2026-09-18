import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude } from 'class-validator';

/**
 * La position autour de laquelle chercher des lieux nommés.
 *
 * `@Type(() => Number)` parce qu'une valeur de query arrive en chaîne et que
 * `IsLatitude` refuserait « 5.345 » écrit en texte. Le `ValidationPipe` global
 * est en `transform: true`, la conversion se fait donc avant la vérification.
 */
export class AutourQueryDto {
  @Type(() => Number)
  @IsLatitude({ message: 'Latitude invalide.' })
  lat: number;

  @Type(() => Number)
  @IsLongitude({ message: 'Longitude invalide.' })
  lng: number;
}
