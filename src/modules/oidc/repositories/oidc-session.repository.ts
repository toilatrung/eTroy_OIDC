import type Redis from 'ioredis';

import { getRedisClient } from '../../../infrastructure/redis/index.js';

import type { OidcSessionRecord, OidcSessionStatus } from '../models/oidc-session.model.js';
import {
  deserializeOidcSessionRecord,
  serializeOidcSessionRecord,
} from '../models/oidc-session.model.js';

const SESSION_KEY_PREFIX = 'oidc:session:';

const getSessionKey = (sessionId: string): string => `${SESSION_KEY_PREFIX}${sessionId}`;

const getExpiryTimestampMs = (record: OidcSessionRecord): number =>
  Math.max(record.expiresAt.getTime(), Date.now() + 1);

const sortAndDedupeClientIds = (clientIds: readonly string[]): string[] =>
  [...new Set(clientIds)].sort((left, right) => left.localeCompare(right));

export interface CreateOidcSessionInput {
  sessionId: string;
  subject: string;
  clientIds: string[];
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  status: OidcSessionStatus;
  invalidatedAt?: Date | null;
  csrfTokenHash?: string | null;
}

export interface TouchOidcSessionInput {
  sessionId: string;
  clientId: string;
  lastSeenAt: Date;
}

export interface InvalidateOidcSessionInput {
  sessionId: string;
  invalidatedAt: Date;
}

export interface ListOidcSessionsInput {
  subject?: string;
  status?: OidcSessionStatus;
  limit?: number;
}

export interface InvalidateOidcSessionsBySubjectInput {
  subject: string;
  invalidatedAt: Date;
  limit?: number;
}

export interface InvalidateOidcSessionsBySubjectResult {
  invalidatedCount: number;
  truncated: boolean;
}

export interface ExpireOidcSessionInput {
  sessionId: string;
}

export interface OidcSessionRepositoryPort {
  createSessionRecord(input: CreateOidcSessionInput): Promise<OidcSessionRecord>;
  findBySessionId(sessionId: string): Promise<OidcSessionRecord | null>;
  touchSession(input: TouchOidcSessionInput): Promise<OidcSessionRecord | null>;
  invalidateSession(input: InvalidateOidcSessionInput): Promise<OidcSessionRecord | null>;
  markSessionExpired(input: ExpireOidcSessionInput): Promise<OidcSessionRecord | null>;
  listSessions(input?: ListOidcSessionsInput): Promise<OidcSessionRecord[]>;
  invalidateSessionsBySubject(
    input: InvalidateOidcSessionsBySubjectInput,
  ): Promise<InvalidateOidcSessionsBySubjectResult>;
}

export class OidcSessionRepository implements OidcSessionRepositoryPort {
  constructor(private readonly getClient: () => Promise<Redis> = getRedisClient) {}

  async createSessionRecord(input: CreateOidcSessionInput): Promise<OidcSessionRecord> {
    const record: OidcSessionRecord = {
      sessionId: input.sessionId,
      subject: input.subject,
      clientIds: sortAndDedupeClientIds(input.clientIds),
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      lastSeenAt: input.lastSeenAt,
      status: input.status,
      invalidatedAt: input.invalidatedAt ?? null,
      csrfTokenHash: input.csrfTokenHash ?? null,
    };

    await this.writeRecord(record);

    return record;
  }

  async findBySessionId(sessionId: string): Promise<OidcSessionRecord | null> {
    const client = await this.getClient();
    const stored = await client.get(getSessionKey(sessionId));

    if (stored === null) {
      return null;
    }

    return deserializeOidcSessionRecord(stored);
  }

  async touchSession(input: TouchOidcSessionInput): Promise<OidcSessionRecord | null> {
    const record = await this.findBySessionId(input.sessionId);
    if (record === null) {
      return null;
    }

    if (record.status !== 'active') {
      return record;
    }

    record.lastSeenAt = input.lastSeenAt;
    record.clientIds = sortAndDedupeClientIds([...record.clientIds, input.clientId]);
    await this.writeRecord(record);

    return record;
  }

  async invalidateSession(input: InvalidateOidcSessionInput): Promise<OidcSessionRecord | null> {
    const record = await this.findBySessionId(input.sessionId);
    if (record === null) {
      return null;
    }

    if (record.status === 'invalidated') {
      return record;
    }

    record.status = 'invalidated';
    record.invalidatedAt = input.invalidatedAt;
    await this.writeRecord(record);

    return record;
  }

  async markSessionExpired(input: ExpireOidcSessionInput): Promise<OidcSessionRecord | null> {
    const record = await this.findBySessionId(input.sessionId);
    if (record === null) {
      return null;
    }

    if (record.status === 'expired') {
      return record;
    }

    if (record.status === 'invalidated') {
      return record;
    }

    record.status = 'expired';
    await this.writeRecord(record);

    return record;
  }

  async listSessions(input: ListOidcSessionsInput = {}): Promise<OidcSessionRecord[]> {
    const requestedLimit = Math.floor(input.limit ?? 100);
    const limit = Math.max(1, Math.min(500, requestedLimit));
    const subject = input.subject?.trim();
    const status = input.status;
    const records: OidcSessionRecord[] = [];
    const client = await this.getClient();
    let cursor = '0';

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${SESSION_KEY_PREFIX}*`, 'COUNT', 200);
      cursor = nextCursor;

      if (keys.length > 0) {
        const values = await client.mget(...keys);
        for (const value of values) {
          if (value === null) {
            continue;
          }

          const parsed = deserializeOidcSessionRecord(value);
          if (parsed === null) {
            continue;
          }

          if (subject !== undefined && parsed.subject !== subject) {
            continue;
          }

          if (status !== undefined && parsed.status !== status) {
            continue;
          }

          records.push(parsed);
          if (records.length >= limit) {
            break;
          }
        }
      }
    } while (cursor !== '0' && records.length < limit);

    records.sort((left, right) => right.lastSeenAt.getTime() - left.lastSeenAt.getTime());
    return records;
  }

  async invalidateSessionsBySubject(
    input: InvalidateOidcSessionsBySubjectInput,
  ): Promise<InvalidateOidcSessionsBySubjectResult> {
    const limit = Math.max(1, Math.min(500, Math.floor(input.limit ?? 200)));
    const subject = input.subject.trim();
    const sessions = await this.listSessions({
      subject,
      status: 'active',
      limit: limit + 1,
    });

    let invalidatedCount = 0;
    const targetSessions = sessions.slice(0, limit);
    for (const session of targetSessions) {
      const updated = await this.invalidateSession({
        sessionId: session.sessionId,
        invalidatedAt: input.invalidatedAt,
      });
      if (updated !== null) {
        invalidatedCount += 1;
      }
    }

    return {
      invalidatedCount,
      truncated: sessions.length > limit,
    };
  }

  private async writeRecord(record: OidcSessionRecord): Promise<void> {
    const client = await this.getClient();
    const key = getSessionKey(record.sessionId);
    const value = JSON.stringify(serializeOidcSessionRecord(record));
    const expiryTimestampMs = getExpiryTimestampMs(record);

    await client.set(key, value);
    await client.pexpireat(key, expiryTimestampMs);
  }
}

export class InMemoryOidcSessionRepository implements OidcSessionRepositoryPort {
  private readonly records = new Map<string, OidcSessionRecord>();

  async createSessionRecord(input: CreateOidcSessionInput): Promise<OidcSessionRecord> {
    const record: OidcSessionRecord = {
      sessionId: input.sessionId,
      subject: input.subject,
      clientIds: sortAndDedupeClientIds(input.clientIds),
      createdAt: new Date(input.createdAt),
      expiresAt: new Date(input.expiresAt),
      lastSeenAt: new Date(input.lastSeenAt),
      status: input.status,
      invalidatedAt: input.invalidatedAt ?? null,
      csrfTokenHash: input.csrfTokenHash ?? null,
    };

    this.records.set(record.sessionId, record);

    return { ...record, clientIds: [...record.clientIds] };
  }

  async findBySessionId(sessionId: string): Promise<OidcSessionRecord | null> {
    const record = this.records.get(sessionId);
    if (record === undefined) {
      return null;
    }

    return {
      ...record,
      clientIds: [...record.clientIds],
    };
  }

  async touchSession(input: TouchOidcSessionInput): Promise<OidcSessionRecord | null> {
    const record = await this.findBySessionId(input.sessionId);
    if (record === null) {
      return null;
    }

    record.lastSeenAt = input.lastSeenAt;
    record.clientIds = sortAndDedupeClientIds([...record.clientIds, input.clientId]);
    this.records.set(record.sessionId, record);

    return {
      ...record,
      clientIds: [...record.clientIds],
    };
  }

  async invalidateSession(input: InvalidateOidcSessionInput): Promise<OidcSessionRecord | null> {
    const record = await this.findBySessionId(input.sessionId);
    if (record === null) {
      return null;
    }

    if (record.status !== 'invalidated') {
      record.status = 'invalidated';
      record.invalidatedAt = input.invalidatedAt;
      this.records.set(record.sessionId, record);
    }

    return {
      ...record,
      clientIds: [...record.clientIds],
    };
  }

  async markSessionExpired(input: ExpireOidcSessionInput): Promise<OidcSessionRecord | null> {
    const record = await this.findBySessionId(input.sessionId);
    if (record === null) {
      return null;
    }

    if (record.status === 'active') {
      record.status = 'expired';
      this.records.set(record.sessionId, record);
    }

    return {
      ...record,
      clientIds: [...record.clientIds],
    };
  }

  async listSessions(input: ListOidcSessionsInput = {}): Promise<OidcSessionRecord[]> {
    const limit = Math.max(1, Math.min(500, Math.floor(input.limit ?? 100)));
    const subject = input.subject?.trim();
    const status = input.status;
    const records = [...this.records.values()]
      .filter((record) => (subject === undefined ? true : record.subject === subject))
      .filter((record) => (status === undefined ? true : record.status === status))
      .sort((left, right) => right.lastSeenAt.getTime() - left.lastSeenAt.getTime())
      .slice(0, limit)
      .map((record) => ({
        ...record,
        clientIds: [...record.clientIds],
      }));

    return records;
  }

  async invalidateSessionsBySubject(
    input: InvalidateOidcSessionsBySubjectInput,
  ): Promise<InvalidateOidcSessionsBySubjectResult> {
    const limit = Math.max(1, Math.min(500, Math.floor(input.limit ?? 200)));
    const subject = input.subject.trim();
    const candidateSessions = [...this.records.values()]
      .filter((record) => record.subject === subject && record.status === 'active')
      .sort((left, right) => right.lastSeenAt.getTime() - left.lastSeenAt.getTime());

    let invalidatedCount = 0;
    for (const session of candidateSessions.slice(0, limit)) {
      session.status = 'invalidated';
      session.invalidatedAt = input.invalidatedAt;
      this.records.set(session.sessionId, session);
      invalidatedCount += 1;
    }

    return {
      invalidatedCount,
      truncated: candidateSessions.length > limit,
    };
  }
}
