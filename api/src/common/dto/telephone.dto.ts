import { EstTelephone } from '../telephone';

/** Identifie l'auteur d'une requête par téléphone (modèle de compte sans inscription visible). */
export class TelephoneDto {
  @EstTelephone()
  telephone: string;
}
