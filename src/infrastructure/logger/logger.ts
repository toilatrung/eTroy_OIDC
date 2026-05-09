import pino, {
  type LevelWithSilent,
  type LevelWithSilentOrString,
  type Logger as PinoLogger,
  type LoggerOptions,
} from 'pino';

import { config } from '../../config/config.js';

export type SafeLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type SafeLogOutcome = 'success' | 'failure' | 'denied' | 'noop' | 'unknown';

export interface SafeLogFields {
  requestId?: string;
  correlationId?: string;
  method?: string;
  path?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  module?: string;
  operation?: string;
  outcome?: SafeLogOutcome;
  reasonCode?: string;
  eventType?: string;
  errorName?: string;
  errorCode?: string;
}

export interface SafeLogger {
  debug(message: string, fields?: SafeLogFields): void;
  debug(fields: SafeLogFields, message: string): void;
  info(message: string, fields?: SafeLogFields): void;
  info(fields: SafeLogFields, message: string): void;
  warn(message: string, fields?: SafeLogFields): void;
  warn(fields: SafeLogFields, message: string): void;
  error(message: string, fields?: SafeLogFields): void;
  error(fields: SafeLogFields, message: string): void;
}

const LOG_LEVEL_BY_ENVIRONMENT: Readonly<Record<typeof config.app.environment, LevelWithSilent>> =
  Object.freeze({
    development: 'debug',
    test: 'warn',
    production: 'info',
  });

const resolveLogLevel = (): LevelWithSilent => LOG_LEVEL_BY_ENVIRONMENT[config.app.environment];

const BASE_LOGGER_OPTIONS: Readonly<LoggerOptions> = Object.freeze({
  timestamp: pino.stdTimeFunctions.isoTime,
});

const SAFE_STRING_FIELDS = new Set<keyof SafeLogFields>([
  'requestId',
  'correlationId',
  'method',
  'path',
  'route',
  'module',
  'operation',
  'outcome',
  'reasonCode',
  'eventType',
  'errorName',
  'errorCode',
]);

const SAFE_NUMBER_FIELDS = new Set<keyof SafeLogFields>(['statusCode', 'durationMs']);
const SAFE_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const SAFE_OUTCOMES = new Set<SafeLogOutcome>(['success', 'failure', 'denied', 'noop', 'unknown']);
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/u;
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_.:/ -]{1,2048}$/u;
const FORBIDDEN_TEXT_PATTERN =
  /(BEGIN\s+PRIVATE\s+KEY|-----BEGIN|access_token|refresh_token|id_token|authorization_code|code_verifier|client_secret|clientSecret|password|authorization:|bearer\s+|set-cookie|cookie:|csrf)/iu;
const JWT_PATTERN = /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/u;
const REDACTED_VALUE = '[REDACTED]';

const createPinoLogger = (options: LoggerOptions = {}): PinoLogger => {
  const { level: providedLevel, ...restOptions } = options;
  const level: LevelWithSilentOrString = providedLevel ?? resolveLogLevel();

  return pino({
    ...BASE_LOGGER_OPTIONS,
    ...restOptions,
    level,
  });
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const containsForbiddenText = (value: string): boolean =>
  FORBIDDEN_TEXT_PATTERN.test(value) || JWT_PATTERN.test(value.trim());

const normalizeStringField = (key: keyof SafeLogFields, value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0 || containsForbiddenText(normalized)) {
    return REDACTED_VALUE;
  }

  if (key === 'method') {
    const method = normalized.toUpperCase();
    return SAFE_METHODS.has(method) ? method : undefined;
  }

  if (key === 'outcome') {
    return SAFE_OUTCOMES.has(normalized as SafeLogOutcome) ? normalized : 'unknown';
  }

  if (
    (key === 'requestId' || key === 'correlationId') &&
    !SAFE_IDENTIFIER_PATTERN.test(normalized)
  ) {
    return undefined;
  }

  return SAFE_TOKEN_PATTERN.test(normalized) ? normalized : REDACTED_VALUE;
};

const normalizeNumberField = (key: keyof SafeLogFields, value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  if (key === 'statusCode') {
    return Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined;
  }

  if (key === 'durationMs') {
    return value >= 0 ? Math.round(value) : undefined;
  }

  return undefined;
};

const sanitizeLogFields = (fields: unknown): Record<string, string | number> => {
  if (!isPlainObject(fields)) {
    return {};
  }

  const sanitized: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(fields)) {
    const safeKey = key as keyof SafeLogFields;

    if (SAFE_STRING_FIELDS.has(safeKey)) {
      const normalized = normalizeStringField(safeKey, value);
      if (normalized !== undefined) {
        sanitized[key] = normalized;
      }
      continue;
    }

    if (SAFE_NUMBER_FIELDS.has(safeKey)) {
      const normalized = normalizeNumberField(safeKey, value);
      if (normalized !== undefined) {
        sanitized[key] = normalized;
      }
    }
  }

  return sanitized;
};

const sanitizeMessage = (message: string): string => {
  const normalized = message.trim();
  if (normalized.length === 0) {
    return 'Log event.';
  }

  if (containsForbiddenText(normalized)) {
    return REDACTED_VALUE;
  }

  return normalized.length > 256 ? `${normalized.slice(0, 253)}...` : normalized;
};

const normalizeLogArgs = (
  first: string | SafeLogFields,
  second?: string | SafeLogFields,
): { fields: Record<string, string | number>; message: string } => {
  if (typeof first === 'string') {
    return {
      fields: sanitizeLogFields(second),
      message: sanitizeMessage(first),
    };
  }

  return {
    fields: sanitizeLogFields(first),
    message: sanitizeMessage(typeof second === 'string' ? second : 'Log event.'),
  };
};

const createSafeLogger = (baseLogger: PinoLogger): SafeLogger => {
  const write = (
    level: SafeLogLevel,
    first: string | SafeLogFields,
    second?: string | SafeLogFields,
  ): void => {
    const { fields, message } = normalizeLogArgs(first, second);
    baseLogger[level](fields, message);
  };

  return {
    debug: (first: string | SafeLogFields, second?: string | SafeLogFields) =>
      write('debug', first, second),
    info: (first: string | SafeLogFields, second?: string | SafeLogFields) =>
      write('info', first, second),
    warn: (first: string | SafeLogFields, second?: string | SafeLogFields) =>
      write('warn', first, second),
    error: (first: string | SafeLogFields, second?: string | SafeLogFields) =>
      write('error', first, second),
  };
};

export const createLogger = (options: LoggerOptions = {}): SafeLogger =>
  createSafeLogger(createPinoLogger(options));

export const logger: SafeLogger = createLogger();
