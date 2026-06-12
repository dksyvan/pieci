import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StatutAlerte, TypePiece } from '../../common/enums';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { Correspondance } from '../../correspondances/entities/correspondance.entity';
import { GeoJsonPoint } from '../../common/geo/geo.util';

@Entity('alertes_perte')
@Index(['statut', 'typePiece'])
export class AlertePerte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Utilisateur, (utilisateur) => utilisateur.alertesPerte, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'type_piece', type: 'enum', enum: TypePiece, enumName: 'type_piece' })
  typePiece: TypePiece;

  @Column({ length: 100 })
  prenom: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  commune: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  quartier: string | null;

  /** GeoJSON Point en WGS84, ex. { type: 'Point', coordinates: [lng, lat] }. */
  @Index({ spatial: true })
  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  position: GeoJsonPoint | null;

  @Column({ type: 'enum', enum: StatutAlerte, enumName: 'statut_alerte', default: StatutAlerte.ACTIVE })
  statut: StatutAlerte;

  /** Auto-expiration 90 jours après la déclaration (cf. job de nettoyage planifié). */
  @Column({
    name: 'date_expiration',
    type: 'timestamptz',
    default: () => "now() + interval '90 days'",
  })
  dateExpiration: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Correspondance, (correspondance) => correspondance.alertePerte)
  correspondances: Correspondance[];
}
