import type { HydratedDocument } from 'mongoose';

import {
  OidcConsentModel,
  type OidcConsentDocument,
  type OidcConsentStatus,
} from '../models/consent.model.js';

export interface OidcConsentEntity {
  id: string;
  subject: string;
  clientId: string;
  grantedScopes: string[];
  status: OidcConsentStatus;
  grantedAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

export interface UpsertOidcConsentInput {
  subject: string;
  clientId: string;
  grantedScopes: string[];
  grantedAt: Date;
}

const toEntity = (document: HydratedDocument<OidcConsentDocument>): OidcConsentEntity => ({
  id: document._id.toString(),
  subject: document.subject,
  clientId: document.clientId,
  grantedScopes: [...document.grantedScopes],
  status: document.status,
  grantedAt: document.grantedAt,
  updatedAt: document.updatedAt,
  revokedAt: document.revokedAt,
});

export class OidcConsentRepository {
  async findBySubjectAndClientId(
    subject: string,
    clientId: string,
  ): Promise<OidcConsentEntity | null> {
    const record = await OidcConsentModel.findOne({
      subject,
      clientId,
    }).exec();

    return record === null ? null : toEntity(record);
  }

  async listBySubject(subject: string): Promise<OidcConsentEntity[]> {
    const records = await OidcConsentModel.find({
      subject,
    })
      .sort({ updatedAt: -1 })
      .exec();

    return records.map((record) => toEntity(record));
  }

  async upsertActiveConsent(input: UpsertOidcConsentInput): Promise<OidcConsentEntity> {
    const updated = await OidcConsentModel.findOneAndUpdate(
      {
        subject: input.subject,
        clientId: input.clientId,
      },
      {
        $set: {
          grantedScopes: input.grantedScopes,
          status: 'active',
          revokedAt: null,
        },
        $setOnInsert: {
          grantedAt: input.grantedAt,
        },
      },
      {
        upsert: true,
        new: true,
      },
    ).exec();

    if (updated === null) {
      throw new Error('Failed to upsert consent.');
    }

    if (updated.grantedAt.getTime() > input.grantedAt.getTime()) {
      updated.grantedAt = input.grantedAt;
      await updated.save();
    }

    return toEntity(updated);
  }

  async revokeConsent(
    subject: string,
    clientId: string,
    revokedAt: Date,
  ): Promise<OidcConsentEntity | null> {
    const updated = await OidcConsentModel.findOneAndUpdate(
      {
        subject,
        clientId,
      },
      {
        $set: {
          status: 'revoked',
          revokedAt,
        },
      },
      { new: true },
    ).exec();

    return updated === null ? null : toEntity(updated);
  }
}
