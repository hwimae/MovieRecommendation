import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validate';
import { createFinanceGroupsController } from './groups.controller';
import { createFinanceGroupsService } from './groups.service';
import { createPrismaFinanceGroupsRepository } from './groups.prisma.repository';
import {
  addFinanceGroupMemberSchema,
  createFinanceGroupSchema,
  financeGroupIdParamSchema,
  financeGroupMemberBudgetParamSchema,
  financeGroupMemberExpenseParamSchema,
  financeGroupMemberParamSchema,
} from './groups.schema';

export function createFinanceGroupsRouter(deps: BackendDeps): Router {
  const router = Router();
  const repository = createPrismaFinanceGroupsRepository(deps.prisma);
  const controller = createFinanceGroupsController(createFinanceGroupsService({ repository }));

  router.use(requireAuth(deps));
  router.get('/', controller.list);
  router.post('/', validateBody(createFinanceGroupSchema), controller.create);
  router.get('/:groupId', validateParams(financeGroupIdParamSchema), controller.detail);
  router.delete('/:groupId', validateParams(financeGroupIdParamSchema), controller.removeGroup);
  router.post('/:groupId/members', validateParams(financeGroupIdParamSchema), validateBody(addFinanceGroupMemberSchema), controller.addMember);
  router.delete('/:groupId/members/:memberUserId', validateParams(financeGroupMemberParamSchema), controller.removeMember);
  router.get('/:groupId/members/:memberUserId/dashboard', validateParams(financeGroupMemberParamSchema), controller.memberDashboard);
  router.get('/:groupId/members/:memberUserId/expenses', validateParams(financeGroupMemberParamSchema), controller.memberExpenses);
  router.get('/:groupId/members/:memberUserId/budgets', validateParams(financeGroupMemberParamSchema), controller.memberBudgets);
  router.delete('/:groupId/members/:memberUserId/expenses/:expenseId', validateParams(financeGroupMemberExpenseParamSchema), controller.deleteMemberExpense);
  router.delete('/:groupId/members/:memberUserId/budgets/:budgetId', validateParams(financeGroupMemberBudgetParamSchema), controller.deleteMemberBudget);

  return router;
}
