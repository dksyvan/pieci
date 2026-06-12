import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PieceTrouvee } from '../../pieces-trouvees/entities/piece-trouvee.entity';
import { AlertePerte } from '../../alertes-perte/entities/alerte-perte.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { JournalAccesContact } from '../../journal-acces-contact/entities/journal-acces-contact.entity';

@Entity('utilisateurs')
export class Utilisateur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  telephone: string;

  @Column({ length: 100 })
  prenom: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'telephone_verifie', default: false })
  telephoneVerifie: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => PieceTrouvee, (piece) => piece.declarant)
  piecesTrouvees: PieceTrouvee[];

  @OneToMany(() => AlertePerte, (alerte) => alerte.utilisateur)
  alertesPerte: AlertePerte[];

  @OneToMany(() => Notification, (notification) => notification.utilisateur)
  notifications: Notification[];

  @OneToMany(() => JournalAccesContact, (journal) => journal.utilisateur)
  accesContacts: JournalAccesContact[];
}
