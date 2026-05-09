import type { HydratedDocument } from 'mongoose';

import type { JwksRsaKey } from '../../infrastructure/crypto/index.js';

import { OidcKeyModel, type OidcKeyDocument, type OidcKeyStatus } from './key.model.js';

export interface OidcKeyEntity {
  id: string;
  kid: string;
  status: OidcKeyStatus;
  algorithm: 'RS256';
  publicJwk: JwksRsaKey;
  privateKeyMaterial: string;
  createdAt: Date;
  activatedAt: Date | null;
  retiredAt: Date | null;
  overlapExpiresAt: Date | null;
  compromisedAt: Date | null;
  lastUsedAt: Date | null;
  rotationReason: string | null;
  createdBy: string | null;
  updatedAt: Date;
}

export interface CreateOidcKeyInput {
  kid: string;
  status: OidcKeyStatus;
  algorithm: 'RS256';
  publicJwk: JwksRsaKey;
  privateKeyMaterial: string;
  createdAt?: Date;
  activatedAt?: Date | null;
  retiredAt?: Date | null;
  overlapExpiresAt?: Date | null;
  compromisedAt?: Date | null;
  lastUsedAt?: Date | null;
  rotationReason?: string | null;
  createdBy?: string | null;
}

const toEntity = (document: HydratedDocument<OidcKeyDocument>): OidcKeyEntity => ({
  id: document._id.toString(),
  kid: document.kid,
  status: document.status,
  algorithm: document.algorithm,
  publicJwk: document.publicJwk,
  privateKeyMaterial: document.privateKeyMaterial,
  createdAt: document.createdAt,
  activatedAt: document.activatedAt ?? null,
  retiredAt: document.retiredAt ?? null,
  overlapExpiresAt: document.overlapExpiresAt ?? null,
  compromisedAt: document.compromisedAt ?? null,
  lastUsedAt: document.lastUsedAt ?? null,
  rotationReason: document.rotationReason ?? null,
  createdBy: document.createdBy ?? null,
  updatedAt: document.updatedAt,
});

export class OidcKeyRepository {
  async createKey(input: CreateOidcKeyInput): Promise<OidcKeyEntity> {
    const created = await OidcKeyModel.create({
      kid: input.kid,
      status: input.status,
      algorithm: input.algorithm,
      publicJwk: input.publicJwk,
      privateKeyMaterial: input.privateKeyMaterial,
      createdAt: input.createdAt,
      activatedAt: input.activatedAt ?? undefined,
      retiredAt: input.retiredAt ?? undefined,
      overlapExpiresAt: input.overlapExpiresAt ?? undefined,
      compromisedAt: input.compromisedAt ?? undefined,
      lastUsedAt: input.lastUsedAt ?? undefined,
      rotationReason: input.rotationReason ?? undefined,
      createdBy: input.createdBy ?? undefined,
    });

    return toEntity(created);
  }

  async findByKid(kid: string): Promise<OidcKeyEntity | null> {
    const record = await OidcKeyModel.findOne({ kid }).exec();
    return record === null ? null : toEntity(record);
  }

  async findActiveKeys(): Promise<OidcKeyEntity[]> {
    const records = await OidcKeyModel.find({ status: 'active' }).sort({ updatedAt: -1 }).exec();
    return records.map(toEntity);
  }

  async findJwksEligibleKeys(now: Date): Promise<OidcKeyEntity[]> {
    const records = await OidcKeyModel.find({
      $or: [{ status: 'active' }, { status: 'retired', overlapExpiresAt: { $gt: now } }],
    })
      .sort({ updatedAt: -1 })
      .exec();

    return records.map(toEntity);
  }

  async updateLastUsed(kid: string, usedAt: Date): Promise<void> {
    await OidcKeyModel.updateOne({ kid }, { $set: { lastUsedAt: usedAt } }).exec();
  }

  async setActiveKey(kid: string, activatedAt: Date): Promise<boolean> {
    const result = await OidcKeyModel.updateOne(
      { kid, status: { $ne: 'compromised' } },
      {
        $set: {
          status: 'active',
          activatedAt,
        },
        $unset: {
          compromisedAt: 1,
          retiredAt: 1,
          overlapExpiresAt: 1,
        },
      },
    ).exec();

    return result.modifiedCount > 0;
  }

  async retireActiveKeysExcept(input: {
    nextActiveKid: string;
    retiredAt: Date;
    overlapExpiresAt: Date;
    rotationReason: string;
  }): Promise<number> {
    const result = await OidcKeyModel.updateMany(
      {
        status: 'active',
        kid: { $ne: input.nextActiveKid },
      },
      {
        $set: {
          status: 'retired',
          retiredAt: input.retiredAt,
          overlapExpiresAt: input.overlapExpiresAt,
          rotationReason: input.rotationReason,
        },
      },
    ).exec();

    return result.modifiedCount;
  }

  async retireKeyByKid(input: {
    kid: string;
    retiredAt: Date;
    overlapExpiresAt: Date;
    rotationReason: string;
  }): Promise<boolean> {
    const result = await OidcKeyModel.updateOne(
      { kid: input.kid, status: { $ne: 'compromised' } },
      {
        $set: {
          status: 'retired',
          retiredAt: input.retiredAt,
          overlapExpiresAt: input.overlapExpiresAt,
          rotationReason: input.rotationReason,
        },
      },
    ).exec();

    return result.modifiedCount > 0;
  }

  async markCompromised(
    kid: string,
    compromisedAt: Date,
    rotationReason: string,
  ): Promise<boolean> {
    const result = await OidcKeyModel.updateOne(
      { kid },
      {
        $set: {
          status: 'compromised',
          compromisedAt,
          rotationReason,
        },
        $unset: {
          overlapExpiresAt: 1,
        },
      },
    ).exec();

    return result.modifiedCount > 0;
  }

  async findByKidForVerification(kid: string, now: Date): Promise<OidcKeyEntity | null> {
    const record = await OidcKeyModel.findOne({
      kid,
      $or: [{ status: 'active' }, { status: 'retired', overlapExpiresAt: { $gt: now } }],
    }).exec();

    return record === null ? null : toEntity(record);
  }
}
