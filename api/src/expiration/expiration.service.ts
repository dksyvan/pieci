import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { PieceTrouvee } from '../pieces-trouvees/entities/piece-trouvee.entity';
import { AlertePerte } from '../alertes-perte/entities/alerte-perte.entity';
import { StatutAlerte, StatutTrouvaille } from '../common/enums';

@Injectable()
export class ExpirationService {
  private readonly logger = new Logger(ExpirationService.name);

  constructor(
    @InjectRepository(PieceTrouvee)
    private readonly piecesTrouvees: Repository<PieceTrouvee>,
    @InjectRepository(AlertePerte)
    private readonly alertesPerte: Repository<AlertePerte>,
  ) {}

  /**
   * Bascule au statut "expiree" les trouvailles et alertes dont la date
   * d'expiration (90 jours, cf. entités) est dépassée. Ne touche pas aux
   * lignes déjà dans un autre statut (recuperee/resolue/annulee/...).
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expirerAnnonces(): Promise<void> {
    const maintenant = new Date();

    const pieces = await this.piecesTrouvees.update(
      { statut: StatutTrouvaille.DISPONIBLE, dateExpiration: LessThanOrEqual(maintenant) },
      { statut: StatutTrouvaille.EXPIREE },
    );

    const alertes = await this.alertesPerte.update(
      { statut: StatutAlerte.ACTIVE, dateExpiration: LessThanOrEqual(maintenant) },
      { statut: StatutAlerte.EXPIREE },
    );

    if ((pieces.affected ?? 0) > 0 || (alertes.affected ?? 0) > 0) {
      this.logger.log(
        `Expiration : ${pieces.affected ?? 0} pièce(s) trouvée(s), ${alertes.affected ?? 0} alerte(s) de perte.`,
      );
    }
  }
}
