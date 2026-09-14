import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ThrottleVisiteurGuard } from '../scans-qr/throttle-visiteur.guard';
import { AlertesPerteService } from './alertes-perte.service';
import { CreateAlertePerteDto } from './dto/create-alerte-perte.dto';
import { FindAlertesPerteQueryDto } from './dto/find-alertes-perte-query.dto';

@Controller('alertes-perte')
export class AlertesPerteController {
  constructor(private readonly alertesPerte: AlertesPerteService) {}

  /**
   * Ne renvoie que l'identifiant.
   *
   * L'entité enregistrée porte le compte trouvé ou créé pour ce numéro — son
   * prénom, son nom, son e-mail. Or le numéro n'est vérifié par aucun code :
   * renvoyer l'entité, c'était donner l'identité de n'importe quel abonné à
   * qui tapait son numéro dans le formulaire.
   */
  /*
   * Cinq alertes par visiteur sur dix minutes. Une personne qui a perdu sa
   * pièce en crée une, parfois deux ; une boucle d'essais sur un nom public en
   * crée des centaines, et chacune notifiait le trouveur. Le visiteur est
   * compté par l'empreinte que pose le Worker, jamais par une adresse gardée.
   */
  @Post()
  @UseGuards(ThrottleVisiteurGuard)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  async create(@Body() dto: CreateAlertePerteDto): Promise<{ id: string }> {
    const { id } = await this.alertesPerte.create(dto);
    return { id };
  }

  @Get()
  findMine(@Query() query: FindAlertesPerteQueryDto) {
    return this.alertesPerte.findByTelephone(query.telephone);
  }
}
