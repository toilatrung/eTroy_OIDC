import { z } from 'zod';

const hasAllowedProtocol = (value: string, protocols: readonly string[]): boolean => {
  try {
    const parsed = new URL(value);
    return protocols.includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production'], {
    message: 'NODE_ENV must be one of: development, test, production.',
  }),
  PORT: z.coerce
    .number({
      message: 'PORT must be a valid number.',
    })
    .int('PORT must be an integer.')
    .min(1, 'PORT must be between 1 and 65535.')
    .max(65535, 'PORT must be between 1 and 65535.'),
  MONGO_URI: z
    .string()
    .trim()
    .min(1, 'MONGO_URI is required.')
    .refine(
      (value) => hasAllowedProtocol(value, ['mongodb:', 'mongodb+srv:']),
      'MONGO_URI must start with mongodb:// or mongodb+srv://.',
    ),
  REDIS_URL: z
    .string()
    .trim()
    .min(1, 'REDIS_URL is required.')
    .refine(
      (value) => hasAllowedProtocol(value, ['redis:', 'rediss:']),
      'REDIS_URL must start with redis:// or rediss://.',
    ),
  APP_BASE_URL: z
    .string()
    .trim()
    .min(1, 'APP_BASE_URL is required.')
    .refine(
      (value) => hasAllowedProtocol(value, ['http:', 'https:']),
      'APP_BASE_URL must start with http:// or https://.',
    ),
  OIDC_CLIENTS_JSON: z.string().trim().min(1, 'OIDC_CLIENTS_JSON is required.'),
  MAIL_HOST: z.string().trim().min(1, 'MAIL_HOST is required.'),
  MAIL_PORT: z.coerce
    .number({
      message: 'MAIL_PORT must be a valid number.',
    })
    .int('MAIL_PORT must be an integer.')
    .min(1, 'MAIL_PORT must be between 1 and 65535.')
    .max(65535, 'MAIL_PORT must be between 1 and 65535.'),
  MAIL_SECURE: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') {
          return true;
        }

        if (normalized === 'false') {
          return false;
        }
      }

      return value;
    },
    z.boolean({
      message: 'MAIL_SECURE must be true or false.',
    }),
  ),
  MAIL_USER: z.string().trim().min(1, 'MAIL_USER is required.'),
  MAIL_PASSWORD: z.string().trim().min(1, 'MAIL_PASSWORD is required.'),
  MAIL_FROM: z.string().trim().min(1, 'MAIL_FROM is required.'),
});

export type EnvSchema = z.infer<typeof envSchema>;
