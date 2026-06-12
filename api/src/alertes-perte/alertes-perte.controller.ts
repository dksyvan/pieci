import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AlertesPerteService } from './alertes-perte.service';
import { CreateAlertePerteDto } from './dto/create-alerte-perte.dto';
import { FindAlertesPerteQueryDto } from './dto/find-alertes-perte-query.dto';

@Controller('alertes-perte')
export class AlertesPerteController {
  constructor(private readonly alertesPerte: AlertesPerteService) {}

  @Post()
  create(@Body() dto: CreateAlertePerteDto) {
    return this.alertesPerte.create(dto);
  }

  @Get()
  findMine(@Query() query: FindAlertesPerteQueryDto) {
    return this.alertesPerte.findByTelephone(query.telephone);
  }
}
