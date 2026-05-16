import { createNodemailerMailProvider } from './nodemailer.provider.js';
import type { MailProvider, MailSendRequest, MailSendResult } from './mail.types.js';

const ensureRecipient = (recipient: string): string => {
  const normalized = recipient.trim();
  if (normalized.length === 0) {
    throw new Error('Mail recipient is required.');
  }
  return normalized;
};

export class PlaceholderMailProvider implements MailProvider {
  async send(request: MailSendRequest): Promise<MailSendResult> {
    const to = ensureRecipient(request.to);

    return {
      messageId: `placeholder-${Date.now()}`,
      accepted: [to],
    };
  }
}

export class MailService {
  constructor(private provider: MailProvider) {}

  setProvider(provider: MailProvider): void {
    this.provider = provider;
  }

  getProvider(): MailProvider {
    return this.provider;
  }

  send(request: MailSendRequest): Promise<MailSendResult> {
    return this.provider.send(request);
  }
}

export const createMailService = (
  provider: MailProvider = createNodemailerMailProvider(),
): MailService => new MailService(provider);

export const mailService = createMailService();

export type { MailProvider, MailSendRequest, MailSendResult } from './mail.types.js';
