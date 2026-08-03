export type UserReview = {
  id: string;
  userId: string;
  storyId: string;
  rating: number;
  title: string;
  content: string;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type MyReviewStory = {
  id: string;
  title: string;
  authors: string;
  externalAverageRating: number;
  externalReviewCount: number;
  userAverageRating: number;
  userReviewCount: number;
};

export type MyReview = UserReview & { story: MyReviewStory };

export type PaginatedMyReviews = {
  items: MyReview[];
  total: number;
  page: number;
  limit: number;
};

export type UpsertUserReviewData = {
  storyId: string;
  rating: number;
  title: string;
  content: string;
};
