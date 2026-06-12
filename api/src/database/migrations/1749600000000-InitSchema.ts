import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1749600000000 implements MigrationInterface {
  name = 'InitSchema1749600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    await queryRunner.query(
      `CREATE TYPE "type_piece" AS ENUM ('CNI', 'Passeport', 'Permis de conduire', 'Carte étudiante', 'Carte consulaire')`,
    );
    await queryRunner.query(
      `CREATE TYPE "type_lieu_depot" AS ENUM ('mairie', 'commissariat', 'gendarmerie', 'poste', 'partenaire', 'autre')`,
    );
    await queryRunner.query(
      `CREATE TYPE "statut_trouvaille" AS ENUM ('disponible', 'en_verification', 'recuperee', 'expiree')`,
    );
    await queryRunner.query(
      `CREATE TYPE "statut_alerte" AS ENUM ('active', 'resolue', 'expiree', 'annulee')`,
    );
    await queryRunner.query(
      `CREATE TYPE "statut_correspondance" AS ENUM ('suggeree', 'confirmee', 'rejetee')`,
    );
    await queryRunner.query(
      `CREATE TYPE "niveau_confiance" AS ENUM ('forte', 'probable', 'a_verifier')`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // unaccent() est STABLE, donc inutilisable dans un index. On l'enrobe dans une fonction
    // plpgsql marquée IMMUTABLE : étant opaque pour le planneur (jamais « inlinée »), elle évite
    // les soucis de résolution de search_path rencontrés avec un wrapper en LANGUAGE sql.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION immutable_unaccent(input_text text)
      RETURNS text AS $$
      BEGIN
        RETURN unaccent('unaccent', input_text);
      END;
      $$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
    `);

    // utilisateurs
    await queryRunner.query(`
      CREATE TABLE "utilisateurs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "telephone" varchar(20) NOT NULL UNIQUE,
        "prenom" varchar(100) NOT NULL,
        "nom" varchar(100) NOT NULL,
        "email" varchar(255),
        "telephone_verifie" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_utilisateurs_updated_at
        BEFORE UPDATE ON utilisateurs
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    // points_depot
    await queryRunner.query(`
      CREATE TABLE "points_depot" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nom" varchar(150) NOT NULL,
        "type_lieu" type_lieu_depot NOT NULL DEFAULT 'autre',
        "commune" varchar(100) NOT NULL,
        "adresse" text,
        "position" geography(Point, 4326) NOT NULL,
        "telephone" varchar(20),
        "horaires" text,
        "actif" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_points_depot_position ON points_depot USING GIST (position)`);
    await queryRunner.query(`CREATE INDEX idx_points_depot_commune ON points_depot (commune)`);

    // pieces_trouvees
    await queryRunner.query(`
      CREATE TABLE "pieces_trouvees" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "declarant_id" uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
        "type_piece" type_piece NOT NULL,
        "prenom" varchar(100) NOT NULL,
        "nom" varchar(100) NOT NULL,
        "commune" varchar(100) NOT NULL,
        "position" geography(Point, 4326) NOT NULL,
        "point_depot_id" uuid REFERENCES points_depot(id) ON DELETE SET NULL,
        "photo_originale_url" varchar(500),
        "photo_floutee_url" varchar(500),
        "statut" statut_trouvaille NOT NULL DEFAULT 'disponible',
        "date_trouvaille" timestamptz NOT NULL DEFAULT now(),
        "date_expiration" timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_pieces_trouvees_position ON pieces_trouvees USING GIST (position)`);
    await queryRunner.query(`CREATE INDEX idx_pieces_trouvees_statut_type ON pieces_trouvees (statut, type_piece)`);
    await queryRunner.query(`CREATE INDEX idx_pieces_trouvees_commune ON pieces_trouvees (commune)`);
    await queryRunner.query(`
      CREATE INDEX idx_pieces_trouvees_noms_trgm
        ON pieces_trouvees USING GIN (immutable_unaccent(lower(prenom || ' ' || nom)) gin_trgm_ops)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_pieces_trouvees_expiration
        ON pieces_trouvees (date_expiration) WHERE statut = 'disponible'
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_pieces_trouvees_updated_at
        BEFORE UPDATE ON pieces_trouvees
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    // alertes_perte
    await queryRunner.query(`
      CREATE TABLE "alertes_perte" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "utilisateur_id" uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        "type_piece" type_piece NOT NULL,
        "prenom" varchar(100) NOT NULL,
        "nom" varchar(100) NOT NULL,
        "commune" varchar(100),
        "position" geography(Point, 4326),
        "statut" statut_alerte NOT NULL DEFAULT 'active',
        "date_expiration" timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_alertes_perte_position ON alertes_perte USING GIST (position)`);
    await queryRunner.query(`CREATE INDEX idx_alertes_perte_statut_type ON alertes_perte (statut, type_piece)`);
    await queryRunner.query(`
      CREATE INDEX idx_alertes_perte_noms_trgm
        ON alertes_perte USING GIN (immutable_unaccent(lower(prenom || ' ' || nom)) gin_trgm_ops)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_alertes_perte_expiration
        ON alertes_perte (date_expiration) WHERE statut = 'active'
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_alertes_perte_updated_at
        BEFORE UPDATE ON alertes_perte
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    // correspondances
    await queryRunner.query(`
      CREATE TABLE "correspondances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "piece_trouvee_id" uuid NOT NULL REFERENCES pieces_trouvees(id) ON DELETE CASCADE,
        "alerte_perte_id" uuid NOT NULL REFERENCES alertes_perte(id) ON DELETE CASCADE,
        "score" numeric(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),
        "niveau_confiance" niveau_confiance NOT NULL,
        "statut" statut_correspondance NOT NULL DEFAULT 'suggeree',
        "date_calcul" timestamptz NOT NULL DEFAULT now(),
        "date_confirmation" timestamptz,
        "confirmation_trouveur" timestamptz,
        "confirmation_demandeur" timestamptz,
        UNIQUE ("piece_trouvee_id", "alerte_perte_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_correspondances_alerte ON correspondances (alerte_perte_id, statut)`);
    await queryRunner.query(`CREATE INDEX idx_correspondances_piece ON correspondances (piece_trouvee_id, statut)`);

    // notifications
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "utilisateur_id" uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        "correspondance_id" uuid REFERENCES correspondances(id) ON DELETE CASCADE,
        "titre" varchar(200) NOT NULL,
        "contenu" text NOT NULL,
        "lu" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_notifications_utilisateur ON notifications (utilisateur_id, lu)`);

    // journal_acces_contact
    await queryRunner.query(`
      CREATE TABLE "journal_acces_contact" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "correspondance_id" uuid NOT NULL REFERENCES correspondances(id) ON DELETE CASCADE,
        "utilisateur_id" uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        "date_acces" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Vue publique : aucune donnée d'identification complète ni de contact (cf. CLAUDE.md section 2)
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_pieces_trouvees_publiques`);
    await queryRunner.query(`DROP TABLE IF EXISTS journal_acces_contact`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS correspondances`);
    await queryRunner.query(`DROP TABLE IF EXISTS alertes_perte`);
    await queryRunner.query(`DROP TABLE IF EXISTS pieces_trouvees`);
    await queryRunner.query(`DROP TABLE IF EXISTS points_depot`);
    await queryRunner.query(`DROP TABLE IF EXISTS utilisateurs`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS immutable_unaccent`);
    await queryRunner.query(`DROP TYPE IF EXISTS niveau_confiance`);
    await queryRunner.query(`DROP TYPE IF EXISTS statut_correspondance`);
    await queryRunner.query(`DROP TYPE IF EXISTS statut_alerte`);
    await queryRunner.query(`DROP TYPE IF EXISTS statut_trouvaille`);
    await queryRunner.query(`DROP TYPE IF EXISTS type_lieu_depot`);
    await queryRunner.query(`DROP TYPE IF EXISTS type_piece`);
  }
}
