import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LimiteVisiteur, LimiteVisiteurGuard } from '../common/limite-visiteur.guard';
import { AutourQueryDto } from './dto/autour-query.dto';
import { ReperesService } from './reperes.service';
import type { ReperesAutour } from './photon';

@Controller('reperes')
export class ReperesController {
  constructor(private readonly reperes: ReperesService) {}

  /**
   * Les lieux nommés autour d'une position, pour le bouton « Je suis sur place ».
   *
   * Cette route sort du site : elle interroge un service de cartographie tenu
   * par d'autres. D'où la limite — soixante appels par visiteur sur dix
   * minutes. C'est large pour quelqu'un qui déclare une pièce (il appuie une
   * fois, deux s'il se déplace), et étroit pour une boucle qui voudrait se
   * servir de nous comme d'un relais gratuit vers Photon.
   *
   * Rien n'est renvoyé qui ne soit déjà public sur une carte, et la position
   * demandée n'est ni journalisée ni conservée : voir `ReperesService`.
   */
  @Get()
  @UseGuards(LimiteVisiteurGuard)
  @LimiteVisiteur('reperes', 60, 10 * 60_000)
  autour(@Query() query: AutourQueryDto): Promise<ReperesAutour> {
    return this.reperes.autour(query.lat, query.lng);
  }
}
