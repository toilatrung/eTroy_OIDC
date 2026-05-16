import type { NextFunction, Request, Response } from 'express';

import { BaseError } from '../../shared/errors/index.js';
import {
  passwordResetService,
  type PasswordResetSuccessResponse,
} from './password-reset.service.js';

interface RequestResetBody {
  email?: unknown;
}

interface ConfirmResetBody {
  token?: unknown;
  newPassword?: unknown;
}

const assertRequiredString = (value: unknown, fieldName: string): void => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BaseError(`${fieldName} is required.`, {
      code: 'INVALID_INPUT',
      statusCode: 400,
    });
  }
};

export const requestPasswordResetHandler = async (
  request: Request<Record<string, never>, PasswordResetSuccessResponse, RequestResetBody>,
  response: Response<PasswordResetSuccessResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    assertRequiredString(request.body.email, 'email');
    const result = await passwordResetService.requestReset(request.body.email);
    response.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const confirmPasswordResetHandler = async (
  request: Request<Record<string, never>, PasswordResetSuccessResponse, ConfirmResetBody>,
  response: Response<PasswordResetSuccessResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    assertRequiredString(request.body.token, 'token');
    assertRequiredString(request.body.newPassword, 'newPassword');
    const result = await passwordResetService.confirmReset(
      request.body.token,
      request.body.newPassword,
    );
    response.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};
