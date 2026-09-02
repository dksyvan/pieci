import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScanQr } from './entities/scan-qr.entity';
import { CreateScanQrDto } from './dto/create-scan-qr.dto';
import { sourceConnue } from './sources';

export interface StatsScans {
  total: number;
  parSource: Record<string, number>;
  parJour: Array<{ jour: string; n: number }>;
}

/** Fenêtre des statistiques journalières. Au-delà, la tendance n'apprend plus rien. */
const JOURS_HISTORIQUE = 90;

@Injectable()
export class ScansQrService {
  constructor(
    @InjectRepository(ScanQr)
    private readonly scans: Repository<ScanQr>,
  ) {}

  /**
   * Enregistre un scan.
   *
   * Ne lève jamais pour une donnée douteuse : la source est ramenée à une
   * valeur connue plutôt que rejetée. Un QR déjà imprimé sur un polo ne se
   * corrige pas, donc un scan réel ne doit jamais être perdu à cause d'un
   * paramètre mal formé.
   */
  async enregistrer(dto: CreateScanQrDto): Promise<void> {
    await this.scans.insert({
      source: sourceConnue(dto.source),
      userAgent: dto.userAgent ?? null,
      ip: dto.ip ?? null,
      pays: dto.pays ? dto.pays.toUpperCase() : null,
    });
  }

  /**
   * Comptes agrégés : combien en tout, par support, et jour par jour.
   *
   * Trois requêtes plutôt qu'une : chacune se lit, et la table restera petite
   * longtemps — un scan de QR code n'est pas un événement de masse.
   */
  async stats(): Promise<StatsScans> {
    const total = await this.scans.count();

    const parSourceBrut = await this.scans
      .createQueryBuilder('s')
      .select('s.source', 'source')
      .addSelect('COUNT(*)', 'n')
      .groupBy('s.source')
      .orderBy('n', 'DESC')
      .getRawMany<{ source: string; n: string }>();

    const parJourBrut = await this.scans
      .createQueryBuilder('s')
      .select("to_char(date_trunc('day', s.created_at), 'YYYY-MM-DD')", 'jour')
      .addSelect('COUNT(*)', 'n')
      .where(`s.created_at >= now() - interval '${JOURS_HISTORIQUE} days'`)
      .groupBy('jour')
      .orderBy('jour', 'ASC')
      .getRawMany<{ jour: string; n: string }>();

    const parSource: Record<string, number> = {};
    // COUNT() arrive en chaîne : le pilote Postgres rend les bigint ainsi
    // pour ne pas perdre de précision.
    for (const { source, n } of parSourceBrut) parSource[source] = Number(n);

    return {
      total,
      parSource,
      parJour: parJourBrut.map(({ jour, n }) => ({ jour, n: Number(n) })),
    };
  }
}
