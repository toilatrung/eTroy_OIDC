import Provider from 'oidc-provider';

import { config, type OidcClient } from '../../../config/config.js';

export interface OidcProviderConfig {
  issuer: string;
  clients: OidcClient[];
}

const mapClientsForProvider = (
  clients: readonly OidcClient[],
): Array<{ client_id: string; redirect_uris: string[]; response_types: ['code'] }> =>
  clients.map((client) => ({
    client_id: client.clientId,
    redirect_uris: [...client.redirectUris],
    response_types: ['code'],
  }));

export const createOidcProviderConfig = (): OidcProviderConfig => ({
  issuer: config.app.baseUrl,
  clients: [...config.oidc.clients],
});

export const createOidcProviderFactory = (): (() => Provider) => {
  const providerConfig = createOidcProviderConfig();

  // Sprint 08 keeps oidc-provider at configuration/factory level only.
  // Callback middleware mounting and broader runtime exposure (/token, etc.)
  // are intentionally deferred to later approved sprint scope.
  return () =>
    new Provider(providerConfig.issuer, {
      clients: mapClientsForProvider(providerConfig.clients),
      pkce: {
        required: () => true,
      },
    });
};
