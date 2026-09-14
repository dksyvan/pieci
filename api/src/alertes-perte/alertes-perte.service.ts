import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertePerte } from './entities/alerte-perte.entity';
import { CreateAlertePerteDto } from './dto/create-alerte-perte.dto';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { MatchingService } from '../matching/matching.service';
import { toGeoJsonPoint } from '../common/geo/geo.util';
import { StatutAlerte } from '../common/enums';
import { normaliser } from '../matching/matching';

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
    const position =
      dto.lat != null && dto.lng != null ? toGeoJsonPoint({ lat: dto.lat, lng: dto.lng }) : null;

    /*
     * La même personne qui renvoie le formulaire — pour corriger ses prénoms,
     * le plus souvent — met à jour son alerte au lieu d'en créer une autre.
     * Chaque doublon ajoutait une correspondance pour la même pièce, une
     * notification au trouveur, et une ligne « Pas la mienne » qui
     * contredisait la confirmation faite sur l'autre. Le rapprochement n'est
     * pas relancé : il ne dépend que du nom et du type, inchangés.
     */
    const actives = await this.alertesPerte.find({
      where: { utilisateur: { id: utilisateur.id }, typePiece: dto.typePiece, statut: StatutAlerte.ACTIVE },
    });
    const existante = actives.find((a) => normaliser(a.nom) === normaliser(dto.nom));
    if (existante) {
      existante.prenom = dto.prenom;
      existante.commune = dto.commune ?? existante.commune;
      existante.quartier = dto.quartier ?? existante.quartier;
      existante.position = position ?? existante.position;
      return this.alertesPerte.save(existante);
    }

    const alerte = this.alertesPerte.create({
      utilisateur,
      typePiece: dto.typePiece,
      prenom: dto.prenom,
      nom: dto.nom,
      commune: dto.commune ?? null,
      quartier: dto.quartier ?? null,
      position,
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
