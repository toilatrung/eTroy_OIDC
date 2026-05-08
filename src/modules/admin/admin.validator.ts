import { z } from 'zod';

import { BaseError } from '../../shared/errors/index.js';

export interface AdminActorInput {
  adminSub: string;
}

export interface AdminUserParams {
  sub: string;
}

export interface AdminCreateUserInput {
  email: string;
  password: string;
  email_verified?: boolean | undefined;
  name?: string | undefined;
  avatar_url?: string | undefined;
}

export interface AdminUpdateProfileInput {
  name?: string | undefined;
  avatar_url?: string | undefined;
}

export interface AdminClientParams {
  clientId: string;
}

export interface AdminCreateClientInput {
  name: string;
  redirectUris: string[];
  postLogoutRedirectUris?: string[] | undefined;
  allowedScopes: string[];
  grantTypes: string[];
  responseTypes: string[];
  status?: 'active' | 'disabled' | undefined;
}

export interface AdminUpdateClientInput {
  name?: string | undefined;
  redirectUris?: string[] | undefined;
  postLogoutRedirectUris?: string[] | undefined;
  allowedScopes?: string[] | undefined;
  grantTypes?: string[] | undefined;
  responseTypes?: string[] | undefined;
  status?: 'active' | 'disabled' | undefined;
}

const trimmedRequiredString = (fieldName: string) =>
  z
    .string()
    .trim()
    .refine((value) => value.length > 0, `${fieldName} is required.`);

const optionalTrimmedString = z
  .string()
  .trim()
  .refine((value) => value.length > 0)
  .optional();

const adminActorSchema = z
  .object({
    adminSub: trimmedRequiredString('adminSub'),
  })
  .strict();

const adminUserParamsSchema = z
  .object({
    sub: trimmedRequiredString('sub'),
  })
  .strict();

const adminCreateUserSchema = z
  .object({
    email: z.string().trim().email(),
    password: trimmedRequiredString('password'),
    email_verified: z.boolean().optional(),
    name: optionalTrimmedString,
    avatar_url: optionalTrimmedString,
  })
  .strict();

const adminUpdateProfileSchema = z
  .object({
    name: optionalTrimmedString,
    avatar_url: optionalTrimmedString,
  })
  .strict()
  .refine((value) => value.name !== undefined || value.avatar_url !== undefined);

const adminClientParamsSchema = z
  .object({
    clientId: trimmedRequiredString('clientId'),
  })
  .strict();

const adminCreateClientSchema = z
  .object({
    name: trimmedRequiredString('name'),
    redirectUris: z.array(trimmedRequiredString('redirectUri')).min(1),
    postLogoutRedirectUris: z.array(trimmedRequiredString('postLogoutRedirectUri')).optional(),
    allowedScopes: z.array(trimmedRequiredString('scope')).min(1),
    grantTypes: z.array(trimmedRequiredString('grantType')).min(1),
    responseTypes: z.array(trimmedRequiredString('responseType')).min(1),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .strict();

const adminUpdateClientSchema = z
  .object({
    name: optionalTrimmedString,
    redirectUris: z.array(trimmedRequiredString('redirectUri')).min(1).optional(),
    postLogoutRedirectUris: z.array(trimmedRequiredString('postLogoutRedirectUri')).optional(),
    allowedScopes: z.array(trimmedRequiredString('scope')).min(1).optional(),
    grantTypes: z.array(trimmedRequiredString('grantType')).min(1).optional(),
    responseTypes: z.array(trimmedRequiredString('responseType')).min(1).optional(),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const invalidAdminInput = (): BaseError =>
  new BaseError('Invalid admin request input.', {
    code: 'INVALID_INPUT',
    statusCode: 400,
  });

const parseAdminInput = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw invalidAdminInput();
  }

  return parsed.data;
};

export const validateAdminActor = (input: unknown): AdminActorInput =>
  parseAdminInput(adminActorSchema, input);

export const validateAdminUserParams = (input: unknown): AdminUserParams =>
  parseAdminInput(adminUserParamsSchema, input);

export const validateAdminCreateUserInput = (input: unknown): AdminCreateUserInput =>
  parseAdminInput(adminCreateUserSchema, input);

export const validateAdminUpdateProfileInput = (input: unknown): AdminUpdateProfileInput =>
  parseAdminInput(adminUpdateProfileSchema, input);

export const validateAdminClientParams = (input: unknown): AdminClientParams =>
  parseAdminInput(adminClientParamsSchema, input);

export const validateAdminCreateClientInput = (input: unknown): AdminCreateClientInput =>
  parseAdminInput(adminCreateClientSchema, input);

export const validateAdminUpdateClientInput = (input: unknown): AdminUpdateClientInput =>
  parseAdminInput(adminUpdateClientSchema, input);
