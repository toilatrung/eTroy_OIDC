import type { HydratedDocument } from 'mongoose';

import { AuditEventModel, type AuditEventDocument } from './audit-event.model.js';
import type { AuditEventRecord } from './audit.types.js';

export type CreateAuditEventInput = Omit<AuditEventRecord, 'id'>;

const toAuditEventRecord = (document: HydratedDocument<AuditEventDocument>): AuditEventRecord => {
  const record: AuditEventRecord = {
    id: document._id.toString(),
    eventId: document.eventId,
    eventType: document.eventType,
    category: document.category,
    severity: document.severity,
    outcome: document.outcome,
    occurredAt: document.occurredAt,
    createdAt: document.createdAt,
  };

  if (document.actor !== undefined) {
    record.actor = document.actor;
  }
  if (document.subject !== undefined) {
    record.subject = document.subject;
  }
  if (document.client !== undefined) {
    record.client = document.client;
  }
  if (document.request !== undefined) {
    record.request = document.request;
  }
  if (document.correlationId !== undefined) {
    record.correlationId = document.correlationId;
  }
  if (document.requestId !== undefined) {
    record.requestId = document.requestId;
  }
  if (document.reasonCode !== undefined) {
    record.reasonCode = document.reasonCode;
  }
  if (document.metadata !== undefined) {
    record.metadata = document.metadata;
  }

  return record;
};

export class AuditRepository {
  async createEvent(input: CreateAuditEventInput): Promise<AuditEventRecord> {
    const created = await AuditEventModel.create(input);
    return toAuditEventRecord(created);
  }
}
