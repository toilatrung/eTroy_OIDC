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

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatExpirationText = (expiresAt: Date): string => {
  const remainingMs = Math.max(0, expiresAt.getTime() - Date.now());
  const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));

  if (remainingHours >= 24 && remainingHours % 24 === 0) {
    const remainingDays = remainingHours / 24;
    return remainingDays === 1 ? '24 giờ' : `${remainingDays} ngày`;
  }

  return `${remainingHours} giờ`;
};

interface VerificationEmailTemplateInput {
  title: string;
  greetingName: string;
  message: string;
  actionUrl: string;
  buttonText: string;
  expirationText: string;
  securityNote: string;
}

const buildVerificationEmailHtml = (input: VerificationEmailTemplateInput): string => {
  const title = escapeHtml(input.title);
  const greetingName = escapeHtml(input.greetingName);
  const message = escapeHtml(input.message);
  const actionUrl = escapeHtml(input.actionUrl);
  const buttonText = escapeHtml(input.buttonText);
  const expirationText = escapeHtml(input.expirationText);
  const securityNote = escapeHtml(input.securityNote);

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>

  <body style="margin:0; padding:0; background:#f4f6f8; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 32px 20px 32px; background:#800000;">
                <div style="font-size:20px; font-weight:700; color:#ffffff;">
                  eTroy OIDC
                </div>
                <div style="margin-top:6px; font-size:14px; color:#f3dada;">
                  Identity Service
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px 0; font-size:22px; line-height:1.35; color:#111827;">
                  ${title}
                </h1>

                <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6;">
                  Xin chào${greetingName},
                </p>

                <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6;">
                  ${message}
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                  <tr>
                    <td align="center" style="border-radius:8px; background:#800000;">
                      <a href="${actionUrl}" target="_blank" style="display:inline-block; padding:12px 22px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:8px;">
                        ${buttonText}
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 10px 0; font-size:14px; line-height:1.6; color:#4b5563;">
                  Nếu nút trên không hoạt động, vui lòng sao chép và mở liên kết sau trong trình duyệt:
                </p>

                <p style="margin:0 0 24px 0; padding:12px; background:#fdf7f7; border:1px solid #ead0d0; border-radius:8px; font-size:13px; line-height:1.5; word-break:break-all;">
                  <a href="${actionUrl}" target="_blank" style="color:#800000; text-decoration:none;">
                    ${actionUrl}
                  </a>
                </p>

                <p style="margin:0 0 12px 0; font-size:14px; line-height:1.6; color:#4b5563;">
                  Liên kết này có hiệu lực trong <strong>${expirationText}</strong>.
                </p>

                <p style="margin:0; font-size:14px; line-height:1.6; color:#4b5563;">
                  ${securityNote}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px; background:#f9fafb; border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 6px 0; font-size:12px; line-height:1.5; color:#6b7280;">
                  Đây là email tự động từ hệ thống eTroy OIDC. Vui lòng không trả lời email này.
                </p>
                <p style="margin:0; font-size:12px; line-height:1.5; color:#6b7280;">
                  © eTroy OIDC Identity Service
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
    const title = 'Xác nhận địa chỉ email';
    const buttonText = 'Xác nhận email';
    const greetingName = user.name === undefined ? '' : ` ${user.name}`;
    const message =
      'Vui lòng xác nhận địa chỉ email của bạn để hoàn tất đăng ký và kích hoạt tài khoản eTroy OIDC.';
    const expirationText = formatExpirationText(generatedToken.expiresAt);
    const securityNote = 'Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.';

    await this.mail.send({
      to: user.email,
      subject: title,
      text: `${title}\n\nXin chào${greetingName},\n\n${message}\n\n${buttonText}: ${link}\n\nLiên kết có hiệu lực trong ${expirationText}.\n${securityNote}`,
      html: buildVerificationEmailHtml({
        title,
        greetingName,
        message,
        actionUrl: link,
        buttonText,
        expirationText,
        securityNote,
      }),
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
