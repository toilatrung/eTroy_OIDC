import { randomBytes } from 'node:crypto';
import { hashValue } from '../../../infrastructure/crypto/index.js';
import { BaseError } from '../../../shared/errors/index.js';
import { auditService } from '../../audit/audit.service.js';
import { OidcClientRepository, type CreateClientInput } from '../repositories/client.repository.js';
import type { OidcClientDocument } from '../models/client.model.js';

export interface CreateClientRequest {
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris?: string[] | undefined;
  allowedScopes: string[];
  grantTypes: string[];
  responseTypes: string[];
  status?: 'active' | 'disabled' | undefined;
}

export interface UpdateClientRequest {
  name?: string | undefined;
  redirectUris?: string[] | undefined;
  postLogoutRedirectUris?: string[] | undefined;
  allowedScopes?: string[] | undefined;
  grantTypes?: string[] | undefined;
  responseTypes?: string[] | undefined;
  status?: 'active' | 'disabled' | undefined;
}

export interface ClientAdminView {
  clientId: string;
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  allowedScopes: string[];
  grantTypes: string[];
  responseTypes: string[];
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
  disabledAt?: Date | undefined;
  secretRotatedAt?: Date | undefined;
}

export interface ClientWithSecret {
  client: ClientAdminView;
  clientSecret: string;
}

export interface ClientValidationContext {
  clientId: string;
  clientSecret?: string;
}

const toClientAdminView = (doc: OidcClientDocument): ClientAdminView => {
  const view: ClientAdminView = {
    clientId: doc.clientId,
    name: doc.name,
    redirectUris: doc.redirectUris,
    postLogoutRedirectUris: doc.postLogoutRedirectUris,
    allowedScopes: doc.allowedScopes,
    grantTypes: doc.grantTypes,
    responseTypes: doc.responseTypes,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if (doc.disabledAt !== undefined) {
    view.disabledAt = doc.disabledAt;
  }
  if (doc.secretRotatedAt !== undefined) {
    view.secretRotatedAt = doc.secretRotatedAt;
  }
  return view;
};

const ALLOWED_GRANT_TYPES = new Set(['authorization_code', 'refresh_token']);
const ALLOWED_RESPONSE_TYPES = new Set(['code']);
const ALLOWED_SCOPES = new Set(['openid', 'profile', 'email']);

const invalidClientInput = (message: string): BaseError =>
  new BaseError(message, {
    code: 'INVALID_CLIENT_INPUT',
    statusCode: 400,
  });

const assertRedirectUris = (uris: string[]): void => {
  if (!Array.isArray(uris) || uris.length === 0) {
    throw invalidClientInput('redirectUris must be a non-empty array of strings.');
  }
  for (const uri of uris) {
    if (typeof uri !== 'string' || uri.includes('*')) {
      throw invalidClientInput('redirectUris must be exact-match strings without wildcards.');
    }
  }
};

const assertGrantTypes = (types: string[]): void => {
  if (!Array.isArray(types)) {
    throw invalidClientInput('grantTypes must be an array of strings.');
  }
  for (const t of types) {
    if (!ALLOWED_GRANT_TYPES.has(t)) {
      throw invalidClientInput(`Grant type ${t} is not allowed.`);
    }
  }
};

const assertResponseTypes = (types: string[]): void => {
  if (!Array.isArray(types)) {
    throw invalidClientInput('responseTypes must be an array of strings.');
  }
  for (const t of types) {
    if (!ALLOWED_RESPONSE_TYPES.has(t)) {
      throw invalidClientInput(`Response type ${t} is not allowed.`);
    }
  }
};

const assertScopes = (scopes: string[]): void => {
  if (!Array.isArray(scopes)) {
    throw invalidClientInput('allowedScopes must be an array of strings.');
  }
  for (const scope of scopes) {
    if (!ALLOWED_SCOPES.has(scope)) {
      throw invalidClientInput(`Scope ${scope} is not allowed.`);
    }
  }
};

export class OidcClientService {
  constructor(
    private readonly repository: OidcClientRepository = new OidcClientRepository(),
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  async createClient(input: CreateClientRequest, adminSub?: string): Promise<ClientWithSecret> {
    assertRedirectUris(input.redirectUris);
    assertGrantTypes(input.grantTypes);
    assertResponseTypes(input.responseTypes);
    assertScopes(input.allowedScopes);

    const clientId = `client_${randomBytes(16).toString('hex')}`;
    const rawSecret = randomBytes(32).toString('base64url');
    const secretHash = hashValue(rawSecret);

    const clientInput: CreateClientInput = {
      clientId,
      clientSecretHash: secretHash,
      name: input.name,
      redirectUris: input.redirectUris,
      postLogoutRedirectUris: input.postLogoutRedirectUris ?? [],
      allowedScopes: input.allowedScopes,
      grantTypes: input.grantTypes,
      responseTypes: input.responseTypes,
      status: input.status ?? 'active',
    };

    const client = await this.repository.createClient(clientInput);

    await auditService.recordEvent({
      eventType: adminSub ? 'admin.client.created' : 'oidc.client.created',
      category: adminSub ? 'admin' : 'client',
      severity: 'info',
      outcome: 'success',
      actor: adminSub ? { type: 'admin', adminSub } : { type: 'system' },
      subject: { type: 'client', clientId: client.clientId },
    });

    return {
      client: toClientAdminView(client),
      clientSecret: rawSecret,
    };
  }

  async getClient(clientId: string): Promise<ClientAdminView | null> {
    const doc = await this.repository.findByClientId(clientId);
    return doc ? toClientAdminView(doc) : null;
  }

  async listClients(skip?: number, limit?: number): Promise<ClientAdminView[]> {
    const opts: { skip?: number; limit?: number } = {};
    if (skip !== undefined) opts.skip = skip;
    if (limit !== undefined) opts.limit = limit;
    const docs = await this.repository.listClients(opts);
    return docs.map(toClientAdminView);
  }

  async updateClient(
    clientId: string,
    input: UpdateClientRequest,
    adminSub?: string,
  ): Promise<ClientAdminView | null> {
    if (input.redirectUris !== undefined) assertRedirectUris(input.redirectUris);
    if (input.grantTypes !== undefined) assertGrantTypes(input.grantTypes);
    if (input.responseTypes !== undefined) assertResponseTypes(input.responseTypes);
    if (input.allowedScopes !== undefined) assertScopes(input.allowedScopes);

    const updated = await this.repository.updateClient(clientId, input);

    if (updated) {
      await auditService.recordEvent({
        eventType: adminSub ? 'admin.client.updated' : 'oidc.client.updated',
        category: adminSub ? 'admin' : 'client',
        severity: 'info',
        outcome: 'success',
        actor: adminSub ? { type: 'admin', adminSub } : { type: 'system' },
        subject: { type: 'client', clientId },
      });
    }

    return updated ? toClientAdminView(updated) : null;
  }

  async disableClient(clientId: string, adminSub?: string): Promise<ClientAdminView | null> {
    const disabledAt = this.getNow();
    const updated = await this.repository.disableClient(clientId, disabledAt);

    if (updated) {
      await auditService.recordEvent({
        eventType: adminSub ? 'admin.client.disabled' : 'oidc.client.disabled',
        category: adminSub ? 'admin' : 'client',
        severity: 'warning',
        outcome: 'success',
        actor: adminSub ? { type: 'admin', adminSub } : { type: 'system' },
        subject: { type: 'client', clientId },
      });
    }

    return updated ? toClientAdminView(updated) : null;
  }

  async rotateClientSecret(clientId: string, adminSub?: string): Promise<ClientWithSecret | null> {
    const client = await this.repository.findByClientId(clientId);
    if (!client) return null;

    const rawSecret = randomBytes(32).toString('base64url');
    const secretHash = hashValue(rawSecret);
    const rotatedAt = this.getNow();

    const updated = await this.repository.updateClientSecretHash(clientId, secretHash, rotatedAt);

    if (updated) {
      await auditService.recordEvent({
        eventType: adminSub ? 'admin.client.secret_rotated' : 'oidc.client.secret_rotated',
        category: adminSub ? 'admin' : 'client',
        severity: 'warning',
        outcome: 'success',
        actor: adminSub ? { type: 'admin', adminSub } : { type: 'system' },
        subject: { type: 'client', clientId },
      });
      return { client: toClientAdminView(updated), clientSecret: rawSecret };
    }

    return null;
  }
}

export const oidcClientService = new OidcClientService();
