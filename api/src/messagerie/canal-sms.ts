import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CanalNotification } from './canal.interface';

/**
 * Envoi de SMS.
 *
 * Canal payant, et le seul qui atteigne tout le monde : il ne demande ni
 * installation, ni permission, ni connexion internet chez le destinataire.
 * C'est notre filet pour les utilisateurs d'iPhone en onglet Safari, qu'aucune
 * notification web ne peut joindre.
 *
 * ── Brancher un fournisseur ──────────────────────────────────────────────
 * La forme d'appel ci-dessous suit Twilio, le mieux documenté. Pour un
 * agrégateur ivoirien, seule `appelerFournisseur` change : l'interface, le
 * repli et la troncature restent valables.
 *
 * Variables attendues :
 *   SMS_ACTIF=true
 *   SMS_COMPTE=<identifiant de compte>
 *   SMS_JETON=<jeton secret>
 *   SMS_EXPEDITEUR=<numéro ou nom d'expéditeur>
 *
 * Tant que `SMS_ACTIF` n'est pas `true`, le canal se déclare inactif et rien
 * n'est envoyé — aucun risque de facturation surprise en développement.
 */

/** Au-delà, l'opérateur découpe en plusieurs SMS et facture d'autant. */
const LONGUEUR_MAX_SMS = 160;

@Injectable()
export class CanalSms implements CanalNotification {
  readonly nom = 'sms';
  readonly payant = true;

  private readonly logger = new Logger(CanalSms.name);

  constructor(private readonly config: ConfigService) {}

  estActif(): boolean {
    return (
      this.config.get<string>('SMS_ACTIF') === 'true' &&
      Boolean(this.config.get<string>('SMS_COMPTE')) &&
      Boolean(this.config.get<string>('SMS_JETON')) &&
      Boolean(this.config.get<string>('SMS_EXPEDITEUR'))
    );
  }

  async envoyer(telephone: string, titre: string, corps: string): Promise<boolean> {
    if (!this.estActif()) return false;

    const texte = this.composer(titre, corps);
    const destinataire = this.normaliser(telephone);

    try {
      return await this.appelerFournisseur(destinataire, texte);
    } catch (err) {
      this.logger.warn(
        `SMS échoué pour ${destinataire} : ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }

  /**
   * Un SMS n'a ni titre ni mise en forme : tout tient en une phrase, et la
   * marque doit apparaître en premier pour que le destinataire sache d'où ça
   * vient avant même d'ouvrir.
   */
  private composer(titre: string, corps: string): string {
    const texte = `Pieci : ${titre}. ${corps}`.replace(/\s+/g, ' ').trim();
    return texte.length <= LONGUEUR_MAX_SMS
      ? texte
      : `${texte.slice(0, LONGUEUR_MAX_SMS - 1).trimEnd()}\u2026`;
  }

  /**
   * Met le numéro au format international. Les numéros ivoiriens sont saisis
   * localement (« 07 00 00 00 00 ») alors que les passerelles exigent E.164.
   */
  private normaliser(telephone: string): string {
    const chiffres = telephone.replace(/\D/g, '');
    if (telephone.trim().startsWith('+')) return `+${chiffres}`;
    if (chiffres.startsWith('225')) return `+${chiffres}`;
    return `+225${chiffres}`;
  }

  /** Seule méthode à réécrire pour changer de fournisseur. */
  private async appelerFournisseur(destinataire: string, texte: string): Promise<boolean> {
    const compte = this.config.get<string>('SMS_COMPTE')!;
    const jeton = this.config.get<string>('SMS_JETON')!;
    const expediteur = this.config.get<string>('SMS_EXPEDITEUR')!;

    const reponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${compte}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${compte}:${jeton}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: destinataire, From: expediteur, Body: texte }),
      },
    );

    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => '');
      this.logger.warn(`Passerelle SMS a répondu ${reponse.status} : ${detail.slice(0, 200)}`);
      return false;
    }

    return true;
  }
}