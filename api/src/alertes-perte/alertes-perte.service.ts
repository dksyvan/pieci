import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertePerte } from './entities/alerte-perte.entity';
import { CreateAlertePerteDto } from './dto/create-alerte-perte.dto';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { MatchingService } from '../matching/matching.service';
import { toGeoJsonPoint } from '../common/geo/geo.util';

@Injectable()
export class AlertesPerteService {
  constructor(
    @InjectRepository(AlertePerte)
    private readonly alertesPerte: Repository<AlertePerte>,
    private readonly utilisateurs: UtilisateursService,
    private readonly matching: MatchingService,
  ) {}

  async create(dto: CreateAlertePerteDto): Promise<AlertePerte> {
    const utilisateur = await this.utilisateurs.findOrCreate(dto.utilisateur);

    const alerte = this.alertesPerte.create({
      utilisateur,
      typePiece: dto.typePiece,
      prenom: dto.prenom,
      nom: dto.nom,
      commune: dto.commune ?? null,
      quartier: dto.quartier ?? null,
      position:
        dto.lat != null && dto.lng != null
          ? toGeoJsonPoint({ lat: dto.lat, lng: dto.lng })
          : null,
    });

    const saved = await this.alertesPerte.save(alerte);
    await this.matching.traiterNouvelleAlerte(saved.id);
    return saved;
  }

  findByTelephone(telephone: string): Promise<AlertePerte[]> {
    return this.alertesPerte.find({
      where: { utilisateur: { telephone } },
      order: { createdAt: 'DESC' },
    });
  }
}
