import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScanQr } from './entities/scan-qr.entity';
import { ScansQrController } from './scans-qr.controller';
import { ScansQrService } from './scans-qr.service';
import { JetonStatsGuard } from './jeton-stats.guard';
import { ThrottleVisiteurGuard } from './throttle-visiteur.guard';

/**
 * Suivi des QR codes imprimés.
 *
 * Le limiteur est déclaré ici et non globalement : c'est le seul endpoint
 * public qu'un script aurait intérêt à marteler, et brider tout le reste de
 * l'API par la même occasion casserait la saisie en série, qui envoie
 * légitimement trente déclarations à la suite.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ScanQr]),
    ThrottlerModule.forRoot([{ name: 'default', limit: 60, ttl: 60_000 }]),
  ],
  controllers: [ScansQrController],
  providers: [ScansQrService, JetonStatsGuard, ThrottleVisiteurGuard],
})
export class ScansQrModule {}
