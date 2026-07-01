import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptions: Repository<PushSubscription>,
    private readonly config: ConfigService,
  ) {
    webpush.setVapidDetails(
      config.get<string>('VAPID_SUBJECT')!,
      config.get<string>('VAPID_PUBLIC_KEY')!,
      config.get<string>('VAPID_PRIVATE_KEY')!,
    );
  }

  vapidPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY')!;
  }

  async subscribe(telephone: string, endpoint: string, p256dh: string, auth: string): Promise<void> {
    const existing = await this.subscriptions.findOne({ where: { endpoint } });
    if (existing) {
      existing.telephone = telephone;
      existing.p256dh = p256dh;
      existing.auth = auth;
      await this.subscriptions.save(existing);
    } else {
      await this.subscriptions.save(
        this.subscriptions.create({ telephone, endpoint, p256dh, auth }),
      );
    }
  }

  async sendToTelephone(telephone: string, title: string, body: string): Promise<void> {
    const subs = await this.subscriptions.findBy({ telephone });
    await Promise.all(
      subs.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body }),
          )
          .catch(async (err: webpush.WebPushError) => {
            if (err.statusCode === 410) {
              await this.subscriptions.delete(sub.id);
            } else {
              this.logger.warn(`Push échoué pour ${telephone}: ${err.message}`);
            }
          }),
      ),
    );
  }
}
