import { config } from '../../../config/config.js';

import { mapOidcClaimsByScope } from '../mappers/claims.mapper.js';
import { oidcKeyService } from '../services/key.service.js';
import type {
  IdTokenIssueInput,
  IdTokenIssueResult,
  IdTokenProvider,
} from '../types/oidc.types.js';

const DEFAULT_ID_TOKEN_TTL_SECONDS = 900;

const toEpochSeconds = (value: Date): number => Math.floor(value.getTime() / 1000);

export class JwtIdTokenProvider implements IdTokenProvider {
  constructor(
    private readonly issuer: string = config.app.baseUrl,
    private readonly expiresInSeconds: number = DEFAULT_ID_TOKEN_TTL_SECONDS,
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  async issueIdToken(input: IdTokenIssueInput): Promise<IdTokenIssueResult> {
    const issuedAt = toEpochSeconds(this.getNow());
    const expiresAt = issuedAt + this.expiresInSeconds;
    const scopedClaims = mapOidcClaimsByScope(input.user, input.scope);
    const idToken = await oidcKeyService.signJwt({
      iss: this.issuer,
      sub: input.user.sub,
      aud: input.audience,
      iat: issuedAt,
      exp: expiresAt,
      ...(scopedClaims.email === undefined ? {} : { email: scopedClaims.email }),
      ...(scopedClaims.email_verified === undefined
        ? {}
        : { email_verified: scopedClaims.email_verified }),
      ...(scopedClaims.name === undefined ? {} : { name: scopedClaims.name }),
      ...(scopedClaims.picture === undefined ? {} : { picture: scopedClaims.picture }),
    });

    return {
      idToken,
    };
  }
}
