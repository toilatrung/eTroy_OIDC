import mongoose, { type HydratedDocument } from 'mongoose';

import { UserModel, type UserDocument, type UserStatus } from './user.model.js';

const { isValidObjectId } = mongoose;

export interface UserEntity {
  id: string;
  sub: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  status: UserStatus;
  name?: string;
  avatar_url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRecordInput {
  email: string;
  password_hash: string;
  email_verified?: boolean;
  status?: UserStatus;
  name?: string;
  avatar_url?: string;
}

export interface UpdateUserRecordInput {
  password_hash?: string;
  email_verified?: boolean;
  status?: UserStatus;
  name?: string;
  avatar_url?: string;
}

export type UserLookup = Readonly<{ id: string } | { sub: string }>;

interface MongoDuplicateKeyError extends Error {
  code?: unknown;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already exists.');
    this.name = 'DuplicateEmailError';
  }
}

const hasEmailDuplicateKey = (error: MongoDuplicateKeyError): boolean =>
  error.code === 11000 &&
  (error.keyPattern?.email === 1 ||
    typeof error.keyValue?.email === 'string' ||
    Object.prototype.hasOwnProperty.call(error.keyPattern ?? {}, 'email'));

const isDuplicateEmailError = (error: unknown): error is MongoDuplicateKeyError => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return hasEmailDuplicateKey(error as MongoDuplicateKeyError);
};

const toUserEntity = (document: HydratedDocument<UserDocument>): UserEntity => {
  const user: UserEntity = {
    id: document._id.toString(),
    sub: document.sub,
    email: document.email,
    password_hash: document.password_hash,
    email_verified: document.email_verified,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };

  if (document.name !== undefined) {
    user.name = document.name;
  }

  if (document.avatar_url !== undefined) {
    user.avatar_url = document.avatar_url;
  }

  return user;
};

const toMongoLookup = (lookup: UserLookup): Record<string, string> | null => {
  if ('id' in lookup) {
    return isValidObjectId(lookup.id) ? { _id: lookup.id } : null;
  }

  return { sub: lookup.sub };
};

const normalizeDuplicateEmail = (error: unknown): never => {
  if (isDuplicateEmailError(error)) {
    throw new DuplicateEmailError();
  }

  throw error;
};

export class UserRepository {
  async createUser(input: CreateUserRecordInput): Promise<UserEntity> {
    try {
      const user = await UserModel.create(input);
      return toUserEntity(user);
    } catch (error: unknown) {
      throw normalizeDuplicateEmail(error);
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    if (!isValidObjectId(id)) {
      return null;
    }

    const user = await UserModel.findById(id).exec();
    return user === null ? null : toUserEntity(user);
  }

  async findBySub(sub: string): Promise<UserEntity | null> {
    const user = await UserModel.findOne({ sub }).exec();
    return user === null ? null : toUserEntity(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await UserModel.findOne({ email }).exec();
    return user === null ? null : toUserEntity(user);
  }

  async updateUser(lookup: UserLookup, patch: UpdateUserRecordInput): Promise<UserEntity | null> {
    const mongoLookup = toMongoLookup(lookup);
    if (mongoLookup === null) {
      return null;
    }

    try {
      const user = await UserModel.findOneAndUpdate(
        mongoLookup,
        { $set: patch },
        { new: true, runValidators: true },
      ).exec();

      return user === null ? null : toUserEntity(user);
    } catch (error: unknown) {
      throw normalizeDuplicateEmail(error);
    }
  }
}
