import mongoose, { type ConnectOptions, type Mongoose } from 'mongoose';

import { config } from '../../config/config.js';

const CONNECT_OPTIONS: Readonly<ConnectOptions> = Object.freeze({
  serverSelectionTimeoutMS: 5000,
});

export interface DatabaseReadiness {
  dependency: 'mongodb';
  status: 'up' | 'down';
}

let connectionPromise: Promise<Mongoose> | null = null;

const formatConnectionError = (error: unknown): Error => {
  const message = error instanceof Error ? error.message : 'Unknown MongoDB connection error.';
  return new Error(`MongoDB connection failed: ${message}`);
};

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

export const connectDatabase = async (): Promise<Mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectionPromise !== null) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(config.infrastructure.mongodb.uri, CONNECT_OPTIONS)
    .catch((error: unknown) => {
      connectionPromise = null;
      throw formatConnectionError(error);
    });

  return connectionPromise;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (connectionPromise === null && mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.disconnect();
  } finally {
    connectionPromise = null;
  }
};

export const resetDatabaseConnectionForTest = (): void => {
  connectionPromise = null;
};

export const checkDatabaseReadiness = async (timeoutMs = 1000): Promise<DatabaseReadiness> => {
  if (mongoose.connection.readyState !== 1 || mongoose.connection.db === undefined) {
    return {
      dependency: 'mongodb',
      status: 'down',
    };
  }

  try {
    await withTimeout(mongoose.connection.db.admin().ping(), timeoutMs);
    return {
      dependency: 'mongodb',
      status: 'up',
    };
  } catch {
    return {
      dependency: 'mongodb',
      status: 'down',
    };
  }
};
