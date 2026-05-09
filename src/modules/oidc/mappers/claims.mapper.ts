import type { OidcClaims, OidcUserIdentity } from '../types/oidc.types.js';

export interface UsersIdentityContractInput {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  avatar_url?: string;
}

const toScopeSet = (scope: string): ReadonlySet<string> =>
  new Set(scope.split(/\s+/u).filter((entry) => entry.length > 0));

export const toOidcUserIdentity = (input: UsersIdentityContractInput): OidcUserIdentity => ({
  sub: input.sub,
  email: input.email,
  emailVerified: input.email_verified,
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.avatar_url === undefined ? {} : { avatarUrl: input.avatar_url }),
});

export const mapOidcClaimsByScope = (user: OidcUserIdentity, scope: string): OidcClaims => {
  const scopeSet = toScopeSet(scope);
  const claims: OidcClaims = {
    sub: user.sub,
  };

  if (scopeSet.has('email')) {
    claims.email = user.email;
    claims.email_verified = user.emailVerified;
  }

  if (scopeSet.has('profile')) {
    if (user.name !== undefined) {
      claims.name = user.name;
    }

    if (user.avatarUrl !== undefined) {
      claims.picture = user.avatarUrl;
    }
  }

  return claims;
};
