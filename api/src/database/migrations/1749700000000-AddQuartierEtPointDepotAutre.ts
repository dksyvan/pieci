import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuartierEtPointDepotAutre1749700000000 implements MigrationInterface {
  name = 'AddQuartierEtPointDepotAutre1749700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pieces_trouvees" ADD COLUMN "quartier" varchar(150)`);
    await queryRunner.query(`ALTER TABLE "alertes_perte" ADD COLUMN "quartier" varchar(150)`);
    await queryRunner.query(
      `ALTER TABLE "pieces_trouvees" ADD COLUMN "point_depot_autre" varchar(200)`,
    );

    await queryRunner.query(`DROP VIEW IF EXISTS v_pieces_trouvees_publiques`);
    await queryRunner.query(`
      CREATE VIEW v_pieces_trouvees_publiques AS
      SELECT
        pt.id,
        pt.type_piece,
        pt.prenom,
        left(pt.nom, 1) || '.' AS nom_initiale,
        pt.commune,
        pt.quartier,
        pt.date_trouvaille,
        pt.photo_floutee_url,
        COALESCE(pd.nom, pt.point_depot_autre) AS depot_nom,
        ST_Y(pt.position::geometry) AS lat,
        ST_X(pt.position::geometry) AS lng
      FROM pieces_trouvees pt
      LEFT JOIN points_depot pd ON pd.id = pt.point_depot_id
      WHERE pt.statut = 'disponible'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_pieces_trouvees_publiques`);
    await queryRunner.query(`
      CREATE VIEW v_pieces_trouvees_publiques AS
      SELECT
        pt.id,
        pt.type_piece,
        pt.prenom,
        left(pt.nom, 1) || '.' AS nom_initiale,
        pt.commune,
        pt.date_trouvaille,
        pt.photo_floutee_url,
        pd.nom AS depot_nom,
        ST_Y(pt.position::geometry) AS lat,
        ST_X(pt.position::geometry) AS lng
      FROM pieces_trouvees pt
      LEFT JOIN points_depot pd ON pd.id = pt.point_depot_id
      WHERE pt.statut = 'disponible'
    `);
    await queryRunner.query(`ALTER TABLE "pieces_trouvees" DROP COLUMN "point_depot_autre"`);
    await queryRunner.query(`ALTER TABLE "alertes_perte" DROP COLUMN "quartier"`);
    await queryRunner.query(`ALTER TABLE "pieces_trouvees" DROP COLUMN "quartier"`);
  }
}
