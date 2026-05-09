import type { NextFunction, Request, Response } from 'express';

import { userInfoService } from '../services/userinfo.service.js';
import type { OidcClaims } from '../types/oidc.types.js';

export const userInfoHandler = async (
  request: Request,
  response: Response<OidcClaims>,
  next: NextFunction,
): Promise<void> => {
  try {
    const claims = await userInfoService.resolveClaims(request.header('authorization'));
    response.status(200).json(claims);
  } catch (error: unknown) {
    next(error);
  }
};
