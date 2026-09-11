import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { EstTelephone } from '../../common/telephone';
import { SansBalise } from '../../common/texte';

export class FindOrCreateUtilisateurDto {
  @EstTelephone()
  telephone: string;

  @IsString({ message: 'Le prénom est obligatoire.' })
  @Length(1, 100, { message: 'Le prénom fait 100 caractères au maximum.' })
  @SansBalise()
  prenom: string;

  @IsString({ message: 'Le nom est obligatoire.' })
  @Length(1, 100, { message: 'Le nom fait 100 caractères au maximum.' })
  @SansBalise()
  nom: string;

  @IsOptional()
  @IsEmail({}, { message: "L'adresse e-mail n'est pas valide." })
  email?: string;
}
