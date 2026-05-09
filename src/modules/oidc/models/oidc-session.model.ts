export type OidcSessionStatus = 'active' | 'expired' | 'invalidated';

export interface OidcSessionRecord {
  sessionId: string;
  subject: string;
  clientIds: string[];
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  status: OidcSessionStatus;
  invalidatedAt: Date | null;
  csrfTokenHash: string | null;
}

export interface StoredOidcSessionRecord {
  sessionId: string;
  subject: string;
  clientIds: string[];
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  status: OidcSessionStatus;
  invalidatedAt: string | null;
  csrfTokenHash: string | null;
}

export const OIDC_SESSION_ID_BYTE_LENGTH = 48;
export const OIDC_SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43,256}$/u;

const assertValidDate = (value: string, fieldName: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`OIDC session record field "${fieldName}" must be a valid ISO date.`);
  }

  return parsed;
};

export const serializeOidcSessionRecord = (record: OidcSessionRecord): StoredOidcSessionRecord => ({
  sessionId: record.sessionId,
  subject: record.subject,
  clientIds: [...record.clientIds],
  createdAt: record.createdAt.toISOString(),
  expiresAt: record.expiresAt.toISOString(),
  lastSeenAt: record.lastSeenAt.toISOString(),
  status: record.status,
  invalidatedAt: record.invalidatedAt?.toISOString() ?? null,
  csrfTokenHash: record.csrfTokenHash,
});

export const deserializeOidcSessionRecord = (value: string): OidcSessionRecord | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const candidate = parsed as Partial<StoredOidcSessionRecord>;
  if (
    typeof candidate.sessionId !== 'string' ||
    typeof candidate.subject !== 'string' ||
    !Array.isArray(candidate.clientIds) ||
    !candidate.clientIds.every((clientId) => typeof clientId === 'string') ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.expiresAt !== 'string' ||
    typeof candidate.lastSeenAt !== 'string' ||
    (candidate.status !== 'active' &&
      candidate.status !== 'expired' &&
      candidate.status !== 'invalidated') ||
    (candidate.invalidatedAt !== null &&
      candidate.invalidatedAt !== undefined &&
      typeof candidate.invalidatedAt !== 'string') ||
    (candidate.csrfTokenHash !== null &&
      candidate.csrfTokenHash !== undefined &&
      typeof candidate.csrfTokenHash !== 'string')
  ) {
    return null;
  }

  try {
    return {
      sessionId: candidate.sessionId,
      subject: candidate.subject,
      clientIds: [...candidate.clientIds],
      createdAt: assertValidDate(candidate.createdAt, 'createdAt'),
      expiresAt: assertValidDate(candidate.expiresAt, 'expiresAt'),
      lastSeenAt: assertValidDate(candidate.lastSeenAt, 'lastSeenAt'),
      status: candidate.status,
      invalidatedAt:
        candidate.invalidatedAt === null || candidate.invalidatedAt === undefined
          ? null
          : assertValidDate(candidate.invalidatedAt, 'invalidatedAt'),
      csrfTokenHash: candidate.csrfTokenHash ?? null,
    };
  } catch {
    return null;
  }
};
