import mongoose, { type Model } from 'mongoose';

const { model, models, Schema } = mongoose;

export type OidcInteractionStatus =
  | 'pending_login'
  | 'pending_consent'
  | 'completed'
  | 'denied'
  | 'expired';

export interface OidcInteractionDocument {
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

const oidcInteractionSchema = new Schema<OidcInteractionDocument>(
  {
    interactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    subject: {
      type: String,
      default: null,
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
    scopeItems: {
      type: [String],
      required: true,
      default: [],
    },
    state: {
      type: String,
      trim: true,
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
    nonce: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending_login', 'pending_consent', 'completed', 'denied', 'expired'],
      default: 'pending_login',
    },
    createdAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    deniedAt: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: true,
    },
  },
);

oidcInteractionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
oidcInteractionSchema.index({ clientId: 1, status: 1, expiresAt: 1 });
oidcInteractionSchema.index({ subject: 1, status: 1, updatedAt: -1 });

export const OidcInteractionModel =
  (models.OidcInteraction as Model<OidcInteractionDocument> | undefined) ??
  model<OidcInteractionDocument>('OidcInteraction', oidcInteractionSchema);
