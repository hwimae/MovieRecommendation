import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validate';
import { financeIdParamSchema } from '../finance.schema';
import { createFinanceCategoriesController } from './categories.controller';
import { createPrismaFinanceCategoriesRepository } from './categories.prisma.repository';
import { createFinanceCategoriesService } from './categories.service';
import { createFinanceCategorySchema, updateFinanceCategorySchema } from './categories.schema';

export function createFinanceCategoriesRouter(deps: BackendDeps): Router {
  const router = Router();
  const repository = createPrismaFinanceCategoriesRepository(deps.prisma);
  const controller = createFinanceCategoriesController(createFinanceCategoriesService({ repository }));

  router.use(requireAuth(deps));
  router.get('/', controller.list);
  router.post('/', validateBody(createFinanceCategorySchema), controller.create);
  router.put('/:id', validateParams(financeIdParamSchema), validateBody(updateFinanceCategorySchema), controller.update);
  router.delete('/:id', validateParams(financeIdParamSchema), controller.remove);

  return router;
}
