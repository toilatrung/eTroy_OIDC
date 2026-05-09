import { createPublicKey, type JsonWebKey, type KeyObject } from 'node:crypto';

import { loadRsaKeyPair, type KeyLoadOptions } from './keys.js';

export interface JwksRsaKey {
  kty: 'RSA';
  use: 'sig';
  alg: 'RS256';
  kid: string;
  n: string;
  e: string;
}

export interface JsonWebKeySet {
  keys: JwksRsaKey[];
}

const toJwksRsaKey = (publicKey: KeyObject, kid: string): JwksRsaKey => {
  const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;

  if (jwk.kty !== 'RSA' || typeof jwk.n !== 'string' || typeof jwk.e !== 'string') {
    throw new Error('Public key is not a valid RSA JWK source.');
  }

  return {
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
    kid,
    n: jwk.n,
    e: jwk.e,
  };
};

export const derivePublicJwk = (publicKey: KeyObject, kid: string): JwksRsaKey =>
  toJwksRsaKey(publicKey, kid);

export const createPublicKeyFromJwk = (jwk: JwksRsaKey): KeyObject => {
  try {
    return createPublicKey({
      key: {
        kty: jwk.kty,
        n: jwk.n,
        e: jwk.e,
      },
      format: 'jwk',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown JWK parse error.';
    throw new Error(`Failed to parse public JWK: ${message}`);
  }
};

export const createJwks = (options: KeyLoadOptions = {}): JsonWebKeySet => {
  const keyPair = loadRsaKeyPair(options);

  return {
    keys: [toJwksRsaKey(keyPair.publicKey, keyPair.keyId)],
  };
};
