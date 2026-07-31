import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { requireAuth } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { createReviewsController } from './reviews.controller';
import { listMyReviewsQuerySchema, reviewStorySchema, type ListMyReviewsQuery } from './reviews.schema';
import { createReviewsService } from './reviews.service';

export function createReviewsRouter(deps: BackendDeps): Router {
  const router = Router();
  const controller = createReviewsController(createReviewsService(deps));

  router.post('/', requireAuth(deps), validateBody(reviewStorySchema), controller.reviewStory);
  router.get<Record<string, string>, unknown, unknown, ListMyReviewsQuery>(
    '/me',
    requireAuth(deps),
    validateQuery(listMyReviewsQuerySchema),
    controller.listMyReviews,
  );

  return router;
}
