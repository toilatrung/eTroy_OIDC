import mongoose, { type Model } from 'mongoose';

import {
  AUDIT_ACTOR_TYPES,
  AUDIT_EVENT_CATEGORIES,
  AUDIT_EVENT_OUTCOMES,
  AUDIT_EVENT_SEVERITIES,
  AUDIT_EVENT_TYPES,
  AUDIT_SUBJECT_TYPES,
  type AuditActor,
  type AuditClient,
  type AuditEventCategory,
  type AuditEventOutcome,
  type AuditEventSeverity,
  type AuditEventType,
  type AuditMetadata,
  type AuditMetadataValue,
  type AuditRequest,
  type AuditSubject,
} from './audit.types.js';

const { model, models, Schema } = mongoose;

export interface AuditEventDocument {
  eventId: string;
  eventType: AuditEventType;
  category: AuditEventCategory;
  severity: AuditEventSeverity;
  outcome: AuditEventOutcome;
  actor?: AuditActor;
  subject?: AuditSubject;
  client?: AuditClient;
  request?: AuditRequest;
  correlationId?: string;
  requestId?: string;
  reasonCode?: string;
  metadata?: AuditMetadata;
  occurredAt: Date;
  createdAt: Date;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isMetadataValue = (value: unknown): value is AuditMetadataValue => {
  if (value === null) {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (item: unknown) =>
      item === null ||
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean',
  );
};

const metadataValidator = (value: unknown): boolean => {
  if (value === undefined) {
    return true;
  }

  if (!isPlainObject(value)) {
    return false;
  }

  const entries = Object.entries(value);
  for (const [, candidateValue] of entries) {
    if (!isMetadataValue(candidateValue)) {
      return false;
    }
  }

  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') <= 4096;
  } catch {
    return false;
  }
};

const actorSchema = new Schema<AuditActor>(
  {
    type: {
      type: String,
      enum: [...AUDIT_ACTOR_TYPES],
      required: true,
    },
    sub: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    adminSub: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    clientId: {
      type: String,
      trim: true,
      maxlength: 256,
    },
    display: {
      type: String,
      trim: true,
      maxlength: 256,
    },
    source: {
      type: String,
      trim: true,
      maxlength: 64,
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const subjectSchema = new Schema<AuditSubject>(
  {
    type: {
      type: String,
      enum: [...AUDIT_SUBJECT_TYPES],
      required: true,
    },
    id: {
      type: String,
      trim: true,
      maxlength: 256,
    },
    sub: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    clientId: {
      type: String,
      trim: true,
      maxlength: 256,
    },
    sessionId: {
      type: String,
      trim: true,
      maxlength: 256,
    },
    tokenFamilyId: {
      type: String,
      trim: true,
      maxlength: 256,
    },
    keyId: {
      type: String,
      trim: true,
      maxlength: 128,
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const clientSchema = new Schema<AuditClient>(
  {
    clientId: {
      type: String,
      trim: true,
      maxlength: 256,
    },
    redirectUri: {
      type: String,
      trim: true,
      maxlength: 2048,
    },
    scope: {
      type: Schema.Types.Mixed,
    },
    grantType: {
      type: String,
      trim: true,
      maxlength: 64,
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const requestSchema = new Schema<AuditRequest>(
  {
    method: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 16,
    },
    path: {
      type: String,
      trim: true,
      maxlength: 2048,
    },
    ip: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 512,
    },
    correlationId: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    requestId: {
      type: String,
      trim: true,
      maxlength: 128,
    },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const auditEventSchema = new Schema<AuditEventDocument>(
  {
    eventId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      unique: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [...AUDIT_EVENT_TYPES],
    },
    category: {
      type: String,
      required: true,
      enum: [...AUDIT_EVENT_CATEGORIES],
    },
    severity: {
      type: String,
      required: true,
      enum: [...AUDIT_EVENT_SEVERITIES],
    },
    outcome: {
      type: String,
      required: true,
      enum: [...AUDIT_EVENT_OUTCOMES],
    },
    actor: {
      type: actorSchema,
      required: false,
    },
    subject: {
      type: subjectSchema,
      required: false,
    },
    client: {
      type: clientSchema,
      required: false,
    },
    request: {
      type: requestSchema,
      required: false,
    },
    correlationId: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    requestId: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    reasonCode: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    metadata: {
      type: Schema.Types.Mixed,
      validate: {
        validator: metadataValidator,
        message: 'metadata must be a bounded plain object of safe primitive values.',
      },
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
      immutable: true,
      default: () => new Date(Date.now()),
    },
  },
  {
    collection: 'audit_events',
    strict: 'throw',
    timestamps: false,
    versionKey: false,
  },
);

auditEventSchema.index({ eventType: 1 });
auditEventSchema.index({ category: 1 });
auditEventSchema.index({ severity: 1 });
auditEventSchema.index({ outcome: 1 });
auditEventSchema.index({ 'actor.sub': 1 });
auditEventSchema.index({ 'actor.adminSub': 1 });
auditEventSchema.index({ 'actor.clientId': 1 });
auditEventSchema.index({ 'subject.type': 1 });
auditEventSchema.index({ 'subject.id': 1 });
auditEventSchema.index({ 'client.clientId': 1 });
auditEventSchema.index({ correlationId: 1 });
auditEventSchema.index({ occurredAt: 1 });
auditEventSchema.index({ createdAt: 1 });

export const AuditEventModel =
  (models.AuditEvent as Model<AuditEventDocument> | undefined) ??
  model<AuditEventDocument>('AuditEvent', auditEventSchema);
