import { IsString, Length } from 'class-validator';

export class FindAlertesPerteQueryDto {
  @IsString()
  @Length(8, 20)
  telephone: string;
}
