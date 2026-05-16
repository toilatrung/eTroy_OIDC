export const AUDIT_EVENT_CATEGORIES = [
  'auth',
  'user',
  'oidc',
  'admin',
  'client',
  'token',
  'session',
  'security',
  'system',
] as const;

export type AuditEventCategory = (typeof AUDIT_EVENT_CATEGORIES)[number];

export const AUDIT_EVENT_SEVERITIES = ['info', 'warning', 'critical'] as const;

export type AuditEventSeverity = (typeof AUDIT_EVENT_SEVERITIES)[number];

export const AUDIT_EVENT_OUTCOMES = ['success', 'failure', 'denied', 'noop'] as const;

export type AuditEventOutcome = (typeof AUDIT_EVENT_OUTCOMES)[number];

export const AUDIT_EVENT_TYPES = [
  'auth.login.success',
  'auth.login.failure',
  'auth.current_password.verified',
  'auth.current_password.failed',
  'user.created',
  'user.profile.updated',
  'user.password.changed',
  'user.email.verified',
  'user.status.changed',
  'oidc.authorization.started',
  'oidc.authorization.login_required',
  'oidc.authorization.consent_required',
  'oidc.authorization.consent_approved',
  'oidc.authorization.consent_denied',
  'oidc.authorization.consent_reused',
  'oidc.authorization.consent_revoked',
  'oidc.authorization.code_issued',
  'oidc.authorization.invalid_client',
  'oidc.authorization.invalid_scope',
  'oidc.authorization.interaction_expired',
  'oidc.authorization.accepted',
  'oidc.authorization.denied',
  'oidc.authorization.pkce_failed',
  'oidc.authorization.invalid_redirect_uri',
  'oidc.token.issued',
  'oidc.token.revoked',
  'oidc.token.introspection.performed',
  'oidc.refresh.rotated',
  'oidc.refresh.reuse_detected',
  'oidc.refresh.family_compromised',
  'oidc.session.created',
  'oidc.session.reused',
  'oidc.session.invalidated',
  'oidc.logout.completed',
  'oidc.logout.csrf_failed',
  'oidc.client.created',
  'oidc.client.updated',
  'oidc.client.disabled',
  'oidc.client.secret_rotated',
  'admin.user.created',
  'admin.user.disabled',
  'admin.user.enabled',
  'admin.user.profile.updated',
  'admin.user.email_verified.marked',
  'admin.client.created',
  'admin.client.updated',
  'admin.client.disabled',
  'admin.client.secret_rotated',
  'admin.token.revoked',
  'admin.session.invalidated',
  'security.csrf.failed',
  'security.pkce.failed',
  'security.invalid_redirect_uri',
  'security.suspicious_token_reuse',
  'security.unauthorized_admin_action',
  'security.secret_redaction_triggered',
  'oidc.key.rotated',
  'oidc.key.retired',
  'oidc.key.rotation_failed',
  'oidc.key.rollback_performed',
  'oidc.key.compromised',
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export const AUDIT_ACTOR_TYPES = ['user', 'admin', 'client', 'system', 'unknown'] as const;

export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const AUDIT_SUBJECT_TYPES = [
  'user',
  'admin',
  'client',
  'token',
  'token_family',
  'session',
  'authorization_code',
  'verification',
  'password_reset',
  'key',
  'system',
  'unknown',
] as const;

export type AuditSubjectType = (typeof AUDIT_SUBJECT_TYPES)[number];

export interface AuditActor {
  type: AuditActorType;
  sub?: string;
  adminSub?: string;
  clientId?: string;
  display?: string;
  source?: string;
}

export interface AuditSubject {
  type: AuditSubjectType;
  id?: string;
  sub?: string;
  clientId?: string;
  sessionId?: string;
  tokenFamilyId?: string;
  keyId?: string;
}

export interface AuditClient {
  clientId?: string;
  redirectUri?: string;
  scope?: string | string[];
  grantType?: string;
}

export interface AuditRequest {
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  requestId?: string;
}

export type AuditMetadataPrimitive = string | number | boolean | null;
export type AuditMetadataValue = AuditMetadataPrimitive | AuditMetadataPrimitive[];
export type AuditMetadata = Record<string, AuditMetadataValue>;

export interface AuditEventRecord {
  id: string;
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
