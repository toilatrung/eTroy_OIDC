import { randomBytes } from 'node:crypto';

import { config } from '../../config/config.js';

import {
  OIDC_SESSION_ID_BYTE_LENGTH,
  OIDC_SESSION_ID_PATTERN,
  type OidcSessionRecord,
} from './oidc-session.model.js';
import {
  OidcSessionRepository,
  type OidcSessionRepositoryPort,
} from './oidc-session.repository.js';

const INVALID_COOKIE_HEADER_PATTERN = /[\r\n]/u;

export interface CreateOidcSessionInput {
  subject: string;
  clientId: string;
}

export interface OidcSessionCookieDescriptor {
  name: string;
  value: string;
  path: string;
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  maxAgeMs: number;
}

export interface CreateOidcSessionResult {
  session: OidcSessionRecord;
  cookie: OidcSessionCookieDescriptor;
}

export type SessionCookieParseResult =
  | { status: 'missing' }
  | { status: 'malformed' }
  | { status: 'present'; sessionId: string };

export type ValidatedOidcSessionResult =
  | { status: 'missing' }
  | { status: 'malformed'; clearCookie: true }
  | { status: 'unknown'; clearCookie: true }
  | { status: 'expired'; clearCookie: true }
  | { status: 'invalidated'; clearCookie: true }
  | { status: 'active'; session: OidcSessionRecord };

const normalizeNonEmpty = (value: string): string => value.trim();

const parseCookieMap = (cookieHeader: string): Map<string, string> => {
  const cookieMap = new Map<string, string>();

  for (const chunk of cookieHeader.split(';')) {
    const trimmed = chunk.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    cookieMap.set(key, rawValue);
  }

  return cookieMap;
};

export class OidcSessionService {
  constructor(
    private readonly repository: OidcSessionRepositoryPort = new OidcSessionRepository(),
    private readonly sessionTtlSeconds: number = config.oidc.session.ttlSeconds,
    private readonly cookieName: string = config.oidc.session.cookieName,
    private readonly cookiePath: string = config.oidc.session.cookiePath,
    private readonly sameSite: 'lax' = config.oidc.session.cookieSameSite,
    private readonly secureCookie: boolean = config.oidc.session.cookieSecure,
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  async createSession(input: CreateOidcSessionInput): Promise<CreateOidcSessionResult> {
    const subject = normalizeNonEmpty(input.subject);
    const clientId = normalizeNonEmpty(input.clientId);
    const createdAt = this.getNow();
    const expiresAt = new Date(createdAt.getTime() + this.sessionTtlSeconds * 1000);
    const sessionId = randomBytes(OIDC_SESSION_ID_BYTE_LENGTH).toString('base64url');
    const session = await this.repository.createSessionRecord({
      sessionId,
      subject,
      clientIds: [clientId],
      createdAt,
      expiresAt,
      lastSeenAt: createdAt,
      status: 'active',
      invalidatedAt: null,
    });

    return {
      session,
      cookie: this.buildCookieDescriptor(session.sessionId),
    };
  }

  parseSessionCookie(cookieHeader: string | undefined): SessionCookieParseResult {
    if (cookieHeader === undefined) {
      return { status: 'missing' };
    }

    if (INVALID_COOKIE_HEADER_PATTERN.test(cookieHeader)) {
      return { status: 'malformed' };
    }

    const cookieMap = parseCookieMap(cookieHeader);
    const rawCookieValue = cookieMap.get(this.cookieName);
    if (rawCookieValue === undefined) {
      return { status: 'missing' };
    }

    let decodedValue: string;
    try {
      decodedValue = decodeURIComponent(rawCookieValue);
    } catch {
      return { status: 'malformed' };
    }

    const normalizedSessionId = decodedValue.trim();
    if (!OIDC_SESSION_ID_PATTERN.test(normalizedSessionId)) {
      return { status: 'malformed' };
    }

    return {
      status: 'present',
      sessionId: normalizedSessionId,
    };
  }

  async validateSessionCookie(
    cookieHeader: string | undefined,
  ): Promise<ValidatedOidcSessionResult> {
    const parsedCookie = this.parseSessionCookie(cookieHeader);
    if (parsedCookie.status === 'missing') {
      return { status: 'missing' };
    }

    if (parsedCookie.status === 'malformed') {
      return { status: 'malformed', clearCookie: true };
    }

    const record = await this.repository.findBySessionId(parsedCookie.sessionId);
    if (record === null) {
      return { status: 'unknown', clearCookie: true };
    }

    const now = this.getNow();
    if (record.status === 'invalidated') {
      return { status: 'invalidated', clearCookie: true };
    }

    if (record.expiresAt.getTime() <= now.getTime()) {
      await this.repository.markSessionExpired({ sessionId: record.sessionId });
      return { status: 'expired', clearCookie: true };
    }

    if (record.status === 'expired') {
      return { status: 'expired', clearCookie: true };
    }

    return {
      status: 'active',
      session: record,
    };
  }

  async touchSessionForAuthorize(
    sessionId: string,
    clientId: string,
  ): Promise<OidcSessionRecord | null> {
    return this.repository.touchSession({
      sessionId,
      clientId,
      lastSeenAt: this.getNow(),
    });
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.repository.invalidateSession({
      sessionId,
      invalidatedAt: this.getNow(),
    });
  }

  buildCookieDescriptor(sessionId: string): OidcSessionCookieDescriptor {
    return {
      name: this.cookieName,
      value: sessionId,
      path: this.cookiePath,
      httpOnly: true,
      sameSite: this.sameSite,
      secure: this.secureCookie,
      maxAgeMs: this.sessionTtlSeconds * 1000,
    };
  }

  buildClearCookieDescriptor(): OidcSessionCookieDescriptor {
    return {
      ...this.buildCookieDescriptor(''),
      maxAgeMs: 0,
    };
  }
}
