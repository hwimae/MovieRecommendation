import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { requireAdmin, requireAuth } from '../../middleware/auth';
import { validateParams, validateQuery } from '../../middleware/validate';
import { createAdminController } from './admin.controller';
import { adminUserIdParamSchema, listAdminUsersQuerySchema } from './admin.schema';
import { createAdminService } from './admin.service';

export function createAdminRouter(deps: BackendDeps): Router {
  const router = Router();
  const controller = createAdminController(createAdminService(deps));

  router.use(requireAuth(deps));
  router.use(requireAdmin());

  router.get('/users', validateQuery(listAdminUsersQuerySchema), controller.listUsers);
  router.post('/users/:id/approve', validateParams(adminUserIdParamSchema), controller.approveUser);
  router.post('/users/:id/reject', validateParams(adminUserIdParamSchema), controller.rejectUser);

  return router;
}
