import { Injectable } from '@nestjs/common';
import { PushService } from '../push/push.service';
import type { CanalNotification } from './canal.interface';

/**
 * Notifications push — navigateurs (Web Push/VAPID) et applications natives
 * (jetons Expo). Gratuit, donc toujours tenté en premier.
 *
 * Ne joint que les personnes qui ont explicitement accepté les notifications,
 * et jamais celles sur iPhone qui n'ont pas installé la PWA : c'est
 * précisément pour elles que le canal SMS existe.
 */
@Injectable()
export class CanalPush implements CanalNotification {
  readonly nom = 'push';
  readonly payant = false;

  constructor(private readonly push: PushService) {}

  estActif(): boolean {
    return true;
  }

  async envoyer(telephone: string, titre: string, corps: string): Promise<boolean> {
    return this.push.sendToTelephone(telephone, titre, corps);
  }
}