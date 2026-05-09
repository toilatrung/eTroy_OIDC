import mongoose, { type Model } from 'mongoose';

const { model, models, Schema } = mongoose;

export interface AuthorizationCodeDocument {
  subject: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeHash: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  expiresAt: Date;
  usedAt: Date | null;
}

const authorizationCodeSchema = new Schema<AuthorizationCodeDocument>(
  {
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
    redirectUri: {
      type: String,
      required: true,
      trim: true,
    },
    scope: {
      type: String,
      required: true,
      trim: true,
    },
    codeHash: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    codeChallenge: {
      type: String,
      required: true,
      trim: true,
    },
    codeChallengeMethod: {
      type: String,
      required: true,
      enum: ['S256'],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

authorizationCodeSchema.index({ expiresAt: 1, usedAt: 1 });

export const AuthorizationCodeModel =
  (models.OidcAuthorizationCode as Model<AuthorizationCodeDocument> | undefined) ??
  model<AuthorizationCodeDocument>('OidcAuthorizationCode', authorizationCodeSchema);
