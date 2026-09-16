import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Raison de l'absence de photo sur une pièce trouvée
 * (`pieces_trouvees.photo_absente_raison`).
 *
 * Sert à mesurer l'usage de la sortie « sans photo » du formulaire de
 * déclaration — le sens de chaque valeur, et de NULL, est expliqué dans
 * `pieces-trouvees/raisons-photo.ts`.
 *
 * varchar et contrainte CHECK plutôt qu'un type enum PostgreSQL : cette liste
 * est faite pour bouger, on la mesure justement pour la durcir. Une valeur
 * ajoutée par `ALTER TYPE … ADD VALUE` n'est utilisable qu'après la fin de la
 * transaction qui l'a créée, et aucune valeur d'enum ne se retire ; une
 * contrainte, elle, se remplace dans une migration ordinaire.
 *
 * La liste est recopiée en dur, et c'est délibéré : une migration décrit la
 * base à une date. Si elle importait la constante de l'API, la modifier
 * demain changerait après coup ce que fait cette migration-ci, sur une base
 * qui l'a déjà passée. Changer la liste, c'est écrire une nouvelle migration
 * qui remplace `chk_photo_absente_raison`.
 *
 * `v_pieces_trouvees_publiques` n'est pas touchée. Elle nomme ses colonnes une
 * à une (migration 1750300000000) : la nouvelle n'y entre pas d'elle-même, et
 * n'a rien à y faire — la raison est rattachée à une déclaration, donc à une
 * personne. Pour la même raison, `down()` peut retirer la colonne sans
 * recréer la vue : rien n'en dépend.
 *
 * À lancer AVANT de déployer l'API qui déclare la colonne dans l'entité :
 * TypeORM écrit et lit toutes les colonnes connues de l'entité, et tant que
 * celle-ci manque en base, l'INSERT d'une déclaration échoue — plus aucune
 * pièce trouvée ne passerait.
 */
export class PhotoAbsenteRaison1750400000000 implements MigrationInterface {
  name = 'PhotoAbsenteRaison1750400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Colonne nullable sans valeur par défaut : PostgreSQL l'ajoute sans
    // réécrire la table, et les déclarations existantes restent à NULL —
    // « question non posée », ce qui est exact pour elles.
    await queryRunner.query(
      `ALTER TABLE "pieces_trouvees" ADD COLUMN IF NOT EXISTS "photo_absente_raison" varchar(30)`,
    );

    // PostgreSQL ne connaît pas `ADD CONSTRAINT IF NOT EXISTS` : on retire
    // d'abord une éventuelle contrainte du même nom, pour que la migration
    // reste rejouable sur une base où la colonne aurait été posée à la main,
    // comme le permet déjà le `IF NOT EXISTS` ci-dessus.
    await queryRunner.query(
      `ALTER TABLE "pieces_trouvees" DROP CONSTRAINT IF EXISTS "chk_photo_absente_raison"`,
    );

    // `IS NULL OR` est redondant pour le moteur — un CHECK évalué à NULL
    // passe déjà — mais il dit au lecteur que NULL est une valeur voulue, pas
    // un oubli.
    await queryRunner.query(`
      ALTER TABLE "pieces_trouvees"
        ADD CONSTRAINT "chk_photo_absente_raison"
        CHECK (
          "photo_absente_raison" IS NULL
          OR "photo_absente_raison" IN (
            'plus_en_main',
            'appareil',
            'photo_ratee',
            'prefere_pas',
            'autre',
            'non_precisee'
          )
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // La contrainte d'abord, la colonne ensuite. `DROP COLUMN` l'emporterait
    // de toute façon, mais l'ordre inverse de `up()` se relit sans réfléchir.
    // Les raisons enregistrées sont perdues : ce n'étaient que des mesures.
    await queryRunner.query(
      `ALTER TABLE "pieces_trouvees" DROP CONSTRAINT IF EXISTS "chk_photo_absente_raison"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pieces_trouvees" DROP COLUMN IF EXISTS "photo_absente_raison"`,
    );
  }
}
