import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpoPushTokens1749900000000 implements MigrationInterface {
  name = 'AddExpoPushTokens1749900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "expo_push_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "telephone" varchar(20) NOT NULL,
        "jeton" varchar(200) NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_expo_tokens_telephone ON expo_push_tokens (telephone)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS expo_push_tokens`);
  }
}
