import type { HydratedDocument } from 'mongoose';

import type { CreateRefreshTokenInput, RefreshTokenEntity } from '../types/oidc.types.js';
import { RefreshTokenModel, type RefreshTokenDocument } from '../models/refresh-token.model.js';

const toEntity = (document: HydratedDocument<RefreshTokenDocument>): RefreshTokenEntity => ({
  id: document._id.toString(),
  tokenHash: document.tokenHash,
  subject: document.subject,
  clientId: document.clientId,
  scope: document.scope,
  familyId: document.familyId ?? document.tokenHash,
  parentTokenId: document.parentTokenId ?? null,
  replacedByTokenId: document.replacedByTokenId ?? null,
  status: document.status ?? 'active',
  compromisedAt: document.compromisedAt ?? null,
  compromiseReason: document.compromiseReason ?? null,
  issuedAt: document.issuedAt,
  expiresAt: document.expiresAt,
  consumedAt: document.consumedAt ?? null,
  revokedAt: document.revokedAt ?? null,
  revokedReason: document.revokedReason ?? null,
  revokedByClientId: document.revokedByClientId ?? null,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

export interface ConsumeRefreshTokenAtomicInput {
  tokenHash: string;
  clientId: string;
  consumedAt: Date;
}

export interface MarkFamilyCompromisedInput {
  familyId: string;
  compromisedAt: Date;
}

export interface RevokeTokenInput {
  tokenId: string;
  revokedAt: Date;
  revokedReason: string;
  revokedByClientId: string;
}

export interface RevokeFamilyActiveTokensInput {
  familyId: string;
  revokedAt: Date;
  revokedReason: string;
  revokedByClientId: string;
}

export interface RefreshTokenRepositoryPort {
  createRefreshTokenRecord(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  consumeRefreshTokenAtomic(
    input: ConsumeRefreshTokenAtomicInput,
  ): Promise<RefreshTokenEntity | null>;
  setReplacementToken(parentTokenId: string, replacementTokenId: string): Promise<void>;
  markFamilyCompromised(input: MarkFamilyCompromisedInput): Promise<void>;
  revokeToken(input: RevokeTokenInput): Promise<void>;
  revokeFamilyActiveTokens(input: RevokeFamilyActiveTokensInput): Promise<void>;
  isFamilyCompromised(familyId: string): Promise<boolean>;
  isFamilyRevoked(familyId: string): Promise<boolean>;
}

export class RefreshTokenRepository implements RefreshTokenRepositoryPort {
  async createRefreshTokenRecord(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity> {
    const created = await RefreshTokenModel.create({
      tokenHash: input.tokenHash,
      subject: input.subject,
      clientId: input.clientId,
      scope: input.scope,
      familyId: input.familyId,
      parentTokenId: input.parentTokenId,
      replacedByTokenId: input.replacedByTokenId ?? null,
      status: input.status ?? 'active',
      compromisedAt: input.compromisedAt ?? null,
      compromiseReason: input.compromiseReason ?? null,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      consumedAt: input.consumedAt ?? null,
      revokedAt: input.revokedAt ?? null,
      revokedReason: input.revokedReason ?? null,
      revokedByClientId: input.revokedByClientId ?? null,
    });

    return toEntity(created);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const record = await RefreshTokenModel.findOne({ tokenHash }).exec();
    return record === null ? null : toEntity(record);
  }

  async consumeRefreshTokenAtomic(
    input: ConsumeRefreshTokenAtomicInput,
  ): Promise<RefreshTokenEntity | null> {
    const consumed = await RefreshTokenModel.findOneAndUpdate(
      {
        tokenHash: input.tokenHash,
        clientId: input.clientId,
        status: 'active',
        consumedAt: null,
        revokedAt: null,
        expiresAt: { $gt: input.consumedAt },
      },
      {
        $set: {
          consumedAt: input.consumedAt,
          status: 'consumed',
        },
      },
      { new: true },
    ).exec();

    return consumed === null ? null : toEntity(consumed);
  }

  async setReplacementToken(parentTokenId: string, replacementTokenId: string): Promise<void> {
    await RefreshTokenModel.updateOne(
      { _id: parentTokenId },
      {
        $set: {
          replacedByTokenId: replacementTokenId,
        },
      },
    ).exec();
  }

  async markFamilyCompromised(input: MarkFamilyCompromisedInput): Promise<void> {
    await RefreshTokenModel.updateMany(
      { familyId: input.familyId, status: { $ne: 'revoked' } },
      {
        $set: {
          status: 'compromised',
          compromisedAt: input.compromisedAt,
          compromiseReason: 'reuse_detected',
        },
      },
    ).exec();
  }

  async revokeToken(input: RevokeTokenInput): Promise<void> {
    await RefreshTokenModel.updateOne(
      { _id: input.tokenId, status: { $ne: 'compromised' } },
      {
        $set: {
          status: 'revoked',
          revokedAt: input.revokedAt,
          revokedReason: input.revokedReason,
          revokedByClientId: input.revokedByClientId,
        },
      },
    ).exec();
  }

  async revokeFamilyActiveTokens(input: RevokeFamilyActiveTokensInput): Promise<void> {
    await RefreshTokenModel.updateMany(
      { familyId: input.familyId, status: 'active' },
      {
        $set: {
          status: 'revoked',
          revokedAt: input.revokedAt,
          revokedReason: input.revokedReason,
          revokedByClientId: input.revokedByClientId,
        },
      },
    ).exec();
  }

  async isFamilyCompromised(familyId: string): Promise<boolean> {
    const record = await RefreshTokenModel.findOne({ familyId, status: 'compromised' })
      .select({ _id: 1 })
      .lean()
      .exec();

    return record !== null;
  }

  async isFamilyRevoked(familyId: string): Promise<boolean> {
    const record = await RefreshTokenModel.findOne({ familyId, status: 'revoked' })
      .select({ _id: 1 })
      .lean()
      .exec();

    return record !== null;
  }
}
