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
  issueAccessToken(input: AccessTokenIssueInput): AccessTokenIssueResult;
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
  issueIdToken(input: IdTokenIssueInput): IdTokenIssueResult;
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
  replacedByTokenId?: string | null;
  status?: 'active' | 'consumed' | 'revoked' | 'compromised';
  compromisedAt?: Date | null;
  compromiseReason?: 'reuse_detected' | null;
}
