import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthService } from './auth.service';

export type AuthController = {
  register: RequestHandler;
  login: RequestHandler;
  me: RequestHandler;
};

export function createAuthController(authService: AuthService): AuthController {
  return {
    async register(req: Request, res: Response, next: NextFunction) {
      try {
        res.json(await authService.register(req.body));
      } catch (error) {
        next(error);
      }
    },

    async login(req: Request, res: Response, next: NextFunction) {
      try {
        res.json(await authService.login(req.body));
      } catch (error) {
        next(error);
      }
    },

    me(req: Request, res: Response) {
      res.json(req.user);
    },
  };
}
