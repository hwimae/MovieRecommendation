import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthUser } from '../identity/auth/auth.schema';
import type { BackendDeps } from '../dependencies';
import { forbidden, unauthorized } from '../errors';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
  Locals extends Record<string, any> = Record<string, any>,
>(deps: Pick<BackendDeps, 'usersRepository' | 'tokenService'>): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return async (req: Request<P, ResBody, ReqBody, ReqQuery, Locals>, _res: Response, next: NextFunction) => {
    try {
      const header = req.header('authorization');
      const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
      if (!token) {
        throw unauthorized('Unauthorized');
      }

      const payload = deps.tokenService.verifyAccessToken(token);
      const user = await deps.usersRepository.findById(payload.sub);
      if (!user || user.status !== 'APPROVED') {
        throw unauthorized('Unauthorized');
      }

      req.user = { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
      next();
    } catch {
      next(unauthorized('Unauthorized'));
    }
  };
}

export function requireAdmin(): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || req.user.status !== 'APPROVED' || req.user.role !== 'ADMIN') {
      next(forbidden('Admin access required'));
      return;
    }

    next();
  };
}
