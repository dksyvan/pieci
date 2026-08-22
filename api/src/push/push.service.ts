import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { ExpoPushToken } from './entities/expo-push-token.entity';

/** Point d'entrée du service de notifications d'Expo. */
const EXPO_ENVOI = 'https://exp.host/--/api/v2/push/send';

/** Expo accepte 100 messages par requête. */
const LOT_EXPO = 100;

/** Réponse d'Expo, réduite à ce qu'on exploite. */
interface RecuExpo {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly webActif: boolean;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptions: Repository<PushSubscription>,
    @InjectRepository(ExpoPushToken)
    private readonly jetons: Repository<ExpoPushToken>,
    private readonly config: ConfigService,
  ) {
    const subject = config.get<string>('VAPID_SUBJECT');
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY');

    if (subject && publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.webActif = true;
    } else {
      this.logger.warn('VAPID keys not configured — Web Push désactivé');
      this.webActif = false;
    }
  }

  vapidPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? '';
  }

  /* ------------------------------------------------------------- Web Push */

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

  /* ----------------------------------------------------------- Push natif */

  /**
   * Enregistre un jeton Expo. Le même appareil peut changer de propriétaire
   * (téléphone prêté, numéro différent) : on réattribue plutôt que de créer
   * un doublon, la contrainte d'unicité porte sur le jeton.
   */
  async enregistrerJeton(telephone: string, jeton: string): Promise<void> {
    const existant = await this.jetons.findOne({ where: { jeton } });
    if (existant) {
      if (existant.telephone === telephone) return;
      existant.telephone = telephone;
      await this.jetons.save(existant);
      return;
    }
    await this.jetons.save(this.jetons.create({ telephone, jeton }));
  }

  /* ------------------------------------------------------------- Diffusion */

  /**
   * Notifie un numéro sur tous ses appareils, web et natifs confondus.
   * Un échec de notification n'interrompt jamais l'appelant : la
   * correspondance reste visible dans l'onglet Suivi.
   *
   * @returns `true` si au moins un appareil a été atteint. C'est ce qui permet
   * de n'engager un canal payant — le SMS — que pour les personnes qu'aucune
   * notification gratuite n'a pu joindre.
   */
  async sendToTelephone(telephone: string, title: string, body: string): Promise<boolean> {
    const [web, expo] = await Promise.all([
      this.envoyerWeb(telephone, title, body),
      this.envoyerExpo(telephone, title, body),
    ]);
    return web + expo > 0;
  }

  /** @returns le nombre d'abonnements navigateur effectivement notifiés. */
  private async envoyerWeb(telephone: string, title: string, body: string): Promise<number> {
    if (!this.webActif) return 0;

    const subs = await this.subscriptions.findBy({ telephone });
    const resultats = await Promise.all(
      subs.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body }),
          )
          .then(() => true)
          .catch(async (err: webpush.WebPushError) => {
            // 410 Gone : l'abonnement navigateur n'existe plus.
            if (err.statusCode === 410) {
              await this.subscriptions.delete(sub.id);
            } else {
              this.logger.warn(`Web Push échoué pour ${telephone}: ${err.message}`);
            }
            return false;
          }),
      ),
    );
    return resultats.filter(Boolean).length;
  }

  /** @returns le nombre de messages qu'Expo a acceptés. */
  private async envoyerExpo(telephone: string, title: string, body: string): Promise<number> {
    const jetons = await this.jetons.findBy({ telephone });
    if (jetons.length === 0) return 0;

    let acceptes = 0;

    for (let i = 0; i < jetons.length; i += LOT_EXPO) {
      const lot = jetons.slice(i, i + LOT_EXPO);

      let recus: RecuExpo[];
      try {
        const reponse = await fetch(EXPO_ENVOI, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(
            lot.map((j) => ({
              to: j.jeton,
              title,
              body,
              sound: 'default',
              channelId: 'correspondances',
              // Exploité par l'app pour ouvrir directement l'onglet Suivi.
              data: { route: '/suivi' },
            })),
          ),
        });

        if (!reponse.ok) {
          this.logger.warn(`Expo Push a répondu ${reponse.status} pour ${telephone}`);
          continue;
        }

        const corps = (await reponse.json()) as { data?: RecuExpo[] };
        recus = corps.data ?? [];
      } catch (err) {
        this.logger.warn(
          `Expo Push injoignable pour ${telephone}: ${err instanceof Error ? err.message : err}`,
        );
        continue;
      }

      // Expo renvoie un reçu par message, dans l'ordre d'envoi.
      const perimes = lot
        .filter((_, index) => recus[index]?.details?.error === 'DeviceNotRegistered')
        .map((j) => j.id);

      if (perimes.length > 0) {
        await this.jetons.delete({ id: In(perimes) });
        this.logger.log(`${perimes.length} jeton(s) Expo périmé(s) supprimé(s)`);
      }

      recus.forEach((recu, index) => {
        if (recu.status === 'ok') {
          acceptes += 1;
        } else if (recu.details?.error !== 'DeviceNotRegistered') {
          this.logger.warn(`Expo Push refusé (${lot[index]?.jeton}): ${recu.message ?? '—'}`);
        }
      });
    }

    return acceptes;
  }
}
