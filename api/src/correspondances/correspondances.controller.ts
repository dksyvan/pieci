import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CorrespondancesService } from './correspondances.service';
import { TelephoneDto } from '../common/dto/telephone.dto';

@Controller('correspondances')
export class CorrespondancesController {
  constructor(private readonly correspondances: CorrespondancesService) {}

  @Get()
  findMine(@Query() query: TelephoneDto) {
    return this.correspondances.findByTelephone(query.telephone);
  }

  @Post(':id/confirmer')
  confirmer(@Param('id') id: string, @Body() dto: TelephoneDto) {
    return this.correspondances.confirmer(id, dto.telephone);
  }

  @Post(':id/rejeter')
  rejeter(@Param('id') id: string, @Body() dto: TelephoneDto) {
    return this.correspondances.rejeter(id, dto.telephone);
  }

  @Post(':id/contact')
  obtenirContact(@Param('id') id: string, @Body() dto: TelephoneDto) {
    return this.correspondances.obtenirContact(id, dto.telephone);
  }
}
