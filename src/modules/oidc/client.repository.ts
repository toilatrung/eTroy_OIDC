import { OidcClientModel, type OidcClientDocument } from './client.model.js';

export interface CreateClientInput {
  clientId: string;
  clientSecretHash: string;
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  allowedScopes: string[];
  grantTypes: string[];
  responseTypes: string[];
  status: 'active' | 'disabled';
}

export interface UpdateClientInput {
  name?: string | undefined;
  redirectUris?: string[] | undefined;
  postLogoutRedirectUris?: string[] | undefined;
  allowedScopes?: string[] | undefined;
  grantTypes?: string[] | undefined;
  responseTypes?: string[] | undefined;
}

export class OidcClientRepository {
  async createClient(input: CreateClientInput): Promise<OidcClientDocument> {
    const client = new OidcClientModel(input);
    return client.save();
  }

  async findByClientId(clientId: string): Promise<OidcClientDocument | null> {
    return OidcClientModel.findOne({ clientId }).exec();
  }

  async listClients({
    skip = 0,
    limit = 50,
  }: {
    skip?: number;
    limit?: number;
  }): Promise<OidcClientDocument[]> {
    return OidcClientModel.find().skip(skip).limit(limit).exec();
  }

  async updateClient(
    clientId: string,
    updates: UpdateClientInput,
  ): Promise<OidcClientDocument | null> {
    const doc = await OidcClientModel.findOne({ clientId }).exec();
    if (!doc) {
      return null;
    }

    if (updates.name !== undefined) doc.name = updates.name;
    if (updates.redirectUris !== undefined) doc.redirectUris = updates.redirectUris;
    if (updates.postLogoutRedirectUris !== undefined)
      doc.postLogoutRedirectUris = updates.postLogoutRedirectUris;
    if (updates.allowedScopes !== undefined) doc.allowedScopes = updates.allowedScopes;
    if (updates.grantTypes !== undefined) doc.grantTypes = updates.grantTypes;
    if (updates.responseTypes !== undefined) doc.responseTypes = updates.responseTypes;

    return doc.save();
  }

  async disableClient(clientId: string, disabledAt: Date): Promise<OidcClientDocument | null> {
    const doc = await OidcClientModel.findOne({ clientId }).exec();
    if (!doc) {
      return null;
    }

    doc.status = 'disabled';
    doc.disabledAt = disabledAt;
    return doc.save();
  }

  async updateClientSecretHash(
    clientId: string,
    newHash: string,
    rotatedAt: Date,
  ): Promise<OidcClientDocument | null> {
    const doc = await OidcClientModel.findOne({ clientId }).exec();
    if (!doc) {
      return null;
    }

    doc.clientSecretHash = newHash;
    doc.secretRotatedAt = rotatedAt;
    return doc.save();
  }
}
