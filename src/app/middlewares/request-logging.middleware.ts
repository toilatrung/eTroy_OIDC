import type { Request, RequestHandler } from 'express';

import { logger } from '../../infrastructure/logger/index.js';
import {
  incrementCounter,
  recordHistogram,
  statusClassFromStatusCode,
} from '../../infrastructure/metrics/metrics.js';

import { getRequestContext } from './request-correlation.middleware.js';

const routeFromRequest = (request: Request): string => {
  const routePath = request.route?.path;
  if (typeof routePath === 'string' && routePath.trim().length > 0) {
    return routePath;
  }

  return 'unmatched';
};

const outcomeFromStatus = (statusCode: number): 'success' | 'failure' | 'denied' => {
  if (statusCode >= 500) {
    return 'failure';
  }

  if (statusCode >= 400) {
    return 'denied';
  }

  return 'success';
};

export const requestLoggingMiddleware: RequestHandler = (request, response, next): void => {
  const startAt = performance.now();

  response.on('finish', () => {
    const durationMs = performance.now() - startAt;
    const statusCode = response.statusCode;
    const method = request.method;
    const route = routeFromRequest(request);
    const statusClass = statusClassFromStatusCode(statusCode);
    const requestContext = getRequestContext(request);

    incrementCounter('http_requests_total', {
      method,
      route,
      status_class: statusClass,
    });
    recordHistogram('http_request_duration_ms', durationMs, {
      method,
      route,
      status_class: statusClass,
    });

    if (statusCode >= 400) {
      incrementCounter('http_errors_total', {
        method,
        route,
        status_class: statusClass,
      });
    }

    logger.info(
      {
        requestId: requestContext.requestId,
        correlationId: requestContext.correlationId,
        module: 'app',
        operation: 'http_request',
        outcome: outcomeFromStatus(statusCode),
        method,
        route,
        statusCode,
        durationMs,
      },
      'HTTP request completed.',
    );
  });

  next();
};
