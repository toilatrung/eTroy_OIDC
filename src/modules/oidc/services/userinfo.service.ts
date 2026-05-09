import { config, type OidcClient } from '../../../config/config.js';
import { BaseError } from '../../../shared/errors/index.js';
import { userService, type UserService } from '../../users/user.service.js';

import { mapOidcClaimsByScope, toOidcUserIdentity } from '../mappers/claims.mapper.js';
import { oidcKeyService } from './key.service.js';
import type { OidcClaims, OidcUserIdentity } from '../types/oidc.types.js';

type UserIdentityReader = Pick<UserService, 'getUserBySub'>;

const unauthorized = (message: string): BaseError =>
  new BaseError(message, {
    code: 'UNAUTHORIZED',
    statusCode: 401,
  });

const readBearerToken = (authorizationHeader: unknown): string => {
  if (typeof authorizationHeader !== 'string') {
    throw unauthorized('Authorization header with Bearer token is required.');
  }

  const trimmed = authorizationHeader.trim();
  if (trimmed.length === 0) {
    throw unauthorized('Authorization header with Bearer token is required.');
  }

  const [scheme, token, ...rest] = trimmed.split(/\s+/u);
  if (scheme !== 'Bearer' || typeof token !== 'string' || token.length === 0 || rest.length > 0) {
    throw unauthorized('Authorization header must use Bearer token.');
  }

  return token;
};

const readStringClaim = (payload: Record<string, unknown>, claim: string): string => {
  const value = payload[claim];
  if (typeof value !== 'string' || value.length === 0) {
    throw unauthorized(`access_token claim ${claim} is invalid.`);
  }

  return value;
};

const readEpochClaim = (payload: Record<string, unknown>, claim: string): number => {
  const value = payload[claim];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw unauthorized(`access_token claim ${claim} is invalid.`);
  }

  return value;
};

const normalizeAudienceList = (audienceClaim: unknown): string[] => {
  if (typeof audienceClaim === 'string' && audienceClaim.length > 0) {
    return [audienceClaim];
  }

  if (Array.isArray(audienceClaim) && audienceClaim.length > 0) {
    const normalized = audienceClaim.filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );

    if (normalized.length !== audienceClaim.length) {
      throw unauthorized('access_token claim aud is invalid.');
    }

    return normalized;
  }

  throw unauthorized('access_token claim aud is invalid.');
};

const ensureKnownAudience = (
  audiences: readonly string[],
  clients: readonly OidcClient[],
): void => {
  const knownClientIds = new Set(clients.map((client) => client.clientId));
  const hasKnownAudience = audiences.some((audience) => knownClientIds.has(audience));

  if (!hasKnownAudience) {
    throw unauthorized('access_token audience is invalid.');
  }
};

const isInvalidJwtError = (error: unknown): boolean =>
  (error instanceof Error && error.message.startsWith('Invalid JWT:')) ||
  (BaseError.isBaseError(error) && error.code === 'INVALID_JWT');

const resolveOidcUserIdentity = async (
  users: UserIdentityReader,
  subject: string,
): Promise<OidcUserIdentity> => {
  try {
    const user = await users.getUserBySub(subject);
    return toOidcUserIdentity(user);
  } catch (error: unknown) {
    if (BaseError.isBaseError(error) && error.code === 'USER_NOT_FOUND') {
      throw unauthorized('access_token subject is invalid.');
    }

    throw error;
  }
};

export class UserInfoService {
  constructor(
    private readonly issuer: string = config.app.baseUrl,
    private readonly clients: readonly OidcClient[] = config.oidc.clients,
    private readonly users: UserIdentityReader = userService,
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  async resolveClaims(authorizationHeader: unknown): Promise<OidcClaims> {
    const token = readBearerToken(authorizationHeader);

    let payload: Record<string, unknown>;
    try {
      payload = (await oidcKeyService.verifyJwt(token)).payload;
    } catch (error: unknown) {
      if (isInvalidJwtError(error)) {
        throw unauthorized('access_token is invalid.');
      }

      throw error;
    }

    const issuer = readStringClaim(payload, 'iss');
    if (issuer !== this.issuer) {
      throw unauthorized('access_token issuer is invalid.');
    }

    const issuedAt = readEpochClaim(payload, 'iat');
    const expiresAt = readEpochClaim(payload, 'exp');
    if (expiresAt <= issuedAt) {
      throw unauthorized('access_token expiry is invalid.');
    }

    const nowSeconds = Math.floor(this.getNow().getTime() / 1000);
    if (expiresAt <= nowSeconds) {
      throw unauthorized('access_token is expired.');
    }

    const audiences = normalizeAudienceList(payload.aud);
    ensureKnownAudience(audiences, this.clients);

    const subject = readStringClaim(payload, 'sub');
    const scope = readStringClaim(payload, 'scope');
    const user = await resolveOidcUserIdentity(this.users, subject);

    return mapOidcClaimsByScope(user, scope);
  }
}

export const userInfoService = new UserInfoService();
