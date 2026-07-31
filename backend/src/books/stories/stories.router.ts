import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { validateParams, validateQuery } from '../../middleware/validate';
import { createStoriesController } from './stories.controller';
import { createPrismaStoriesRepository } from './stories.prisma.repository';
import { listStoriesQuerySchema, storyIdParamsSchema, type ListStoriesQuery } from './stories.schema';
import { createStoriesService } from './stories.service';

export function createStoriesRouter(deps: BackendDeps): Router {
  const router = Router();
  const repository = createPrismaStoriesRepository(deps.prisma);
  const controller = createStoriesController(createStoriesService({
    repository,
    storyContentReader: deps.storyContentReader,
  }));

  router.get<Record<string, string>, unknown, unknown, ListStoriesQuery>(
    '/',
    validateQuery(listStoriesQuerySchema),
    controller.listStories,
  );
  router.get('/:id/content', validateParams(storyIdParamsSchema), controller.getStoryContentById);
  router.get('/:id', validateParams(storyIdParamsSchema), controller.getStoryById);

  return router;
}
