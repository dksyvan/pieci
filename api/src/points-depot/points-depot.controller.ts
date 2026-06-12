import { Controller, Get } from '@nestjs/common';
import { PointsDepotService } from './points-depot.service';

@Controller('points-depot')
export class PointsDepotController {
  constructor(private readonly pointsDepot: PointsDepotService) {}

  @Get()
  findAll() {
    return this.pointsDepot.findActifs();
  }
}
