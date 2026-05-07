import express, { type Express, type NextFunction, type Request, type Response } from 'express';

import { config } from '../config/config.js';
import {
  authorizeContinueHandler,
  authorizeHandler,
  introspectHandler,
  logoutHandler,
  revokeHandler,
  tokenHandler,
} from '../modules/oidc/oidc.controller.js';
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
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/authorize', authorizeHandler);
  app.post('/authorize/continue', authorizeContinueHandler);
  app.post('/token', tokenHandler);
  app.post('/revoke', revokeHandler);
  app.post('/introspect', introspectHandler);
  app.post('/logout', logoutHandler);
  app.get('/userinfo', userInfoHandler);

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response<ErrorResponseBody>,
      next: NextFunction,
    ): void => {
      if (BaseError.isBaseError(error)) {
        response.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      if (error instanceof Error) {
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
