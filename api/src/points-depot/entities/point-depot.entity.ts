import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TypeLieuDepot } from '../../common/enums';
import { PieceTrouvee } from '../../pieces-trouvees/entities/piece-trouvee.entity';

@Entity('points_depot')
export class PointDepot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nom: string;

  @Column({
    name: 'type_lieu',
    type: 'enum',
    enum: TypeLieuDepot,
    enumName: 'type_lieu_depot',
    default: TypeLieuDepot.AUTRE,
  })
  typeLieu: TypeLieuDepot;

  @Index()
  @Column({ length: 100 })
  commune: string;

  @Column({ type: 'text', nullable: true })
  adresse: string | null;

  /** GeoJSON Point en WGS84, ex. { type: 'Point', coordinates: [lng, lat] }. */
  @Index({ spatial: true })
  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  position: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string | null;

  @Column({ type: 'text', nullable: true })
  horaires: string | null;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => PieceTrouvee, (piece) => piece.pointDepot)
  piecesTrouvees: PieceTrouvee[];
}
