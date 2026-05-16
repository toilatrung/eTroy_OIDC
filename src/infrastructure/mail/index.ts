export {
  createMailService,
  MailService,
  PlaceholderMailProvider,
  mailService,
} from './mail.service.js';
export { NodemailerMailProvider, createNodemailerMailProvider } from './nodemailer.provider.js';

export type { MailProvider, MailSendRequest, MailSendResult } from './mail.types.js';
