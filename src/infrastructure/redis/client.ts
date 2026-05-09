import Redis, { type RedisOptions } from 'ioredis';

import { config } from '../../config/config.js';

const REDIS_OPTIONS: Readonly<RedisOptions> = Object.freeze({
  lazyConnect: true,
  maxRetriesPerRequest: 0,
  enableOfflineQueue: false,
  connectTimeout: 5000,
});

export interface RedisReadiness {
  dependency: 'redis';
  status: 'up' | 'down';
}

let redisClient: Redis | null = null;
let initializationPromise: Promise<Redis> | null = null;
let isInitialized = false;

const formatRedisError = (error: unknown): Error => {
  const message = error instanceof Error ? error.message : 'Unknown Redis initialization error.';
  return new Error(`Redis initialization failed: ${message}`);
};

const createClient = (): Redis => new Redis(config.infrastructure.redis.url, REDIS_OPTIONS);

const withTimeout = async <T>(operation: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Readiness check timed out.'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
};

export const getRedisClient = async (): Promise<Redis> => {
  if (redisClient !== null && isInitialized) {
    return redisClient;
  }

  if (initializationPromise !== null) {
    return initializationPromise;
  }

  if (redisClient === null) {
    redisClient = createClient();
  }

  initializationPromise = (async () => {
    if (redisClient === null) {
      throw new Error('Redis client is unavailable during initialization.');
    }

    try {
      await redisClient.connect();
      await redisClient.ping();
      isInitialized = true;
      return redisClient;
    } catch (error: unknown) {
      redisClient.disconnect();
      redisClient = null;
      isInitialized = false;
      throw formatRedisError(error);
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

export const disconnectRedisClient = async (): Promise<void> => {
  if (redisClient === null) {
    return;
  }

  try {
    if (isInitialized) {
      await redisClient.quit();
    } else {
      redisClient.disconnect();
    }
  } finally {
    redisClient = null;
    initializationPromise = null;
    isInitialized = false;
  }
};

export const resetRedisClientForTest = (): void => {
  if (redisClient !== null) {
    redisClient.disconnect();
  }

  redisClient = null;
  initializationPromise = null;
  isInitialized = false;
};

export const checkRedisReadiness = async (timeoutMs = 1000): Promise<RedisReadiness> => {
  if (redisClient === null || !isInitialized || redisClient.status !== 'ready') {
    return {
      dependency: 'redis',
      status: 'down',
    };
  }

  try {
    await withTimeout(redisClient.ping(), timeoutMs);
    return {
      dependency: 'redis',
      status: 'up',
    };
  } catch {
    return {
      dependency: 'redis',
      status: 'down',
    };
  }
};
