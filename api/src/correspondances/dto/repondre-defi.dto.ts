import { IsString, Length } from 'class-validator';
import { EstTelephone } from '../../common/telephone';
import { SansBalise } from '../../common/texte';

/** Réponse au défi des prénoms, par le demandeur d'une correspondance. */
export class RepondreDefiDto {
  @EstTelephone()
  telephone: string;

  @IsString({ message: 'Écris les prénoms inscrits sur la pièce.' })
  @Length(1, 200, { message: 'Écris les prénoms inscrits sur la pièce.' })
  @SansBalise()
  prenoms: string;
}
