export type RecommendationQuery = { limit: number };

export type RecommendationItem = {
  storyId: string;
  title: string;
  authors: string;
  category: string;
  averageRating: number;
  reviewCount: number;
  score: number;
  reason: string;
};

export type RecommendationsResponse = { items: RecommendationItem[] };

export type StoryAdvisorResponse = { answer: string; recommendations: RecommendationItem[] };

export type PopularStoryCandidate = {
  id: string;
  title: string;
  authors: string;
  userAverageRating: number;
  userReviewCount: number;
  category: { name: string };
};

export type StoryChunkSearchRow = {
  storyId: string;
  title: string;
  authors: string;
  category: string;
  averageRating: number;
  reviewCount: number;
  chunkContent: string;
  distance: number;
};
