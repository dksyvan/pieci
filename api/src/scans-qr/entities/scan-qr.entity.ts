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
   * Code pays ISO à deux lettres, fourni par le bord (`request.cf.country`).
   *
   * C'est la seule donnée géographique retenue, et il n'y en aura pas d'autre.
   * L'adresse IP n'est ni stockée ni transmise à l'API : la confidentialité by
   * design est un principe non négociable du projet (CLAUDE.md, section 2), et
   * savoir quel support amène du monde ne demande d'identifier personne.
   */
  @Column({ type: 'varchar', length: 2, nullable: true })
  pays: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
