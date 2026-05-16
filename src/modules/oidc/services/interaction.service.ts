import { randomBytes } from 'node:crypto';

import {
  OidcInteractionRepository,
  type OidcInteractionEntity,
} from '../repositories/interaction.repository.js';

const OIDC_INTERACTION_ID_BYTE_LENGTH = 32;

export interface CreateInteractionInput {
  subject: string | null;
  clientId: string;
  redirectUri: string;
  scope: string;
  scopeItems: string[];
  state?: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  nonce?: string;
  createdAt: Date;
  expiresAt: Date;
}

export class OidcInteractionService {
  constructor(
    private readonly repository: OidcInteractionRepository = new OidcInteractionRepository(),
  ) {}

  async create(input: CreateInteractionInput): Promise<OidcInteractionEntity> {
    const interactionId = randomBytes(OIDC_INTERACTION_ID_BYTE_LENGTH).toString('base64url');

    return this.repository.create({
      interactionId,
      subject: input.subject,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      scope: input.scope,
      scopeItems: [...input.scopeItems],
      ...(input.state === undefined ? {} : { state: input.state }),
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
      ...(input.nonce === undefined ? {} : { nonce: input.nonce }),
      status: input.subject === null ? 'pending_login' : 'pending_consent',
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
    });
  }

  async findById(interactionId: string): Promise<OidcInteractionEntity | null> {
    return this.repository.findByInteractionId(interactionId);
  }

  isExpired(interaction: OidcInteractionEntity, now: Date): boolean {
    return interaction.expiresAt.getTime() <= now.getTime();
  }

  async markPendingConsent(
    interactionId: string,
    subject: string,
  ): Promise<OidcInteractionEntity | null> {
    return this.repository.markPendingConsent(interactionId, subject);
  }

  async markCompleted(
    interactionId: string,
    subject: string,
    completedAt: Date,
  ): Promise<OidcInteractionEntity | null> {
    return this.repository.markCompleted(interactionId, subject, completedAt);
  }

  async markDenied(
    interactionId: string,
    subject: string,
    deniedAt: Date,
  ): Promise<OidcInteractionEntity | null> {
    return this.repository.markDenied(interactionId, subject, deniedAt);
  }

  async markExpired(interactionId: string): Promise<OidcInteractionEntity | null> {
    return this.repository.markExpired(interactionId);
  }
}
