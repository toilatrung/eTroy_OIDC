import { randomUUID } from 'node:crypto';

import { logger } from '../../infrastructure/logger/index.js';
import { incrementCounter } from '../../infrastructure/metrics/metrics.js';
import { BaseError } from '../../shared/errors/index.js';

import { AuditRepository, type CreateAuditEventInput } from './audit.repository.js';
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_EVENT_CATEGORIES,
  AUDIT_EVENT_OUTCOMES,
  AUDIT_EVENT_SEVERITIES,
  AUDIT_EVENT_TYPES,
  AUDIT_SUBJECT_TYPES,
  type AuditActor,
  type AuditClient,
  type AuditEventCategory,
  type AuditEventOutcome,
  type AuditEventRecord,
  type AuditEventSeverity,
  type AuditEventType,
  type AuditMetadata,
  type AuditMetadataPrimitive,
  type AuditMetadataValue,
  type AuditRequest,
  type AuditSubject,
} from './audit.types.js';

export interface RecordAuditEventInput {
  eventId?: string;
  eventType: AuditEventType;
  category: AuditEventCategory;
  severity: AuditEventSeverity;
  outcome: AuditEventOutcome;
  actor?: AuditActor;
  subject?: AuditSubject;
  client?: AuditClient;
  request?: AuditRequest;
  correlationId?: string;
  requestId?: string;
  reasonCode?: string;
  metadata?: AuditMetadata;
  occurredAt?: Date | string;
}

export type AuditRecordResult =
  | {
      status: 'recorded';
      event: AuditEventRecord;
    }
  | {
      status: 'rejected';
      reason: string;
      code: string;
    }
  | {
      status: 'failed';
      reason: string;
      code: 'AUDIT_PERSISTENCE_FAILED';
    };

const FORBIDDEN_METADATA_KEYS = new Set<string>([
  'password',
  'passwordhash',
  'password_hash',
  'accesstoken',
  'access_token',
  'idtoken',
  'id_token',
  'refreshtoken',
  'refresh_token',
  'authorizationcode',
  'authorization_code',
  'codeverifier',
  'code_verifier',
  'clientsecret',
  'client_secret',
  'privatekey',
  'sessioncookie',
  'csrftoken',
  'csrf',
  'verificationtoken',
  'passwordresettoken',
  'authorizationheader',
  'authorization',
  'requestbody',
  'responsebody',
  'cookie',
  'cookies',
]);

const FORBIDDEN_TEXT_PATTERN =
  /(BEGIN\s+PRIVATE\s+KEY|-----BEGIN|access_token=|refresh_token=|id_token=|client_secret=|authorization_code=|code_verifier=|authorization:|set-cookie:)/iu;
const JWT_PATTERN = /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/u;
const SAFE_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/u;
const MAX_METADATA_KEYS = 30;
const MAX_METADATA_ARRAY_LENGTH = 20;
const MAX_METADATA_STRING_LENGTH = 512;
const MAX_METADATA_SERIALIZED_SIZE = 4096;
const MAX_GENERIC_STRING_LENGTH = 256;
const MAX_PATH_LENGTH = 2048;
const MAX_REASON_CODE_LENGTH = 128;
const MAX_CORRELATION_ID_LENGTH = 128;
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const ALLOWED_GRANT_TYPES = new Set(['authorization_code', 'refresh_token']);
const SENSITIVE_QUERY_PATTERN =
  /(access_token|refresh_token|id_token|client_secret|authorization_code|code_verifier|password|token)=/iu;

const AUDIT_EVENT_TYPE_SET = new Set<string>(AUDIT_EVENT_TYPES);
const AUDIT_CATEGORY_SET = new Set<string>(AUDIT_EVENT_CATEGORIES);
const AUDIT_SEVERITY_SET = new Set<string>(AUDIT_EVENT_SEVERITIES);
const AUDIT_OUTCOME_SET = new Set<string>(AUDIT_EVENT_OUTCOMES);
const AUDIT_ACTOR_TYPE_SET = new Set<string>(AUDIT_ACTOR_TYPES);
const AUDIT_SUBJECT_TYPE_SET = new Set<string>(AUDIT_SUBJECT_TYPES);

const normalizeKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9_]/gu, '');

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const invalidAuditInput = (message: string, code = 'AUDIT_INVALID_EVENT'): BaseError =>
  new BaseError(message, {
    code,
    statusCode: 400,
  });

const containsForbiddenText = (value: string): boolean =>
  FORBIDDEN_TEXT_PATTERN.test(value) || JWT_PATTERN.test(value.trim());

const normalizeSafeString = (
  value: unknown,
  fieldName: string,
  maxLength: number = MAX_GENERIC_STRING_LENGTH,
): string => {
  if (typeof value !== 'string') {
    throw invalidAuditInput(`${fieldName} is required.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength) {
    throw invalidAuditInput(`${fieldName} is invalid.`);
  }

  if (containsForbiddenText(normalized)) {
    throw invalidAuditInput(`${fieldName} contains forbidden content.`);
  }

  return normalized;
};

const normalizeOptionalSafeString = (
  value: unknown,
  fieldName: string,
  maxLength: number = MAX_GENERIC_STRING_LENGTH,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return normalizeSafeString(value, fieldName, maxLength);
};

const normalizeOccurredAt = (value: Date | string | undefined): Date => {
  if (value === undefined) {
    return new Date(Date.now());
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw invalidAuditInput('occurredAt is invalid.');
  }

  return date;
};

const ensureAllowedValue = <T extends string>(
  value: string,
  allowed: ReadonlySet<string>,
  fieldName: string,
): T => {
  if (!allowed.has(value)) {
    throw invalidAuditInput(`${fieldName} is invalid.`);
  }

  return value as T;
};

const normalizeActor = (actor: unknown): AuditActor | undefined => {
  if (actor === undefined) {
    return undefined;
  }
  if (!isPlainObject(actor)) {
    throw invalidAuditInput('actor must be a plain object.');
  }

  const actorKeys = new Set(Object.keys(actor));
  for (const key of actorKeys) {
    if (!['type', 'sub', 'adminSub', 'clientId', 'display', 'source'].includes(key)) {
      throw invalidAuditInput('actor contains unsupported fields.');
    }
  }

  const type = ensureAllowedValue<AuditActor['type']>(
    normalizeSafeString(actor.type, 'actor.type', 32),
    AUDIT_ACTOR_TYPE_SET,
    'actor.type',
  );

  const normalized: AuditActor = { type };
  const sub = normalizeOptionalSafeString(actor.sub, 'actor.sub', 128);
  const adminSub = normalizeOptionalSafeString(actor.adminSub, 'actor.adminSub', 128);
  const clientId = normalizeOptionalSafeString(actor.clientId, 'actor.clientId', 256);
  const display = normalizeOptionalSafeString(actor.display, 'actor.display', 256);
  const source = normalizeOptionalSafeString(actor.source, 'actor.source', 64);

  if (sub !== undefined) {
    if (type !== 'user') {
      throw invalidAuditInput('actor.sub is allowed only for actor.type=user.');
    }
    normalized.sub = sub;
  }
  if (adminSub !== undefined) {
    if (type !== 'admin') {
      throw invalidAuditInput('actor.adminSub is allowed only for actor.type=admin.');
    }
    normalized.adminSub = adminSub;
  }
  if (clientId !== undefined) {
    if (type !== 'client') {
      throw invalidAuditInput('actor.clientId is allowed only for actor.type=client.');
    }
    normalized.clientId = clientId;
  }
  if (display !== undefined) {
    normalized.display = display;
  }
  if (source !== undefined) {
    normalized.source = source;
  }

  return normalized;
};

const normalizeSubject = (subject: unknown): AuditSubject | undefined => {
  if (subject === undefined) {
    return undefined;
  }
  if (!isPlainObject(subject)) {
    throw invalidAuditInput('subject must be a plain object.');
  }

  const subjectKeys = new Set(Object.keys(subject));
  for (const key of subjectKeys) {
    if (!['type', 'id', 'sub', 'clientId', 'sessionId', 'tokenFamilyId', 'keyId'].includes(key)) {
      throw invalidAuditInput('subject contains unsupported fields.');
    }
  }

  const type = ensureAllowedValue<AuditSubject['type']>(
    normalizeSafeString(subject.type, 'subject.type', 32),
    AUDIT_SUBJECT_TYPE_SET,
    'subject.type',
  );

  const normalized: AuditSubject = { type };
  const id = normalizeOptionalSafeString(subject.id, 'subject.id', 256);
  const sub = normalizeOptionalSafeString(subject.sub, 'subject.sub', 128);
  const clientId = normalizeOptionalSafeString(subject.clientId, 'subject.clientId', 256);
  const sessionId = normalizeOptionalSafeString(subject.sessionId, 'subject.sessionId', 256);
  const tokenFamilyId = normalizeOptionalSafeString(
    subject.tokenFamilyId,
    'subject.tokenFamilyId',
    256,
  );
  const keyId = normalizeOptionalSafeString(subject.keyId, 'subject.keyId', 128);

  if (id !== undefined) {
    normalized.id = id;
  }
  if (sub !== undefined) {
    if (type !== 'user') {
      throw invalidAuditInput('subject.sub is allowed only for subject.type=user.');
    }
    normalized.sub = sub;
  }
  if (clientId !== undefined) {
    if (type !== 'client') {
      throw invalidAuditInput('subject.clientId is allowed only for subject.type=client.');
    }
    normalized.clientId = clientId;
  }
  if (sessionId !== undefined) {
    if (type !== 'session') {
      throw invalidAuditInput('subject.sessionId is allowed only for subject.type=session.');
    }
    normalized.sessionId = sessionId;
  }
  if (tokenFamilyId !== undefined) {
    if (type !== 'token_family') {
      throw invalidAuditInput(
        'subject.tokenFamilyId is allowed only for subject.type=token_family.',
      );
    }
    normalized.tokenFamilyId = tokenFamilyId;
  }
  if (keyId !== undefined) {
    if (type !== 'key') {
      throw invalidAuditInput('subject.keyId is allowed only for subject.type=key.');
    }
    normalized.keyId = keyId;
  }

  return normalized;
};

const normalizeClient = (client: unknown): AuditClient | undefined => {
  if (client === undefined) {
    return undefined;
  }
  if (!isPlainObject(client)) {
    throw invalidAuditInput('client must be a plain object.');
  }

  const clientKeys = new Set(Object.keys(client));
  for (const key of clientKeys) {
    if (!['clientId', 'redirectUri', 'scope', 'grantType'].includes(key)) {
      throw invalidAuditInput('client contains unsupported fields.');
    }
    if (FORBIDDEN_METADATA_KEYS.has(normalizeKey(key))) {
      throw invalidAuditInput('client contains forbidden fields.');
    }
  }

  const normalized: AuditClient = {};
  const clientId = normalizeOptionalSafeString(client.clientId, 'client.clientId', 256);
  const redirectUri = normalizeOptionalSafeString(client.redirectUri, 'client.redirectUri', 2048);
  const grantType = normalizeOptionalSafeString(client.grantType, 'client.grantType', 64);

  if (clientId !== undefined) {
    normalized.clientId = clientId;
  }
  if (redirectUri !== undefined) {
    if (SENSITIVE_QUERY_PATTERN.test(redirectUri)) {
      throw invalidAuditInput('client.redirectUri contains sensitive query parameters.');
    }
    normalized.redirectUri = redirectUri;
  }
  if (grantType !== undefined) {
    if (!ALLOWED_GRANT_TYPES.has(grantType)) {
      throw invalidAuditInput('client.grantType is invalid.');
    }
    normalized.grantType = grantType;
  }

  const scopeInput = client.scope;
  if (scopeInput !== undefined) {
    if (typeof scopeInput === 'string') {
      normalized.scope = normalizeSafeString(scopeInput, 'client.scope', 512);
    } else if (Array.isArray(scopeInput)) {
      const normalizedScope = scopeInput.map((item: unknown) =>
        normalizeSafeString(item, 'client.scope[]', 128),
      );
      normalized.scope = normalizedScope;
    } else {
      throw invalidAuditInput('client.scope must be a string or string array.');
    }
  }

  return Object.keys(normalized).length === 0 ? undefined : normalized;
};

const normalizeRequest = (request: unknown): AuditRequest | undefined => {
  if (request === undefined) {
    return undefined;
  }
  if (!isPlainObject(request)) {
    throw invalidAuditInput('request must be a plain object.');
  }

  const requestKeys = new Set(Object.keys(request));
  for (const key of requestKeys) {
    if (!['method', 'path', 'ip', 'userAgent', 'correlationId', 'requestId'].includes(key)) {
      throw invalidAuditInput('request contains unsupported fields.');
    }
  }

  const normalized: AuditRequest = {};
  const method = normalizeOptionalSafeString(request.method, 'request.method', 16);
  if (method !== undefined) {
    const normalizedMethod = method.toUpperCase();
    if (!ALLOWED_METHODS.has(normalizedMethod)) {
      throw invalidAuditInput('request.method is invalid.');
    }
    normalized.method = normalizedMethod;
  }

  const path = normalizeOptionalSafeString(request.path, 'request.path', MAX_PATH_LENGTH);
  if (path !== undefined) {
    if (SENSITIVE_QUERY_PATTERN.test(path)) {
      throw invalidAuditInput('request.path contains sensitive query parameters.');
    }
    normalized.path = path;
  }

  const correlationId = normalizeOptionalSafeString(
    request.correlationId,
    'request.correlationId',
    MAX_CORRELATION_ID_LENGTH,
  );
  if (correlationId !== undefined) {
    normalized.correlationId = correlationId;
  }

  const requestId = normalizeOptionalSafeString(
    request.requestId,
    'request.requestId',
    MAX_CORRELATION_ID_LENGTH,
  );
  if (requestId !== undefined) {
    normalized.requestId = requestId;
  }

  // Sprint 16 defaults to excluding high-risk request context unless explicitly approved by event use case.
  return Object.keys(normalized).length === 0 ? undefined : normalized;
};

const isMetadataPrimitive = (value: unknown): value is AuditMetadataPrimitive =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

const sanitizeMetadataValue = (value: unknown): AuditMetadataValue | undefined => {
  if (isMetadataPrimitive(value)) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized.length === 0 || normalized.length > MAX_METADATA_STRING_LENGTH) {
        return undefined;
      }
      if (containsForbiddenText(normalized)) {
        return undefined;
      }
      return normalized;
    }
    return value;
  }

  if (!Array.isArray(value) || value.length > MAX_METADATA_ARRAY_LENGTH) {
    return undefined;
  }

  const sanitizedItems: AuditMetadataPrimitive[] = [];
  for (const item of value) {
    if (!isMetadataPrimitive(item)) {
      return undefined;
    }

    if (typeof item === 'string') {
      const normalized = item.trim();
      if (normalized.length === 0 || normalized.length > MAX_METADATA_STRING_LENGTH) {
        return undefined;
      }
      if (containsForbiddenText(normalized)) {
        return undefined;
      }
      sanitizedItems.push(normalized);
      continue;
    }

    sanitizedItems.push(item);
  }

  return sanitizedItems;
};

const sanitizeMetadata = (metadata: unknown): AuditMetadata | undefined => {
  if (metadata === undefined) {
    return undefined;
  }

  if (!isPlainObject(metadata)) {
    throw invalidAuditInput('metadata must be a plain object.');
  }

  const metadataEntries = Object.entries(metadata);
  if (metadataEntries.length > MAX_METADATA_KEYS) {
    throw invalidAuditInput('metadata has too many keys.');
  }

  const sanitized: AuditMetadata = {};
  for (const [key, rawValue] of metadataEntries) {
    if (!SAFE_KEY_PATTERN.test(key)) {
      throw invalidAuditInput('metadata contains invalid keys.');
    }

    const normalizedKey = normalizeKey(key);
    if (FORBIDDEN_METADATA_KEYS.has(normalizedKey)) {
      continue;
    }

    const safeValue = sanitizeMetadataValue(rawValue);
    if (safeValue !== undefined) {
      sanitized[key] = safeValue;
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return undefined;
  }

  const serialized = JSON.stringify(sanitized);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_SERIALIZED_SIZE) {
    throw invalidAuditInput('metadata is too large.');
  }

  return sanitized;
};

const normalizeRecordInput = (input: RecordAuditEventInput): CreateAuditEventInput => {
  const eventType = ensureAllowedValue<AuditEventType>(
    normalizeSafeString(input.eventType, 'eventType', 128),
    AUDIT_EVENT_TYPE_SET,
    'eventType',
  );
  const category = ensureAllowedValue<AuditEventCategory>(
    normalizeSafeString(input.category, 'category', 32),
    AUDIT_CATEGORY_SET,
    'category',
  );
  const severity = ensureAllowedValue<AuditEventSeverity>(
    normalizeSafeString(input.severity, 'severity', 32),
    AUDIT_SEVERITY_SET,
    'severity',
  );
  const outcome = ensureAllowedValue<AuditEventOutcome>(
    normalizeSafeString(input.outcome, 'outcome', 32),
    AUDIT_OUTCOME_SET,
    'outcome',
  );

  const now = new Date(Date.now());
  const normalized: CreateAuditEventInput = {
    eventId:
      input.eventId === undefined
        ? randomUUID()
        : normalizeSafeString(input.eventId, 'eventId', MAX_CORRELATION_ID_LENGTH),
    eventType,
    category,
    severity,
    outcome,
    occurredAt: normalizeOccurredAt(input.occurredAt),
    createdAt: now,
  };

  const actor = normalizeActor(input.actor);
  const subject = normalizeSubject(input.subject);
  const client = normalizeClient(input.client);
  const request = normalizeRequest(input.request);
  const metadata = sanitizeMetadata(input.metadata);
  const correlationId = normalizeOptionalSafeString(
    input.correlationId,
    'correlationId',
    MAX_CORRELATION_ID_LENGTH,
  );
  const requestId = normalizeOptionalSafeString(
    input.requestId,
    'requestId',
    MAX_CORRELATION_ID_LENGTH,
  );
  const reasonCode = normalizeOptionalSafeString(
    input.reasonCode,
    'reasonCode',
    MAX_REASON_CODE_LENGTH,
  );

  if (actor !== undefined) {
    normalized.actor = actor;
  }
  if (subject !== undefined) {
    normalized.subject = subject;
  }
  if (client !== undefined) {
    normalized.client = client;
  }
  if (request !== undefined) {
    normalized.request = request;
  }
  if (metadata !== undefined) {
    normalized.metadata = metadata;
  }
  if (correlationId !== undefined) {
    normalized.correlationId = correlationId;
  }
  if (requestId !== undefined) {
    normalized.requestId = requestId;
  }
  if (reasonCode !== undefined) {
    normalized.reasonCode = reasonCode;
  }

  return normalized;
};

const summarizeValidationError = (error: unknown): { reason: string; code: string } => {
  if (BaseError.isBaseError(error)) {
    return {
      reason: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      reason: error.message,
      code: 'AUDIT_INVALID_EVENT',
    };
  }

  return {
    reason: 'Audit event validation failed.',
    code: 'AUDIT_INVALID_EVENT',
  };
};

export class AuditService {
  constructor(private readonly repository: AuditRepository = new AuditRepository()) {}

  async recordEvent(input: RecordAuditEventInput): Promise<AuditRecordResult> {
    let normalizedInput: CreateAuditEventInput;
    try {
      normalizedInput = normalizeRecordInput(input);
    } catch (error: unknown) {
      const rejection = summarizeValidationError(error);
      incrementCounter('audit_events_total', {
        module: 'audit',
        operation: 'record_event',
        outcome: 'denied',
        event_type: 'unknown',
      });
      logger.warn(
        {
          module: 'audit',
          operation: 'record_event',
          outcome: 'denied',
          eventType: 'unknown',
          reasonCode: rejection.code,
          errorCode: rejection.code,
        },
        'Audit event rejected by validation policy.',
      );

      return {
        status: 'rejected',
        reason: rejection.reason,
        code: rejection.code,
      };
    }

    try {
      const event = await this.repository.createEvent(normalizedInput);
      incrementCounter('audit_events_total', {
        module: 'audit',
        operation: 'record_event',
        outcome: 'success',
        event_type: normalizedInput.eventType,
      });
      return {
        status: 'recorded',
        event,
      };
    } catch (error: unknown) {
      incrementCounter('audit_events_total', {
        module: 'audit',
        operation: 'record_event',
        outcome: 'failure',
        event_type: normalizedInput.eventType,
      });
      logger.error(
        {
          module: 'audit',
          operation: 'record_event',
          outcome: 'failure',
          eventType: normalizedInput.eventType,
          reasonCode: 'AUDIT_PERSISTENCE_FAILED',
          errorName: error instanceof Error ? error.name : 'Error',
          errorCode: 'AUDIT_PERSISTENCE_FAILED',
        },
        'Audit persistence failed; continuing primary flow by fail-open policy.',
      );

      return {
        status: 'failed',
        reason: 'Audit persistence failed.',
        code: 'AUDIT_PERSISTENCE_FAILED',
      };
    }
  }
}

export const auditService = new AuditService();
