import { randomUUID } from 'node:crypto';

import type { Request, RequestHandler } from 'express';

export interface RequestContext {
  requestId: string;
  correlationId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    requestContext?: RequestContext;
  }
}

const SAFE_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/u;
const FORBIDDEN_ID_PATTERN =
  /(access_token|refresh_token|id_token|authorization_code|code_verifier|client_secret|clientSecret|password|bearer\s+|cookie|csrf|BEGIN\s+PRIVATE\s+KEY|-----BEGIN)/iu;

const normalizeIncomingId = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  if (normalized === undefined || normalized.length === 0) {
    return undefined;
  }

  if (!SAFE_ID_PATTERN.test(normalized) || FORBIDDEN_ID_PATTERN.test(normalized)) {
    return undefined;
  }

  return normalized;
};

export const requestCorrelationMiddleware: RequestHandler = (request, response, next): void => {
  const requestId = normalizeIncomingId(request.header('x-request-id')) ?? randomUUID();
  const correlationId = normalizeIncomingId(request.header('x-correlation-id')) ?? randomUUID();

  request.requestContext = {
    requestId,
    correlationId,
  };

  response.setHeader('x-request-id', requestId);
  response.setHeader('x-correlation-id', correlationId);

  next();
};

export const getRequestContext = (request: Request): RequestContext => {
  if (request.requestContext !== undefined) {
    return request.requestContext;
  }

  return {
    requestId: randomUUID(),
    correlationId: randomUUID(),
  };
};
