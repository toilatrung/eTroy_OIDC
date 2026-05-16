export interface MailSendRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface MailSendResult {
  messageId: string;
  accepted: string[];
}

export interface MailProvider {
  send(request: MailSendRequest): Promise<MailSendResult>;
}
