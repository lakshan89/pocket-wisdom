import { Injectable } from '@nestjs/common';
import {
  AuthenticationStorage,
  type RefreshTokenRecord,
  type RefreshTokenStore,
} from '@nestjs/authentication';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThan, type Repository } from 'typeorm';
import {
  RefreshToken,
  RevokedRefreshTokenFamily,
} from './refresh-token.entity.js';

/**
 * Keeps refresh tokens in Postgres instead of the package's in-memory
 * default, so they survive restarts and work across several instances.
 * In production the app refuses to start without a real store.
 */
@Injectable()
export class TypeOrmRefreshTokenStore implements RefreshTokenStore {
  private readonly tokens: Repository<RefreshToken>;
  private readonly revoked: Repository<RevokedRefreshTokenFamily>;

  constructor(
    @InjectDataSource() dataSource: DataSource,
    storage: AuthenticationStorage,
  ) {
    this.tokens = dataSource.getRepository(RefreshToken);
    this.revoked = dataSource.getRepository(RevokedRefreshTokenFamily);
    storage.registerSource({ refreshTokens: this });
  }

  async getRefreshToken(id: string): Promise<RefreshTokenRecord | undefined> {
    const row = await this.tokens.findOneBy({ id });
    return row ? toRecord(row) : undefined;
  }

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    // Keeps the table bounded: a family past its absolute lifetime can't be
    // refreshed any more, so its tokens (and revocation) are dead weight.
    // createdAt is TokenService's clock, which the contract asks us to use.
    await this.tokens.delete({ familyExpiresAt: LessThan(record.createdAt) });
    await this.revoked
      .createQueryBuilder()
      .delete()
      .where(
        'NOT EXISTS (SELECT 1 FROM refresh_tokens t WHERE t.family_id = refresh_token_family_revocations.family_id)',
      )
      .execute();
    await this.tokens.insert({
      ...record,
      usedAt: record.usedAt ?? null,
      claims: record.claims ?? null,
    });
  }

  async markRefreshTokenUsed(id: string, at: Date): Promise<boolean> {
    // One conditional UPDATE, never read-then-write: of two concurrent
    // refreshes with the same token, exactly one matches "used_at IS NULL".
    // The loser is treated as a stolen token and the family is revoked.
    const result = await this.tokens.update(
      { id, usedAt: IsNull() },
      { usedAt: at },
    );
    return result.affected === 1;
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await this.revoked
      .createQueryBuilder()
      .insert()
      .values({ familyId })
      .orIgnore() // ON CONFLICT DO NOTHING: revoking twice is fine
      .execute();
  }

  async isRefreshTokenFamilyRevoked(familyId: string): Promise<boolean> {
    return this.revoked.existsBy({ familyId });
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    await this.revoked.query(
      `INSERT INTO refresh_token_family_revocations (family_id)
       SELECT DISTINCT family_id FROM refresh_tokens WHERE user_id = $1
       ON CONFLICT DO NOTHING`,
      [userId],
    );
  }
}

function toRecord(row: RefreshToken): RefreshTokenRecord {
  // The contract wants optional fields absent, never null.
  return {
    id: row.id,
    familyId: row.familyId,
    userId: row.userId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    familyExpiresAt: row.familyExpiresAt,
    ...(row.usedAt ? { usedAt: row.usedAt } : {}),
    ...(row.claims ? { claims: row.claims as Record<string, unknown> } : {}),
  };
}
