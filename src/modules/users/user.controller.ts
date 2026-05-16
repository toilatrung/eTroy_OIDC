import type { NextFunction, Request, Response } from 'express';
import { BaseError } from '../../shared/errors/index.js';
import { oidcService } from '../oidc/services/oidc.service.js';

import {
  userService,
  type ChangePasswordInput,
  type CreateUserInput,
  type UpdateProfileInput,
  type UserProfile,
} from './user.service.js';

interface UserParams {
  sub: string;
}

interface UserResponseBody {
  data: UserProfile;
}

interface SessionTerminationResponseBody {
  data: {
    invalidatedSessions: number;
  };
}

const unauthorized = (): BaseError =>
  new BaseError('Authentication is required.', {
    code: 'UNAUTHORIZED',
    statusCode: 401,
  });

const requireAuthenticatedSubject = async (request: Request): Promise<string> => {
  const session = await oidcService.getActiveSession(request.headers.cookie);
  if (session === null) {
    throw unauthorized();
  }

  return session.subject;
};

const sendUser = (
  response: Response<UserResponseBody>,
  statusCode: number,
  user: UserProfile,
): void => {
  response.status(statusCode).json({ data: user });
};

export const registerUserHandler = async (
  request: Request<Record<string, never>, UserResponseBody, CreateUserInput>,
  response: Response<UserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.createUser(request.body);
    sendUser(response, 201, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const getUserHandler = async (
  request: Request<UserParams, UserResponseBody>,
  response: Response<UserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.getUserBySub(request.params.sub);
    sendUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const updateProfileHandler = async (
  request: Request<UserParams, UserResponseBody, UpdateProfileInput>,
  response: Response<UserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.updateProfile(request.params.sub, request.body);
    sendUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const changePasswordHandler = async (
  request: Request<UserParams, UserResponseBody, ChangePasswordInput>,
  response: Response<UserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.changePassword(request.params.sub, request.body);
    sendUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const getCurrentUserHandler = async (
  request: Request<Record<string, never>, UserResponseBody>,
  response: Response<UserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const subject = await requireAuthenticatedSubject(request);
    const user = await userService.getUserBySub(subject);
    sendUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const updateCurrentProfileHandler = async (
  request: Request<Record<string, never>, UserResponseBody, UpdateProfileInput>,
  response: Response<UserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const subject = await requireAuthenticatedSubject(request);
    const user = await userService.updateProfile(subject, request.body);
    sendUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const changeCurrentPasswordHandler = async (
  request: Request<Record<string, never>, UserResponseBody, ChangePasswordInput>,
  response: Response<UserResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const subject = await requireAuthenticatedSubject(request);
    const user = await userService.changePassword(subject, request.body, {
      requireCurrentPassword: true,
    });
    sendUser(response, 200, user);
  } catch (error: unknown) {
    next(error);
  }
};

export const signOutFromAllSessionsHandler = async (
  request: Request<Record<string, never>, SessionTerminationResponseBody>,
  response: Response<SessionTerminationResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const subject = await requireAuthenticatedSubject(request);
    const result = await oidcService.invalidateSessionsBySubject(subject);

    response.clearCookie(oidcService.getClearSessionCookieDescriptor().name, {
      path: oidcService.getClearSessionCookieDescriptor().path,
      httpOnly: oidcService.getClearSessionCookieDescriptor().httpOnly,
      sameSite: oidcService.getClearSessionCookieDescriptor().sameSite,
      secure: oidcService.getClearSessionCookieDescriptor().secure,
    });
    response.clearCookie(oidcService.getClearCsrfCookieDescriptor().name, {
      path: oidcService.getClearCsrfCookieDescriptor().path,
      httpOnly: oidcService.getClearCsrfCookieDescriptor().httpOnly,
      sameSite: oidcService.getClearCsrfCookieDescriptor().sameSite,
      secure: oidcService.getClearCsrfCookieDescriptor().secure,
    });

    response.status(200).json({
      data: {
        invalidatedSessions: result.invalidatedCount,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
};
