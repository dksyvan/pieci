import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PieceTrouvee } from '../pieces-trouvees/entities/piece-trouvee.entity';
import { AlertePerte } from '../alertes-perte/entities/alerte-perte.entity';
import { ExpirationService } from './expiration.service';

@Module({
  imports: [TypeOrmModule.forFeature([PieceTrouvee, AlertePerte])],
  providers: [ExpirationService],
})
export class ExpirationModule {}
