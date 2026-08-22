import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { CanalPush } from './canal-push';
import { CanalSms } from './canal-sms';
import { MessagerieService } from './messagerie.service';

/**
 * Acheminement des notifications. Ajouter un canal — WhatsApp Business API,
 * courriel — consiste à implémenter `CanalNotification` et à le déclarer ici
 * puis dans le constructeur de `MessagerieService`. Rien d'autre ne bouge.
 */
@Module({
  imports: [PushModule],
  providers: [CanalPush, CanalSms, MessagerieService],
  exports: [MessagerieService],
})
export class MessagerieModule {}