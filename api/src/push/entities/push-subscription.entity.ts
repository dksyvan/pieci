import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 20 })
  telephone: string;

  @Column({ length: 500, unique: true })
  endpoint: string;

  @Column({ length: 200 })
  p256dh: string;

  @Column({ length: 100 })
  auth: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
