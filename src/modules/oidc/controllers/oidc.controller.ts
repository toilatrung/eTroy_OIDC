import type { NextFunction, Request, Response } from 'express';
import type { JsonWebKeySet } from '../../../infrastructure/crypto/index.js';

import {
  oidcService,
  type AuthorizeHandlerResult,
  type AuthorizeContinueResult,
  type AuthorizeRequestContext,
  type LogoutResult,
  type LogoutSuccessResponse,
  type TokenExchangeResponse,
} from '../services/oidc.service.js';
import type {
  OidcCsrfCookieDescriptor,
  OidcSessionCookieDescriptor,
} from '../services/oidc-session.service.js';
import type { TokenIntrospectionResponse } from '../types/oidc.types.js';

interface AuthorizeResponseBody {
  data: AuthorizeRequestContext;
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
  response: Response<AuthorizeResponseBody>,
  next: NextFunction,
): Promise<void> => {
  try {
    const result: AuthorizeHandlerResult = await oidcService.authorize(
      request.query,
      request.headers.cookie,
    );

    if (result.kind === 'redirect') {
      response.redirect(302, result.redirectTo);
      return;
    }

    if (result.clearSessionCookie) {
      clearCookie(response, oidcService.getClearSessionCookieDescriptor());
      clearCookie(response, oidcService.getClearCsrfCookieDescriptor());
    }

    response.status(200).json({ data: result.context });
  } catch (error: unknown) {
    next(error);
  }
};

export const authorizeContinueHandler = async (
  request: Request<Record<string, never>, never, Record<string, unknown>>,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result: AuthorizeContinueResult = await oidcService.continueAuthorize(request.body);
    setCookie(response, result.sessionCookie);
    setCookie(response, result.csrfCookie);
    response.redirect(302, result.redirectTo);
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
