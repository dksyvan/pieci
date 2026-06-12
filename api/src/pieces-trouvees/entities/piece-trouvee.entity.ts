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
import { StatutTrouvaille, TypePiece } from '../../common/enums';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { PointDepot } from '../../points-depot/entities/point-depot.entity';
import { Correspondance } from '../../correspondances/entities/correspondance.entity';
import { GeoJsonPoint } from '../../common/geo/geo.util';

@Entity('pieces_trouvees')
@Index(['statut', 'typePiece'])
export class PieceTrouvee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Utilisateur, (utilisateur) => utilisateur.piecesTrouvees, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'declarant_id' })
  declarant: Utilisateur;

  @Column({ name: 'type_piece', type: 'enum', enum: TypePiece, enumName: 'type_piece' })
  typePiece: TypePiece;

  @Column({ length: 100 })
  prenom: string;

  @Column({ length: 100 })
  nom: string;

  @Index()
  @Column({ length: 100 })
  commune: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  quartier: string | null;

  /** GeoJSON Point en WGS84, ex. { type: 'Point', coordinates: [lng, lat] }. */
  @Index({ spatial: true })
  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  position: GeoJsonPoint;

  @ManyToOne(() => PointDepot, (depot) => depot.piecesTrouvees, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'point_depot_id' })
  pointDepot: PointDepot | null;

  /** Point de dépôt hors liste (texte libre), mutuellement exclusif avec `pointDepot`. */
  @Column({ type: 'varchar', name: 'point_depot_autre', length: 200, nullable: true })
  pointDepotAutre: string | null;

  @Column({ type: 'varchar', name: 'photo_originale_url', length: 500, nullable: true })
  photoOriginaleUrl: string | null;

  @Column({ type: 'varchar', name: 'photo_floutee_url', length: 500, nullable: true })
  photoFlouteeUrl: string | null;

  @Column({
    type: 'enum',
    enum: StatutTrouvaille,
    enumName: 'statut_trouvaille',
    default: StatutTrouvaille.DISPONIBLE,
  })
  statut: StatutTrouvaille;

  @Column({ name: 'date_trouvaille', type: 'timestamptz', default: () => 'now()' })
  dateTrouvaille: Date;

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

  @OneToMany(() => Correspondance, (correspondance) => correspondance.pieceTrouvee)
  correspondances: Correspondance[];
}
