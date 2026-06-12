import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Correspondance } from '../../correspondances/entities/correspondance.entity';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

@Entity('journal_acces_contact')
export class JournalAccesContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Correspondance, (correspondance) => correspondance.accesContacts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'correspondance_id' })
  correspondance: Correspondance;

  @ManyToOne(() => Utilisateur, (utilisateur) => utilisateur.accesContacts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'date_acces', type: 'timestamptz', default: () => 'now()' })
  dateAcces: Date;
}
