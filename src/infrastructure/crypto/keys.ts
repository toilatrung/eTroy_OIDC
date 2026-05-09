import {
  createHash,
  createPrivateKey,
  createPublicKey,
  createVerify,
  generateKeyPairSync,
  sign as rsaSign,
  type KeyObject,
} from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_KEYS_DIRECTORY = resolve(process.cwd(), 'keys');
const PRIVATE_KEY_FILE_NAME = 'private.pem';
const PUBLIC_KEY_FILE_NAME = 'public.pem';

export interface KeyLoadOptions {
  keysDirectory?: string;
}

export interface RsaKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
  keyId: string;
}

export interface GeneratedRsaKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
}

export interface JwtHeader {
  alg: 'RS256';
  typ: 'JWT';
  kid: string;
}

export type JwtPayload = Record<string, unknown>;

export interface VerifiedJwt {
  header: JwtHeader;
  payload: JwtPayload;
}

const resolveKeysDirectory = (options: KeyLoadOptions = {}): string =>
  options.keysDirectory ?? DEFAULT_KEYS_DIRECTORY;

const readPemFile = (path: string, label: string): string => {
  try {
    const content = readFileSync(path, 'utf-8').trim();
    if (content.length === 0) {
      throw new Error(`${label} is empty.`);
    }
    return content;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown file read error.';
    throw new Error(`Failed to read ${label}: ${message}`);
  }
};

const toBase64Url = (buffer: Buffer): string =>
  buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const invalidJwt = (message: string): never => {
  throw new Error(`Invalid JWT: ${message}`);
};

const parseJwtPartJson = <T>(value: string, label: string): T => {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    return JSON.parse(decoded) as T;
  } catch {
    return invalidJwt(`${label} is not valid base64url JSON.`);
  }
};

const toCompactJsonBase64Url = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const parseHeader = (value: unknown): JwtHeader => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalidJwt('header must be an object.');
  }

  const header = value as Record<string, unknown>;
  const { alg, typ, kid } = header;

  if (alg !== 'RS256') {
    return invalidJwt('alg must be RS256.');
  }

  if (typ !== 'JWT') {
    return invalidJwt('typ must be JWT.');
  }

  if (typeof kid !== 'string' || kid.length === 0) {
    return invalidJwt('kid is required.');
  }

  return {
    alg,
    typ,
    kid,
  };
};

const parsePayload = (value: unknown): JwtPayload => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalidJwt('payload must be an object.');
  }

  return value as JwtPayload;
};

export const loadPrivateKeyPem = (options: KeyLoadOptions = {}): string => {
  const keysDirectory = resolveKeysDirectory(options);
  return readPemFile(resolve(keysDirectory, PRIVATE_KEY_FILE_NAME), PRIVATE_KEY_FILE_NAME);
};

export const loadPublicKeyPem = (options: KeyLoadOptions = {}): string => {
  const keysDirectory = resolveKeysDirectory(options);
  return readPemFile(resolve(keysDirectory, PUBLIC_KEY_FILE_NAME), PUBLIC_KEY_FILE_NAME);
};

export const deriveKeyIdFromPublicKey = (publicKey: KeyObject): string => {
  const der = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  const digest = createHash('sha256').update(der).digest();
  return toBase64Url(digest);
};

export const generateRsaKeyPair = (): GeneratedRsaKeyPair => {
  const generated = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const privateKeyPem = generated.privateKey.trim();
  const publicKeyPem = generated.publicKey.trim();

  return {
    privateKeyPem,
    publicKeyPem,
    privateKey: createPrivateKey(privateKeyPem),
    publicKey: createPublicKey(publicKeyPem),
  };
};

export const createPrivateKeyFromPem = (privateKeyPem: string): KeyObject => {
  try {
    return createPrivateKey(privateKeyPem);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown private key parse error.';
    throw new Error(`Failed to parse private signing key material: ${message}`);
  }
};

export const signJwtRs256WithPrivateKey = (
  payload: JwtPayload,
  privateKeyPem: string,
  kid: string,
): string => {
  const privateKey = createPrivateKeyFromPem(privateKeyPem);
  const header: JwtHeader = {
    alg: 'RS256',
    typ: 'JWT',
    kid,
  };

  const encodedHeader = toCompactJsonBase64Url(header);
  const encodedPayload = toCompactJsonBase64Url(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = rsaSign('RSA-SHA256', Buffer.from(signingInput, 'utf8'), privateKey);

  return `${signingInput}.${signature.toString('base64url')}`;
};

export const verifyJwtRs256WithPublicKey = (token: string, publicKey: KeyObject): VerifiedJwt => {
  if (typeof token !== 'string' || token.length === 0) {
    return invalidJwt('token is required.');
  }

  const segments = token.split('.');
  if (segments.length !== 3) {
    return invalidJwt('token must have exactly 3 segments.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = segments as [string, string, string];
  if (encodedHeader.length === 0 || encodedPayload.length === 0 || encodedSignature.length === 0) {
    return invalidJwt('token segments must not be empty.');
  }

  const header = parseHeader(parseJwtPartJson<unknown>(encodedHeader, 'header'));
  const payload = parsePayload(parseJwtPartJson<unknown>(encodedPayload, 'payload'));

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = Buffer.from(encodedSignature, 'base64url');
  const verifier = createVerify('RSA-SHA256');
  verifier.update(signingInput, 'utf8');
  verifier.end();

  const isValid = verifier.verify(publicKey, signature);
  if (!isValid) {
    return invalidJwt('signature verification failed.');
  }

  return {
    header,
    payload,
  };
};

export const loadRsaKeyPair = (options: KeyLoadOptions = {}): RsaKeyPair => {
  const privateKeyPem = loadPrivateKeyPem(options);
  const publicKeyPem = loadPublicKeyPem(options);

  try {
    const privateKey = createPrivateKey(privateKeyPem);
    const publicKey = createPublicKey(publicKeyPem);
    const keyId = deriveKeyIdFromPublicKey(publicKey);

    return {
      privateKeyPem,
      publicKeyPem,
      privateKey,
      publicKey,
      keyId,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown RSA parse error.';
    throw new Error(`Failed to load RSA key material: ${message}`);
  }
};
