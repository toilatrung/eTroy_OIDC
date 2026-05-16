import {
  auditService,
  type AuditService,
  type ListAuditEventsRequest,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import type { AuditEventRecord } from '../audit/audit.types.js';
import {
  oidcClientService,
  type ClientAdminView,
  type ClientWithSecret,
  type CreateClientRequest,
  type UpdateClientRequest,
} from '../oidc/services/client.service.js';
import { oidcService, type OidcSessionView } from '../oidc/services/oidc.service.js';
import {
  userService,
  type CreateAdminProvisionedUserInput,
  type ListAdminUsersInput,
  type PreviewUnverifiedUsersPurgeInput,
  type PreviewUnverifiedUsersPurgeResult,
  type UpdateProfileInput,
  type UserAdminView,
  type UserService,
} from '../users/user.service.js';

export interface AdminActor {
  adminSub: string;
}

export interface AdminRequestMetadata {
  method?: string;
  path?: string;
  correlationId?: string;
  requestId?: string;
}

export interface AdminOperationContext {
  actor: AdminActor;
  request?: AdminRequestMetadata;
}

export interface AdminPaginationInput {
  skip?: number;
  limit?: number;
}

export interface AdminPurgeUnverifiedUsersInput {
  dryRun?: boolean;
  olderThanDays?: number;
}

export interface AdminPurgeUnverifiedUsersResult {
  deletedCount: number;
  candidateCount: number;
  dryRun: boolean;
  blocked: boolean;
  reasonCode: string;
  olderThanDays: number;
}

type AdminUsersService = Pick<
  UserService,
  | 'createAdminProvisionedUser'
  | 'getAdminUserViewBySub'
  | 'setUserStatusBySub'
  | 'updateAdminProfileBySub'
  | 'markEmailVerifiedBySub'
  | 'listAdminUsers'
  | 'previewUnverifiedUsersPurge'
>;

type AdminAuditService = Pick<AuditService, 'recordEvent' | 'listEvents'>;
type AdminOidcService = Pick<typeof oidcService, 'listSessions'>;

const toAuditRequest = (
  request: AdminRequestMetadata | undefined,
): RecordAuditEventInput['request'] => {
  if (request === undefined) {
    return undefined;
  }

  const auditRequest: NonNullable<RecordAuditEventInput['request']> = {};

  if (request.method !== undefined) {
    auditRequest.method = request.method;
  }

  if (request.path !== undefined) {
    auditRequest.path = request.path;
  }

  if (request.correlationId !== undefined) {
    auditRequest.correlationId = request.correlationId;
  }

  if (request.requestId !== undefined) {
    auditRequest.requestId = request.requestId;
  }

  return Object.keys(auditRequest).length === 0 ? undefined : auditRequest;
};

const changedProfileFields = (input: UpdateProfileInput): string[] => {
  const fields: string[] = [];

  if (input.name !== undefined) {
    fields.push('name');
  }

  if (input.avatar_url !== undefined) {
    fields.push('avatar_url');
  }

  return fields;
};

export class AdminService {
  constructor(
    private readonly users: AdminUsersService = userService,
    private readonly audit: AdminAuditService = auditService,
    private readonly oidc: AdminOidcService = oidcService,
  ) {}

  async createUser(
    input: CreateAdminProvisionedUserInput,
    context: AdminOperationContext,
  ): Promise<UserAdminView> {
    const user = await this.users.createAdminProvisionedUser(input);

    await this.recordAdminUserEvent({
      eventType: 'admin.user.created',
      severity: 'info',
      reasonCode: 'ADMIN_USER_CREATED',
      targetUser: user,
      context,
      metadata: {
        emailVerified: user.email_verified,
        status: user.status,
      },
    });

    return user;
  }

  async getUser(sub: string): Promise<UserAdminView> {
    return this.users.getAdminUserViewBySub(sub);
  }

  async listUsers(input: ListAdminUsersInput = {}): Promise<UserAdminView[]> {
    return this.users.listAdminUsers(input);
  }

  async disableUser(sub: string, context: AdminOperationContext): Promise<UserAdminView> {
    const user = await this.users.setUserStatusBySub(sub, 'disabled');

    await this.recordAdminUserEvent({
      eventType: 'admin.user.disabled',
      severity: 'warning',
      reasonCode: 'ADMIN_USER_DISABLED',
      targetUser: user,
      context,
      metadata: {
        status: user.status,
      },
    });

    return user;
  }

  async enableUser(sub: string, context: AdminOperationContext): Promise<UserAdminView> {
    const user = await this.users.setUserStatusBySub(sub, 'active');

    await this.recordAdminUserEvent({
      eventType: 'admin.user.enabled',
      severity: 'info',
      reasonCode: 'ADMIN_USER_ENABLED',
      targetUser: user,
      context,
      metadata: {
        status: user.status,
      },
    });

    return user;
  }

  async updateProfile(
    sub: string,
    input: UpdateProfileInput,
    context: AdminOperationContext,
  ): Promise<UserAdminView> {
    const user = await this.users.updateAdminProfileBySub(sub, input);

    await this.recordAdminUserEvent({
      eventType: 'admin.user.profile.updated',
      severity: 'info',
      reasonCode: 'ADMIN_USER_PROFILE_UPDATED',
      targetUser: user,
      context,
      metadata: {
        changedFields: changedProfileFields(input),
      },
    });

    return user;
  }

  async markEmailVerified(sub: string, context: AdminOperationContext): Promise<UserAdminView> {
    const user = await this.users.markEmailVerifiedBySub(sub);

    await this.recordAdminUserEvent({
      eventType: 'admin.user.email_verified.marked',
      severity: 'info',
      reasonCode: 'ADMIN_USER_EMAIL_VERIFIED_MARKED',
      targetUser: user,
      context,
      metadata: {
        emailVerified: user.email_verified,
      },
    });

    return user;
  }

  async createClient(
    input: CreateClientRequest,
    context: AdminOperationContext,
  ): Promise<ClientWithSecret> {
    return oidcClientService.createClient(input, context.actor.adminSub);
  }

  async getClient(clientId: string): Promise<ClientAdminView | null> {
    return oidcClientService.getClient(clientId);
  }

  async listClients(skip?: number, limit?: number): Promise<ClientAdminView[]> {
    return oidcClientService.listClients(skip, limit);
  }

  async updateClient(
    clientId: string,
    input: UpdateClientRequest,
    context: AdminOperationContext,
  ): Promise<ClientAdminView | null> {
    return oidcClientService.updateClient(clientId, input, context.actor.adminSub);
  }

  async disableClient(
    clientId: string,
    context: AdminOperationContext,
  ): Promise<ClientAdminView | null> {
    return oidcClientService.disableClient(clientId, context.actor.adminSub);
  }

  async rotateClientSecret(
    clientId: string,
    context: AdminOperationContext,
  ): Promise<ClientWithSecret | null> {
    return oidcClientService.rotateClientSecret(clientId, context.actor.adminSub);
  }

  async listAuditLogs(input: ListAuditEventsRequest = {}): Promise<AuditEventRecord[]> {
    return this.audit.listEvents(input);
  }

  async listSessions(input: AdminPaginationInput = {}): Promise<OidcSessionView[]> {
    const skip = input.skip ?? 0;
    const limit = input.limit ?? 50;
    const sessions = await this.oidc.listSessions(skip + limit);
    return sessions.slice(skip, skip + limit);
  }

  async purgeUnverifiedUsers(
    input: AdminPurgeUnverifiedUsersInput = {},
    context: AdminOperationContext,
  ): Promise<AdminPurgeUnverifiedUsersResult> {
    const previewInput: PreviewUnverifiedUsersPurgeInput = {
      ...(input.olderThanDays === undefined ? {} : { olderThanDays: input.olderThanDays }),
    };
    const preview: PreviewUnverifiedUsersPurgeResult =
      await this.users.previewUnverifiedUsersPurge(previewInput);

    const dryRun = input.dryRun ?? true;
    const reasonCode = dryRun
      ? 'ADMIN_PURGE_UNVERIFIED_USERS_DRY_RUN'
      : 'ADMIN_PURGE_UNVERIFIED_USERS_BLOCKED';
    const outcome: RecordAuditEventInput['outcome'] = dryRun ? 'noop' : 'denied';
    const severity: RecordAuditEventInput['severity'] = dryRun ? 'info' : 'warning';
    const request = toAuditRequest(context.request);

    await this.audit.recordEvent({
      eventType: 'security.unauthorized_admin_action',
      category: 'security',
      severity,
      outcome,
      actor: {
        type: 'admin',
        adminSub: context.actor.adminSub,
      },
      ...(request === undefined ? {} : { request }),
      reasonCode,
      metadata: {
        operation: 'purge-unverified-users',
        dryRun,
        candidateCount: preview.candidateCount,
        olderThanDays: preview.olderThanDays,
      },
    });

    return {
      deletedCount: 0,
      candidateCount: preview.candidateCount,
      dryRun,
      blocked: !dryRun,
      reasonCode,
      olderThanDays: preview.olderThanDays,
    };
  }

  private async recordAdminUserEvent(input: {
    eventType: RecordAuditEventInput['eventType'];
    severity: RecordAuditEventInput['severity'];
    reasonCode: string;
    targetUser: UserAdminView;
    context: AdminOperationContext;
    metadata?: RecordAuditEventInput['metadata'];
  }): Promise<void> {
    const request = toAuditRequest(input.context.request);

    await this.audit.recordEvent({
      eventType: input.eventType,
      category: 'admin',
      severity: input.severity,
      outcome: 'success',
      actor: {
        type: 'admin',
        adminSub: input.context.actor.adminSub,
      },
      subject: {
        type: 'user',
        sub: input.targetUser.sub,
      },
      ...(request === undefined ? {} : { request }),
      reasonCode: input.reasonCode,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    });
  }
}

export const adminService = new AdminService();
