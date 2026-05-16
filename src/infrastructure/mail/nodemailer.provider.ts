import nodemailer, { type Transporter } from 'nodemailer';

import { config } from '../../config/config.js';

import type { MailProvider, MailSendRequest, MailSendResult } from './mail.types.js';

type AcceptedRecipient = string | { address: string };

const resolveAcceptedRecipient = (
  value: AcceptedRecipient | undefined,
): string => {
  if (typeof value === 'string') {
    return value;
  }

  return value?.address ?? '';
};

export class NodemailerMailProvider implements MailProvider {
  constructor(
    private readonly transporter: Transporter,
    private readonly from: string,
  ) {}

  async send(request: MailSendRequest): Promise<MailSendResult> {
    try {
      const response = await this.transporter.sendMail({
        from: this.from,
        to: request.to,
        subject: request.subject,
        text: request.text,
        html: request.html,
      });

      return {
        messageId: response.messageId,
        accepted: (response.accepted as Array<AcceptedRecipient | undefined>)
          .map((recipient) => resolveAcceptedRecipient(recipient))
          .filter((recipient: string) => recipient.length > 0),
      };
    } catch (error: unknown) {
      throw new Error('Mail provider send operation failed.', {
        cause: error,
      });
    }
  }
}

export const createNodemailerMailProvider = (): NodemailerMailProvider => {
  const transporter = nodemailer.createTransport({
    host: config.infrastructure.mail.host,
    port: config.infrastructure.mail.port,
    secure: config.infrastructure.mail.secure,
    auth: {
      user: config.infrastructure.mail.user,
      pass: config.infrastructure.mail.password,
    },
  });

  return new NodemailerMailProvider(transporter, config.infrastructure.mail.from);
};
