import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokens1794881029967 implements MigrationInterface {
  name = 'AddRefreshTokens1794881029967';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" character varying(128) NOT NULL, "family_id" character varying(128) NOT NULL, "user_id" character varying(128) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "family_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "claims" jsonb, CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_refresh_tokens_family_id" ON "refresh_tokens"  ("family_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_refresh_tokens_user_id" ON "refresh_tokens"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_refresh_tokens_family_expires_at" ON "refresh_tokens"  ("family_expires_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_token_family_revocations" ("family_id" character varying(128) NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6f5f19c83131d7208b9de7185e9" PRIMARY KEY ("family_id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_token_family_revocations"`);
    await queryRunner.query(
      `DROP INDEX "public"."ix_refresh_tokens_family_expires_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."ix_refresh_tokens_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."ix_refresh_tokens_family_id"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
