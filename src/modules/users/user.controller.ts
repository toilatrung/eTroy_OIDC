import type { NextFunction, Request, Response } from 'express';

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
