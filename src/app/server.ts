import express, { type Express, type NextFunction, type Request, type Response } from 'express';

import { config } from '../config/config.js';
import { logger } from '../infrastructure/logger/index.js';
import { renderMetrics } from '../infrastructure/metrics/metrics.js';
import {
  getRequestContext,
  requestCorrelationMiddleware,
} from './middlewares/request-correlation.middleware.js';
import { requestLoggingMiddleware } from './middlewares/request-logging.middleware.js';
import {
  createAdminUserHandler,
  disableAdminUserHandler,
  enableAdminUserHandler,
  getAdminUserHandler,
  markAdminUserEmailVerifiedHandler,
  updateAdminUserProfileHandler,
  createAdminClientHandler,
  getAdminClientHandler,
  listAdminClientsHandler,
  updateAdminClientHandler,
  disableAdminClientHandler,
  rotateAdminClientSecretHandler,
} from '../modules/admin/admin.controller.js';
import {
  authorizeContinueHandler,
  authorizeHandler,
  introspectHandler,
  logoutHandler,
  revokeHandler,
  tokenHandler,
} from '../modules/oidc/oidc.controller.js';
import { healthHandler, readinessHandler } from '../modules/health/health.controller.js';
import { userInfoHandler } from '../modules/oidc/userinfo.controller.js';
import { BaseError } from '../shared/errors/index.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
  };
}

export const createServer = (): Express => {
  const app = express();
  app.use(requestCorrelationMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/health', healthHandler);
  app.get('/ready', readinessHandler);
  app.get('/metrics', (_request: Request, response: Response<string>): void => {
    response.type('text/plain; version=0.0.4; charset=utf-8').status(200).send(renderMetrics());
  });
  app.get('/authorize', authorizeHandler);
  app.post('/authorize/continue', authorizeContinueHandler);
  app.post('/token', tokenHandler);
  app.post('/revoke', revokeHandler);
  app.post('/introspect', introspectHandler);
  app.post('/logout', logoutHandler);
  app.get('/userinfo', userInfoHandler);
  app.post('/admin/users', createAdminUserHandler);
  app.get('/admin/users/:sub', getAdminUserHandler);
  app.post('/admin/users/:sub/disable', disableAdminUserHandler);
  app.post('/admin/users/:sub/enable', enableAdminUserHandler);
  app.patch('/admin/users/:sub/profile', updateAdminUserProfileHandler);
  app.post('/admin/users/:sub/email-verification/mark-verified', markAdminUserEmailVerifiedHandler);
  app.post('/admin/clients', createAdminClientHandler);
  app.get('/admin/clients', listAdminClientsHandler);
  app.get('/admin/clients/:clientId', getAdminClientHandler);
  app.patch('/admin/clients/:clientId', updateAdminClientHandler);
  app.post('/admin/clients/:clientId/disable', disableAdminClientHandler);
  app.post('/admin/clients/:clientId/rotate-secret', rotateAdminClientSecretHandler);

  app.use(
    (
      error: unknown,
      request: Request,
      response: Response<ErrorResponseBody>,
      next: NextFunction,
    ): void => {
      const requestContext = getRequestContext(request);

      if (BaseError.isBaseError(error)) {
        logger.warn(
          {
            requestId: requestContext.requestId,
            correlationId: requestContext.correlationId,
            module: 'app',
            operation: 'request_error',
            outcome: 'failure',
            reasonCode: error.code,
            statusCode: error.statusCode,
            errorName: error.name,
            errorCode: error.code,
          },
          'Request failed with handled error.',
        );

        response.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      if (error instanceof Error) {
        logger.error(
          {
            requestId: requestContext.requestId,
            correlationId: requestContext.correlationId,
            module: 'app',
            operation: 'request_error',
            outcome: 'failure',
            statusCode: 500,
            errorName: error.name,
            errorCode: 'INTERNAL_ERROR',
          },
          'Unhandled request error.',
        );

        response.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: error.message,
          },
        });
        return;
      }

      next(error);
    },
  );

  return app;
};

export const startServer = () =>
  createServer().listen(config.app.port, () => {
    process.stdout.write(`Server listening on port ${config.app.port}\n`);
  });
