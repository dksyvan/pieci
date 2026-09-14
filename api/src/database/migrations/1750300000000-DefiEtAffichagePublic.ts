import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nouvel affichage public (NOM + initiales du prénom), défi des prénoms, et
 * coordonnées publiques arrondies.
 *
 * La vue publique est la frontière de confidentialité : tout ce qu'elle
 * sélectionne peut être lu par n'importe qui via GET /pieces-trouvees. C'est
 * donc ici, et non dans l'affichage, que se tient la règle « jamais le nom
 * et le prénom en entier ». Si la vue renvoyait encore le prénom complet, un
 * simple appel à l'API rendrait public le nom entier, quel que soit ce
 * qu'affiche le site.
 *
 * Trois changements :
 *
 * 1. `nom` en capitales remplace `nom_initiale` ; `prenom_initiales`
 *    remplace `prenom`, qui ne sort plus. Les initiales sont calculées ici,
 *    séparateurs conservés (« Serge-Yvan » → « S-Y. », « Marie Ange » →
 *    « M.A. »). Même règle que `initialesPrenom` côté site et API — la table
 *    de cas a été vérifiée sur la base de production (collation
 *    en_US.UTF-8 : les accents passent en capitales).
 *
 * 2. `lat` et `lng` sont arrondis à deux décimales, soit environ 1,1 km —
 *    l'échelle d'un quartier. Jusqu'ici la vue exposait la position exacte :
 *    quand le trouveur utilisait « Je suis sur place », n'importe qui pouvait
 *    lire l'endroit où il se tenait, parfois son domicile. Le rapprochement
 *    ne perd rien — il lit la table, pas la vue.
 *
 * 3. `correspondances.defi_reussi_le` retient que le demandeur a répondu
 *    juste au défi des prénoms (voir DefisService).
 */
export class DefiEtAffichagePublic1750300000000 implements MigrationInterface {
  name = 'DefiEtAffichagePublic1750300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "correspondances" ADD COLUMN IF NOT EXISTS "defi_reussi_le" timestamptz`,
    );

    await queryRunner.query(`DROP VIEW IF EXISTS v_pieces_trouvees_publiques`);
    await queryRunner.query(`
      CREATE VIEW v_pieces_trouvees_publiques AS
      SELECT
        pt.id,
        pt.type_piece,
        upper(btrim(pt.nom)) AS nom,
        CASE
          WHEN btrim(coalesce(pt.prenom, '')) = '' THEN NULL
          ELSE upper(
            rtrim(
              regexp_replace(
                regexp_replace(btrim(pt.prenom), '([^[:space:]-])[^[:space:]-]*', '\\1', 'g'),
                '[[:space:]]+', '.', 'g'
              ),
              '.'
            )
          ) || '.'
        END AS prenom_initiales,
        pt.commune,
        pt.quartier,
        pt.date_trouvaille,
        pt.photo_floutee_url,
        COALESCE(pd.nom, pt.point_depot_autre) AS depot_nom,
        round(ST_Y(pt.position::geometry)::numeric, 2)::float8 AS lat,
        round(ST_X(pt.position::geometry)::numeric, 2)::float8 AS lng
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
    await queryRunner.query(`ALTER TABLE "correspondances" DROP COLUMN IF EXISTS "defi_reussi_le"`);
  }
}
