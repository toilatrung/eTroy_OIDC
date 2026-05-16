import { config } from '../../config/config.js';
import { mailService, type MailService } from '../../infrastructure/mail/index.js';
import { BaseError } from '../../shared/errors/index.js';
import {
  TOKEN_PURPOSE_EMAIL_VERIFICATION,
  tokenService,
  type TokenService,
} from '../token-lifecycle/index.js';
import { userService, type UserProfile, type UserService } from '../users/user.service.js';

type VerificationUserService = Pick<UserService, 'getUserBySub' | 'markEmailVerifiedBySub'>;
type VerificationTokenService = Pick<
  TokenService,
  'generateToken' | 'validateToken' | 'consumeToken'
>;
type VerificationMailService = Pick<MailService, 'send'>;

export interface VerificationRequestResult {
  status: 'verification_requested';
  expiresAt: string;
}

const invalidInput = (message: string): BaseError =>
  new BaseError(message, {
    code: 'INVALID_INPUT',
    statusCode: 400,
  });

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string') {
    throw invalidInput(`${fieldName} is required.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw invalidInput(`${fieldName} is required.`);
  }

  return normalized;
};

export class VerificationService {
  constructor(
    private readonly users: VerificationUserService = userService,
    private readonly tokens: VerificationTokenService = tokenService,
    private readonly mail: VerificationMailService = mailService,
  ) {}

  async requestVerification(userId: unknown): Promise<VerificationRequestResult> {
    const normalizedUserId = normalizeRequiredString(userId, 'userId');
    const user = await this.users.getUserBySub(normalizedUserId);
    const generatedToken = await this.tokens.generateToken(
      normalizedUserId,
      TOKEN_PURPOSE_EMAIL_VERIFICATION,
    );
    const verificationUrl = new URL('/verify-email/result', config.app.publicUiBaseUrl);
    verificationUrl.searchParams.set('token', generatedToken.rawToken);
    const link = verificationUrl.toString();

    await this.mail.send({
      to: user.email,
      subject: 'Verify your email address',
      text: `Verify your email address by opening this link: ${link}`,
      html: `<p>Verify your email address by opening this link:</p><p><a href="${link}">${link}</a></p>`,
    });

    return {
      status: 'verification_requested',
      expiresAt: generatedToken.expiresAt.toISOString(),
    };
  }

  async verifyEmail(rawToken: unknown): Promise<UserProfile> {
    const normalizedRawToken = normalizeRequiredString(rawToken, 'token');
    const validatedToken = await this.tokens.validateToken(
      normalizedRawToken,
      TOKEN_PURPOSE_EMAIL_VERIFICATION,
    );
    const user = await this.users.markEmailVerifiedBySub(validatedToken.userId);

    await this.tokens.consumeToken(validatedToken.tokenId);
    return user;
  }
}

export const verificationService = new VerificationService();
