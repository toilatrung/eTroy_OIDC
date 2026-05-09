import { randomUUID } from 'node:crypto';

import {
  createPublicKeyFromJwk,
  derivePublicJwk,
  generateRsaKeyPair,
  loadRsaKeyPair,
  signJwtRs256WithPrivateKey,
  verifyJwtRs256WithPublicKey,
  type JsonWebKeySet,
  type JwksRsaKey,
  type SigningJwtPayload,
  type SigningVerifiedJwt,
} from '../../../infrastructure/crypto/index.js';
import { logger } from '../../../infrastructure/logger/index.js';
import { incrementCounter, setGauge } from '../../../infrastructure/metrics/metrics.js';
import { BaseError } from '../../../shared/errors/index.js';
import { auditService } from '../../audit/audit.service.js';

import { OidcKeyRepository, type OidcKeyEntity } from '../repositories/key.repository.js';

const DEFAULT_OVERLAP_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_KID_GENERATION_ATTEMPTS = 5;
const DEFAULT_CREATED_BY = 'system';

const invalidKeyState = (message: string, code: string): BaseError =>
  new BaseError(message, {
    code,
    statusCode: 500,
  });

const invalidKeyInput = (message: string, code: string): BaseError =>
  new BaseError(message, {
    code,
    statusCode: 400,
  });

const isDuplicateKeyError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return maybeCode === 11000;
};

const generateKid = (): string => `kid_${randomUUID()}`;

const parseJwtKid = (token: string): string => {
  const segments = token.split('.');
  if (segments.length !== 3) {
    throw invalidKeyInput('Token is malformed.', 'INVALID_JWT');
  }

  try {
    const [encodedHeader] = segments;
    if (encodedHeader === undefined) {
      throw new Error('Missing header segment');
    }

    const decodedHeader = Buffer.from(encodedHeader, 'base64url').toString('utf8');
    const parsed = JSON.parse(decodedHeader) as Record<string, unknown>;
    const kid = parsed.kid;

    if (typeof kid !== 'string' || kid.trim().length === 0) {
      throw new Error('Missing kid');
    }

    return kid;
  } catch {
    throw invalidKeyInput('Token header is invalid.', 'INVALID_JWT');
  }
};

interface RotationResult {
  newKid: string;
  previousKid: string;
  overlapExpiresAt: Date;
}

interface InitializationResult {
  kid: string;
  created: boolean;
}

export class OidcKeyService {
  constructor(
    private readonly repository: OidcKeyRepository = new OidcKeyRepository(),
    private readonly overlapWindowMs: number = DEFAULT_OVERLAP_WINDOW_MS,
    private readonly getNow: () => Date = () => new Date(),
  ) {}

  async signJwt(payload: SigningJwtPayload): Promise<string> {
    const activeKey = await this.getSingleActiveSigningKey();

    try {
      const token = signJwtRs256WithPrivateKey(
        payload,
        activeKey.privateKeyMaterial,
        activeKey.kid,
      );
      await this.repository.updateLastUsed(activeKey.kid, this.getNow());
      return token;
    } catch {
      throw invalidKeyState(
        'Active signing key material is invalid.',
        'ACTIVE_SIGNING_KEY_INVALID',
      );
    }
  }

  async verifyJwt(token: string): Promise<SigningVerifiedJwt> {
    const now = this.getNow();
    const kid = parseJwtKid(token);
    const verificationKey = await this.repository.findByKidForVerification(kid, now);
    if (verificationKey === null) {
      throw invalidKeyInput('Token signing key is not eligible for verification.', 'INVALID_JWT');
    }

    try {
      const publicKey = createPublicKeyFromJwk(verificationKey.publicJwk);
      const verified = verifyJwtRs256WithPublicKey(token, publicKey);

      if (verified.header.kid !== verificationKey.kid) {
        throw invalidKeyInput('Token kid does not match resolved key.', 'INVALID_JWT');
      }

      await this.repository.updateLastUsed(verificationKey.kid, now);
      return verified;
    } catch (error: unknown) {
      if (BaseError.isBaseError(error)) {
        throw error;
      }

      throw invalidKeyInput('Token signature is invalid.', 'INVALID_JWT');
    }
  }

  async getJwks(): Promise<JsonWebKeySet> {
    const now = this.getNow();
    const keys = await this.repository.findJwksEligibleKeys(now);

    const publicKeys = keys
      .filter(
        (key) =>
          key.status === 'active' || (key.status === 'retired' && this.isInOverlap(key, now)),
      )
      .sort((left, right) => {
        if (left.status === right.status) {
          return left.kid.localeCompare(right.kid);
        }
        return left.status === 'active' ? -1 : 1;
      })
      .map((key) => this.toPublicJwk(key.publicJwk, key.kid));

    return {
      keys: publicKeys,
    };
  }

  async initializeActiveSigningKey(): Promise<InitializationResult> {
    const activeKeys = await this.repository.findActiveKeys();
    if (activeKeys.length === 1) {
      const [activeKey] = activeKeys;
      if (activeKey === undefined) {
        throw invalidKeyState('No active signing key is available.', 'NO_ACTIVE_SIGNING_KEY');
      }

      return {
        kid: activeKey.kid,
        created: false,
      };
    }

    if (activeKeys.length > 1) {
      throw invalidKeyState(
        'Multiple active signing keys detected. Initialization is blocked.',
        'MULTIPLE_ACTIVE_SIGNING_KEYS',
      );
    }

    const now = this.getNow();

    try {
      const loaded = loadRsaKeyPair();
      const created = await this.createActiveKeyWithRetry({
        privateKeyMaterial: loaded.privateKeyPem,
        publicJwkSource: loaded.publicKey,
        createdAt: now,
        activatedAt: now,
        createdBy: DEFAULT_CREATED_BY,
        rotationReason: 'BOOTSTRAP_FROM_LOCAL_KEYS',
      });

      return {
        kid: created.kid,
        created: true,
      };
    } catch {
      const generated = generateRsaKeyPair();
      const created = await this.createActiveKeyWithRetry({
        privateKeyMaterial: generated.privateKeyPem,
        publicJwkSource: generated.publicKey,
        createdAt: now,
        activatedAt: now,
        createdBy: DEFAULT_CREATED_BY,
        rotationReason: 'BOOTSTRAP_GENERATED_KEY',
      });

      return {
        kid: created.kid,
        created: true,
      };
    }
  }

  async rotateSigningKey(reasonCode = 'MANUAL_ROTATION'): Promise<RotationResult> {
    const currentActive = await this.getSingleActiveSigningKey();
    const now = this.getNow();
    const overlapExpiresAt = new Date(now.getTime() + this.overlapWindowMs);

    try {
      const generated = generateRsaKeyPair();
      const newKey = await this.createActiveKeyWithRetry({
        privateKeyMaterial: generated.privateKeyPem,
        publicJwkSource: generated.publicKey,
        createdBy: DEFAULT_CREATED_BY,
        rotationReason: reasonCode,
      });

      const retiredCurrent = await this.repository.retireKeyByKid({
        kid: currentActive.kid,
        retiredAt: now,
        overlapExpiresAt,
        rotationReason: reasonCode,
      });

      const retiredAdditional = await this.repository.retireActiveKeysExcept({
        nextActiveKid: newKey.kid,
        retiredAt: now,
        overlapExpiresAt,
        rotationReason: reasonCode,
      });

      if (!retiredCurrent && retiredAdditional === 0) {
        throw invalidKeyState(
          'Previous active key could not be retired during rotation.',
          'KEY_ROTATION_RETIREMENT_FAILED',
        );
      }

      await this.recordRotationSuccessAudit(
        newKey.kid,
        currentActive.kid,
        overlapExpiresAt,
        reasonCode,
      );
      incrementCounter('oidc_key_rotation_total', {
        module: 'oidc',
        operation: 'key_rotation',
        outcome: 'success',
      });
      setGauge('oidc_active_signing_key_available', 1, {
        module: 'oidc',
        operation: 'signing_key_status',
      });
      logger.info(
        {
          module: 'oidc',
          operation: 'key_rotation',
          outcome: 'success',
          reasonCode,
        },
        'OIDC signing key rotated successfully.',
      );

      return {
        newKid: newKey.kid,
        previousKid: currentActive.kid,
        overlapExpiresAt,
      };
    } catch (error: unknown) {
      await this.recordRotationFailureAudit(reasonCode);
      incrementCounter('oidc_key_rotation_total', {
        module: 'oidc',
        operation: 'key_rotation',
        outcome: 'failure',
      });
      logger.error(
        {
          module: 'oidc',
          operation: 'key_rotation',
          outcome: 'failure',
          reasonCode: 'KEY_ROTATION_FAILED',
          errorCode: 'KEY_ROTATION_FAILED',
          errorName: error instanceof Error ? error.name : 'Error',
        },
        'OIDC signing key rotation failed.',
      );

      if (BaseError.isBaseError(error)) {
        throw error;
      }

      throw invalidKeyState('Key rotation failed.', 'KEY_ROTATION_FAILED');
    }
  }

  async rollbackToRetiredKey(targetKid: string, reasonCode = 'MANUAL_ROLLBACK'): Promise<void> {
    const now = this.getNow();
    const targetKey = await this.repository.findByKid(targetKid);
    if (targetKey === null) {
      throw invalidKeyInput('Rollback target key does not exist.', 'KEY_NOT_FOUND');
    }

    if (targetKey.status !== 'retired') {
      throw invalidKeyInput('Rollback target key must be retired.', 'KEY_ROLLBACK_INVALID_TARGET');
    }

    if (!this.isInOverlap(targetKey, now)) {
      throw invalidKeyInput(
        'Rollback target key is outside the overlap window.',
        'KEY_ROLLBACK_OUTSIDE_OVERLAP',
      );
    }

    const currentActive = await this.getSingleActiveSigningKey();
    if (currentActive.kid === targetKid) {
      return;
    }

    const activated = await this.repository.setActiveKey(targetKid, now);
    if (!activated) {
      throw invalidKeyState('Rollback activation failed.', 'KEY_ROLLBACK_ACTIVATION_FAILED');
    }

    await this.repository.retireActiveKeysExcept({
      nextActiveKid: targetKid,
      retiredAt: now,
      overlapExpiresAt: new Date(now.getTime() + this.overlapWindowMs),
      rotationReason: reasonCode,
    });

    await auditService.recordEvent({
      eventType: 'oidc.key.rollback_performed',
      category: 'security',
      severity: 'warning',
      outcome: 'success',
      actor: { type: 'system' },
      subject: { type: 'key', keyId: targetKid },
      reasonCode,
      metadata: {
        operation: 'rollback',
        previousKid: currentActive.kid,
        newKid: targetKid,
      },
    });

    incrementCounter('oidc_key_rollback_total', {
      module: 'oidc',
      operation: 'key_rollback',
      outcome: 'success',
    });
  }

  async markKeyCompromised(kid: string, reasonCode = 'COMPROMISED'): Promise<void> {
    const key = await this.repository.findByKid(kid);
    if (key === null) {
      throw invalidKeyInput('Key does not exist.', 'KEY_NOT_FOUND');
    }

    if (key.status === 'compromised') {
      return;
    }

    if (key.status === 'active') {
      await this.rotateSigningKey('COMPROMISE_RESPONSE_ROTATION');
    }

    const compromised = await this.repository.markCompromised(kid, this.getNow(), reasonCode);
    if (!compromised) {
      throw invalidKeyState('Failed to mark key as compromised.', 'KEY_COMPROMISE_FAILED');
    }

    await auditService.recordEvent({
      eventType: 'oidc.key.compromised',
      category: 'security',
      severity: 'critical',
      outcome: 'success',
      actor: { type: 'system' },
      subject: { type: 'key', keyId: kid },
      reasonCode,
      metadata: {
        operation: 'compromise',
        kid,
        newStatus: 'compromised',
      },
    });

    incrementCounter('oidc_key_compromised_total', {
      module: 'oidc',
      operation: 'key_compromised',
      outcome: 'success',
    });
  }

  private async getSingleActiveSigningKey(): Promise<OidcKeyEntity> {
    const activeKeys = await this.repository.findActiveKeys();
    if (activeKeys.length === 0) {
      setGauge('oidc_active_signing_key_available', 0, {
        module: 'oidc',
        operation: 'signing_key_status',
      });
      throw invalidKeyState('No active signing key is available.', 'NO_ACTIVE_SIGNING_KEY');
    }

    if (activeKeys.length > 1) {
      setGauge('oidc_active_signing_key_available', 0, {
        module: 'oidc',
        operation: 'signing_key_status',
      });
      throw invalidKeyState(
        'Multiple active signing keys detected. Signing is blocked.',
        'MULTIPLE_ACTIVE_SIGNING_KEYS',
      );
    }

    setGauge('oidc_active_signing_key_available', 1, {
      module: 'oidc',
      operation: 'signing_key_status',
    });
    const activeKey = activeKeys[0];
    if (activeKey === undefined) {
      throw invalidKeyState('No active signing key is available.', 'NO_ACTIVE_SIGNING_KEY');
    }

    return activeKey;
  }

  private async createActiveKeyWithRetry(input: {
    privateKeyMaterial: string;
    publicJwkSource: Parameters<typeof derivePublicJwk>[0];
    createdAt?: Date;
    activatedAt?: Date;
    createdBy: string;
    rotationReason: string;
  }): Promise<OidcKeyEntity> {
    for (let attempt = 0; attempt < MAX_KID_GENERATION_ATTEMPTS; attempt += 1) {
      const kid = generateKid();
      const publicJwk = derivePublicJwk(input.publicJwkSource, kid);
      const now = this.getNow();

      try {
        return await this.repository.createKey({
          kid,
          status: 'active',
          algorithm: 'RS256',
          publicJwk,
          privateKeyMaterial: input.privateKeyMaterial,
          createdAt: input.createdAt ?? now,
          activatedAt: input.activatedAt ?? now,
          rotationReason: input.rotationReason,
          createdBy: input.createdBy,
        });
      } catch (error: unknown) {
        if (isDuplicateKeyError(error)) {
          continue;
        }
        throw error;
      }
    }

    throw invalidKeyState('Unable to generate a unique signing key id.', 'KID_GENERATION_FAILED');
  }

  private isInOverlap(key: Pick<OidcKeyEntity, 'overlapExpiresAt'>, now: Date): boolean {
    return key.overlapExpiresAt !== null && key.overlapExpiresAt.getTime() > now.getTime();
  }

  private toPublicJwk(jwk: JwksRsaKey, kid: string): JwksRsaKey {
    return {
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid,
      n: jwk.n,
      e: jwk.e,
    };
  }

  private async recordRotationSuccessAudit(
    newKid: string,
    previousKid: string,
    overlapExpiresAt: Date,
    reasonCode: string,
  ): Promise<void> {
    await auditService.recordEvent({
      eventType: 'oidc.key.rotated',
      category: 'security',
      severity: 'warning',
      outcome: 'success',
      actor: { type: 'system' },
      subject: { type: 'key', keyId: newKid },
      reasonCode,
      metadata: {
        operation: 'rotation',
        previousKid,
        newKid,
        overlapExpiresAt: overlapExpiresAt.toISOString(),
      },
    });

    await auditService.recordEvent({
      eventType: 'oidc.key.retired',
      category: 'security',
      severity: 'info',
      outcome: 'success',
      actor: { type: 'system' },
      subject: { type: 'key', keyId: previousKid },
      reasonCode: 'ROTATED_TO_RETIRED',
      metadata: {
        operation: 'retirement',
        kid: previousKid,
        newStatus: 'retired',
        overlapExpiresAt: overlapExpiresAt.toISOString(),
      },
    });
  }

  private async recordRotationFailureAudit(reasonCode: string): Promise<void> {
    await auditService.recordEvent({
      eventType: 'oidc.key.rotation_failed',
      category: 'security',
      severity: 'critical',
      outcome: 'failure',
      actor: { type: 'system' },
      subject: { type: 'key' },
      reasonCode,
      metadata: {
        operation: 'rotation',
        outcome: 'failure',
      },
    });
  }
}

export const oidcKeyService = new OidcKeyService();
