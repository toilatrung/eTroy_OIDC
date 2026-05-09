import { randomBytes } from 'node:crypto';

import { hashValue } from '../../../infrastructure/crypto/index.js';
import { BaseError } from '../../../shared/errors/index.js';

import type { RefreshTokenEntity, TokenIntrospectionResponse } from '../types/oidc.types.js';
import {
  RefreshTokenRepository,
  type RefreshTokenRepositoryPort,
} from '../repositories/refresh-token.repository.js';

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

export interface RotateRefreshTokenInput {
  refreshToken: string;
  clientId: string;
}

export interface RotateRefreshTokenResult {
  subject: string;
  clientId: string;
  scope: string;
  refreshToken: string;
}

export interface RevokeRefreshTokenInput {
  refreshToken: string;
  clientId: string;
  revokedReason?: string;
}

export interface IntrospectRefreshTokenInput {
  refreshToken: string;
  clientId: string;
}

const invalidGrant = (): BaseError =>
  new BaseError('Refresh token grant is invalid.', {
    code: 'INVALID_GRANT',
    statusCode: 400,
  });

const inactiveIntrospection = (): TokenIntrospectionResponse => ({ active: false });

const normalizeNonEmpty = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw invalidGrant();
  }

  return normalized;
};

const normalizeFamilyId = (record: RefreshTokenEntity): string => record.familyId || record.id;

const toEpochSeconds = (value: Date): number => Math.floor(value.getTime() / 1000);

const isTokenExpired = (record: RefreshTokenEntity, now: Date): boolean =>
  record.expiresAt.getTime() <= now.getTime();

const isTokenRevoked = (record: RefreshTokenEntity): boolean =>
  record.revokedAt !== null || record.status === 'revoked';

const isTokenCompromised = (record: RefreshTokenEntity): boolean => record.status === 'compromised';

const isTokenConsumed = (record: RefreshTokenEntity): boolean =>
  record.consumedAt !== null || record.status === 'consumed' || record.replacedByTokenId !== null;

const isEligibleForRefreshIntrospection = (record: RefreshTokenEntity, now: Date): boolean => {
  if (record.status !== 'active') {
    return false;
  }

  if (
    record.consumedAt !== null ||
    record.revokedAt !== null ||
    record.replacedByTokenId !== null
  ) {
    return false;
  }

  if (isTokenCompromised(record) || isTokenRevoked(record) || isTokenExpired(record, now)) {
    return false;
  }

  return true;
};

export class RefreshTokenService {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort = new RefreshTokenRepository(),
    private readonly refreshTokenTtlSeconds: number = REFRESH_TOKEN_TTL_SECONDS,
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  async issueRefreshToken(input: IssueRefreshTokenInput): Promise<IssueRefreshTokenResult> {
    const subject = normalizeNonEmpty(input.subject);
    const clientId = normalizeNonEmpty(input.clientId);
    const scope = normalizeNonEmpty(input.scope);

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('base64url');
    const familyId = randomBytes(24).toString('hex');
    const tokenHash = hashValue(refreshToken);
    const issuedAt = this.getNow();
    const expiresAt = new Date(issuedAt.getTime() + this.refreshTokenTtlSeconds * 1000);

    await this.refreshTokenRepository.createRefreshTokenRecord({
      tokenHash,
      subject,
      clientId,
      scope,
      familyId,
      parentTokenId: null,
      issuedAt,
      expiresAt,
    });

    return { refreshToken };
  }

  async rotateRefreshToken(input: RotateRefreshTokenInput): Promise<RotateRefreshTokenResult> {
    const rawRefreshToken = normalizeNonEmpty(input.refreshToken);
    const clientId = normalizeNonEmpty(input.clientId);

    if (!REFRESH_TOKEN_PATTERN.test(rawRefreshToken)) {
      throw invalidGrant();
    }

    const tokenHash = hashValue(rawRefreshToken);
    const now = this.getNow();
    const knownToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (knownToken === null) {
      throw invalidGrant();
    }

    if (knownToken.clientId !== clientId) {
      throw invalidGrant();
    }

    const familyId = normalizeFamilyId(knownToken);
    if (await this.refreshTokenRepository.isFamilyCompromised(familyId)) {
      throw invalidGrant();
    }

    if (await this.refreshTokenRepository.isFamilyRevoked(familyId)) {
      throw invalidGrant();
    }

    if (isTokenConsumed(knownToken)) {
      await this.refreshTokenRepository.markFamilyCompromised({
        familyId,
        compromisedAt: now,
      });
      throw invalidGrant();
    }

    if (
      isTokenRevoked(knownToken) ||
      isTokenCompromised(knownToken) ||
      isTokenExpired(knownToken, now)
    ) {
      throw invalidGrant();
    }

    const consumedToken = await this.refreshTokenRepository.consumeRefreshTokenAtomic({
      tokenHash,
      clientId,
      consumedAt: now,
    });

    if (consumedToken === null) {
      const latestKnownToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);
      if (
        latestKnownToken !== null &&
        latestKnownToken.clientId === clientId &&
        isTokenConsumed(latestKnownToken)
      ) {
        await this.refreshTokenRepository.markFamilyCompromised({
          familyId: normalizeFamilyId(latestKnownToken),
          compromisedAt: now,
        });
      }

      throw invalidGrant();
    }

    const rotatedRefreshToken = randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('base64url');
    const rotatedTokenHash = hashValue(rotatedRefreshToken);
    const rotatedIssuedAt = now;
    const rotatedExpiresAt = new Date(
      rotatedIssuedAt.getTime() + this.refreshTokenTtlSeconds * 1000,
    );
    const rotatedFamilyId = normalizeFamilyId(consumedToken);

    const replacementToken = await this.refreshTokenRepository.createRefreshTokenRecord({
      tokenHash: rotatedTokenHash,
      subject: consumedToken.subject,
      clientId: consumedToken.clientId,
      scope: consumedToken.scope,
      familyId: rotatedFamilyId,
      parentTokenId: consumedToken.id,
      issuedAt: rotatedIssuedAt,
      expiresAt: rotatedExpiresAt,
    });

    await this.refreshTokenRepository.setReplacementToken(consumedToken.id, replacementToken.id);

    return {
      subject: consumedToken.subject,
      clientId: consumedToken.clientId,
      scope: consumedToken.scope,
      refreshToken: rotatedRefreshToken,
    };
  }

  async revokeRefreshToken(input: RevokeRefreshTokenInput): Promise<void> {
    const rawRefreshToken = normalizeNonEmpty(input.refreshToken);
    const clientId = normalizeNonEmpty(input.clientId);
    if (!REFRESH_TOKEN_PATTERN.test(rawRefreshToken)) {
      return;
    }

    const tokenHash = hashValue(rawRefreshToken);
    const foundToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (foundToken === null) {
      return;
    }

    if (foundToken.clientId !== clientId) {
      return;
    }

    const revokedAt = this.getNow();
    const revokedReason = input.revokedReason ?? 'client_request';
    const familyId = normalizeFamilyId(foundToken);

    await this.refreshTokenRepository.revokeToken({
      tokenId: foundToken.id,
      revokedAt,
      revokedReason,
      revokedByClientId: clientId,
    });

    await this.refreshTokenRepository.revokeFamilyActiveTokens({
      familyId,
      revokedAt,
      revokedReason,
      revokedByClientId: clientId,
    });
  }

  async introspectRefreshToken(
    input: IntrospectRefreshTokenInput,
  ): Promise<TokenIntrospectionResponse> {
    const rawRefreshToken = input.refreshToken.trim();
    const clientId = input.clientId.trim();
    if (rawRefreshToken.length === 0 || clientId.length === 0) {
      return inactiveIntrospection();
    }

    if (!REFRESH_TOKEN_PATTERN.test(rawRefreshToken)) {
      return inactiveIntrospection();
    }

    const tokenHash = hashValue(rawRefreshToken);
    const token = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (token === null) {
      return inactiveIntrospection();
    }

    if (token.clientId !== clientId) {
      return inactiveIntrospection();
    }

    const familyId = normalizeFamilyId(token);
    if (await this.refreshTokenRepository.isFamilyCompromised(familyId)) {
      return inactiveIntrospection();
    }

    if (await this.refreshTokenRepository.isFamilyRevoked(familyId)) {
      return inactiveIntrospection();
    }

    const now = this.getNow();
    if (!isEligibleForRefreshIntrospection(token, now)) {
      return inactiveIntrospection();
    }

    return {
      active: true,
      token_type: 'refresh_token',
      client_id: token.clientId,
      sub: token.subject,
      scope: token.scope,
      exp: toEpochSeconds(token.expiresAt),
      iat: toEpochSeconds(token.issuedAt),
    };
  }
}
