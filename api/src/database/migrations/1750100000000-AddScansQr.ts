import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Table des scans de QR codes imprimés (polo, casquette, flyer, sticker,
 * kakémono).
 *
 * Aucune clé étrangère vers les tables du registre, et c'est délibéré :
 * scanner un QR code n'est pas une déclaration, la personne ne s'identifie
 * pas, et rien ne doit laisser croire qu'on relie les deux. La table peut
 * être vidée entièrement sans toucher au reste.
 */
export class AddScansQr1750100000000 implements MigrationInterface {
  name = 'AddScansQr1750100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "scans_qr" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "source" varchar(30) NOT NULL,
        "user_agent" text,
        "ip" varchar(45),
        "pays" varchar(2),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Les deux seules lectures prévues : le compte par support, et la courbe
    // dans le temps. Un index par colonne suffit — la table restera petite.
    await queryRunner.query(`CREATE INDEX idx_scans_qr_source ON scans_qr (source)`);
    await queryRunner.query(`CREATE INDEX idx_scans_qr_created_at ON scans_qr (created_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scans_qr"`);
  }
}
