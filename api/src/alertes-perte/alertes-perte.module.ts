import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertePerte } from './entities/alerte-perte.entity';
import { AlertesPerteService } from './alertes-perte.service';
import { AlertesPerteController } from './alertes-perte.controller';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { MatchingModule } from '../matching/matching.module';
import { ThrottleVisiteurGuard } from '../scans-qr/throttle-visiteur.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AlertePerte]), UtilisateursModule, MatchingModule],
  // ThrottlerModule est global (déclaré dans ScansQrModule) : le garde en
  // reprend le stockage, la limite est posée sur la route.
  providers: [AlertesPerteService, ThrottleVisiteurGuard],
  controllers: [AlertesPerteController],
  exports: [AlertesPerteService],
})
export class AlertesPerteModule {}
