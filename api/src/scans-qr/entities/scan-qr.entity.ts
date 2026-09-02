import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Un scan de QR code imprimé sur un support (polo, casquette, flyer…).
 *
 * Sert à savoir quel support amène du monde, pour ne pas réimprimer au hasard.
 * Aucun lien avec les tables du registre : personne ne s'identifie en scannant
 * un QR code, et un scan ne dit rien de ce que la personne fera ensuite.
 */
@Entity('scans_qr')
export class ScanQr {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Support d'où vient le scan, ramené à une valeur connue (voir SOURCES). */
  @Index()
  @Column({ length: 30 })
  source: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  /**
   * Adresse du visiteur, telle que Cloudflare la voit.
   *
   * Longueur 45 : c'est la taille d'une IPv6 en notation longue, et les
   * réseaux mobiles ivoiriens en distribuent. `null` quand l'en-tête manque —
   * un scan sans adresse reste un scan, on ne le jette pas pour autant.
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  /** Code pays ISO à deux lettres, fourni par le bord (`request.cf.country`). */
  @Column({ type: 'varchar', length: 2, nullable: true })
  pays: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
