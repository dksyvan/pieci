import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { LimiteVisiteur, LimiteVisiteurGuard } from '../common/limite-visiteur.guard';
import { CorrespondancesService } from './correspondances.service';
import { TelephoneDto } from '../common/dto/telephone.dto';
import { RepondreDefiDto } from './dto/repondre-defi.dto';

/*
 * Chaque route est bornée par visiteur (voir LimiteVisiteurGuard). Les
 * compteurs du défi (DefisService) restent la vraie limite des essais ; ceux-ci
 * freinent l'énumération des numéros et les rafales.
 */
@Controller('correspondances')
@UseGuards(LimiteVisiteurGuard)
export class CorrespondancesController {
  constructor(private readonly correspondances: CorrespondancesService) {}

  @Get()
  @LimiteVisiteur('correspondances-lecture', 60, 10 * 60_000)
  findMine(@Query() query: TelephoneDto) {
    return this.correspondances.findByTelephone(query.telephone);
  }

  @Post(':id/confirmer')
  @LimiteVisiteur('correspondances-confirmer', 20, 10 * 60_000)
  confirmer(@Param('id') id: string, @Body() dto: TelephoneDto) {
    return this.correspondances.confirmer(id, dto.telephone);
  }

  /** Défi des prénoms, avant que le demandeur puisse confirmer. */
  @Post(':id/defi')
  @LimiteVisiteur('correspondances-defi', 10, 10 * 60_000)
  repondreDefi(@Param('id') id: string, @Body() dto: RepondreDefiDto) {
    return this.correspondances.repondreDefi(id, dto.telephone, dto.prenoms);
  }

  @Post(':id/rejeter')
  @LimiteVisiteur('correspondances-rejeter', 20, 10 * 60_000)
  rejeter(@Param('id') id: string, @Body() dto: TelephoneDto) {
    return this.correspondances.rejeter(id, dto.telephone);
  }

  @Post(':id/contact')
  @LimiteVisiteur('correspondances-contact', 20, 10 * 60_000)
  obtenirContact(@Param('id') id: string, @Body() dto: TelephoneDto) {
    return this.correspondances.obtenirContact(id, dto.telephone);
  }
}
