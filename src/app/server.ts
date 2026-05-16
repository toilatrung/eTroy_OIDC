import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';

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
  listAdminAuditLogsHandler,
  listAdminSessionsHandler,
  listAdminUsersHandler,
  markAdminUserEmailVerifiedHandler,
  purgeUnverifiedUsersHandler,
  updateAdminUserProfileHandler,
  createAdminClientHandler,
  getAdminClientHandler,
  listAdminClientsHandler,
  updateAdminClientHandler,
  disableAdminClientHandler,
  rotateAdminClientSecretHandler,
} from '../modules/admin/admin.controller.js';
import {
  changeCurrentPasswordHandler,
  getCurrentUserHandler,
  registerUserHandler,
  signOutFromAllSessionsHandler,
  updateCurrentProfileHandler,
} from '../modules/users/user.controller.js';
import {
  confirmVerificationHandler,
  requestVerificationHandler,
  verificationLinkRedirectHandler,
} from '../modules/verification/verification.controller.js';
import {
  confirmPasswordResetHandler,
  passwordResetLinkRedirectHandler,
  requestPasswordResetHandler,
} from '../modules/password-reset/password-reset.controller.js';
import {
  authorizeDecisionHandler,
  authorizeHandler,
  authorizeInteractionHandler,
  internalLoginHandler,
  introspectHandler,
  jwksHandler,
  listConnectedApplicationsHandler,
  logoutHandler,
  revokeConnectedApplicationHandler,
  revokeHandler,
  tokenHandler,
} from '../modules/oidc/controllers/oidc.controller.js';
import { healthHandler, readinessHandler } from '../modules/health/health.controller.js';
import { userInfoHandler } from '../modules/oidc/controllers/userinfo.controller.js';
import { oidcKeyService } from '../modules/oidc/services/key.service.js';
import { BaseError } from '../shared/errors/index.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
  };
}

export const createServer = (): Express => {
  const app = express();
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
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
  app.get('/authorize/interaction', authorizeInteractionHandler);
  app.get('/jwks', jwksHandler);
  app.post('/authorize/decision', authorizeDecisionHandler);
  app.post('/token', tokenHandler);
  app.post('/revoke', revokeHandler);
  app.post('/introspect', introspectHandler);
  app.post('/logout', logoutHandler);
  app.get('/userinfo', userInfoHandler);
  app.post('/login', internalLoginHandler);
  app.post('/register', registerUserHandler);
  app.get('/api/v1/users/me', getCurrentUserHandler);
  app.patch('/api/v1/users/me/profile', updateCurrentProfileHandler);
  app.post('/api/v1/users/me/password', changeCurrentPasswordHandler);
  app.delete('/api/v1/users/me/sessions', signOutFromAllSessionsHandler);
  app.get('/api/v1/users/me/connected-applications', listConnectedApplicationsHandler);
  app.post(
    '/api/v1/users/me/connected-applications/:clientId/revoke',
    revokeConnectedApplicationHandler,
  );
  app.post('/verification/request', requestVerificationHandler);
  app.post('/verification/confirm', confirmVerificationHandler);
  app.get('/verify-email', verificationLinkRedirectHandler);
  app.post('/password-reset/request', requestPasswordResetHandler);
  app.post('/password-reset/confirm', confirmPasswordResetHandler);
  app.get('/reset-password', passwordResetLinkRedirectHandler);
  app.post('/admin/users', createAdminUserHandler);
  app.get('/admin/users', listAdminUsersHandler);
  app.get('/admin/users/:sub', getAdminUserHandler);
  app.post('/admin/users/:sub/disable', disableAdminUserHandler);
  app.post('/admin/users/:sub/enable', enableAdminUserHandler);
  app.patch('/admin/users/:sub/profile', updateAdminUserProfileHandler);
  app.post('/admin/users/:sub/email-verification/mark-verified', markAdminUserEmailVerifiedHandler);
  app.get('/admin/audit-logs', listAdminAuditLogsHandler);
  app.get('/admin/sessions', listAdminSessionsHandler);
  app.post('/admin/maintenance/purge-unverified-users', purgeUnverifiedUsersHandler);
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

import { connectDatabase } from '../infrastructure/database/index.js';
import { getRedisClient } from '../infrastructure/redis/index.js';

export const startServer = async () => {
  try {
    await connectDatabase();
    await getRedisClient();
    await oidcKeyService.initializeActiveSigningKey();

    return createServer().listen(config.app.port, () => {
      process.stdout.write(`Server listening on port ${config.app.port}\n`);
    });
  } catch (error: unknown) {
    logger.error('Failed to start server', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorCode: 'SERVER_START_FAILURE',
    });
    if (error instanceof Error) {
      process.stdout.write(`Error: ${error.message}\n${error.stack}\n`);
    }
    process.exit(1);
  }
};
