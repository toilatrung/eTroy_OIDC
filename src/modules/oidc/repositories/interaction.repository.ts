import type { HydratedDocument } from 'mongoose';

import {
  OidcInteractionModel,
  type OidcInteractionDocument,
  type OidcInteractionStatus,
} from '../models/interaction.model.js';

export interface OidcInteractionEntity {
  id: string;
  interactionId: string;
  subject: string | null;
  clientId: string;
  redirectUri: string;
  scope: string;
  scopeItems: string[];
  state?: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  nonce?: string;
  status: OidcInteractionStatus;
  createdAt: Date;
  expiresAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  deniedAt?: Date;
}

export interface CreateOidcInteractionInput {
  interactionId: string;
  subject: string | null;
  clientId: string;
  redirectUri: string;
  scope: string;
  scopeItems: string[];
  state?: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  nonce?: string;
  status: OidcInteractionStatus;
  createdAt: Date;
  expiresAt: Date;
}

const toEntity = (document: HydratedDocument<OidcInteractionDocument>): OidcInteractionEntity => ({
  id: document._id.toString(),
  interactionId: document.interactionId,
  subject: document.subject,
  clientId: document.clientId,
  redirectUri: document.redirectUri,
  scope: document.scope,
  scopeItems: [...document.scopeItems],
  ...(document.state === undefined ? {} : { state: document.state }),
  codeChallenge: document.codeChallenge,
  codeChallengeMethod: document.codeChallengeMethod,
  ...(document.nonce === undefined ? {} : { nonce: document.nonce }),
  status: document.status,
  createdAt: document.createdAt,
  expiresAt: document.expiresAt,
  updatedAt: document.updatedAt,
  ...(document.completedAt === undefined ? {} : { completedAt: document.completedAt }),
  ...(document.deniedAt === undefined ? {} : { deniedAt: document.deniedAt }),
});

export class OidcInteractionRepository {
  async create(input: CreateOidcInteractionInput): Promise<OidcInteractionEntity> {
    const created = await OidcInteractionModel.create({
      interactionId: input.interactionId,
      subject: input.subject,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      scope: input.scope,
      scopeItems: input.scopeItems,
      ...(input.state === undefined ? {} : { state: input.state }),
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
      ...(input.nonce === undefined ? {} : { nonce: input.nonce }),
      status: input.status,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
    });

    return toEntity(created);
  }

  async findByInteractionId(interactionId: string): Promise<OidcInteractionEntity | null> {
    const record = await OidcInteractionModel.findOne({ interactionId }).exec();
    return record === null ? null : toEntity(record);
  }

  async markPendingConsent(
    interactionId: string,
    subject: string,
  ): Promise<OidcInteractionEntity | null> {
    const updated = await OidcInteractionModel.findOneAndUpdate(
      {
        interactionId,
        status: { $in: ['pending_login', 'pending_consent'] },
      },
      {
        $set: {
          status: 'pending_consent',
          subject,
        },
      },
      { new: true },
    ).exec();

    return updated === null ? null : toEntity(updated);
  }

  async markCompleted(
    interactionId: string,
    subject: string,
    completedAt: Date,
  ): Promise<OidcInteractionEntity | null> {
    const updated = await OidcInteractionModel.findOneAndUpdate(
      {
        interactionId,
        status: { $in: ['pending_login', 'pending_consent'] },
      },
      {
        $set: {
          status: 'completed',
          subject,
          completedAt,
        },
      },
      { new: true },
    ).exec();

    return updated === null ? null : toEntity(updated);
  }

  async markDenied(
    interactionId: string,
    subject: string,
    deniedAt: Date,
  ): Promise<OidcInteractionEntity | null> {
    const updated = await OidcInteractionModel.findOneAndUpdate(
      {
        interactionId,
        status: { $in: ['pending_login', 'pending_consent'] },
      },
      {
        $set: {
          status: 'denied',
          subject,
          deniedAt,
        },
      },
      { new: true },
    ).exec();

    return updated === null ? null : toEntity(updated);
  }

  async markExpired(interactionId: string): Promise<OidcInteractionEntity | null> {
    const updated = await OidcInteractionModel.findOneAndUpdate(
      {
        interactionId,
        status: { $in: ['pending_login', 'pending_consent'] },
      },
      {
        $set: {
          status: 'expired',
        },
      },
      { new: true },
    ).exec();

    return updated === null ? null : toEntity(updated);
  }
}
