import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { BackendDeps } from '../../dependencies';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createAuthController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';
import { createAuthService } from './auth.service';

export function createAuthRouter(deps: BackendDeps): Router {
  const router = Router();
  const authLimiter = rateLimit({ windowMs: 60_000, limit: 10 });
  const controller = createAuthController(createAuthService(deps));

  router.post('/register', authLimiter, validateBody(registerSchema), controller.register);
  router.post('/login', authLimiter, validateBody(loginSchema), controller.login);
  router.get('/me', requireAuth(deps), controller.me);

  return router;
}
