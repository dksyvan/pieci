import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { NiveauConfiance, StatutCorrespondance } from '../../common/enums';
import { PieceTrouvee } from '../../pieces-trouvees/entities/piece-trouvee.entity';
import { AlertePerte } from '../../alertes-perte/entities/alerte-perte.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { JournalAccesContact } from '../../journal-acces-contact/entities/journal-acces-contact.entity';

@Entity('correspondances')
@Unique(['pieceTrouvee', 'alertePerte'])
export class Correspondance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => PieceTrouvee, (piece) => piece.correspondances, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'piece_trouvee_id' })
  pieceTrouvee: PieceTrouvee;

  @Index()
  @ManyToOne(() => AlertePerte, (alerte) => alerte.correspondances, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'alerte_perte_id' })
  alertePerte: AlertePerte;

  /** Score de correspondance entre 0 et 1, calculé par lib/matching.ts. */
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  score: number;

  @Column({ name: 'niveau_confiance', type: 'enum', enum: NiveauConfiance, enumName: 'niveau_confiance' })
  niveauConfiance: NiveauConfiance;

  @Column({
    type: 'enum',
    enum: StatutCorrespondance,
    enumName: 'statut_correspondance',
    default: StatutCorrespondance.SUGGEREE,
  })
  statut: StatutCorrespondance;

  @CreateDateColumn({ name: 'date_calcul', type: 'timestamptz' })
  dateCalcul: Date;

  @Column({ name: 'date_confirmation', type: 'timestamptz', nullable: true })
  dateConfirmation: Date | null;

  /** Confirmation par le déclarant de la trouvaille (pieceTrouvee.declarant). */
  @Column({ name: 'confirmation_trouveur', type: 'timestamptz', nullable: true })
  confirmationTrouveur: Date | null;

  /** Confirmation par le déclarant de l'alerte de perte (alertePerte.utilisateur). */
  @Column({ name: 'confirmation_demandeur', type: 'timestamptz', nullable: true })
  confirmationDemandeur: Date | null;

  @OneToMany(() => Notification, (notification) => notification.correspondance)
  notifications: Notification[];

  @OneToMany(() => JournalAccesContact, (journal) => journal.correspondance)
  accesContacts: JournalAccesContact[];
}
