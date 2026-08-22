import { Injectable, Logger } from '@nestjs/common';
import type { CanalNotification } from './canal.interface';
import { CanalPush } from './canal-push';
import { CanalSms } from './canal-sms';

/**
 * Achemine une notification vers un numéro, par les canaux disponibles.
 *
 * Règle d'acheminement : **les canaux gratuits d'abord, le payant seulement
 * si aucun n'a abouti.** Sans cette règle, chaque correspondance coûterait un
 * SMS même aux personnes déjà prévenues sur leur téléphone — et le registre
 * génère plusieurs correspondances par déclaration.
 *
 * Aucun échec de canal ne remonte à l'appelant : une notification manquée est
 * regrettable, une déclaration perdue ne l'est pas. La correspondance reste
 * consultable dans l'onglet Suivi dans tous les cas.
 */
@Injectable()
export class MessagerieService {
  private readonly logger = new Logger(MessagerieService.name);
  private readonly canaux: CanalNotification[];

  constructor(push: CanalPush, sms: CanalSms) {
    this.canaux = [push, sms];
  }

  async notifier(telephone: string, titre: string, corps: string): Promise<void> {
    const actifs = this.canaux.filter((c) => c.estActif());
    const gratuits = actifs.filter((c) => !c.payant);
    const payants = actifs.filter((c) => c.payant);

    const joint = await this.tenter(gratuits, telephone, titre, corps);
    if (joint) return;

    if (payants.length === 0) {
      this.logger.debug(`Aucun canal n'a pu joindre ${telephone}`);
      return;
    }

    await this.tenter(payants, telephone, titre, corps);
  }

  /** @returns `true` dès qu'un canal a joint le destinataire. */
  private async tenter(
    canaux: CanalNotification[],
    telephone: string,
    titre: string,
    corps: string,
  ): Promise<boolean> {
    const resultats = await Promise.all(
      canaux.map(async (canal) => {
        try {
          return await canal.envoyer(telephone, titre, corps);
        } catch (err) {
          // Un canal qui lève ne doit pas empêcher les autres de partir.
          this.logger.warn(
            `Canal ${canal.nom} en erreur : ${err instanceof Error ? err.message : err}`,
          );
          return false;
        }
      }),
    );
    return resultats.some(Boolean);
  }
}