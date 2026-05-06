import type { NextFunction, Request, Response } from 'express';

import {
  oidcService,
  type AuthorizeContinueResult,
  type AuthorizeRequestContext,
  type TokenExchangeResponse,
} from './oidc.service.js';

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

export const authorizeHandler = (
  request: Request,
  response: Response<AuthorizeResponseBody>,
  next: NextFunction,
): void => {
  try {
    const result = oidcService.validateAuthorizeRequest(request.query);
    response.status(200).json({ data: result });
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
