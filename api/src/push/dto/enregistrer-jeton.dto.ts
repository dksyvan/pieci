import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { EstTelephone } from '../../common/telephone';

/** Corps de `POST /push/expo` — abonnement d'une application native. */
export class EnregistrerJetonDto {
  @EstTelephone()
  telephone: string;

  /**
   * Expo délivre deux formes selon le SDK. On les accepte toutes les deux et
   * on rejette le reste : un jeton mal formé serait refusé par l'API d'Expo
   * de toute façon, autant ne pas le stocker.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/, {
    message: 'jeton doit être de la forme ExponentPushToken[…]',
  })
  jeton: string;
}
