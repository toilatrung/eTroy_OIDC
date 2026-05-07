import { validatedEnv } from './env.js';

export interface OidcClient {
  clientId: string;
  redirectUris: readonly string[];
}

export interface AppConfig {
  app: {
    environment: 'development' | 'test' | 'production';
    port: number;
    baseUrl: string;
    isDevelopment: boolean;
    isTest: boolean;
    isProduction: boolean;
  };
  infrastructure: {
    mongodb: {
      uri: string;
    };
    redis: {
      url: string;
    };
  };
  oidc: {
    clients: readonly OidcClient[];
    session: {
      ttlSeconds: number;
      cookieName: string;
      cookiePath: string;
      cookieSameSite: 'lax';
      cookieSecure: boolean;
    };
  };
}

const environment = validatedEnv.NODE_ENV;

const hasHttpProtocol = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const invalidOidcClients = (message: string): never => {
  throw new Error(`Invalid OIDC_CLIENTS_JSON: ${message}`);
};

const parseOidcClients = (raw: string): OidcClient[] => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return invalidOidcClients('must be valid JSON.');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return invalidOidcClients('must be a non-empty array.');
  }

  const clients = parsed.map((client, index): OidcClient => {
    if (typeof client !== 'object' || client === null || Array.isArray(client)) {
      return invalidOidcClients(`client at index ${index} must be an object.`);
    }

    const candidate = client as Record<string, unknown>;
    const { clientId, redirectUris } = candidate;

    if (typeof clientId !== 'string' || clientId.trim().length === 0) {
      return invalidOidcClients(`clientId at index ${index} is required.`);
    }

    if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
      return invalidOidcClients(`redirectUris at index ${index} must be a non-empty array.`);
    }

    const normalizedRedirectUris = redirectUris.map((redirectUri, uriIndex): string => {
      if (typeof redirectUri !== 'string' || redirectUri.trim().length === 0) {
        return invalidOidcClients(
          `redirectUris[${uriIndex}] at index ${index} must be a non-empty string.`,
        );
      }

      const normalized = redirectUri.trim();
      if (!hasHttpProtocol(normalized)) {
        return invalidOidcClients(
          `redirectUris[${uriIndex}] at index ${index} must start with http:// or https://.`,
        );
      }

      return normalized;
    });

    return Object.freeze({
      clientId: clientId.trim(),
      redirectUris: Object.freeze([...normalizedRedirectUris]),
    });
  });

  const seenClientIds = new Set<string>();
  for (const client of clients) {
    if (seenClientIds.has(client.clientId)) {
      return invalidOidcClients(`duplicate clientId "${client.clientId}" is not allowed.`);
    }

    seenClientIds.add(client.clientId);
  }

  return clients;
};

const oidcClients = parseOidcClients(validatedEnv.OIDC_CLIENTS_JSON);
const OIDC_SESSION_TTL_SECONDS = 8 * 60 * 60;
const OIDC_SESSION_COOKIE_NAME = 'etroy_oidc_sid';
const OIDC_SESSION_COOKIE_PATH = '/authorize';

export const config: Readonly<AppConfig> = Object.freeze({
  app: Object.freeze({
    environment,
    port: validatedEnv.PORT,
    baseUrl: validatedEnv.APP_BASE_URL,
    isDevelopment: environment === 'development',
    isTest: environment === 'test',
    isProduction: environment === 'production',
  }),
  infrastructure: Object.freeze({
    mongodb: Object.freeze({
      uri: validatedEnv.MONGO_URI,
    }),
    redis: Object.freeze({
      url: validatedEnv.REDIS_URL,
    }),
  }),
  oidc: Object.freeze({
    clients: Object.freeze([...oidcClients]),
    session: Object.freeze({
      ttlSeconds: OIDC_SESSION_TTL_SECONDS,
      cookieName: OIDC_SESSION_COOKIE_NAME,
      cookiePath: OIDC_SESSION_COOKIE_PATH,
      cookieSameSite: 'lax',
      cookieSecure: environment === 'production',
    }),
  }),
});
