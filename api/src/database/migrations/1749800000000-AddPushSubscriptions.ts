import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushSubscriptions1749800000000 implements MigrationInterface {
  name = 'AddPushSubscriptions1749800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "telephone" varchar(20) NOT NULL,
        "endpoint" varchar(500) NOT NULL UNIQUE,
        "p256dh" varchar(200) NOT NULL,
        "auth" varchar(100) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_push_subs_telephone ON push_subscriptions (telephone)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS push_subscriptions`);
  }
}
