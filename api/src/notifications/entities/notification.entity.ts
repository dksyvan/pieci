import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { Correspondance } from '../../correspondances/entities/correspondance.entity';

@Entity('notifications')
@Index(['utilisateur', 'lu'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Utilisateur, (utilisateur) => utilisateur.notifications, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @ManyToOne(() => Correspondance, (correspondance) => correspondance.notifications, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'correspondance_id' })
  correspondance: Correspondance | null;

  @Column({ length: 200 })
  titre: string;

  @Column({ type: 'text' })
  contenu: string;

  @Column({ default: false })
  lu: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
