import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retire la colonne `ip` de `scans_qr`.
 *
 * Elle n'aurait jamais dû être créée : la confidentialité by design est un
 * principe non négociable du projet (CLAUDE.md, section 2), et compter les
 * scans par support ne demande d'identifier personne. Le pays suffit à toute
 * lecture géographique, et il est déjà là.
 *
 * `DROP COLUMN` efface les valeurs avec la colonne — c'est le but, pas un
 * effet de bord. La table venait d'être créée et ne contenait que des lignes
 * d'essai, mais l'ordre resterait le bon avec du trafic réel.
 *
 * Le `down()` recrée la colonne vide plutôt que rien : une migration qui ne
 * sait pas revenir en arrière bloque tout l'historique. Les adresses, elles,
 * ne reviendront pas — et c'est bien ainsi.
 */
export class RetirerIpScansQr1750200000000 implements MigrationInterface {
  name = 'RetirerIpScansQr1750200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "scans_qr" DROP COLUMN IF EXISTS "ip"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "scans_qr" ADD COLUMN IF NOT EXISTS "ip" varchar(45)`);
  }
}
