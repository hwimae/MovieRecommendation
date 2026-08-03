import type { MyReview, UpsertUserReviewData, UserReview } from './reviews.model';

export interface ReviewsRepository {
  upsertForStoryAndRefreshRating(userId: string, input: UpsertUserReviewData): Promise<UserReview | null>;
  listByUser(userId: string, pagination: { page: number; limit: number }): Promise<{ items: MyReview[]; total: number }>;
}
