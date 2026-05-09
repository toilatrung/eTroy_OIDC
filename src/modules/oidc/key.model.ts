import mongoose, { type Model } from 'mongoose';

import type { JwksRsaKey } from '../../infrastructure/crypto/index.js';

const { model, models, Schema } = mongoose;

export type OidcKeyStatus = 'active' | 'retired' | 'compromised';

export interface OidcKeyDocument {
  kid: string;
  status: OidcKeyStatus;
  algorithm: 'RS256';
  publicJwk: JwksRsaKey;
  privateKeyMaterial: string;
  createdAt: Date;
  activatedAt?: Date;
  retiredAt?: Date;
  overlapExpiresAt?: Date;
  compromisedAt?: Date;
  lastUsedAt?: Date;
  rotationReason?: string;
  createdBy?: string;
  updatedAt: Date;
}

const oidcPublicJwkSchema = new Schema<JwksRsaKey>(
  {
    kty: {
      type: String,
      required: true,
      enum: ['RSA'],
    },
    use: {
      type: String,
      required: true,
      enum: ['sig'],
    },
    alg: {
      type: String,
      required: true,
      enum: ['RS256'],
    },
    kid: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    n: {
      type: String,
      required: true,
      trim: true,
    },
    e: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const oidcKeySchema = new Schema<OidcKeyDocument>(
  {
    kid: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
      maxlength: 128,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'retired', 'compromised'],
    },
    algorithm: {
      type: String,
      required: true,
      enum: ['RS256'],
      default: 'RS256',
    },
    publicJwk: {
      type: oidcPublicJwkSchema,
      required: true,
    },
    privateKeyMaterial: {
      type: String,
      required: true,
    },
    activatedAt: {
      type: Date,
    },
    retiredAt: {
      type: Date,
    },
    overlapExpiresAt: {
      type: Date,
    },
    compromisedAt: {
      type: Date,
    },
    lastUsedAt: {
      type: Date,
    },
    rotationReason: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    createdBy: {
      type: String,
      trim: true,
      maxlength: 64,
    },
  },
  {
    timestamps: true,
    collection: 'oidc_keys',
  },
);

oidcKeySchema.index({ status: 1, updatedAt: -1 });
oidcKeySchema.index({ status: 1, overlapExpiresAt: 1 });

export const OidcKeyModel =
  (models.OidcKey as Model<OidcKeyDocument> | undefined) ??
  model<OidcKeyDocument>('OidcKey', oidcKeySchema);
