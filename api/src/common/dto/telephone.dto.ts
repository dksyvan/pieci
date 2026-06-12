import { IsString, Length } from 'class-validator';

/** Identifie l'auteur d'une requête par téléphone (modèle de compte sans inscription visible). */
export class TelephoneDto {
  @IsString()
  @Length(8, 20)
  telephone: string;
}
