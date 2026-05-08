import { hashValue } from '../../infrastructure/crypto/index.js';
import { BaseError } from '../../shared/errors/index.js';

import {
  DuplicateEmailError,
  UserRepository,
  type CreateUserRecordInput,
  type UpdateUserRecordInput,
  type UserEntity,
} from './user.repository.js';
import type { UserStatus } from './user.model.js';

export interface UserProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  status: UserStatus;
  name?: string;
  avatar_url?: string;
}

export interface UserCredentialIdentity extends UserProfile {
  passwordHash: string;
}

export interface CreateUserInput {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  avatar_url?: unknown;
}

export interface CreateAdminProvisionedUserInput extends CreateUserInput {
  email_verified?: unknown;
}

export interface UpdateProfileInput {
  name?: unknown;
  avatar_url?: unknown;
}

export interface UserAdminView {
  id: string;
  sub: string;
  email: string;
  email_verified: boolean;
  status: UserStatus;
  name?: string;
  avatar_url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangePasswordInput {
  newPassword?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const invalidInput = (message: string): BaseError =>
  new BaseError(message, {
    code: 'INVALID_INPUT',
    statusCode: 400,
  });

const userNotFound = (): BaseError =>
  new BaseError('User not found.', {
    code: 'USER_NOT_FOUND',
    statusCode: 404,
  });

const duplicateEmail = (): BaseError =>
  new BaseError('Email already exists.', {
    code: 'DUPLICATE_EMAIL',
    statusCode: 409,
  });

function assertKnownFields(
  input: unknown,
  allowedFields: readonly string[],
): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw invalidInput('Request body must be an object.');
  }

  const invalidFields = Object.keys(input).filter((field) => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    throw invalidInput(`Unsupported field: ${invalidFields[0]}.`);
  }
}

const requiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string') {
    throw invalidInput(`${fieldName} is required.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw invalidInput(`${fieldName} is required.`);
  }

  return normalized;
};

const optionalString = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw invalidInput(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
};

const optionalBoolean = (value: unknown, fieldName: string): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw invalidInput(`${fieldName} must be a boolean.`);
  }

  return value;
};

const normalizeEmail = (value: unknown): string => {
  const email = requiredString(value, 'email').toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw invalidInput('email must be valid.');
  }

  return email;
};

const toUserProfile = (user: UserEntity): UserProfile => {
  const profile: UserProfile = {
    sub: user.sub,
    email: user.email,
    email_verified: user.email_verified,
    status: user.status,
  };

  if (user.name !== undefined) {
    profile.name = user.name;
  }

  if (user.avatar_url !== undefined) {
    profile.avatar_url = user.avatar_url;
  }

  return profile;
};

const toUserAdminView = (user: UserEntity): UserAdminView => {
  const view: UserAdminView = {
    id: user.id,
    sub: user.sub,
    email: user.email,
    email_verified: user.email_verified,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };

  if (user.name !== undefined) {
    view.name = user.name;
  }

  if (user.avatar_url !== undefined) {
    view.avatar_url = user.avatar_url;
  }

  return view;
};

const toUserCredentialIdentity = (user: UserEntity): UserCredentialIdentity => {
  const identity: UserCredentialIdentity = {
    ...toUserProfile(user),
    passwordHash: user.password_hash,
  };

  return identity;
};

const mapRepositoryError = (error: unknown): never => {
  if (error instanceof DuplicateEmailError) {
    throw duplicateEmail();
  }

  throw error;
};

export class UserService {
  constructor(private readonly userRepository: UserRepository = new UserRepository()) {}

  async createUser(input: CreateUserInput = {}): Promise<UserProfile> {
    assertKnownFields(input, ['email', 'password', 'name', 'avatar_url']);

    const email = normalizeEmail(input.email);
    const password = requiredString(input.password, 'password');
    const name = optionalString(input.name, 'name');
    const avatarUrl = optionalString(input.avatar_url, 'avatar_url');

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser !== null) {
      throw duplicateEmail();
    }

    const createInput: CreateUserRecordInput = {
      email,
      password_hash: hashValue(password),
      email_verified: false,
    };

    if (name !== undefined) {
      createInput.name = name;
    }

    if (avatarUrl !== undefined) {
      createInput.avatar_url = avatarUrl;
    }

    try {
      const user = await this.userRepository.createUser(createInput);
      return toUserProfile(user);
    } catch (error: unknown) {
      throw mapRepositoryError(error);
    }
  }

  async createAdminProvisionedUser(
    input: CreateAdminProvisionedUserInput = {},
  ): Promise<UserAdminView> {
    assertKnownFields(input, ['email', 'password', 'name', 'avatar_url', 'email_verified']);

    const email = normalizeEmail(input.email);
    const password = requiredString(input.password, 'password');
    const name = optionalString(input.name, 'name');
    const avatarUrl = optionalString(input.avatar_url, 'avatar_url');
    const emailVerified = optionalBoolean(input.email_verified, 'email_verified') ?? false;

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser !== null) {
      throw duplicateEmail();
    }

    const createInput: CreateUserRecordInput = {
      email,
      password_hash: hashValue(password),
      email_verified: emailVerified,
      status: 'active',
    };

    if (name !== undefined) {
      createInput.name = name;
    }

    if (avatarUrl !== undefined) {
      createInput.avatar_url = avatarUrl;
    }

    try {
      const user = await this.userRepository.createUser(createInput);
      return toUserAdminView(user);
    } catch (error: unknown) {
      throw mapRepositoryError(error);
    }
  }

  async getUserBySub(sub: string): Promise<UserProfile> {
    const normalizedSub = requiredString(sub, 'sub');
    const user = await this.userRepository.findBySub(normalizedSub);

    if (user === null) {
      throw userNotFound();
    }

    return toUserProfile(user);
  }

  async getUserById(id: string): Promise<UserProfile> {
    const normalizedId = requiredString(id, 'id');
    const user = await this.userRepository.findById(normalizedId);

    if (user === null) {
      throw userNotFound();
    }

    return toUserProfile(user);
  }

  async getAdminUserViewBySub(sub: string): Promise<UserAdminView> {
    const normalizedSub = requiredString(sub, 'sub');
    const user = await this.userRepository.findBySub(normalizedSub);

    if (user === null) {
      throw userNotFound();
    }

    return toUserAdminView(user);
  }

  async markEmailVerifiedById(id: string): Promise<UserProfile> {
    const normalizedId = requiredString(id, 'id');
    const user = await this.userRepository.updateUser(
      { id: normalizedId },
      { email_verified: true },
    );

    if (user === null) {
      throw userNotFound();
    }

    return toUserProfile(user);
  }

  async markEmailVerifiedBySub(sub: string): Promise<UserAdminView> {
    const normalizedSub = requiredString(sub, 'sub');
    const user = await this.userRepository.updateUser(
      { sub: normalizedSub },
      { email_verified: true },
    );

    if (user === null) {
      throw userNotFound();
    }

    return toUserAdminView(user);
  }

  async getCredentialIdentityByEmail(email: string): Promise<UserCredentialIdentity | null> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalizedEmail);

    return user === null ? null : toUserCredentialIdentity(user);
  }

  async updateProfile(sub: string, input: UpdateProfileInput = {}): Promise<UserProfile> {
    assertKnownFields(input, ['name', 'avatar_url']);

    const normalizedSub = requiredString(sub, 'sub');
    const name = optionalString(input.name, 'name');
    const avatarUrl = optionalString(input.avatar_url, 'avatar_url');
    const patch: UpdateUserRecordInput = {};

    if (name !== undefined) {
      patch.name = name;
    }

    if (avatarUrl !== undefined) {
      patch.avatar_url = avatarUrl;
    }

    if (Object.keys(patch).length === 0) {
      throw invalidInput('At least one profile field is required.');
    }

    const user = await this.userRepository.updateUser({ sub: normalizedSub }, patch);
    if (user === null) {
      throw userNotFound();
    }

    return toUserProfile(user);
  }

  async updateAdminProfileBySub(
    sub: string,
    input: UpdateProfileInput = {},
  ): Promise<UserAdminView> {
    assertKnownFields(input, ['name', 'avatar_url']);

    const normalizedSub = requiredString(sub, 'sub');
    const name = optionalString(input.name, 'name');
    const avatarUrl = optionalString(input.avatar_url, 'avatar_url');
    const patch: UpdateUserRecordInput = {};

    if (name !== undefined) {
      patch.name = name;
    }

    if (avatarUrl !== undefined) {
      patch.avatar_url = avatarUrl;
    }

    if (Object.keys(patch).length === 0) {
      throw invalidInput('At least one profile field is required.');
    }

    const user = await this.userRepository.updateUser({ sub: normalizedSub }, patch);
    if (user === null) {
      throw userNotFound();
    }

    return toUserAdminView(user);
  }

  async setUserStatusBySub(sub: string, status: UserStatus): Promise<UserAdminView> {
    const normalizedSub = requiredString(sub, 'sub');
    const user = await this.userRepository.updateUser({ sub: normalizedSub }, { status });

    if (user === null) {
      throw userNotFound();
    }

    return toUserAdminView(user);
  }

  async changePassword(sub: string, input: ChangePasswordInput = {}): Promise<UserProfile> {
    assertKnownFields(input, ['newPassword']);

    const normalizedSub = requiredString(sub, 'sub');
    const newPassword = requiredString(input.newPassword, 'newPassword');
    const user = await this.userRepository.updateUser(
      { sub: normalizedSub },
      { password_hash: hashValue(newPassword) },
    );

    if (user === null) {
      throw userNotFound();
    }

    return toUserProfile(user);
  }
}

export const userService = new UserService();
