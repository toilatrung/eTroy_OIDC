import mongoose, { type Model } from 'mongoose';

const { model, models, Schema } = mongoose;

export interface RefreshTokenDocument {
  tokenHash: string;
  subject: string;
  clientId: string;
  scope: string;
  familyId: string;
  parentTokenId: string | null;
  replacedByTokenId: string | null;
  status: 'active' | 'consumed' | 'revoked' | 'compromised';
  compromisedAt: Date | null;
  compromiseReason: 'reuse_detected' | null;
  issuedAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    tokenHash: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    clientId: {
      type: String,
      required: true,
      trim: true,
    },
    scope: {
      type: String,
      required: true,
      trim: true,
    },
    familyId: {
      type: String,
      required: true,
      trim: true,
    },
    parentTokenId: {
      type: String,
      default: null,
    },
    replacedByTokenId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'consumed', 'revoked', 'compromised'],
      required: true,
      default: 'active',
    },
    compromisedAt: {
      type: Date,
      default: null,
    },
    compromiseReason: {
      type: String,
      default: null,
    },
    issuedAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

refreshTokenSchema.index({ expiresAt: 1 });
refreshTokenSchema.index({ subject: 1, clientId: 1 });
refreshTokenSchema.index({ familyId: 1 });
refreshTokenSchema.index({ familyId: 1, status: 1 });

export const RefreshTokenModel =
  (models.OidcRefreshToken as Model<RefreshTokenDocument> | undefined) ??
  model<RefreshTokenDocument>('OidcRefreshToken', refreshTokenSchema);
