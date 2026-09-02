import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ScansQrService } from './scans-qr.service';
import { CreateScanQrDto } from './dto/create-scan-qr.dto';
import { JetonStatsGuard } from './jeton-stats.guard';
import { ThrottleVisiteurGuard } from './throttle-visiteur.guard';

@Controller('scans-qr')
export class ScansQrController {
  constructor(private readonly scans: ScansQrService) {}

  /**
   * Enregistre un scan. Appelé par le Worker de bord, jamais par le site.
   *
   * Répond 204 : le Worker n'attend pas cette réponse — il redirige d'abord et
   * poste ensuite (voir `ctx.waitUntil` dans app/worker/index.js). Il n'y a
   * donc rien à lui rendre.
   *
   * Débit borné par visiteur (voir ThrottleVisiteurGuard) : soixante par
   * minute. Le seuil est très haut pour un geste humain — on ne scanne pas un
   * polo soixante fois par minute — et suffit à ce qu'un script ne remplisse
   * pas la table à la vitesse du réseau.
   */
  @Post()
  @HttpCode(204)
  @UseGuards(ThrottleVisiteurGuard)
  async enregistrer(@Body() dto: CreateScanQrDto): Promise<void> {
    await this.scans.enregistrer(dto);
  }

  /**
   * Comptes agrégés, réservés au porteur du jeton (voir JetonStatsGuard).
   *
   * Fermé parce que ces chiffres disent où en est le projet — combien de
   * scans, par quel support — et que rien n'oblige à les publier.
   */
  @Get('stats')
  @UseGuards(JetonStatsGuard)
  stats() {
    return this.scans.stats();
  }
}
