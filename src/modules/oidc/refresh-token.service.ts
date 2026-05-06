import { randomBytes } from 'node:crypto';

import { hashValue } from '../../infrastructure/crypto/index.js';
import { BaseError } from '../../shared/errors/index.js';

import { RefreshTokenRepository } from './refresh-token.repository.js';

const REFRESH_TOKEN_BYTE_LENGTH = 48;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,256}$/u;

export interface IssueRefreshTokenInput {
  subject: string;
  clientId: string;
  scope: string;
}

export interface IssueRefreshTokenResult {
  refreshToken: string;
}

export interface ValidateRefreshTokenInput {
  refreshToken: string;
  clientId: string;
}

export interface RefreshTokenValidationResult {
  subject: string;
  clientId: string;
  scope: string;
}

const invalidGrant = (): BaseError =>
  new BaseError('Refresh token grant is invalid.', {
    code: 'INVALID_GRANT',
    statusCode: 400,
  });

const normalizeNonEmpty = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw invalidGrant();
  }

  return normalized;
};

export class RefreshTokenService {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository = new RefreshTokenRepository(),
    private readonly refreshTokenTtlSeconds: number = REFRESH_TOKEN_TTL_SECONDS,
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  async issueRefreshToken(input: IssueRefreshTokenInput): Promise<IssueRefreshTokenResult> {
    const subject = normalizeNonEmpty(input.subject);
    const clientId = normalizeNonEmpty(input.clientId);
    const scope = normalizeNonEmpty(input.scope);

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('base64url');
    const tokenHash = hashValue(refreshToken);
    const issuedAt = this.getNow();
    const expiresAt = new Date(issuedAt.getTime() + this.refreshTokenTtlSeconds * 1000);

    await this.refreshTokenRepository.createRefreshTokenRecord({
      tokenHash,
      subject,
      clientId,
      scope,
      issuedAt,
      expiresAt,
    });

    return { refreshToken };
  }

  async validateRefreshToken(
    input: ValidateRefreshTokenInput,
  ): Promise<RefreshTokenValidationResult> {
    const refreshToken = normalizeNonEmpty(input.refreshToken);
    const clientId = normalizeNonEmpty(input.clientId);

    if (!REFRESH_TOKEN_PATTERN.test(refreshToken)) {
      throw invalidGrant();
    }

    const tokenHash = hashValue(refreshToken);
    const refreshTokenRecord = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (refreshTokenRecord === null) {
      throw invalidGrant();
    }

    const now = this.getNow();
    if (refreshTokenRecord.expiresAt.getTime() <= now.getTime()) {
      throw invalidGrant();
    }

    if (refreshTokenRecord.revokedAt !== null || refreshTokenRecord.consumedAt !== null) {
      throw invalidGrant();
    }

    if (refreshTokenRecord.clientId !== clientId) {
      throw invalidGrant();
    }

    return {
      subject: refreshTokenRecord.subject,
      clientId: refreshTokenRecord.clientId,
      scope: refreshTokenRecord.scope,
    };
  }
}
