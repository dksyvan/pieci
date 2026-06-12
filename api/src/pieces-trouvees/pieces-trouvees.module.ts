import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PieceTrouvee } from './entities/piece-trouvee.entity';
import { PiecesTrouveesService } from './pieces-trouvees.service';
import { PiecesTrouveesController } from './pieces-trouvees.controller';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [TypeOrmModule.forFeature([PieceTrouvee]), UtilisateursModule, MatchingModule],
  providers: [PiecesTrouveesService],
  controllers: [PiecesTrouveesController],
  exports: [PiecesTrouveesService],
})
export class PiecesTrouveesModule {}
