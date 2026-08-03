import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validate';
import { financeSessionIdParamSchema } from '../finance.schema';
import { createFinanceChatController } from './chat.controller';
import { createPrismaFinanceChatRepository } from './chat.prisma.repository';
import { createFinanceChatService } from './chat.service';
import { sendFinanceChatMessageSchema, startFinanceChatSchema } from './chat.schema';

export function createFinanceChatRouter(deps: BackendDeps): Router {
  const router = Router();
  const repository = createPrismaFinanceChatRepository(deps.prisma);
  const controller = createFinanceChatController(createFinanceChatService({
    repository,
    financeAiClient: deps.financeAiClient,
  }));

  router.use(requireAuth(deps));
  router.post('/start', validateBody(startFinanceChatSchema), controller.start);
  router.post('/:sessionId/message', validateParams(financeSessionIdParamSchema), validateBody(sendFinanceChatMessageSchema), controller.sendMessage);
  router.get('/:sessionId/history', validateParams(financeSessionIdParamSchema), controller.history);
  router.post('/:sessionId/close', validateParams(financeSessionIdParamSchema), controller.close);

  return router;
}
