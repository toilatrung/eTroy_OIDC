import {
  OidcConsentRepository,
  type OidcConsentEntity,
} from '../repositories/consent.repository.js';

export interface ConnectedApplicationView {
  clientId: string;
  clientName: string;
  grantedScopes: string[];
  grantedAt: string;
  updatedAt: string;
  status: 'active' | 'revoked';
}

const normalizeScopeItems = (scopeItems: readonly string[]): string[] =>
  [...new Set(scopeItems.map((scope) => scope.trim()).filter((scope) => scope.length > 0))].sort(
    (left, right) => left.localeCompare(right),
  );

const includesAllScopes = (
  grantedScopes: readonly string[],
  requestedScopes: readonly string[],
): boolean => {
  const grantedSet = new Set(grantedScopes);
  return requestedScopes.every((scope) => grantedSet.has(scope));
};

const toConnectedApplicationView = (
  consent: OidcConsentEntity,
  clientName: string,
): ConnectedApplicationView => ({
  clientId: consent.clientId,
  clientName,
  grantedScopes: [...consent.grantedScopes],
  grantedAt: consent.grantedAt.toISOString(),
  updatedAt: consent.updatedAt.toISOString(),
  status: consent.status,
});

export class OidcConsentService {
  constructor(private readonly repository: OidcConsentRepository = new OidcConsentRepository()) {}

  async getConsent(subject: string, clientId: string): Promise<OidcConsentEntity | null> {
    return this.repository.findBySubjectAndClientId(subject, clientId);
  }

  hasCoverage(consent: OidcConsentEntity | null, requestedScopes: readonly string[]): boolean {
    if (consent === null || consent.status !== 'active') {
      return false;
    }

    const normalizedRequestedScopes = normalizeScopeItems(requestedScopes);
    return includesAllScopes(consent.grantedScopes, normalizedRequestedScopes);
  }

  async approveConsent(
    subject: string,
    clientId: string,
    requestedScopes: readonly string[],
    now: Date,
  ): Promise<OidcConsentEntity> {
    const normalizedRequestedScopes = normalizeScopeItems(requestedScopes);
    const existing = await this.repository.findBySubjectAndClientId(subject, clientId);

    if (existing !== null) {
      const mergedScopes = normalizeScopeItems([
        ...existing.grantedScopes,
        ...normalizedRequestedScopes,
      ]);
      return this.repository.upsertActiveConsent({
        subject,
        clientId,
        grantedScopes: mergedScopes,
        grantedAt: existing.grantedAt,
      });
    }

    return this.repository.upsertActiveConsent({
      subject,
      clientId,
      grantedScopes: normalizedRequestedScopes,
      grantedAt: now,
    });
  }

  async revokeConsent(
    subject: string,
    clientId: string,
    revokedAt: Date,
  ): Promise<OidcConsentEntity | null> {
    return this.repository.revokeConsent(subject, clientId, revokedAt);
  }

  async listConnectedApplications(
    subject: string,
    resolveClientName: (clientId: string) => Promise<string> | string,
  ): Promise<ConnectedApplicationView[]> {
    const consents = await this.repository.listActiveBySubject(subject);
    const views = await Promise.all(
      consents.map(async (consent) =>
        toConnectedApplicationView(consent, await resolveClientName(consent.clientId)),
      ),
    );
    return views;
  }
}
