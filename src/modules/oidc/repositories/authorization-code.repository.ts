import mongoose, { type HydratedDocument } from 'mongoose';

import type { AuthorizationCodeEntity, CreateAuthorizationCodeInput } from '../types/oidc.types.js';
import {
  AuthorizationCodeModel,
  type AuthorizationCodeDocument,
} from '../models/authorization-code.model.js';

const { isValidObjectId } = mongoose;

const toEntity = (
  document: HydratedDocument<AuthorizationCodeDocument>,
): AuthorizationCodeEntity => ({
  id: document._id.toString(),
  subject: document.subject,
  clientId: document.clientId,
  redirectUri: document.redirectUri,
  scope: document.scope,
  codeHash: document.codeHash,
  codeChallenge: document.codeChallenge,
  codeChallengeMethod: document.codeChallengeMethod,
  expiresAt: document.expiresAt,
  usedAt: document.usedAt ?? null,
});

export class AuthorizationCodeRepository {
  async createAuthorizationCodeRecord(
    input: CreateAuthorizationCodeInput,
  ): Promise<AuthorizationCodeEntity> {
    const created = await AuthorizationCodeModel.create({
      subject: input.subject,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      scope: input.scope,
      codeHash: input.codeHash,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
      expiresAt: input.expiresAt,
      usedAt: null,
    });

    return toEntity(created);
  }

  async findByCodeHash(codeHash: string): Promise<AuthorizationCodeEntity | null> {
    const record = await AuthorizationCodeModel.findOne({ codeHash }).exec();
    return record === null ? null : toEntity(record);
  }

  async consumeAuthorizationCodeAtomic(
    authorizationCodeId: string,
    consumedAt: Date,
  ): Promise<AuthorizationCodeEntity | null> {
    if (!isValidObjectId(authorizationCodeId)) {
      return null;
    }

    const consumed = await AuthorizationCodeModel.findOneAndUpdate(
      { _id: authorizationCodeId, usedAt: null },
      { $set: { usedAt: consumedAt } },
      { new: true },
    ).exec();

    return consumed === null ? null : toEntity(consumed);
  }
}
