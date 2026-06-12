import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointDepot } from './entities/point-depot.entity';
import { PointsDepotService } from './points-depot.service';
import { PointsDepotController } from './points-depot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PointDepot])],
  providers: [PointsDepotService],
  controllers: [PointsDepotController],
  exports: [PointsDepotService],
})
export class PointsDepotModule {}
