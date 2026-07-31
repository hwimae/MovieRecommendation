import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validate';
import { financeIdParamSchema } from '../finance.schema';
import { createFinanceBudgetsController } from './budgets.controller';
import { createPrismaFinanceBudgetsRepository } from './budgets.prisma.repository';
import { createFinanceBudgetsService } from './budgets.service';
import { upsertFinanceBudgetSchema } from './budgets.schema';

export function createFinanceBudgetsRouter(deps: BackendDeps): Router {
  const router = Router();
  const repository = createPrismaFinanceBudgetsRepository(deps.prisma);
  const service = createFinanceBudgetsService({ repository });
  const controller = createFinanceBudgetsController(service);

  router.use(requireAuth(deps));
  router.get('/', controller.list);
  router.post('/', validateBody(upsertFinanceBudgetSchema), controller.upsert);
  router.delete('/:id', validateParams(financeIdParamSchema), controller.remove);

  return router;
}
