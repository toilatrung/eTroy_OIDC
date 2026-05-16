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
    publicUiBaseUrl: string;
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
    mail: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      from: string;
    };
  };
  oidc: {
    clients: readonly OidcClient[];
    interaction: {
      ttlSeconds: number;
      loginPath: string;
      consentPath: string;
    };
    session: {
      ttlSeconds: number;
      cookieName: string;
      cookiePath: string;
      cookieSameSite: 'lax';
      cookieSecure: boolean;
      csrfCookieName: string;
      csrfCookiePath: string;
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
const resolvePublicUiBaseUrl = (clients: readonly OidcClient[]): string => {
  const preferredClient = clients.find((client) => client.clientId === 'etroy-web') ?? clients[0];
  const candidateRedirectUri = preferredClient?.redirectUris[0];

  if (candidateRedirectUri === undefined) {
    return validatedEnv.APP_BASE_URL;
  }

  try {
    const parsed = new URL(candidateRedirectUri);
    return `${parsed.origin}/`;
  } catch {
    return validatedEnv.APP_BASE_URL;
  }
};

const publicUiBaseUrl = resolvePublicUiBaseUrl(oidcClients);
const OIDC_INTERACTION_TTL_SECONDS = 10 * 60;
const OIDC_INTERACTION_LOGIN_PATH = '/oidc/login';
const OIDC_INTERACTION_CONSENT_PATH = '/oidc/consent';
const OIDC_SESSION_TTL_SECONDS = 8 * 60 * 60;
const OIDC_SESSION_COOKIE_NAME = 'etroy_oidc_sid';
const OIDC_SESSION_COOKIE_PATH = '/';
const OIDC_CSRF_COOKIE_NAME = 'etroy_oidc_csrf';
const OIDC_CSRF_COOKIE_PATH = '/';

export const config: Readonly<AppConfig> = Object.freeze({
  app: Object.freeze({
    environment,
    port: validatedEnv.PORT,
    baseUrl: validatedEnv.APP_BASE_URL,
    publicUiBaseUrl,
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
    mail: Object.freeze({
      host: validatedEnv.MAIL_HOST,
      port: validatedEnv.MAIL_PORT,
      secure: validatedEnv.MAIL_SECURE,
      user: validatedEnv.MAIL_USER,
      password: validatedEnv.MAIL_PASSWORD,
      from: validatedEnv.MAIL_FROM,
    }),
  }),
  oidc: Object.freeze({
    clients: Object.freeze([...oidcClients]),
    interaction: Object.freeze({
      ttlSeconds: OIDC_INTERACTION_TTL_SECONDS,
      loginPath: OIDC_INTERACTION_LOGIN_PATH,
      consentPath: OIDC_INTERACTION_CONSENT_PATH,
    }),
    session: Object.freeze({
      ttlSeconds: OIDC_SESSION_TTL_SECONDS,
      cookieName: OIDC_SESSION_COOKIE_NAME,
      cookiePath: OIDC_SESSION_COOKIE_PATH,
      cookieSameSite: 'lax',
      cookieSecure: environment === 'production',
      csrfCookieName: OIDC_CSRF_COOKIE_NAME,
      csrfCookiePath: OIDC_CSRF_COOKIE_PATH,
    }),
  }),
});
