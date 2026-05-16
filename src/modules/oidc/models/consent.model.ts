import mongoose, { type Model } from 'mongoose';

const { model, models, Schema } = mongoose;

export type OidcConsentStatus = 'active' | 'revoked';

export interface OidcConsentDocument {
  subject: string;
  clientId: string;
  grantedScopes: string[];
  status: OidcConsentStatus;
  grantedAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

const oidcConsentSchema = new Schema<OidcConsentDocument>(
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
    grantedScopes: {
      type: [String],
      required: true,
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'revoked'],
      default: 'active',
    },
    grantedAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: true,
    },
    collection: 'oidc_consents',
  },
);

oidcConsentSchema.index({ subject: 1, clientId: 1 }, { unique: true });
oidcConsentSchema.index({ subject: 1, status: 1, updatedAt: -1 });
oidcConsentSchema.index({ clientId: 1, status: 1 });

export const OidcConsentModel =
  (models.OidcConsent as Model<OidcConsentDocument> | undefined) ??
  model<OidcConsentDocument>('OidcConsent', oidcConsentSchema);
