import type { HydratedDocument } from 'mongoose';

import type { CreateRefreshTokenInput, RefreshTokenEntity } from './oidc.types.js';
import { RefreshTokenModel, type RefreshTokenDocument } from './refresh-token.model.js';

const toEntity = (document: HydratedDocument<RefreshTokenDocument>): RefreshTokenEntity => ({
  id: document._id.toString(),
  tokenHash: document.tokenHash,
  subject: document.subject,
  clientId: document.clientId,
  scope: document.scope,
  issuedAt: document.issuedAt,
  expiresAt: document.expiresAt,
  consumedAt: document.consumedAt ?? null,
  revokedAt: document.revokedAt ?? null,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

export class RefreshTokenRepository {
  async createRefreshTokenRecord(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity> {
    const created = await RefreshTokenModel.create({
      tokenHash: input.tokenHash,
      subject: input.subject,
      clientId: input.clientId,
      scope: input.scope,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      consumedAt: null,
      revokedAt: null,
    });

    return toEntity(created);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const record = await RefreshTokenModel.findOne({ tokenHash }).exec();
    return record === null ? null : toEntity(record);
  }
}
