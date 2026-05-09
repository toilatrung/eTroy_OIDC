import {
  auditService,
  type AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import {
  oidcClientService,
  type ClientAdminView,
  type ClientWithSecret,
  type CreateClientRequest,
  type UpdateClientRequest,
} from '../oidc/services/client.service.js';
import {
  userService,
  type CreateAdminProvisionedUserInput,
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

type AdminUsersService = Pick<
  UserService,
  | 'createAdminProvisionedUser'
  | 'getAdminUserViewBySub'
  | 'setUserStatusBySub'
  | 'updateAdminProfileBySub'
  | 'markEmailVerifiedBySub'
>;

type AdminAuditService = Pick<AuditService, 'recordEvent'>;

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
