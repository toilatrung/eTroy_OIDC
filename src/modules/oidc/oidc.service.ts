import { config, type OidcClient } from '../../config/config.js';
import { hashValue } from '../../infrastructure/crypto/index.js';
import { verifyJwtRs256 } from '../../infrastructure/crypto/index.js';
import { BaseError } from '../../shared/errors/index.js';
import { authService, type AuthenticatedIdentity } from '../auth/auth.service.js';
import { userService, type UserService } from '../users/user.service.js';
import { randomBytes, createHash } from 'node:crypto';

import { toOidcUserIdentity } from './claims.mapper.js';
import { JwtAccessTokenProvider } from './access-token.provider.js';
import { AuthorizationCodeRepository } from './authorization-code.repository.js';
import { JwtIdTokenProvider } from './id-token.provider.js';
import { RefreshTokenService } from './refresh-token.service.js';
import type {
  AccessTokenProvider,
  AuthorizationCodeEntity,
  IntrospectTokenInput,
  IdTokenProvider,
  OidcUserIdentity,
  TokenIntrospectionResponse,
} from './oidc.types.js';

export interface AuthorizeRequestContext {
  accepted: true;
  requiresAuthentication: true;
  responseType: 'code';
  client: {
    clientId: string;
  };
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state?: string;
}

export type AuthResult = AuthenticatedIdentity;

export interface AuthBridge {
  validateCredentials(email: unknown, password: unknown): Promise<AuthResult>;
}

// Sprint 08 exposes this contract surface only; /authorize must not execute it.
// Credential-validation continuation belongs to later approved flow scope.
export const defaultAuthBridge: AuthBridge = authService;

const PKCE_S256 = 'S256';
const AUTHORIZATION_CODE_BYTE_LENGTH = 32;
const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/u;
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/u;
const AUTHORIZATION_CODE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/u;

export interface AuthorizeContinueResult {
  redirectTo: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
}

type SupportedTokenTypeHint = 'refresh_token' | 'access_token';

const invalidInput = (message: string): BaseError =>
  new BaseError(message, {
    code: 'INVALID_INPUT',
    statusCode: 400,
  });

const invalidGrant = (): BaseError =>
  new BaseError('Authorization code exchange is invalid.', {
    code: 'INVALID_GRANT',
    statusCode: 400,
  });

const inactiveIntrospection = (): TokenIntrospectionResponse => ({ active: false });

const readSingleString = (
  source: Record<string, unknown>,
  field: string,
  message: string = `${field} is required.`,
): string => {
  const value = source[field];

  if (typeof value !== 'string') {
    throw invalidInput(message);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw invalidInput(message);
  }

  return normalized;
};

const readOptionalString = (source: Record<string, unknown>, field: string): string | undefined => {
  const value = source[field];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw invalidInput(`${field} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw invalidInput(`${field} must not be empty.`);
  }

  return normalized;
};

const readTokenTypeHint = (
  source: Record<string, unknown>,
  field: string,
): SupportedTokenTypeHint | undefined => {
  const value = readOptionalString(source, field);
  if (value === undefined) {
    return undefined;
  }

  if (value !== 'refresh_token' && value !== 'access_token') {
    throw invalidInput(`${field} is not supported.`);
  }

  return value;
};

const assertOpenIdScope = (scope: string): void => {
  const scopes = scope.split(/\s+/u).filter((item) => item.length > 0);
  if (!scopes.includes('openid')) {
    throw invalidInput('scope must include openid.');
  }
};

const assertPkceChallenge = (challenge: string): void => {
  if (!CODE_CHALLENGE_PATTERN.test(challenge)) {
    throw invalidInput('code_challenge must be URL-safe base64 and between 43 and 128 characters.');
  }
};

const assertPkceVerifier = (verifier: string): void => {
  if (!CODE_VERIFIER_PATTERN.test(verifier)) {
    throw invalidInput('code_verifier must be 43-128 chars and use unreserved characters only.');
  }
};

const assertAuthorizationCodeFormat = (code: string): void => {
  if (!AUTHORIZATION_CODE_PATTERN.test(code)) {
    throw invalidGrant();
  }
};

const findClient = (clients: readonly OidcClient[], clientId: string): OidcClient => {
  const client = clients.find((item) => item.clientId === clientId);
  if (client === undefined) {
    throw invalidInput('client_id is invalid.');
  }

  return client;
};

const assertRedirectUri = (client: OidcClient, redirectUri: string): void => {
  if (!client.redirectUris.includes(redirectUri)) {
    throw invalidInput('redirect_uri is invalid.');
  }
};

const toQueryRecord = (query: unknown): Record<string, unknown> => {
  if (typeof query !== 'object' || query === null || Array.isArray(query)) {
    throw invalidInput('authorize query must be an object.');
  }

  return query as Record<string, unknown>;
};

const inferTokenTypeHint = (token: string): SupportedTokenTypeHint =>
  token.split('.').length === 3 ? 'access_token' : 'refresh_token';

const toEpochSeconds = (value: Date): number => Math.floor(value.getTime() / 1000);

const asStringClaim = (payload: Record<string, unknown>, claim: string): string | null => {
  const value = payload[claim];
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
};

const asNumberClaim = (payload: Record<string, unknown>, claim: string): number | null => {
  const value = payload[claim];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const toAudienceList = (audienceClaim: unknown): string[] | null => {
  if (typeof audienceClaim === 'string') {
    const normalized = audienceClaim.trim();
    return normalized.length === 0 ? null : [normalized];
  }

  if (!Array.isArray(audienceClaim) || audienceClaim.length === 0) {
    return null;
  }

  const audiences: string[] = [];
  for (const entry of audienceClaim) {
    if (typeof entry !== 'string') {
      return null;
    }

    const normalized = entry.trim();
    if (normalized.length === 0) {
      return null;
    }

    audiences.push(normalized);
  }

  return audiences;
};

const ensureUnconsumed = (authorizationCode: AuthorizationCodeEntity): void => {
  if (authorizationCode.usedAt !== null) {
    throw invalidGrant();
  }
};

const ensureNotExpired = (authorizationCode: AuthorizationCodeEntity, now: Date): void => {
  if (authorizationCode.expiresAt.getTime() <= now.getTime()) {
    throw invalidGrant();
  }
};

const ensureAuthorizationCodeClientContext = (
  authorizationCode: AuthorizationCodeEntity,
  clientId: string,
  redirectUri: string,
): void => {
  if (authorizationCode.clientId !== clientId || authorizationCode.redirectUri !== redirectUri) {
    throw invalidGrant();
  }
};

const ensurePkceVerifierMatches = (
  codeVerifier: string,
  authorizationCode: AuthorizationCodeEntity,
): void => {
  if (authorizationCode.codeChallengeMethod !== PKCE_S256) {
    throw invalidGrant();
  }

  const computedChallenge = createHash('sha256').update(codeVerifier, 'utf8').digest('base64url');
  if (computedChallenge !== authorizationCode.codeChallenge) {
    throw invalidGrant();
  }
};

type UserIdentityReader = Pick<UserService, 'getUserBySub'>;

const resolveOidcUserIdentity = async (
  users: UserIdentityReader,
  subject: string,
): Promise<OidcUserIdentity> => {
  try {
    const profile = await users.getUserBySub(subject);
    return toOidcUserIdentity(profile);
  } catch (error: unknown) {
    if (BaseError.isBaseError(error) && error.code === 'USER_NOT_FOUND') {
      throw invalidGrant();
    }

    throw error;
  }
};

export class OidcService {
  constructor(
    private readonly clients: readonly OidcClient[] = config.oidc.clients,
    private readonly authBridge: AuthBridge = defaultAuthBridge,
    private readonly authorizationCodeRepository: AuthorizationCodeRepository = new AuthorizationCodeRepository(),
    private readonly users: UserIdentityReader = userService,
    private readonly accessTokenProvider: AccessTokenProvider = new JwtAccessTokenProvider(),
    private readonly idTokenProvider: IdTokenProvider = new JwtIdTokenProvider(),
    private readonly refreshTokenService: RefreshTokenService = new RefreshTokenService(),
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  validateAuthorizeRequest(query: unknown): AuthorizeRequestContext {
    const queryRecord = toQueryRecord(query);
    const responseType = readSingleString(queryRecord, 'response_type');
    if (responseType !== 'code') {
      throw invalidInput('response_type must be code.');
    }

    const clientId = readSingleString(queryRecord, 'client_id');
    const redirectUri = readSingleString(queryRecord, 'redirect_uri');
    const scope = readSingleString(queryRecord, 'scope');
    const codeChallenge = readSingleString(queryRecord, 'code_challenge');
    const codeChallengeMethod = readSingleString(queryRecord, 'code_challenge_method');
    const state = readOptionalString(queryRecord, 'state');

    if (codeChallengeMethod !== PKCE_S256) {
      throw invalidInput('code_challenge_method must be S256.');
    }

    assertOpenIdScope(scope);
    assertPkceChallenge(codeChallenge);

    const client = findClient(this.clients, clientId);
    assertRedirectUri(client, redirectUri);

    return {
      accepted: true,
      requiresAuthentication: true,
      responseType: 'code',
      client: {
        clientId,
      },
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod: PKCE_S256,
      ...(state === undefined ? {} : { state }),
    };
  }

  async continueAuthorize(input: unknown): Promise<AuthorizeContinueResult> {
    const inputRecord = toQueryRecord(input);
    const email = readSingleString(inputRecord, 'email');
    const password = readSingleString(inputRecord, 'password');
    const context = this.validateAuthorizeRequest(inputRecord);
    const identity = await this.authBridge.validateCredentials(email, password);
    const issuedAuthorizationCode = await this.issueAuthorizationCode(context, identity.sub);

    const redirectUrl = new URL(context.redirectUri);
    redirectUrl.searchParams.set('code', issuedAuthorizationCode.rawCode);
    if (context.state !== undefined) {
      redirectUrl.searchParams.set('state', context.state);
    }

    return {
      redirectTo: redirectUrl.toString(),
    };
  }

  async exchangeToken(input: unknown): Promise<TokenExchangeResponse> {
    const inputRecord = toQueryRecord(input);
    const grantType = readSingleString(inputRecord, 'grant_type');

    if (grantType === 'authorization_code') {
      return this.exchangeAuthorizationCodeGrant(inputRecord);
    }

    if (grantType === 'refresh_token') {
      return this.exchangeRefreshTokenGrant(inputRecord);
    }

    throw invalidInput('grant_type is not supported.');
  }

  async revokeToken(input: unknown): Promise<Record<string, never>> {
    const inputRecord = toQueryRecord(input);
    const token = readSingleString(inputRecord, 'token');
    const clientId = readSingleString(inputRecord, 'client_id');
    const tokenTypeHint = readTokenTypeHint(inputRecord, 'token_type_hint');

    findClient(this.clients, clientId);
    if (tokenTypeHint !== undefined && tokenTypeHint !== 'refresh_token') {
      throw invalidInput('token_type_hint is not supported.');
    }

    await this.refreshTokenService.revokeRefreshToken({
      refreshToken: token,
      clientId,
      revokedReason: 'client_request',
    });

    return {};
  }

  async introspectToken(input: unknown): Promise<TokenIntrospectionResponse> {
    const inputRecord = toQueryRecord(input);
    const token = readSingleString(inputRecord, 'token');
    const clientId = readSingleString(inputRecord, 'client_id');
    const tokenTypeHint = readTokenTypeHint(inputRecord, 'token_type_hint');

    findClient(this.clients, clientId);
    const resolvedHint = tokenTypeHint ?? inferTokenTypeHint(token);

    if (resolvedHint === 'refresh_token') {
      return this.refreshTokenService.introspectRefreshToken({
        refreshToken: token,
        clientId,
      });
    }

    return this.introspectAccessToken({
      token,
      clientId,
      tokenTypeHint: resolvedHint,
    });
  }

  private async exchangeAuthorizationCodeGrant(
    inputRecord: Record<string, unknown>,
  ): Promise<TokenExchangeResponse> {
    const rawAuthorizationCode = readSingleString(inputRecord, 'code');
    const clientId = readSingleString(inputRecord, 'client_id');
    const redirectUri = readSingleString(inputRecord, 'redirect_uri');
    const codeVerifier = readSingleString(inputRecord, 'code_verifier');

    assertAuthorizationCodeFormat(rawAuthorizationCode);
    assertPkceVerifier(codeVerifier);

    const client = findClient(this.clients, clientId);
    assertRedirectUri(client, redirectUri);

    const codeHash = hashValue(rawAuthorizationCode);
    const authorizationCode = await this.authorizationCodeRepository.findByCodeHash(codeHash);
    if (authorizationCode === null) {
      throw invalidGrant();
    }

    const now = this.getNow();
    ensureUnconsumed(authorizationCode);
    ensureNotExpired(authorizationCode, now);
    ensureAuthorizationCodeClientContext(authorizationCode, clientId, redirectUri);
    ensurePkceVerifierMatches(codeVerifier, authorizationCode);

    const consumed = await this.authorizationCodeRepository.consumeAuthorizationCodeAtomic(
      authorizationCode.id,
      now,
    );
    if (consumed === null) {
      throw invalidGrant();
    }

    const userIdentity = await resolveOidcUserIdentity(this.users, authorizationCode.subject);
    const issuedAccessToken = this.accessTokenProvider.issueAccessToken({
      subject: userIdentity.sub,
      audience: clientId,
      scope: authorizationCode.scope,
    });
    const issuedIdToken = this.idTokenProvider.issueIdToken({
      audience: clientId,
      scope: authorizationCode.scope,
      user: userIdentity,
    });
    const issuedRefreshToken = await this.refreshTokenService.issueRefreshToken({
      subject: userIdentity.sub,
      clientId,
      scope: authorizationCode.scope,
    });

    return {
      access_token: issuedAccessToken.accessToken,
      token_type: issuedAccessToken.tokenType,
      expires_in: issuedAccessToken.expiresIn,
      id_token: issuedIdToken.idToken,
      refresh_token: issuedRefreshToken.refreshToken,
    };
  }

  private async exchangeRefreshTokenGrant(
    inputRecord: Record<string, unknown>,
  ): Promise<TokenExchangeResponse> {
    const rawRefreshToken = readSingleString(inputRecord, 'refresh_token');
    const clientId = readSingleString(inputRecord, 'client_id');

    findClient(this.clients, clientId);

    const rotatedRefreshToken = await this.refreshTokenService.rotateRefreshToken({
      refreshToken: rawRefreshToken,
      clientId,
    });
    const userIdentity = await resolveOidcUserIdentity(this.users, rotatedRefreshToken.subject);
    const issuedAccessToken = this.accessTokenProvider.issueAccessToken({
      subject: userIdentity.sub,
      audience: rotatedRefreshToken.clientId,
      scope: rotatedRefreshToken.scope,
    });

    return {
      access_token: issuedAccessToken.accessToken,
      token_type: issuedAccessToken.tokenType,
      expires_in: issuedAccessToken.expiresIn,
      refresh_token: rotatedRefreshToken.refreshToken,
    };
  }

  private introspectAccessToken(input: IntrospectTokenInput): TokenIntrospectionResponse {
    try {
      const { payload } = verifyJwtRs256(input.token);
      const issuer = asStringClaim(payload, 'iss');
      const subject = asStringClaim(payload, 'sub');
      const scope = asStringClaim(payload, 'scope');
      const issuedAt = asNumberClaim(payload, 'iat');
      const expiresAt = asNumberClaim(payload, 'exp');
      const audiences = toAudienceList(payload.aud);

      if (
        issuer === null ||
        subject === null ||
        scope === null ||
        issuedAt === null ||
        expiresAt === null ||
        audiences === null
      ) {
        return inactiveIntrospection();
      }

      if (issuer !== config.app.baseUrl) {
        return inactiveIntrospection();
      }

      if (!audiences.includes(input.clientId)) {
        return inactiveIntrospection();
      }

      const nowSeconds = toEpochSeconds(this.getNow());
      if (expiresAt <= nowSeconds || expiresAt <= issuedAt) {
        return inactiveIntrospection();
      }

      return {
        active: true,
        token_type: 'access_token',
        client_id: input.clientId,
        sub: subject,
        scope,
        exp: expiresAt,
        iat: issuedAt,
        iss: issuer,
      };
    } catch {
      return inactiveIntrospection();
    }
  }

  private async issueAuthorizationCode(
    context: AuthorizeRequestContext,
    subject: string,
  ): Promise<{ rawCode: string }> {
    const rawCode = randomBytes(AUTHORIZATION_CODE_BYTE_LENGTH).toString('base64url');
    const now = this.getNow();
    const expiresAt = new Date(now.getTime() + AUTHORIZATION_CODE_TTL_MS);
    const codeHash = hashValue(rawCode);

    await this.authorizationCodeRepository.createAuthorizationCodeRecord({
      subject,
      clientId: context.client.clientId,
      redirectUri: context.redirectUri,
      scope: context.scope,
      codeHash,
      codeChallenge: context.codeChallenge,
      codeChallengeMethod: context.codeChallengeMethod,
      expiresAt,
    });

    return { rawCode };
  }
}

export const oidcService = new OidcService();
