export interface AccessTokenIssueResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AccessTokenIssueInput {
  subject: string;
  audience: string;
  scope: string;
}

export interface AccessTokenProvider {
  issueAccessToken(input: AccessTokenIssueInput): Promise<AccessTokenIssueResult>;
}

export interface IdTokenIssueInput {
  audience: string;
  scope: string;
  user: OidcUserIdentity;
}

export interface IdTokenIssueResult {
  idToken: string;
}

export interface IdTokenProvider {
  issueIdToken(input: IdTokenIssueInput): Promise<IdTokenIssueResult>;
}

export interface OidcUserIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

export interface OidcClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export interface AuthorizationCodeEntity {
  id: string;
  subject: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeHash: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  expiresAt: Date;
  usedAt: Date | null;
}

export interface CreateAuthorizationCodeInput {
  subject: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeHash: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  expiresAt: Date;
}

export interface RefreshTokenEntity {
  id: string;
  tokenHash: string;
  subject: string;
  clientId: string;
  scope: string;
  familyId: string;
  parentTokenId: string | null;
  replacedByTokenId: string | null;
  status: 'active' | 'consumed' | 'revoked' | 'compromised';
  compromisedAt: Date | null;
  compromiseReason: 'reuse_detected' | null;
  issuedAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  revokedByClientId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRefreshTokenInput {
  tokenHash: string;
  subject: string;
  clientId: string;
  scope: string;
  familyId: string;
  parentTokenId: string | null;
  issuedAt: Date;
  expiresAt: Date;
  consumedAt?: Date | null;
  revokedAt?: Date | null;
  revokedReason?: string | null;
  revokedByClientId?: string | null;
  replacedByTokenId?: string | null;
  status?: 'active' | 'consumed' | 'revoked' | 'compromised';
  compromisedAt?: Date | null;
  compromiseReason?: 'reuse_detected' | null;
}

export interface RevokeTokenInput {
  token: string;
  tokenTypeHint?: string;
  clientId: string;
}

export interface IntrospectTokenInput {
  token: string;
  tokenTypeHint?: string;
  clientId: string;
}

export interface InactiveTokenIntrospectionResponse {
  active: false;
}

export interface ActiveRefreshTokenIntrospectionResponse {
  active: true;
  token_type: 'refresh_token';
  client_id: string;
  sub: string;
  scope: string;
  exp: number;
  iat: number;
}

export interface ActiveAccessTokenIntrospectionResponse {
  active: true;
  token_type: 'access_token';
  client_id: string;
  sub: string;
  scope: string;
  exp: number;
  iat: number;
  iss: string;
}

export type TokenIntrospectionResponse =
  | InactiveTokenIntrospectionResponse
  | ActiveRefreshTokenIntrospectionResponse
  | ActiveAccessTokenIntrospectionResponse;

export type {
  OidcSessionRecord as OidcSessionEntity,
  OidcSessionStatus,
} from './oidc-session.model.js';
