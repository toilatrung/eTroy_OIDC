import mongoose, { type Model } from 'mongoose';

const { model, models, Schema } = mongoose;

export interface OidcClientDocument {
  clientId: string;
  clientSecretHash: string;
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  allowedScopes: string[];
  grantTypes: string[];
  responseTypes: string[];
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
  disabledAt?: Date;
  secretRotatedAt?: Date;
}

const oidcClientSchema = new Schema<OidcClientDocument>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 128,
    },
    clientSecretHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },
    redirectUris: {
      type: [String],
      required: true,
      default: [],
    },
    postLogoutRedirectUris: {
      type: [String],
      default: [],
    },
    allowedScopes: {
      type: [String],
      required: true,
      default: [],
    },
    grantTypes: {
      type: [String],
      required: true,
      default: [],
    },
    responseTypes: {
      type: [String],
      required: true,
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    disabledAt: {
      type: Date,
    },
    secretRotatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'oidc_clients',
  },
);

oidcClientSchema.index({ clientId: 1 }, { unique: true });

export const OidcClientModel =
  (models.OidcClient as Model<OidcClientDocument> | undefined) ??
  model<OidcClientDocument>('OidcClient', oidcClientSchema);
