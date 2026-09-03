import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

/**
 * Corps de `POST /scans-qr`, envoyé par le Worker de bord.
 *
 * Tout est facultatif, y compris la source : ce qui compte est qu'un scan
 * s'enregistre, pas qu'il soit complet. Un QR imprimé sur un vêtement ne se
 * corrige pas — mieux vaut une ligne imparfaite qu'une ligne perdue.
 *
 * Les valeurs ne sont pas dignes de confiance pour autant. L'endpoint est
 * public, donc n'importe qui peut poster ici : la source est ramenée à une
 * liste fermée par le service, et les longueurs sont bornées pour qu'un corps
 * gonflé ne remplisse pas la table.
 *
 * Aucun champ d'adresse : le Worker n'en transmet pas, et l'API n'en
 * accepterait pas — `whitelist: true` écarte tout champ non déclaré ici.
 */
export class CreateScanQrDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  pays?: string;
}
