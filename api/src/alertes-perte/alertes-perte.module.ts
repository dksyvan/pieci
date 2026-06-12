import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertePerte } from './entities/alerte-perte.entity';
import { AlertesPerteService } from './alertes-perte.service';
import { AlertesPerteController } from './alertes-perte.controller';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [TypeOrmModule.forFeature([AlertePerte]), UtilisateursModule, MatchingModule],
  providers: [AlertesPerteService],
  controllers: [AlertesPerteController],
  exports: [AlertesPerteService],
})
export class AlertesPerteModule {}
