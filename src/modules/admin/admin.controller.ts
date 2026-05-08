import type { NextFunction, Request, Response } from 'express';

import { adminService } from './admin.service.js';
import type { AdminOperationContext } from './admin.service.js';
import {
  validateAdminActor,
  validateAdminCreateUserInput,
  validateAdminUpdateProfileInput,
  validateAdminUserParams,
  type AdminCreateUserInput,
  type AdminUpdateProfileInput,
  type AdminUserParams,
} from './admin.validator.js';
import type { UserAdminView } from '../users/user.service.js';

interface AdminUserResponseBody {
  data: UserAdminView;
}

type AdminRequestContextSource = Pick<Request, 'header' | 'method' | 'path' | 'route'>;

const optionalHeader = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
};

const buildAdminContext = (request: AdminRequestContextSource): AdminOperationContext => {
  const actor = validateAdminActor({
    adminSub: request.header('x-admin-sub'),
  });

  const correlationId = optionalHeader(request.header('x-correlation-id'));
  const requestId = optionalHeader(request.header('x-request-id'));

  return {
    actor,
    request: {
      method: request.method,
      path: request.route?.path === undefined ? request.path : String(request.route.path),
      ...(correlationId === undefined ? {} : { correlationId }),
      ...(requestId === undefined ? {} : { requestId }),
    },
  };
};

const sendAdminUser = (
  response: Response<AdminUserResponseBody>,
  statusCode: number,
  user: UserAdminView,
): void => {
  response.status(statusCode).json({ data: user });
};

export const createAdminUserHandler = async (
  request: Request<Record<string, never>, AdminUserResponseBody, AdminCreateUserInput>,
  response: Response<AdminUserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = buildAdminContext(request);
    const input = validateAdminCreateUserInput(request.body);
    const user = await adminService.createUser(input, context);
    sendAdminUser(response, 201, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const getAdminUserHandler = async (
  request: Request<AdminUserParams, AdminUserResponseBody>,
  response: Response<AdminUserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = validateAdminUserParams(request.params);
    const user = await adminService.getUser(params.sub);
    sendAdminUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const disableAdminUserHandler = async (
  request: Request<AdminUserParams, AdminUserResponseBody>,
  response: Response<AdminUserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = buildAdminContext(request);
    const params = validateAdminUserParams(request.params);
    const user = await adminService.disableUser(params.sub, context);
    sendAdminUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const enableAdminUserHandler = async (
  request: Request<AdminUserParams, AdminUserResponseBody>,
  response: Response<AdminUserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = buildAdminContext(request);
    const params = validateAdminUserParams(request.params);
    const user = await adminService.enableUser(params.sub, context);
    sendAdminUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const updateAdminUserProfileHandler = async (
  request: Request<AdminUserParams, AdminUserResponseBody, AdminUpdateProfileInput>,
  response: Response<AdminUserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = buildAdminContext(request);
    const params = validateAdminUserParams(request.params);
    const input = validateAdminUpdateProfileInput(request.body);
    const user = await adminService.updateProfile(params.sub, input, context);
    sendAdminUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const markAdminUserEmailVerifiedHandler = async (
  request: Request<AdminUserParams, AdminUserResponseBody>,
  response: Response<AdminUserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = buildAdminContext(request);
    const params = validateAdminUserParams(request.params);
    const user = await adminService.markEmailVerified(params.sub, context);
    sendAdminUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};
