import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { createReviewsController } from './reviews.controller';
import { listMyReviewsQuerySchema, reviewStorySchema, type ListMyReviewsQuery } from './reviews.schema';
import { createPrismaReviewsRepository } from './reviews.prisma.repository';
import { createReviewsService } from './reviews.service';

export function createReviewsRouter(deps: BackendDeps): Router {
  const router = Router();
  const repository = createPrismaReviewsRepository(deps.prisma);
  const controller = createReviewsController(createReviewsService({ repository }));

  router.post('/', requireAuth(deps), validateBody(reviewStorySchema), controller.reviewStory);
  router.get<Record<string, string>, unknown, unknown, ListMyReviewsQuery>(
    '/me',
    requireAuth(deps),
    validateQuery(listMyReviewsQuerySchema),
    controller.listMyReviews,
  );

  return router;
}
