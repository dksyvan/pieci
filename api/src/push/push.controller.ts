import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { SubscribeDto } from './dto/subscribe.dto';
import { EnregistrerJetonDto } from './dto/enregistrer-jeton.dto';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('vapid-public-key')
  vapidPublicKey() {
    return { key: this.push.vapidPublicKey() };
  }

  /** Abonnement d'un navigateur (Web Push / VAPID). */
  @Post('subscribe')
  @HttpCode(204)
  async subscribe(@Body() dto: SubscribeDto): Promise<void> {
    await this.push.subscribe(dto.telephone, dto.endpoint, dto.keys.p256dh, dto.keys.auth);
  }

  /** Abonnement d'une application native (jeton Expo). */
  @Post('expo')
  @HttpCode(204)
  async enregistrerJeton(@Body() dto: EnregistrerJetonDto): Promise<void> {
    await this.push.enregistrerJeton(dto.telephone, dto.jeton);
  }
}
