import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointDepot } from './entities/point-depot.entity';
import { PointDepotDto } from './dto/point-depot.dto';

@Injectable()
export class PointsDepotService {
  constructor(
    @InjectRepository(PointDepot)
    private readonly pointsDepot: Repository<PointDepot>,
  ) {}

  findActifs(): Promise<PointDepotDto[]> {
    return this.pointsDepot
      .createQueryBuilder('pd')
      .select('pd.id', 'id')
      .addSelect('pd.nom', 'nom')
      .addSelect('pd.type_lieu', 'typeLieu')
      .addSelect('pd.commune', 'commune')
      .addSelect('pd.adresse', 'adresse')
      .addSelect('pd.telephone', 'telephone')
      .addSelect('pd.horaires', 'horaires')
      .addSelect('ST_Y(pd.position::geometry)', 'lat')
      .addSelect('ST_X(pd.position::geometry)', 'lng')
      .where('pd.actif = true')
      .orderBy('pd.commune', 'ASC')
      .getRawMany<PointDepotDto>();
  }
}
