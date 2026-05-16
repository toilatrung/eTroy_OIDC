import type { NextFunction, Request, Response } from 'express';

import { adminService } from './admin.service.js';
import type { AdminOperationContext } from './admin.service.js';
import {
  validateAdminActor,
  validateAdminCreateUserInput,
  validateAdminUpdateProfileInput,
  validateAdminUserParams,
  validateAdminClientParams,
  validateAdminCreateClientInput,
  validateAdminUpdateClientInput,
  type AdminCreateUserInput,
  type AdminUpdateProfileInput,
  type AdminUserParams,
  type AdminClientParams,
  type AdminCreateClientInput,
  type AdminUpdateClientInput,
} from './admin.validator.js';
import type { UserAdminView } from '../users/user.service.js';
import type { ClientAdminView, ClientWithSecret } from '../oidc/services/client.service.js';

interface AdminUserResponseBody {
  data: UserAdminView;
}

interface AdminClientResponseBody {
  data: ClientAdminView | ClientAdminView[] | ClientWithSecret | null;
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

const sendAdminClient = (
  response: Response<AdminClientResponseBody>,
  statusCode: number,
  clientData: ClientAdminView | ClientAdminView[] | ClientWithSecret | null,
): void => {
  response.status(statusCode).json({ data: clientData });
};

export const createAdminClientHandler = async (
  request: Request<Record<string, never>, AdminClientResponseBody, AdminCreateClientInput>,
  response: Response<AdminClientResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = buildAdminContext(request);
    const input = validateAdminCreateClientInput(request.body);
    const client = await adminService.createClient(input, context);
    sendAdminClient(response, 201, client);
  } catch (error: unknown) {
    next(error);
  }
};

export const getAdminClientHandler = async (
  request: Request<AdminClientParams, AdminClientResponseBody>,
  response: Response<AdminClientResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const params = validateAdminClientParams(request.params);
    const client = await adminService.getClient(params.clientId);
    if (!client) {
      response.status(404).json({ data: null });
      return;
    }
    sendAdminClient(response, 200, client);
  } catch (error: unknown) {
    next(error);
  }
};

export const listAdminClientsHandler = async (
  request: Request<Record<string, never>, AdminClientResponseBody>,
  response: Response<AdminClientResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    // We can extract skip/limit from query params, but currently there's no validator for them.
    // For simplicity, passing undefined defaults to 0 and 50.
    const clients = await adminService.listClients();
    sendAdminClient(response, 200, clients);
  } catch (error: unknown) {
    next(error);
  }
};

export const updateAdminClientHandler = async (
  request: Request<AdminClientParams, AdminClientResponseBody, AdminUpdateClientInput>,
  response: Response<AdminClientResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = buildAdminContext(request);
    const params = validateAdminClientParams(request.params);
    const input = validateAdminUpdateClientInput(request.body);
    const client = await adminService.updateClient(params.clientId, input, context);
    if (!client) {
      response.status(404).json({ data: null });
      return;
    }
    sendAdminClient(response, 200, client);
  } catch (error: unknown) {
    next(error);
  }
};

export const disableAdminClientHandler = async (
  request: Request<AdminClientParams, AdminClientResponseBody>,
  response: Response<AdminClientResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = buildAdminContext(request);
    const params = validateAdminClientParams(request.params);
    const client = await adminService.disableClient(params.clientId, context);
    if (!client) {
      response.status(404).json({ data: null });
      return;
    }
    sendAdminClient(response, 200, client);
  } catch (error: unknown) {
    next(error);
  }
};

export const rotateAdminClientSecretHandler = async (
  request: Request<AdminClientParams, AdminClientResponseBody>,
  response: Response<AdminClientResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = buildAdminContext(request);
    const params = validateAdminClientParams(request.params);
    const result = await adminService.rotateClientSecret(params.clientId, context);
    if (!result) {
      response.status(404).json({ data: null });
      return;
    }
    sendAdminClient(response, 200, result);
  } catch (error: unknown) {
    next(error);
  }
};
