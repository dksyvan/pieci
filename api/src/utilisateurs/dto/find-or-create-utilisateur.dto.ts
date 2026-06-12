import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class FindOrCreateUtilisateurDto {
  @IsString()
  @Length(8, 20)
  telephone: string;

  @IsString()
  @Length(1, 100)
  prenom: string;

  @IsString()
  @Length(1, 100)
  nom: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
