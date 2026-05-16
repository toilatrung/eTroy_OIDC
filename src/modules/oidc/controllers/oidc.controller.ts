import type { NextFunction, Request, Response } from 'express';
import type { JsonWebKeySet } from '../../../infrastructure/crypto/index.js';
import type { AuthenticatedIdentity } from '../../auth/auth.service.js';
import { BaseError } from '../../../shared/errors/index.js';

import {
  oidcService,
  type AuthorizeHandlerResult,
  type OidcAuthorizeDecisionResponse,
  type OidcAuthorizeInteractionResponse,
  type OidcConnectedApplicationsResponse,
  type OidcRevokeConsentResponse,
  type LogoutResult,
  type LogoutSuccessResponse,
  type TokenExchangeResponse,
} from '../services/oidc.service.js';
import type {
  OidcCsrfCookieDescriptor,
  OidcSessionCookieDescriptor,
} from '../services/oidc-session.service.js';
import type { TokenIntrospectionResponse } from '../types/oidc.types.js';

interface InternalLoginRequestBody {
  email?: string;
  password?: string;
}

interface InternalLoginResponseBody {
  data: AuthenticatedIdentity;
}

interface TokenRequestBody {
  grant_type?: string;
  code?: string;
  refresh_token?: string;
  client_id?: string;
  redirect_uri?: string;
  code_verifier?: string;
}

interface RevokeRequestBody {
  token?: string;
  token_type_hint?: string;
  client_id?: string;
}

interface IntrospectRequestBody {
  token?: string;
  token_type_hint?: string;
  client_id?: string;
}

interface LogoutRequestBody {
  post_logout_redirect_uri?: string;
  client_id?: string;
  state?: string;
  csrf_token?: string;
}

type OidcCookieDescriptor = OidcSessionCookieDescriptor | OidcCsrfCookieDescriptor;

const setCookie = (response: Response, cookie: OidcCookieDescriptor): void => {
  response.cookie(cookie.name, cookie.value, {
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    maxAge: cookie.maxAgeMs,
  });
};

const clearCookie = (response: Response, cookie: OidcCookieDescriptor): void => {
  response.clearCookie(cookie.name, {
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
  });
};

export const authorizeHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result: AuthorizeHandlerResult = await oidcService.authorize(
      request.query,
      request.headers.cookie,
    );

    if (result.clearSessionCookie) {
      clearCookie(response, oidcService.getClearSessionCookieDescriptor());
      clearCookie(response, oidcService.getClearCsrfCookieDescriptor());
    }

    response.redirect(302, result.redirectTo);
  } catch (error: unknown) {
    next(error);
  }
};

export const authorizeInteractionHandler = async (
  request: Request,
  response: Response<OidcAuthorizeInteractionResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const interactionId = request.query.interaction_id;
    if (typeof interactionId !== 'string' || interactionId.trim().length === 0) {
      throw new BaseError('interaction_id is required.', {
        code: 'invalid_request',
        statusCode: 400,
      });
    }

    const result = await oidcService.getAuthorizeInteraction(
      interactionId.trim(),
      request.headers.cookie,
    );
    response.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const authorizeDecisionHandler = async (
  request: Request<Record<string, never>, never, Record<string, unknown>>,
  response: Response<OidcAuthorizeDecisionResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await oidcService.decideAuthorizeInteraction(
      request.body,
      request.headers.cookie,
    );
    response.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const listConnectedApplicationsHandler = async (
  request: Request,
  response: Response<OidcConnectedApplicationsResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await oidcService.listConnectedApplications(request.headers.cookie);
    response.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const revokeConnectedApplicationHandler = async (
  request: Request<{ clientId: string }>,
  response: Response<OidcRevokeConsentResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await oidcService.revokeConnectedApplication(
      request.params.clientId,
      request.headers.cookie,
    );
    response.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const internalLoginHandler = async (
  request: Request<Record<string, never>, InternalLoginResponseBody, InternalLoginRequestBody>,
  response: Response<InternalLoginResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await oidcService.loginInternal(request.body ?? {});
    setCookie(response, result.sessionCookie);
    setCookie(response, result.csrfCookie);
    response.status(200).json({ data: result.identity });
  } catch (error: unknown) {
    next(error);
  }
};

export const tokenHandler = async (
  request: Request<Record<string, never>, TokenExchangeResponse, TokenRequestBody>,
  response: Response<TokenExchangeResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await oidcService.exchangeToken(request.body);
    response.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const revokeHandler = async (
  request: Request<Record<string, never>, Record<string, never>, RevokeRequestBody>,
  response: Response<Record<string, never>>,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await oidcService.revokeToken(request.body);
    response.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const introspectHandler = async (
  request: Request<Record<string, never>, TokenIntrospectionResponse, IntrospectRequestBody>,
  response: Response<TokenIntrospectionResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await oidcService.introspectToken(request.body);
    response.status(200).json(result);
  } catch (error: unknown) {
    next(error);
  }
};

export const jwksHandler = async (
  _request: Request,
  response: Response<JsonWebKeySet>,
  next: NextFunction,
): Promise<void> => {
  try {
    const jwks = await oidcService.getJwks();
    response.status(200).json(jwks);
  } catch (error: unknown) {
    next(error);
  }
};

export const logoutHandler = async (
  request: Request<Record<string, never>, LogoutSuccessResponse, LogoutRequestBody>,
  response: Response<LogoutSuccessResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const csrfHeader = request.header('x-oidc-csrf-token');
    const result: LogoutResult = await oidcService.logout({
      body: request.body ?? {},
      cookieHeader: request.headers.cookie,
      csrfToken: csrfHeader === undefined ? undefined : csrfHeader.trim(),
    });

    if (result.clearSessionCookie) {
      clearCookie(response, oidcService.getClearSessionCookieDescriptor());
    }

    if (result.clearCsrfCookie) {
      clearCookie(response, oidcService.getClearCsrfCookieDescriptor());
    }

    if (result.kind === 'redirect') {
      response.redirect(302, result.location);
      return;
    }

    response.status(200).json(result.body);
  } catch (error: unknown) {
    next(error);
  }
};
