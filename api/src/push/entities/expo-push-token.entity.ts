import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Jeton de notification délivré par Expo aux applications natives.
 *
 * Table distincte de `push_subscriptions` : le Web Push transporte un endpoint
 * et deux clés de chiffrement, le natif un jeton opaque et rien d'autre. Les
 * mélanger obligerait à rendre `p256dh` et `auth` nullables sur une table déjà
 * en production.
 */
@Entity('expo_push_tokens')
export class ExpoPushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 20 })
  telephone: string;

  /** Forme `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`. */
  @Column({ length: 200, unique: true })
  jeton: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
