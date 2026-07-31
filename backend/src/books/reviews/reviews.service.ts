import { notFound } from '../../errors';
import type { PaginatedMyReviews, UserReview } from './reviews.model';
import type { ReviewsRepository } from './reviews.repository';
import type { ListMyReviewsQuery, ReviewStoryInput } from './reviews.schema';

export type ReviewsService = {
  reviewStory(userId: string, input: ReviewStoryInput): Promise<UserReview>;
  listMyReviews(userId: string, query: ListMyReviewsQuery): Promise<PaginatedMyReviews>;
};

export function createReviewsService(deps: { repository: ReviewsRepository }): ReviewsService {
  return {
    async reviewStory(userId, input) {
      const review = await deps.repository.upsertForStoryAndRefreshRating(userId, input);
      if (!review) {
        throw notFound('Story not found');
      }

      return review;
    },

    async listMyReviews(userId, query) {
      const { items, total } = await deps.repository.listByUser(userId, {
        page: query.page,
        limit: query.limit,
      });

      return { items, total, page: query.page, limit: query.limit };
    },
  };
}
