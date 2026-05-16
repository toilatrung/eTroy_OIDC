import type { NextFunction, Request, Response } from 'express';

import { config } from '../../config/config.js';
import { BaseError } from '../../shared/errors/index.js';
import { verificationService, type VerificationRequestResult } from './verification.service.js';
import type { UserProfile } from '../users/user.service.js';

interface RequestVerificationBody {
  userId?: unknown;
}

interface ConfirmVerificationBody {
  token?: unknown;
}

interface RequestVerificationResponseBody {
  data: VerificationRequestResult;
}

interface ConfirmVerificationResponseBody {
  data: UserProfile;
}

const assertRequiredString = (value: unknown, fieldName: string): void => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BaseError(`${fieldName} is required.`, {
      code: 'INVALID_INPUT',
      statusCode: 400,
    });
  }
};

export const requestVerificationHandler = async (
  request: Request<Record<string, never>, RequestVerificationResponseBody, RequestVerificationBody>,
  response: Response<RequestVerificationResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    assertRequiredString(request.body.userId, 'userId');
    const result = await verificationService.requestVerification(request.body.userId);
    response.status(200).json({ data: result });
  } catch (error: unknown) {
    next(error);
  }
};

export const confirmVerificationHandler = async (
  request: Request<Record<string, never>, ConfirmVerificationResponseBody, ConfirmVerificationBody>,
  response: Response<ConfirmVerificationResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    assertRequiredString(request.body.token, 'token');
    const user = await verificationService.verifyEmail(request.body.token);
    response.status(200).json({ data: user });
  } catch (error: unknown) {
    next(error);
  }
};

export const verificationLinkRedirectHandler = (request: Request, response: Response): void => {
  const target = new URL('/verify-email/result', config.app.publicUiBaseUrl);
  const token = request.query.token;

  if (typeof token === 'string' && token.trim().length > 0) {
    target.searchParams.set('token', token.trim());
  }

  response.redirect(302, target.toString());
};
