import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';

class PushKeysDto {
  @IsString() @IsNotEmpty() p256dh: string;
  @IsString() @IsNotEmpty() auth: string;
}

export class SubscribeDto {
  @IsString() @IsNotEmpty() telephone: string;
  @IsString() @IsNotEmpty() endpoint: string;
  @IsObject() @ValidateNested() @Type(() => PushKeysDto) keys: PushKeysDto;
}
