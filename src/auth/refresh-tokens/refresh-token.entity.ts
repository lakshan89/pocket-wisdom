import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * One refresh token, stored by hash: the database never holds a token a
 * thief could use. Every rotation of one sign-in shares a family_id.
 *
 * user_id has no foreign key: the package's store contract tests save
 * tokens for made-up user ids. Deleting a user should call
 * TokenService.revokeAll() first.
 */
@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
  /** SHA-256 of the token. */
  @PrimaryColumn({ type: 'varchar', length: 128 })
  id: string;

  @Index('ix_refresh_tokens_family_id')
  @Column({ name: 'family_id', type: 'varchar', length: 128 })
  familyId: string;

  @Index('ix_refresh_tokens_user_id')
  @Column({ name: 'user_id', type: 'varchar', length: 128 })
  userId: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Index('ix_refresh_tokens_family_expires_at')
  @Column({ name: 'family_expires_at', type: 'timestamptz' })
  familyExpiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  // Typed as object, not Record<string, unknown>: TypeORM's insert() types
  // can't handle an index signature on a jsonb column.
  @Column({ type: 'jsonb', nullable: true })
  claims: object | null;
}

/**
 * A revoked family. Kept apart from refresh_tokens so a revocation also
 * covers tokens of the family saved after it (a refresh that lost a race
 * to a reuse can still save its successor).
 */
@Entity({ name: 'refresh_token_family_revocations' })
export class RevokedRefreshTokenFamily {
  @PrimaryColumn({ name: 'family_id', type: 'varchar', length: 128 })
  familyId: string;

  @Column({ name: 'revoked_at', type: 'timestamptz', default: () => 'now()' })
  revokedAt: Date;
}
