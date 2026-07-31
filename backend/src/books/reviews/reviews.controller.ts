import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { unauthorized } from '../../errors';
import type { ListMyReviewsQuery } from './reviews.schema';
import type { ReviewsService } from './reviews.service';

type ListMyReviewsRequest = Request<Record<string, string>, unknown, unknown, ListMyReviewsQuery>;
type ListMyReviewsHandler = RequestHandler<Record<string, string>, unknown, unknown, ListMyReviewsQuery>;

export type ReviewsController = {
  reviewStory: RequestHandler;
  listMyReviews: ListMyReviewsHandler;
};

function getUserId(req: Request<any, any, any, any>, next: NextFunction): string | undefined {
  if (!req.user) {
    next(unauthorized('Unauthorized'));
    return undefined;
  }

  return req.user.id;
}

export function createReviewsController(reviewsService: ReviewsService): ReviewsController {
  return {
    async reviewStory(req: Request, res: Response, next: NextFunction) {
      const userId = getUserId(req, next);
      if (!userId) return;

      try {
        res.json(await reviewsService.reviewStory(userId, req.body));
      } catch (error) {
        next(error);
      }
    },

    async listMyReviews(req: ListMyReviewsRequest, res: Response, next: NextFunction) {
      const userId = getUserId(req, next);
      if (!userId) return;

      try {
        res.json(await reviewsService.listMyReviews(userId, req.query));
      } catch (error) {
        next(error);
      }
    },
  };
}
