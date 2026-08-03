import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ListStoriesQuery, StoryIdParams } from './stories.schema';
import type { StoriesService } from './stories.service';

export type StoriesController = {
  listStories: RequestHandler<Record<string, string>, unknown, unknown, ListStoriesQuery>;
  getStoryById: RequestHandler<StoryIdParams>;
  getStoryContentById: RequestHandler<StoryIdParams>;
};

export function createStoriesController(storiesService: StoriesService): StoriesController {
  return {
    async listStories(req: Request<Record<string, string>, unknown, unknown, ListStoriesQuery>, res: Response, next: NextFunction) {
      try {
        res.json(await storiesService.listStories(req.query));
      } catch (error) {
        next(error);
      }
    },

    async getStoryById(req: Request<StoryIdParams>, res: Response, next: NextFunction) {
      try {
        res.json(await storiesService.getStoryById(req.params.id));
      } catch (error) {
        next(error);
      }
    },

    async getStoryContentById(req: Request<StoryIdParams>, res: Response, next: NextFunction) {
      try {
        res.json(await storiesService.getStoryContentById(req.params.id));
      } catch (error) {
        next(error);
      }
    },
  };
}
