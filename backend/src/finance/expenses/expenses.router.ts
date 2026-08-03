import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validate';
import { financeIdParamSchema } from '../finance.schema';
import { createFinanceExpensesController } from './expenses.controller';
import { createPrismaFinanceExpensesRepository } from './expenses.prisma.repository';
import { createFinanceExpensesService } from './expenses.service';
import { createFinanceExpenseSchema, updateFinanceExpenseSchema } from './expenses.schema';

export function createFinanceExpensesRouter(deps: BackendDeps): Router {
  const router = Router();
  const repository = createPrismaFinanceExpensesRepository(deps.prisma);
  const controller = createFinanceExpensesController(createFinanceExpensesService({ repository }));

  router.use(requireAuth(deps));
  router.get('/', controller.list);
  router.post('/', validateBody(createFinanceExpenseSchema), controller.create);
  router.put('/:id', validateParams(financeIdParamSchema), validateBody(updateFinanceExpenseSchema), controller.update);
  router.delete('/:id', validateParams(financeIdParamSchema), controller.remove);

  return router;
}
