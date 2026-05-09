import { config } from '../../config/config.js';

import type {
  AccessTokenIssueInput,
  AccessTokenIssueResult,
  AccessTokenProvider,
} from './oidc.types.js';
import { oidcKeyService } from './key.service.js';

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 900;

const toEpochSeconds = (value: Date): number => Math.floor(value.getTime() / 1000);

export class JwtAccessTokenProvider implements AccessTokenProvider {
  constructor(
    private readonly issuer: string = config.app.baseUrl,
    private readonly expiresInSeconds: number = DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  async issueAccessToken(input: AccessTokenIssueInput): Promise<AccessTokenIssueResult> {
    const issuedAt = toEpochSeconds(this.getNow());
    const expiresAt = issuedAt + this.expiresInSeconds;
    const accessToken = await oidcKeyService.signJwt({
      iss: this.issuer,
      sub: input.subject,
      aud: input.audience,
      iat: issuedAt,
      exp: expiresAt,
      scope: input.scope,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresInSeconds,
    };
  }
}
