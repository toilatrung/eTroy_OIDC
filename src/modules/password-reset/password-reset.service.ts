import { config } from '../../config/config.js';
import { mailService, type MailService } from '../../infrastructure/mail/index.js';
import { BaseError } from '../../shared/errors/index.js';
import {
  TOKEN_PURPOSE_PASSWORD_RESET,
  tokenService,
  type TokenService,
} from '../token-lifecycle/index.js';
import {
  userService,
  type UserCredentialIdentity,
  type UserService,
} from '../users/user.service.js';

type PasswordResetUserService = Pick<
  UserService,
  'getCredentialIdentityByEmail' | 'changePassword'
>;
type PasswordResetTokenService = Pick<
  TokenService,
  'generateToken' | 'validateToken' | 'consumeToken'
>;
type PasswordResetMailService = Pick<MailService, 'send'>;

export interface PasswordResetSuccessResponse {
  status: 'success';
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

const successResponse = (): PasswordResetSuccessResponse => ({ status: 'success' });

export class PasswordResetService {
  constructor(
    private readonly users: PasswordResetUserService = userService,
    private readonly tokens: PasswordResetTokenService = tokenService,
    private readonly mail: PasswordResetMailService = mailService,
  ) {}

  async requestReset(email: unknown): Promise<PasswordResetSuccessResponse> {
    const normalizedEmail = normalizeRequiredString(email, 'email');
    const user = await this.users.getCredentialIdentityByEmail(normalizedEmail);

    if (user !== null) {
      // Side effects are intentionally detached to keep externally observable response behavior uniform.
      void this.dispatchResetTokenEmail(user);
    }

    return successResponse();
  }

  async confirmReset(
    rawToken: unknown,
    newPassword: unknown,
  ): Promise<PasswordResetSuccessResponse> {
    const normalizedRawToken = normalizeRequiredString(rawToken, 'token');
    const normalizedNewPassword = normalizeRequiredString(newPassword, 'newPassword');
    const validatedToken = await this.tokens.validateToken(
      normalizedRawToken,
      TOKEN_PURPOSE_PASSWORD_RESET,
    );

    await this.users.changePassword(validatedToken.userId, {
      newPassword: normalizedNewPassword,
    });
    await this.tokens.consumeToken(validatedToken.tokenId);

    return successResponse();
  }

  private async dispatchResetTokenEmail(user: UserCredentialIdentity): Promise<void> {
    try {
      const generatedToken = await this.tokens.generateToken(
        user.sub,
        TOKEN_PURPOSE_PASSWORD_RESET,
      );
      const resetUrl = new URL('/reset-password', config.app.baseUrl);
      resetUrl.searchParams.set('token', generatedToken.rawToken);
      const link = resetUrl.toString();

      await this.mail.send({
        to: user.email,
        subject: 'Reset your password',
        text: `Reset your password by opening this link: ${link}`,
        html: `<p>Reset your password by opening this link:</p><p><a href="${link}">${link}</a></p>`,
      });
    } catch {
      // Suppress side-effect errors to preserve anti-enumeration response behavior.
    }
  }
}

export const passwordResetService = new PasswordResetService();
