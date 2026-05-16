import { config, type OidcClient } from '../../../config/config.js';
import { hashValue } from '../../../infrastructure/crypto/index.js';
import type { JsonWebKeySet } from '../../../infrastructure/crypto/index.js';
import { BaseError } from '../../../shared/errors/index.js';
import { authService, type AuthenticatedIdentity } from '../../auth/auth.service.js';
import { auditService } from '../../audit/audit.service.js';
import { userService, type UserService } from '../../users/user.service.js';
import { randomBytes, createHash } from 'node:crypto';

import { toOidcUserIdentity } from '../mappers/claims.mapper.js';
import { oidcClientService } from './client.service.js';
import { OidcConsentService, type ConnectedApplicationView } from './consent.service.js';
import { OidcInteractionService } from './interaction.service.js';
import { oidcKeyService } from './key.service.js';
import { JwtAccessTokenProvider } from '../providers/access-token.provider.js';
import { AuthorizationCodeRepository } from '../repositories/authorization-code.repository.js';
import { JwtIdTokenProvider } from '../providers/id-token.provider.js';
import {
  OidcSessionService,
  type OidcCsrfCookieDescriptor,
  type OidcSessionCookieDescriptor,
} from './oidc-session.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import type {
  AccessTokenProvider,
  AuthorizationCodeEntity,
  IntrospectTokenInput,
  IdTokenProvider,
  OidcUserIdentity,
  TokenIntrospectionResponse,
} from '../types/oidc.types.js';

type OidcProtocolErrorCode =
  | 'invalid_client'
  | 'invalid_redirect_uri'
  | 'invalid_scope'
  | 'invalid_request'
  | 'access_denied'
  | 'login_required'
  | 'consent_required'
  | 'session_expired'
  | 'interaction_expired'
  | 'server_error';

interface AuthorizeRequestContext {
  clientId: string;
  clientName: string;
  redirectUri: string;
  scope: string;
  scopeItems: string[];
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state?: string;
  nonce?: string;
}

export type AuthResult = AuthenticatedIdentity;

export interface AuthBridge {
  validateCredentials(email: unknown, password: unknown): Promise<AuthResult>;
}

// Sprint 08 exposes this contract surface only; /authorize must not execute it.
// Credential-validation continuation belongs to later approved flow scope.
export const defaultAuthBridge: AuthBridge = authService;

const PKCE_S256 = 'S256';
const INTERNAL_LOGIN_CLIENT_ID = 'etroy-oidc-internal';
const AUTHORIZATION_CODE_BYTE_LENGTH = 32;
const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
const INTERACTION_TTL_MS = config.oidc.interaction.ttlSeconds * 1000;
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/u;
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/u;
const AUTHORIZATION_CODE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/u;
const STATE_PATTERN = /^[A-Za-z0-9\-._~]{1,1024}$/u;
const NONCE_PATTERN = /^[A-Za-z0-9\-._~]{1,255}$/u;
const ALLOWED_SCOPES = new Set(['openid', 'profile', 'email']);

interface OidcServiceErrorOptions {
  code: OidcProtocolErrorCode;
  message: string;
  statusCode: number;
  redirectUri?: string;
  state?: string;
  shouldRedirect: boolean;
}

export interface OidcAuthorizeDecisionResponse {
  success: true;
  data: {
    redirectUrl: string;
  };
}

export interface OidcAuthorizeInteractionResponse {
  success: true;
  data:
    | {
        status: 'completed';
        redirectUrl: string;
      }
    | {
        status: 'consent_required';
        interactionId: string;
        clientId: string;
        clientName: string;
        requestedScopes: string[];
      };
}

export interface OidcConnectedApplicationsResponse {
  success: true;
  data: {
    applications: ConnectedApplicationView[];
  };
}

export interface OidcRevokeConsentResponse {
  success: true;
  data: {
    clientId: string;
    status: 'revoked';
  };
}

interface ResolvedClientContext {
  clientId: string;
  clientName: string;
  redirectUris: readonly string[];
  allowedScopes: readonly string[];
}

export interface InternalLoginResult {
  identity: AuthenticatedIdentity;
  sessionCookie: OidcSessionCookieDescriptor;
  csrfCookie: OidcCsrfCookieDescriptor;
}

export interface TokenExchangeResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
}

export interface LogoutRequestInput {
  body: unknown;
  cookieHeader: string | undefined;
  csrfToken: string | undefined;
}

export interface LogoutSuccessResponse {
  status: 'logged_out';
}

export interface OidcSessionView {
  sessionId: string;
  subject: string;
  clientIds: string[];
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  status: 'active' | 'expired' | 'invalidated';
  invalidatedAt: string | null;
}

export type LogoutResult =
  | {
      kind: 'json';
      body: LogoutSuccessResponse;
      clearSessionCookie: boolean;
      clearCsrfCookie: boolean;
    }
  | {
      kind: 'redirect';
      location: string;
      clearSessionCookie: boolean;
      clearCsrfCookie: boolean;
    };

type SupportedTokenTypeHint = 'refresh_token' | 'access_token';

export interface AuthorizeHandlerResult {
  kind: 'redirect';
  redirectTo: string;
  clearSessionCookie: boolean;
}

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

const oidcServiceError = (options: OidcServiceErrorOptions): BaseError =>
  new BaseError(options.message, {
    code: options.code,
    statusCode: options.statusCode,
    metadata: {
      shouldRedirect: options.shouldRedirect,
      ...(options.redirectUri === undefined ? {} : { redirectUri: options.redirectUri }),
      ...(options.state === undefined ? {} : { state: options.state }),
    },
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

const normalizeScopeItems = (scope: string): string[] =>
  [
    ...new Set(
      scope
        .split(/\s+/u)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));

const assertPkceChallenge = (challenge: string, redirectUri: string, state?: string): void => {
  if (!CODE_CHALLENGE_PATTERN.test(challenge)) {
    throw oidcServiceError({
      code: 'invalid_request',
      message: 'code_challenge is invalid.',
      statusCode: 400,
      redirectUri,
      ...(state === undefined ? {} : { state }),
      shouldRedirect: true,
    });
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

const findClient = async (
  clients: readonly OidcClient[],
  clientId: string,
): Promise<ResolvedClientContext> => {
  const managedClient = await oidcClientService.getClient(clientId);
  if (managedClient) {
    if (managedClient.status !== 'active') {
      throw oidcServiceError({
        code: 'invalid_client',
        message: 'client_id is invalid.',
        statusCode: 400,
        shouldRedirect: false,
      });
    }
    return {
      clientId: managedClient.clientId,
      redirectUris: managedClient.redirectUris,
      clientName: managedClient.name,
      allowedScopes: managedClient.allowedScopes,
    };
  }

  const client = clients.find((item) => item.clientId === clientId);
  if (client === undefined) {
    throw oidcServiceError({
      code: 'invalid_client',
      message: 'client_id is invalid.',
      statusCode: 400,
      shouldRedirect: false,
    });
  }

  return {
    clientId: client.clientId,
    redirectUris: client.redirectUris,
    clientName: client.clientId,
    allowedScopes: [...ALLOWED_SCOPES],
  };
};

const assertRedirectUri = (client: ResolvedClientContext, redirectUri: string): void => {
  if (!client.redirectUris.includes(redirectUri)) {
    throw oidcServiceError({
      code: 'invalid_redirect_uri',
      message: 'redirect_uri is invalid.',
      statusCode: 400,
      shouldRedirect: false,
    });
  }
};

const toQueryRecord = (query: unknown): Record<string, unknown> => {
  if (typeof query !== 'object' || query === null || Array.isArray(query)) {
    throw invalidInput('authorize query must be an object.');
  }

  return query as Record<string, unknown>;
};

const assertKnownFields = (
  source: Record<string, unknown>,
  allowedFields: readonly string[],
): void => {
  const invalidFields = Object.keys(source).filter((field) => !allowedFields.includes(field));
  if (invalidFields.length > 0) {
    throw invalidInput(`Unsupported field: ${invalidFields[0]}.`);
  }
};

const assertState = (state: string | undefined, redirectUri: string): void => {
  if (state === undefined) {
    return;
  }

  if (!STATE_PATTERN.test(state)) {
    throw oidcServiceError({
      code: 'invalid_request',
      message: 'state is invalid.',
      statusCode: 400,
      redirectUri,
      state,
      shouldRedirect: true,
    });
  }
};

const assertNonce = (nonce: string | undefined, redirectUri: string, state?: string): void => {
  if (nonce === undefined) {
    return;
  }

  if (!NONCE_PATTERN.test(nonce)) {
    throw oidcServiceError({
      code: 'invalid_request',
      message: 'nonce is invalid.',
      statusCode: 400,
      redirectUri,
      ...(state === undefined ? {} : { state }),
      shouldRedirect: true,
    });
  }
};

const assertScopeAllowed = (
  requestedScopeItems: readonly string[],
  allowedScopes: readonly string[],
  redirectUri: string,
  state?: string,
): void => {
  if (!requestedScopeItems.includes('openid')) {
    throw oidcServiceError({
      code: 'invalid_scope',
      message: 'scope must include openid.',
      statusCode: 400,
      redirectUri,
      ...(state === undefined ? {} : { state }),
      shouldRedirect: true,
    });
  }

  if (!requestedScopeItems.every((scope) => ALLOWED_SCOPES.has(scope))) {
    throw oidcServiceError({
      code: 'invalid_scope',
      message: 'scope contains unsupported values.',
      statusCode: 400,
      redirectUri,
      ...(state === undefined ? {} : { state }),
      shouldRedirect: true,
    });
  }

  const allowedScopeSet = new Set(allowedScopes);
  if (!requestedScopeItems.every((scope) => allowedScopeSet.has(scope))) {
    throw oidcServiceError({
      code: 'invalid_scope',
      message: 'scope is not allowed for this client.',
      statusCode: 400,
      redirectUri,
      ...(state === undefined ? {} : { state }),
      shouldRedirect: true,
    });
  }
};

const buildAuthorizeErrorRedirectUrl = (
  redirectUri: string,
  errorCode: OidcProtocolErrorCode,
  state?: string,
): string => {
  const target = new URL(redirectUri);
  target.searchParams.set('error', errorCode);
  if (state !== undefined) {
    target.searchParams.set('state', state);
  }

  return target.toString();
};

const inferTokenTypeHint = (token: string): SupportedTokenTypeHint =>
  token.split('.').length === 3 ? 'access_token' : 'refresh_token';

const buildPostLogoutRedirectUrl = (redirectUri: string, state: string | undefined): string => {
  if (state === undefined) {
    return redirectUri;
  }

  const target = new URL(redirectUri);
  target.searchParams.set('state', state);

  return target.toString();
};

const toSessionView = (session: {
  sessionId: string;
  subject: string;
  clientIds: string[];
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  status: 'active' | 'expired' | 'invalidated';
  invalidatedAt: Date | null;
}): OidcSessionView => ({
  sessionId: session.sessionId,
  subject: session.subject,
  clientIds: [...session.clientIds],
  createdAt: session.createdAt.toISOString(),
  expiresAt: session.expiresAt.toISOString(),
  lastSeenAt: session.lastSeenAt.toISOString(),
  status: session.status,
  invalidatedAt: session.invalidatedAt?.toISOString() ?? null,
});

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

const buildAuthorizeRedirectUrl = (
  redirectUri: string,
  authorizationCode: string,
  state?: string,
): string => {
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', authorizationCode);
  if (state !== undefined) {
    redirectUrl.searchParams.set('state', state);
  }

  return redirectUrl.toString();
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
    private readonly oidcSessionService: OidcSessionService = new OidcSessionService(),
    private readonly consentService: OidcConsentService = new OidcConsentService(),
    private readonly interactionService: OidcInteractionService = new OidcInteractionService(),
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  async authorize(
    query: unknown,
    cookieHeader: string | undefined,
  ): Promise<AuthorizeHandlerResult> {
    try {
      const context = await this.validateAuthorizeRequest(query);
      const now = this.getNow();

      const interaction = await this.interactionService.create({
        subject: null,
        clientId: context.clientId,
        redirectUri: context.redirectUri,
        scope: context.scope,
        scopeItems: context.scopeItems,
        ...(context.state === undefined ? {} : { state: context.state }),
        codeChallenge: context.codeChallenge,
        codeChallengeMethod: context.codeChallengeMethod,
        ...(context.nonce === undefined ? {} : { nonce: context.nonce }),
        createdAt: now,
        expiresAt: new Date(now.getTime() + INTERACTION_TTL_MS),
      });

      await this.recordAuthorizeStartedAudit(context);

      const validatedSession = await this.oidcSessionService.validateSessionCookie(cookieHeader);
      if (validatedSession.status !== 'active') {
        await auditService.recordEvent({
          eventType: 'oidc.authorization.login_required',
          category: 'oidc',
          severity: 'info',
          outcome: 'denied',
          actor: { type: 'unknown', source: 'browser' },
          subject: { type: 'client', clientId: context.clientId },
          client: {
            clientId: context.clientId,
            redirectUri: context.redirectUri,
            scope: context.scopeItems,
          },
          reasonCode: 'LOGIN_REQUIRED',
        });

        return {
          kind: 'redirect',
          redirectTo: this.buildLoginInteractionRedirectUrl(interaction.interactionId),
          clearSessionCookie: validatedSession.status !== 'missing',
        };
      }

      const subject = validatedSession.session.subject;
      const consent = await this.consentService.getConsent(subject, context.clientId);

      if (!this.consentService.hasCoverage(consent, context.scopeItems)) {
        await this.interactionService.markPendingConsent(interaction.interactionId, subject);

        await auditService.recordEvent({
          eventType: 'oidc.authorization.consent_required',
          category: 'oidc',
          severity: 'info',
          outcome: 'denied',
          actor: { type: 'user', sub: subject, source: 'browser' },
          subject: { type: 'client', clientId: context.clientId },
          client: {
            clientId: context.clientId,
            redirectUri: context.redirectUri,
            scope: context.scopeItems,
          },
          reasonCode: 'CONSENT_REQUIRED',
        });

        return {
          kind: 'redirect',
          redirectTo: this.buildConsentInteractionRedirectUrl(interaction.interactionId),
          clearSessionCookie: false,
        };
      }

      await this.oidcSessionService.touchSessionForAuthorize(
        validatedSession.session.sessionId,
        context.clientId,
      );
      const redirectUrl = await this.issueAuthorizationCodeFromInteraction(
        interaction.interactionId,
        {
          subject,
          clientId: context.clientId,
          redirectUri: context.redirectUri,
          scope: context.scope,
          scopeItems: context.scopeItems,
          codeChallenge: context.codeChallenge,
          codeChallengeMethod: context.codeChallengeMethod,
          ...(context.state === undefined ? {} : { state: context.state }),
          ...(context.nonce === undefined ? {} : { nonce: context.nonce }),
        },
      );

      await auditService.recordEvent({
        eventType: 'oidc.authorization.consent_reused',
        category: 'oidc',
        severity: 'info',
        outcome: 'success',
        actor: { type: 'user', sub: subject, source: 'browser' },
        subject: { type: 'client', clientId: context.clientId },
        client: {
          clientId: context.clientId,
          redirectUri: context.redirectUri,
          scope: context.scopeItems,
        },
        reasonCode: 'CONSENT_REUSED',
      });

      return {
        kind: 'redirect',
        redirectTo: redirectUrl,
        clearSessionCookie: false,
      };
    } catch (error: unknown) {
      if (BaseError.isBaseError(error)) {
        if (error.code === 'invalid_scope') {
          await auditService.recordEvent({
            eventType: 'oidc.authorization.invalid_scope',
            category: 'security',
            severity: 'warning',
            outcome: 'denied',
            actor: { type: 'unknown', source: 'browser' },
            reasonCode: 'INVALID_SCOPE',
          });
        }

        if (error.code === 'invalid_redirect_uri') {
          await auditService.recordEvent({
            eventType: 'oidc.authorization.invalid_redirect_uri',
            category: 'security',
            severity: 'warning',
            outcome: 'denied',
            actor: { type: 'unknown', source: 'browser' },
            reasonCode: 'INVALID_REDIRECT_URI',
          });
        }
      }

      const redirectUrl = this.tryBuildRedirectFromError(error);
      if (redirectUrl !== null) {
        return {
          kind: 'redirect',
          redirectTo: redirectUrl,
          clearSessionCookie: false,
        };
      }

      if (BaseError.isBaseError(error) && error.code === 'invalid_client') {
        await auditService.recordEvent({
          eventType: 'oidc.authorization.invalid_client',
          category: 'security',
          severity: 'warning',
          outcome: 'denied',
          actor: { type: 'unknown', source: 'browser' },
          reasonCode: 'INVALID_CLIENT',
        });
      }

      throw error;
    }
  }

  async validateAuthorizeRequest(query: unknown): Promise<AuthorizeRequestContext> {
    if (typeof query !== 'object' || query === null || Array.isArray(query)) {
      throw oidcServiceError({
        code: 'invalid_request',
        message: 'authorize query must be an object.',
        statusCode: 400,
        shouldRedirect: false,
      });
    }

    const queryRecord = query as Record<string, unknown>;
    const readAuthorizeField = (
      field: string,
      options: { redirectUri?: string; state?: string; shouldRedirect?: boolean } = {},
    ): string => {
      const value = queryRecord[field];
      if (typeof value !== 'string') {
        throw oidcServiceError({
          code: 'invalid_request',
          message: `${field} is required.`,
          statusCode: 400,
          ...(options.redirectUri === undefined ? {} : { redirectUri: options.redirectUri }),
          ...(options.state === undefined ? {} : { state: options.state }),
          shouldRedirect: options.shouldRedirect ?? false,
        });
      }

      const normalized = value.trim();
      if (normalized.length === 0) {
        throw oidcServiceError({
          code: 'invalid_request',
          message: `${field} is required.`,
          statusCode: 400,
          ...(options.redirectUri === undefined ? {} : { redirectUri: options.redirectUri }),
          ...(options.state === undefined ? {} : { state: options.state }),
          shouldRedirect: options.shouldRedirect ?? false,
        });
      }

      return normalized;
    };
    const allowedAuthorizeFields = [
      'response_type',
      'client_id',
      'redirect_uri',
      'scope',
      'code_challenge',
      'code_challenge_method',
      'state',
      'nonce',
    ] as const;
    const invalidAuthorizeField = Object.keys(queryRecord).find(
      (field) => !allowedAuthorizeFields.includes(field as (typeof allowedAuthorizeFields)[number]),
    );
    if (invalidAuthorizeField !== undefined) {
      throw oidcServiceError({
        code: 'invalid_request',
        message: `Unsupported field: ${invalidAuthorizeField}.`,
        statusCode: 400,
        shouldRedirect: false,
      });
    }

    const clientId = readAuthorizeField('client_id');
    const client = await findClient(this.clients, clientId);
    const redirectUri = readAuthorizeField('redirect_uri');
    assertRedirectUri(client, redirectUri);

    const responseType = readAuthorizeField('response_type', {
      redirectUri,
      shouldRedirect: true,
    });
    if (responseType !== 'code') {
      throw oidcServiceError({
        code: 'invalid_request',
        message: 'response_type must be code.',
        statusCode: 400,
        redirectUri,
        shouldRedirect: true,
      });
    }

    const state = readOptionalString(queryRecord, 'state');
    assertState(state, redirectUri);

    const scope = readAuthorizeField('scope', {
      redirectUri,
      ...(state === undefined ? {} : { state }),
      shouldRedirect: true,
    });
    const scopeItems = normalizeScopeItems(scope);
    assertScopeAllowed(scopeItems, client.allowedScopes, redirectUri, state);

    const codeChallenge = readAuthorizeField('code_challenge', {
      redirectUri,
      ...(state === undefined ? {} : { state }),
      shouldRedirect: true,
    });
    assertPkceChallenge(codeChallenge, redirectUri, state);

    const codeChallengeMethodRaw = readAuthorizeField('code_challenge_method', {
      redirectUri,
      ...(state === undefined ? {} : { state }),
      shouldRedirect: true,
    });
    if (codeChallengeMethodRaw !== PKCE_S256) {
      throw oidcServiceError({
        code: 'invalid_request',
        message: 'code_challenge_method must be S256.',
        statusCode: 400,
        redirectUri,
        ...(state === undefined ? {} : { state }),
        shouldRedirect: true,
      });
    }

    const nonce = readOptionalString(queryRecord, 'nonce');
    assertNonce(nonce, redirectUri, state);

    const normalizedScope = scopeItems.join(' ');

    return {
      clientId,
      clientName: client.clientName,
      redirectUri,
      scope: normalizedScope,
      scopeItems,
      codeChallenge,
      codeChallengeMethod: PKCE_S256,
      ...(state === undefined ? {} : { state }),
      ...(nonce === undefined ? {} : { nonce }),
    };
  }

  async getAuthorizeInteraction(
    interactionId: string,
    cookieHeader: string | undefined,
  ): Promise<OidcAuthorizeInteractionResponse> {
    const interaction = await this.requireValidInteraction(interactionId);
    const validatedSession = await this.oidcSessionService.validateSessionCookie(cookieHeader);
    if (validatedSession.status !== 'active') {
      throw oidcServiceError({
        code: 'session_expired',
        message: 'Session is expired or invalid.',
        statusCode: 401,
        shouldRedirect: false,
      });
    }

    const subject = validatedSession.session.subject;
    if (interaction.subject !== null && interaction.subject !== subject) {
      throw oidcServiceError({
        code: 'session_expired',
        message: 'Session does not match interaction subject.',
        statusCode: 401,
        shouldRedirect: false,
      });
    }

    const consent = await this.consentService.getConsent(subject, interaction.clientId);
    if (this.consentService.hasCoverage(consent, interaction.scopeItems)) {
      await this.oidcSessionService.touchSessionForAuthorize(
        validatedSession.session.sessionId,
        interaction.clientId,
      );
      const redirectUrl = await this.issueAuthorizationCodeFromInteraction(
        interaction.interactionId,
        {
          subject,
          clientId: interaction.clientId,
          redirectUri: interaction.redirectUri,
          scope: interaction.scope,
          scopeItems: interaction.scopeItems,
          codeChallenge: interaction.codeChallenge,
          codeChallengeMethod: interaction.codeChallengeMethod,
          ...(interaction.state === undefined ? {} : { state: interaction.state }),
          ...(interaction.nonce === undefined ? {} : { nonce: interaction.nonce }),
        },
      );

      await auditService.recordEvent({
        eventType: 'oidc.authorization.consent_reused',
        category: 'oidc',
        severity: 'info',
        outcome: 'success',
        actor: { type: 'user', sub: subject, source: 'browser' },
        subject: { type: 'client', clientId: interaction.clientId },
        client: {
          clientId: interaction.clientId,
          redirectUri: interaction.redirectUri,
          scope: interaction.scopeItems,
        },
        reasonCode: 'CONSENT_REUSED',
      });

      return {
        success: true,
        data: {
          status: 'completed',
          redirectUrl,
        },
      };
    }

    await this.interactionService.markPendingConsent(interaction.interactionId, subject);

    return {
      success: true,
      data: {
        status: 'consent_required',
        interactionId: interaction.interactionId,
        clientId: interaction.clientId,
        clientName: await this.resolveClientName(interaction.clientId),
        requestedScopes: [...interaction.scopeItems],
      },
    };
  }

  async decideAuthorizeInteraction(
    input: unknown,
    cookieHeader: string | undefined,
  ): Promise<OidcAuthorizeDecisionResponse> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw oidcServiceError({
        code: 'invalid_request',
        message: 'request body must be an object.',
        statusCode: 400,
        shouldRedirect: false,
      });
    }

    const inputRecord = input as Record<string, unknown>;
    const allowedDecisionFields = ['interaction_id', 'decision'] as const;
    const invalidDecisionField = Object.keys(inputRecord).find(
      (field) => !allowedDecisionFields.includes(field as (typeof allowedDecisionFields)[number]),
    );
    if (invalidDecisionField !== undefined) {
      throw oidcServiceError({
        code: 'invalid_request',
        message: `Unsupported field: ${invalidDecisionField}.`,
        statusCode: 400,
        shouldRedirect: false,
      });
    }
    const interactionIdRaw = inputRecord.interaction_id;
    const decisionRaw = inputRecord.decision;

    if (typeof interactionIdRaw !== 'string' || interactionIdRaw.trim().length === 0) {
      throw oidcServiceError({
        code: 'invalid_request',
        message: 'interaction_id is required.',
        statusCode: 400,
        shouldRedirect: false,
      });
    }

    if (typeof decisionRaw !== 'string' || decisionRaw.trim().length === 0) {
      throw oidcServiceError({
        code: 'invalid_request',
        message: 'decision is required.',
        statusCode: 400,
        shouldRedirect: false,
      });
    }

    const interactionId = interactionIdRaw.trim();
    const decision = decisionRaw.trim();

    if (decision !== 'approve' && decision !== 'deny') {
      throw oidcServiceError({
        code: 'invalid_request',
        message: 'decision must be approve or deny.',
        statusCode: 400,
        shouldRedirect: false,
      });
    }

    const interaction = await this.requireValidInteraction(interactionId);
    if (interaction.status !== 'pending_consent') {
      throw oidcServiceError({
        code: 'consent_required',
        message: 'Interaction is not ready for consent decision.',
        statusCode: 409,
        shouldRedirect: false,
      });
    }
    const validatedSession = await this.oidcSessionService.validateSessionCookie(cookieHeader);
    if (validatedSession.status !== 'active') {
      throw oidcServiceError({
        code: 'session_expired',
        message: 'Session is expired or invalid.',
        statusCode: 401,
        shouldRedirect: false,
      });
    }

    const subject = validatedSession.session.subject;
    if (interaction.subject !== null && interaction.subject !== subject) {
      throw oidcServiceError({
        code: 'session_expired',
        message: 'Session does not match interaction subject.',
        statusCode: 401,
        shouldRedirect: false,
      });
    }

    if (decision === 'deny') {
      await this.interactionService.markDenied(interaction.interactionId, subject, this.getNow());
      const redirectUrl = buildAuthorizeErrorRedirectUrl(
        interaction.redirectUri,
        'access_denied',
        interaction.state,
      );

      await auditService.recordEvent({
        eventType: 'oidc.authorization.consent_denied',
        category: 'oidc',
        severity: 'warning',
        outcome: 'denied',
        actor: { type: 'user', sub: subject, source: 'browser' },
        subject: { type: 'client', clientId: interaction.clientId },
        client: {
          clientId: interaction.clientId,
          redirectUri: interaction.redirectUri,
          scope: interaction.scopeItems,
        },
        reasonCode: 'ACCESS_DENIED',
      });

      return {
        success: true,
        data: {
          redirectUrl,
        },
      };
    }

    await this.consentService.approveConsent(
      subject,
      interaction.clientId,
      interaction.scopeItems,
      this.getNow(),
    );
    await this.oidcSessionService.touchSessionForAuthorize(
      validatedSession.session.sessionId,
      interaction.clientId,
    );
    const redirectUrl = await this.issueAuthorizationCodeFromInteraction(
      interaction.interactionId,
      {
        subject,
        clientId: interaction.clientId,
        redirectUri: interaction.redirectUri,
        scope: interaction.scope,
        scopeItems: interaction.scopeItems,
        codeChallenge: interaction.codeChallenge,
        codeChallengeMethod: interaction.codeChallengeMethod,
        ...(interaction.state === undefined ? {} : { state: interaction.state }),
        ...(interaction.nonce === undefined ? {} : { nonce: interaction.nonce }),
      },
    );

    await auditService.recordEvent({
      eventType: 'oidc.authorization.consent_approved',
      category: 'oidc',
      severity: 'info',
      outcome: 'success',
      actor: { type: 'user', sub: subject, source: 'browser' },
      subject: { type: 'client', clientId: interaction.clientId },
      client: {
        clientId: interaction.clientId,
        redirectUri: interaction.redirectUri,
        scope: interaction.scopeItems,
      },
      reasonCode: 'CONSENT_APPROVED',
    });

    return {
      success: true,
      data: {
        redirectUrl,
      },
    };
  }

  async listConnectedApplications(
    cookieHeader: string | undefined,
  ): Promise<OidcConnectedApplicationsResponse> {
    const session = await this.requireActiveSession(cookieHeader);
    const applications = await this.consentService.listConnectedApplications(
      session.subject,
      async (clientId) => this.resolveClientName(clientId),
    );

    return {
      success: true,
      data: {
        applications,
      },
    };
  }

  async revokeConnectedApplication(
    clientId: string,
    cookieHeader: string | undefined,
  ): Promise<OidcRevokeConsentResponse> {
    const session = await this.requireActiveSession(cookieHeader);
    const consent = await this.consentService.revokeConsent(
      session.subject,
      clientId,
      this.getNow(),
    );
    if (consent === null) {
      throw oidcServiceError({
        code: 'invalid_request',
        message: 'Consent was not found for the provided client.',
        statusCode: 404,
        shouldRedirect: false,
      });
    }

    await auditService.recordEvent({
      eventType: 'oidc.authorization.consent_revoked',
      category: 'oidc',
      severity: 'warning',
      outcome: 'success',
      actor: { type: 'user', sub: session.subject, source: 'browser' },
      subject: { type: 'client', clientId },
      client: { clientId },
      reasonCode: 'CONSENT_REVOKED',
    });

    return {
      success: true,
      data: {
        clientId,
        status: 'revoked',
      },
    };
  }

  async loginInternal(input: unknown): Promise<InternalLoginResult> {
    const inputRecord = toQueryRecord(input);
    assertKnownFields(inputRecord, ['email', 'password']);
    const email = readSingleString(inputRecord, 'email');
    const password = readSingleString(inputRecord, 'password');
    const identity = await this.authBridge.validateCredentials(email, password);
    const createdSession = await this.oidcSessionService.createSession({
      subject: identity.sub,
      clientId: INTERNAL_LOGIN_CLIENT_ID,
    });

    return {
      identity,
      sessionCookie: createdSession.cookie,
      csrfCookie: createdSession.csrfCookie,
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

    await findClient(this.clients, clientId);
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

    await findClient(this.clients, clientId);
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

  async getJwks(): Promise<JsonWebKeySet> {
    return oidcKeyService.getJwks();
  }

  async logout(input: LogoutRequestInput): Promise<LogoutResult> {
    const inputRecord = toQueryRecord(input.body);
    const postLogoutRedirectUri = readOptionalString(inputRecord, 'post_logout_redirect_uri');
    const clientId = readOptionalString(inputRecord, 'client_id');
    const state = readOptionalString(inputRecord, 'state');
    const csrfTokenFromBody = readOptionalString(inputRecord, 'csrf_token');

    let redirectLocation: string | undefined;
    if (postLogoutRedirectUri !== undefined) {
      if (clientId === undefined) {
        throw invalidInput('client_id is required when post_logout_redirect_uri is provided.');
      }

      const client = await findClient(this.clients, clientId);
      assertRedirectUri(client, postLogoutRedirectUri);
      redirectLocation = buildPostLogoutRedirectUrl(postLogoutRedirectUri, state);
    }

    const validatedSession = await this.oidcSessionService.validateSessionCookie(
      input.cookieHeader,
    );
    const clearCookies = validatedSession.status !== 'missing';

    if (validatedSession.status === 'active') {
      const csrfToken = input.csrfToken ?? csrfTokenFromBody;
      const csrfValid = this.oidcSessionService.validateLogoutCsrfToken(
        validatedSession.session,
        csrfToken,
      );

      if (!csrfValid) {
        throw new BaseError('Logout request could not be processed.', {
          code: 'INVALID_CSRF',
          statusCode: 403,
        });
      }

      await this.oidcSessionService.invalidateSession(validatedSession.session.sessionId);
    }

    if (redirectLocation !== undefined) {
      return {
        kind: 'redirect',
        location: redirectLocation,
        clearSessionCookie: clearCookies,
        clearCsrfCookie: clearCookies,
      };
    }

    return {
      kind: 'json',
      body: {
        status: 'logged_out',
      },
      clearSessionCookie: clearCookies,
      clearCsrfCookie: clearCookies,
    };
  }

  getClearSessionCookieDescriptor(): OidcSessionCookieDescriptor {
    return this.oidcSessionService.buildClearCookieDescriptor();
  }

  getClearCsrfCookieDescriptor(): OidcCsrfCookieDescriptor {
    return this.oidcSessionService.buildClearCsrfCookieDescriptor();
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.oidcSessionService.invalidateSession(sessionId);
  }

  async getActiveSession(cookieHeader: string | undefined): Promise<OidcSessionView | null> {
    const sessionResult = await this.oidcSessionService.validateSessionCookie(cookieHeader);
    if (sessionResult.status !== 'active') {
      return null;
    }

    return toSessionView(sessionResult.session);
  }

  async listSessions(limit?: number): Promise<OidcSessionView[]> {
    const sessions = await this.oidcSessionService.listSessions({
      ...(limit === undefined ? {} : { limit }),
    });
    return sessions.map((session) => toSessionView(session));
  }

  async invalidateSessionsBySubject(
    subject: string,
  ): Promise<{ invalidatedCount: number; truncated: boolean }> {
    return this.oidcSessionService.invalidateSessionsBySubject(subject);
  }

  private async recordAuthorizeStartedAudit(context: AuthorizeRequestContext): Promise<void> {
    await auditService.recordEvent({
      eventType: 'oidc.authorization.started',
      category: 'oidc',
      severity: 'info',
      outcome: 'success',
      actor: { type: 'unknown', source: 'browser' },
      subject: { type: 'client', clientId: context.clientId },
      client: {
        clientId: context.clientId,
        redirectUri: context.redirectUri,
        scope: context.scopeItems,
      },
      reasonCode: 'AUTHORIZE_STARTED',
    });
  }

  private buildLoginInteractionRedirectUrl(interactionId: string): string {
    const target = new URL(config.oidc.interaction.loginPath, config.app.publicUiBaseUrl);
    target.searchParams.set('interaction_id', interactionId);
    return target.toString();
  }

  private buildConsentInteractionRedirectUrl(interactionId: string): string {
    const target = new URL(config.oidc.interaction.consentPath, config.app.publicUiBaseUrl);
    target.searchParams.set('interaction_id', interactionId);
    return target.toString();
  }

  private tryBuildRedirectFromError(error: unknown): string | null {
    if (!BaseError.isBaseError(error)) {
      return null;
    }

    const metadata = error.metadata as Record<string, unknown>;
    if (metadata.shouldRedirect !== true) {
      return null;
    }

    const redirectUri = metadata.redirectUri;
    if (typeof redirectUri !== 'string' || redirectUri.trim().length === 0) {
      return null;
    }

    const state = typeof metadata.state === 'string' ? metadata.state : undefined;
    const code = error.code as OidcProtocolErrorCode;
    return buildAuthorizeErrorRedirectUrl(redirectUri, code, state);
  }

  private async requireActiveSession(cookieHeader: string | undefined): Promise<{
    sessionId: string;
    subject: string;
  }> {
    const validatedSession = await this.oidcSessionService.validateSessionCookie(cookieHeader);
    if (validatedSession.status !== 'active') {
      throw oidcServiceError({
        code: 'session_expired',
        message: 'Session is expired or invalid.',
        statusCode: 401,
        shouldRedirect: false,
      });
    }

    return {
      sessionId: validatedSession.session.sessionId,
      subject: validatedSession.session.subject,
    };
  }

  private async resolveClientName(clientId: string): Promise<string> {
    const managedClient = await oidcClientService.getClient(clientId);
    if (managedClient !== null) {
      return managedClient.name;
    }

    const staticClient = this.clients.find((client) => client.clientId === clientId);
    return staticClient?.clientId ?? clientId;
  }

  private async requireValidInteraction(interactionId: string): Promise<{
    interactionId: string;
    status: 'pending_login' | 'pending_consent';
    subject: string | null;
    clientId: string;
    redirectUri: string;
    scope: string;
    scopeItems: string[];
    state?: string;
    codeChallenge: string;
    codeChallengeMethod: 'S256';
    nonce?: string;
  }> {
    const interaction = await this.interactionService.findById(interactionId);
    if (interaction === null) {
      await auditService.recordEvent({
        eventType: 'oidc.authorization.interaction_expired',
        category: 'oidc',
        severity: 'warning',
        outcome: 'failure',
        actor: { type: 'unknown', source: 'browser' },
        subject: { type: 'unknown', id: interactionId },
        reasonCode: 'INTERACTION_NOT_FOUND_OR_EXPIRED',
      });
      throw oidcServiceError({
        code: 'interaction_expired',
        message: 'Interaction is not available.',
        statusCode: 410,
        shouldRedirect: false,
      });
    }

    if (
      this.interactionService.isExpired(interaction, this.getNow()) ||
      interaction.status === 'expired'
    ) {
      await this.interactionService.markExpired(interaction.interactionId);
      await auditService.recordEvent({
        eventType: 'oidc.authorization.interaction_expired',
        category: 'oidc',
        severity: 'warning',
        outcome: 'failure',
        actor: { type: 'unknown', source: 'browser' },
        subject: { type: 'client', clientId: interaction.clientId },
        reasonCode: 'INTERACTION_EXPIRED',
      });
      throw oidcServiceError({
        code: 'interaction_expired',
        message: 'Interaction has expired.',
        statusCode: 410,
        shouldRedirect: false,
      });
    }

    if (interaction.status !== 'pending_login' && interaction.status !== 'pending_consent') {
      throw oidcServiceError({
        code: 'invalid_request',
        message: 'Interaction is not actionable.',
        statusCode: 409,
        shouldRedirect: false,
      });
    }

    return {
      interactionId: interaction.interactionId,
      status: interaction.status,
      subject: interaction.subject,
      clientId: interaction.clientId,
      redirectUri: interaction.redirectUri,
      scope: interaction.scope,
      scopeItems: interaction.scopeItems,
      ...(interaction.state === undefined ? {} : { state: interaction.state }),
      codeChallenge: interaction.codeChallenge,
      codeChallengeMethod: interaction.codeChallengeMethod,
      ...(interaction.nonce === undefined ? {} : { nonce: interaction.nonce }),
    };
  }

  private async issueAuthorizationCodeFromInteraction(
    interactionId: string,
    context: {
      subject: string;
      clientId: string;
      redirectUri: string;
      scope: string;
      scopeItems: string[];
      codeChallenge: string;
      codeChallengeMethod: 'S256';
      state?: string;
      nonce?: string;
    },
  ): Promise<string> {
    const issuedAuthorizationCode = await this.issueAuthorizationCode(
      {
        clientId: context.clientId,
        redirectUri: context.redirectUri,
        scope: context.scope,
        codeChallenge: context.codeChallenge,
        codeChallengeMethod: context.codeChallengeMethod,
        ...(context.state === undefined ? {} : { state: context.state }),
        ...(context.nonce === undefined ? {} : { nonce: context.nonce }),
      },
      context.subject,
    );

    await this.interactionService.markCompleted(interactionId, context.subject, this.getNow());

    await auditService.recordEvent({
      eventType: 'oidc.authorization.code_issued',
      category: 'oidc',
      severity: 'info',
      outcome: 'success',
      actor: { type: 'user', sub: context.subject, source: 'browser' },
      subject: { type: 'authorization_code', id: interactionId },
      client: {
        clientId: context.clientId,
        redirectUri: context.redirectUri,
        scope: context.scopeItems,
      },
      reasonCode: 'AUTHORIZATION_CODE_ISSUED',
    });

    return buildAuthorizeRedirectUrl(
      context.redirectUri,
      issuedAuthorizationCode.rawCode,
      context.state,
    );
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

    const client = await findClient(this.clients, clientId);
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
    const issuedAccessToken = await this.accessTokenProvider.issueAccessToken({
      subject: userIdentity.sub,
      audience: clientId,
      scope: authorizationCode.scope,
    });
    const issuedIdToken = await this.idTokenProvider.issueIdToken({
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

    await findClient(this.clients, clientId);

    const rotatedRefreshToken = await this.refreshTokenService.rotateRefreshToken({
      refreshToken: rawRefreshToken,
      clientId,
    });
    const userIdentity = await resolveOidcUserIdentity(this.users, rotatedRefreshToken.subject);
    const issuedAccessToken = await this.accessTokenProvider.issueAccessToken({
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

  private async introspectAccessToken(
    input: IntrospectTokenInput,
  ): Promise<TokenIntrospectionResponse> {
    try {
      const { payload } = await oidcKeyService.verifyJwt(input.token);
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
    context: {
      clientId: string;
      redirectUri: string;
      scope: string;
      codeChallenge: string;
      codeChallengeMethod: 'S256';
      state?: string;
      nonce?: string;
    },
    subject: string,
  ): Promise<{ rawCode: string }> {
    const rawCode = randomBytes(AUTHORIZATION_CODE_BYTE_LENGTH).toString('base64url');
    const now = this.getNow();
    const expiresAt = new Date(now.getTime() + AUTHORIZATION_CODE_TTL_MS);
    const codeHash = hashValue(rawCode);

    await this.authorizationCodeRepository.createAuthorizationCodeRecord({
      subject,
      clientId: context.clientId,
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
