import type Redis from 'ioredis';

import { getRedisClient } from '../../infrastructure/redis/index.js';

import type { OidcSessionRecord, OidcSessionStatus } from './oidc-session.model.js';
import { deserializeOidcSessionRecord, serializeOidcSessionRecord } from './oidc-session.model.js';

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

export interface ExpireOidcSessionInput {
  sessionId: string;
}

export interface OidcSessionRepositoryPort {
  createSessionRecord(input: CreateOidcSessionInput): Promise<OidcSessionRecord>;
  findBySessionId(sessionId: string): Promise<OidcSessionRecord | null>;
  touchSession(input: TouchOidcSessionInput): Promise<OidcSessionRecord | null>;
  invalidateSession(input: InvalidateOidcSessionInput): Promise<OidcSessionRecord | null>;
  markSessionExpired(input: ExpireOidcSessionInput): Promise<OidcSessionRecord | null>;
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
}
