import type { NextFunction, Request, Response } from 'express';

import {
  oidcService,
  type AuthorizeHandlerResult,
  type AuthorizeContinueResult,
  type AuthorizeRequestContext,
  type TokenExchangeResponse,
} from './oidc.service.js';
import type { OidcSessionCookieDescriptor } from './oidc-session.service.js';
import type { TokenIntrospectionResponse } from './oidc.types.js';

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

const setSessionCookie = (response: Response, cookie: OidcSessionCookieDescriptor): void => {
  response.cookie(cookie.name, cookie.value, {
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    maxAge: cookie.maxAgeMs,
  });
};

const clearSessionCookie = (response: Response, cookie: OidcSessionCookieDescriptor): void => {
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
      clearSessionCookie(response, oidcService.getClearSessionCookieDescriptor());
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
    setSessionCookie(response, result.sessionCookie);
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
