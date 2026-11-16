import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794798688650 implements MigrationInterface {
  name = 'InitialSchema1794798688650';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "slug" character varying(60) NOT NULL, "name" character varying(100) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quotes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "text" text NOT NULL, "author_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_quotes_author_id_text" UNIQUE ("author_id", "text"), CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_quotes_author_id" ON "quotes"  ("author_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "authors" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "slug" character varying(120) NOT NULL, "name" character varying(200) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f068a15d416578e89d41189ca25" UNIQUE ("slug"), CONSTRAINT "PK_d2ed02fabd9b52847ccb85e6b88" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "quote_categories" ("quote_id" uuid NOT NULL, "category_id" uuid NOT NULL, CONSTRAINT "PK_70108b47aed1a7507a7c08f64f4" PRIMARY KEY ("quote_id", "category_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7530c1cd7e8824a1fc73a6def6" ON "quote_categories"  ("quote_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cfc25f2edc6fd438dedb71475b" ON "quote_categories"  ("category_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ADD CONSTRAINT "FK_c450fcfc314c504b3a736364bf0" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_categories" ADD CONSTRAINT "FK_7530c1cd7e8824a1fc73a6def6f" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_categories" ADD CONSTRAINT "FK_cfc25f2edc6fd438dedb71475b7" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote_categories" DROP CONSTRAINT "FK_cfc25f2edc6fd438dedb71475b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_categories" DROP CONSTRAINT "FK_7530c1cd7e8824a1fc73a6def6f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP CONSTRAINT "FK_c450fcfc314c504b3a736364bf0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cfc25f2edc6fd438dedb71475b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7530c1cd7e8824a1fc73a6def6"`,
    );
    await queryRunner.query(`DROP TABLE "quote_categories"`);
    await queryRunner.query(`DROP TABLE "authors"`);
    await queryRunner.query(`DROP INDEX "public"."ix_quotes_author_id"`);
    await queryRunner.query(`DROP TABLE "quotes"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
