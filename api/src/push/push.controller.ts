import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { SubscribeDto } from './dto/subscribe.dto';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('vapid-public-key')
  vapidPublicKey() {
    return { key: this.push.vapidPublicKey() };
  }

  @Post('subscribe')
  @HttpCode(204)
  async subscribe(@Body() dto: SubscribeDto): Promise<void> {
    await this.push.subscribe(dto.telephone, dto.endpoint, dto.keys.p256dh, dto.keys.auth);
  }
}
